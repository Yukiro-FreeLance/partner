import "server-only";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import type { Database, Row, TableName } from "@/lib/domain";
import { emptyDatabase, createMemoryRepository } from "@/lib/data/memory";
import type { Repository } from "@/lib/data/repository";
import { dataDir } from "@/lib/data/paths";
import { ensureContent, ensureDemo, ensureOperator } from "@/lib/demo/seed";

const filePath = path.join(dataDir(), "db.json");
const blobPath = "couplesync/db.json";
const store = globalThis as { __couplesyncRepo?: Promise<Repository>; __couplesyncQueue?: Promise<unknown>; __couplesyncShared?: Repository };
store.__couplesyncQueue ??= Promise.resolve();

function locked<T>(work: () => Promise<T>) {
  const run = store.__couplesyncQueue!.then(work, work);
  store.__couplesyncQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sharedEnabled() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

function operatorReady(db: Database) {
  const emails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email && !email.endsWith("@demo.couplesync.local"));
  if (emails.length === 0) return true;
  return emails.every((email) =>
    db.profiles.some((profile) => profile.email.toLowerCase() === email && profile.role === "super_admin" && profile.emailVerified && !profile.isDemo),
  );
}

async function readDatabase(): Promise<Database> {
  try {
    const raw = await readFile(filePath, "utf8");
    return { ...emptyDatabase(), ...JSON.parse(raw) } as Database;
  } catch {
    return emptyDatabase();
  }
}

async function writeDatabase(db: Database) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    await writeFile(temporary, JSON.stringify(db));
    await rename(temporary, filePath);
  } catch (error) {
    console.error("Could not save the local database", error instanceof Error ? error.message : "unknown error");
  }
}

async function readBlobDatabase(): Promise<{ db: Database; etag: string | null }> {
  try {
    const loaded = await get(blobPath, { access: "private", useCache: false });
    if (!loaded || loaded.statusCode !== 200 || !loaded.stream) return { db: emptyDatabase(), etag: null };
    const raw = await new Response(loaded.stream).text();
    return { db: { ...emptyDatabase(), ...JSON.parse(raw) } as Database, etag: loaded.blob.etag };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { db: emptyDatabase(), etag: null };
    throw error;
  }
}

async function writeBlobDatabase(db: Database) {
  const saved = await put(blobPath, JSON.stringify(db), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return saved.etag;
}

async function loadPrepared() {
  const { db } = await readBlobDatabase();
  const memory = createMemoryRepository(db);
  let changed = false;
  if (db.questions.length === 0) {
    await ensureContent(memory);
    changed = true;
  }
  if (!db.profiles.some((profile) => profile.isDemo)) {
    try {
      await ensureDemo(memory);
      changed = true;
    } catch (error) {
      console.error("Demo seed failed", error instanceof Error ? error.message : "unknown error");
    }
  }
  if (!operatorReady(db)) changed = (await ensureOperator(memory)) || changed;
  if (changed) await writeBlobDatabase(memory.snapshot());
  return { memory };
}

function sharedRepository(): Repository {
  async function mutate<T>(change: (memory: ReturnType<typeof createMemoryRepository>) => Promise<T>) {
    return locked(async () => {
      const { memory } = await loadPrepared();
      const result = await change(memory);
      await writeBlobDatabase(memory.snapshot());
      return result;
    });
  }
  return {
    kind: "memory",
    async list(table, where, options) {
      const { memory } = await loadPrepared();
      return memory.list(table, where, options);
    },
    async find(table, where) {
      const { memory } = await loadPrepared();
      return memory.find(table, where);
    },
    async insert(table, row) {
      const saved = await mutate((memory) => memory.insert(table, row));
      return saved as Row<TableName>;
    },
    async update(table, id, patch) {
      const saved = await mutate((memory) => memory.update(table, id, patch));
      return saved as Row<TableName>;
    },
    async updateWhere(table, where, patch) {
      return mutate((memory) => memory.updateWhere(table, where, patch));
    },
    async remove(table, id) {
      await mutate(async (memory) => {
        await memory.remove(table, id);
      });
    },
    async removeWhere(table, where) {
      return mutate((memory) => memory.removeWhere(table, where));
    },
  };
}

export function getLocalRepository() {
  if (sharedEnabled()) {
    store.__couplesyncShared ??= sharedRepository();
    return Promise.resolve(store.__couplesyncShared);
  }
  store.__couplesyncRepo ??= locked(async () => {
    const db = await readDatabase();
    const memory = createMemoryRepository(db);
    const hadQuestions = db.questions.length > 0;
    const hadDemo = db.profiles.some((profile) => profile.isDemo);
    if (!hadQuestions) await ensureContent(memory);
    if (!hadDemo) {
      try {
        await ensureDemo(memory);
      } catch (error) {
        console.error("Demo seed failed", error instanceof Error ? error.message : "unknown error");
      }
    }
    const staffChanged = await ensureOperator(memory);
    if (!hadQuestions || !hadDemo || staffChanged) await writeDatabase(memory.snapshot());
    return wrap(memory);
  });
  return store.__couplesyncRepo;
}

function wrap(memory: ReturnType<typeof createMemoryRepository>): Repository {
  async function persist() {
    await writeDatabase(memory.snapshot());
  }
  return {
    kind: "memory",
    list: (table, where, options) => memory.list(table, where, options),
    find: (table, where) => memory.find(table, where),
    async insert(table, row) {
      const saved = await locked(async () => {
        const inserted = await memory.insert(table, row);
        await persist();
        return inserted;
      });
      return saved as Row<TableName>;
    },
    async update(table, id, patch) {
      const saved = await locked(async () => {
        const updated = await memory.update(table, id, patch);
        await persist();
        return updated;
      });
      return saved as Row<TableName>;
    },
    async updateWhere(table, where, patch) {
      return locked(async () => {
        const updated = await memory.updateWhere(table, where, patch);
        await persist();
        return updated;
      });
    },
    async remove(table, id) {
      await locked(async () => {
        await memory.remove(table, id);
        await persist();
      });
    },
    async removeWhere(table, where) {
      return locked(async () => {
        const count = await memory.removeWhere(table, where);
        await persist();
        return count;
      });
    },
  };
}
