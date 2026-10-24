import "server-only";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { Database, Row, TableName } from "@/lib/domain";
import { emptyDatabase, createMemoryRepository } from "@/lib/data/memory";
import type { Repository } from "@/lib/data/repository";
import { dataDir } from "@/lib/data/paths";
import { ensureContent, ensureDemo, ensureOperator } from "@/lib/demo/seed";

const filePath = path.join(dataDir(), "db.json");
const store = globalThis as { __couplesyncRepo?: Promise<Repository>; __couplesyncQueue?: Promise<unknown> };
store.__couplesyncQueue ??= Promise.resolve();

function locked<T>(work: () => Promise<T>) {
  const run = store.__couplesyncQueue!.then(work, work);
  store.__couplesyncQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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

export function getLocalRepository() {
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
