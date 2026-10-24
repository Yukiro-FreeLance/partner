import { existsSync, readFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { resolve } from "path";
import type { Database } from "../src/lib/domain";

function loadEnv(file: string) {
  const envPath = resolve(file);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

async function readSource(): Promise<Database> {
  const { unpackDatabase } = await import("../src/lib/data/compact");
  const { emptyDatabase } = await import("../src/lib/data/memory");
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const { BlobNotFoundError, get } = await import("@vercel/blob");
    try {
      const loaded = await get("couplesync/db.json", { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
      if (!loaded || loaded.statusCode !== 200 || !loaded.stream) return emptyDatabase();
      const bytes = Buffer.from(await new Response(loaded.stream).arrayBuffer());
      return { ...emptyDatabase(), ...unpackDatabase(bytes) };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return emptyDatabase();
      const message = error instanceof Error ? error.message : "unknown error";
      throw new Error(`The shared store could not be read, so no database rows were changed. ${message}`);
    }
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), ".data", "db.json"));
    return { ...emptyDatabase(), ...unpackDatabase(bytes) };
  } catch {
    return emptyDatabase();
  }
}

function contentTypeFor(db: Database, storagePath: string) {
  const media = db.mediaObjects.find((item) => item.storagePath === storagePath);
  if (media?.contentType) return media.contentType;
  for (const settings of db.siteSettings) {
    if (settings.faviconPath === storagePath && settings.faviconType) return settings.faviconType;
    if (settings.appleIconPath === storagePath && settings.appleIconType) return settings.appleIconType;
    if (settings.iconPath === storagePath && settings.iconType) return settings.iconType;
    if (settings.ogImagePath === storagePath && settings.ogImageType) return settings.ogImageType;
  }
  return "image/jpeg";
}

async function readFileBytes(storagePath: string) {
  const { unpackBytes } = await import("../src/lib/data/compact");
  let bytes: Buffer | null = null;
  if (storagePath.startsWith("couplesync/")) {
    const { BlobNotFoundError, get } = await import("@vercel/blob");
    try {
      const loaded = await get(storagePath, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
      if (!loaded?.stream || loaded.statusCode !== 200) return null;
      bytes = Buffer.from(await new Response(loaded.stream).arrayBuffer());
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  } else {
    try {
      bytes = await readFile(storagePath);
    } catch {
      return null;
    }
  }
  if (!bytes) return null;
  return storagePath.endsWith(".gz") ? unpackBytes(bytes) : bytes;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const database = await readSource();
  const { sourceHasRecords, snapshotDatabase, copyDatabase, storedFileMoves } = await import("../src/lib/data/migrate");
  const { createMemoryRepository } = await import("../src/lib/data/memory");
  if (!sourceHasRecords(database)) {
    console.error("The source has no profiles, questions, or saved site settings. Nothing was written.");
    process.exit(1);
  }
  const moves = storedFileMoves(database);
  console.log(`Source profiles: ${database.profiles.length}. Questions: ${database.questions.length}. Site settings: ${database.siteSettings.length}. Files to copy: ${moves.length}.`);
  if (!apply) {
    console.log("Dry run only. Re-run with --apply after Supabase credentials are set. The Blob store was not changed.");
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Supabase credentials are missing. Nothing was written.");
    process.exit(1);
  }
  const files = new Map<string, { bytes: Buffer; contentType: string }>();
  const readable = [];
  for (const move of moves) {
    const bytes = await readFileBytes(move.from);
    if (!bytes) {
      console.error(`Could not read a stored file. Its database path will stay unchanged.`);
      continue;
    }
    files.set(move.to, { bytes, contentType: contentTypeFor(database, move.from) });
    readable.push(move);
  }
  const copied = structuredClone(database);
  const moved = new Map(readable.map((move) => [move.from, move.to]));
  for (const media of copied.mediaObjects) {
    const nextPath = moved.get(media.storagePath);
    if (nextPath) media.storagePath = nextPath;
  }
  for (const settings of copied.siteSettings) {
    if (typeof settings.faviconPath === "string" && moved.has(settings.faviconPath)) settings.faviconPath = moved.get(settings.faviconPath) ?? settings.faviconPath;
    if (typeof settings.appleIconPath === "string" && moved.has(settings.appleIconPath)) settings.appleIconPath = moved.get(settings.appleIconPath) ?? settings.appleIconPath;
    if (typeof settings.iconPath === "string" && moved.has(settings.iconPath)) settings.iconPath = moved.get(settings.iconPath) ?? settings.iconPath;
    if (typeof settings.ogImagePath === "string" && moved.has(settings.ogImagePath)) settings.ogImagePath = moved.get(settings.ogImagePath) ?? settings.ogImagePath;
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    return originalFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
  const { createClient } = await import("@supabase/supabase-js");
  const { createSupabaseRepository } = await import("../src/lib/data/supabase-repo");
  const target = createSupabaseRepository();
  for (const profile of copied.profiles) {
    const existing = await target.find("profiles", { eq: { email: profile.email } });
    if (!existing || existing.id === profile.id) continue;
    await target.removeWhere("credentials", { eq: { userId: existing.id } });
    await target.removeWhere("userPreferences", { eq: { userId: existing.id } });
    await target.removeWhere("emailTokens", { eq: { userId: existing.id } });
    await target.remove("profiles", existing.id);
  }
  const fromTable = process.argv.find((arg) => arg.startsWith("--from="))?.slice("--from=".length);
  if (fromTable) {
    for (const key of Object.keys(copied) as (keyof Database)[]) {
      if (key === fromTable) break;
      (copied as Record<keyof Database, unknown[]>)[key] = [];
    }
  }
  const profileIds = new Set(database.profiles.map((profile) => profile.id));
  const coupleIds = new Set(database.couples.map((couple) => couple.id));
  copied.mediaObjects = copied.mediaObjects.flatMap((media) => {
    if (!profileIds.has(media.ownerId)) return [];
    if (media.coupleId && !coupleIds.has(media.coupleId)) media.coupleId = null;
    return [media];
  });
  for (const event of copied.auditEvents) {
    if (event.userId && !profileIds.has(event.userId)) event.userId = null;
  }
  console.log("Saving a rollback snapshot.");
  const before = await snapshotDatabase(target);
  const rollbackPath = path.join(process.cwd(), ".data", "migration-rollback.json");
  await mkdir(path.dirname(rollbackPath), { recursive: true });
  await writeFile(rollbackPath, JSON.stringify(before));
  const report = await copyDatabase(createMemoryRepository(copied), target);
  if (report.missing.length) {
    console.error(`Validation failed for ${report.missing.length} rows. Run npm run migrate:rollback to restore the previous database rows.`);
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [objectPath, file] of files) {
    const upload = await client.storage.from("private-media").upload(objectPath, file.bytes, { upsert: true, contentType: file.contentType });
    if (upload.error) {
      console.error(`File upload failed for ${objectPath}: ${upload.error.message}`);
    }
  }
  console.log("Supabase now has the copied records. Blob files and couplesync/db.json were left in place.");
  console.log(`Rollback snapshot: ${rollbackPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
