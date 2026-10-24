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
  const { sourceHasRecords, snapshotDatabase, copyDatabase, storedFileMoves, rewriteStoredPaths } = await import("../src/lib/data/migrate");
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
  const files = new Map<string, Buffer>();
  for (const move of moves) {
    const bytes = await readFileBytes(move.from);
    if (!bytes) {
      console.error(`Could not read ${move.from}. Nothing was written to Supabase.`);
      process.exit(1);
    }
    files.set(move.to, bytes);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const { createSupabaseRepository } = await import("../src/lib/data/supabase-repo");
  const target = createSupabaseRepository();
  const before = await snapshotDatabase(target);
  const rollbackPath = path.join(process.cwd(), ".data", "migration-rollback.json");
  await mkdir(path.dirname(rollbackPath), { recursive: true });
  await writeFile(rollbackPath, JSON.stringify(before));
  const report = await copyDatabase(createMemoryRepository(rewriteStoredPaths(database)), target);
  if (report.missing.length) {
    console.error(`Validation failed for ${report.missing.length} rows. Run npm run migrate:rollback to restore the previous database rows.`);
    process.exit(1);
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [objectPath, bytes] of files) {
    const upload = await client.storage.from("private-media").upload(objectPath, bytes, { upsert: true });
    if (upload.error) {
      console.error(`File upload failed for ${objectPath}. Database rows can be restored with npm run migrate:rollback. Blob files were left in place.`);
      process.exit(1);
    }
  }
  console.log("Supabase now has the copied records. Blob files and couplesync/db.json were left in place.");
  console.log(`Rollback snapshot: ${rollbackPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
