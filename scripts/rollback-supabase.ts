import { existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { resolve } from "path";

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

async function main() {
  const file = process.argv[2] || path.join(process.cwd(), ".data", "migration-rollback.json");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase credentials are missing. Nothing was restored.");
    process.exit(1);
  }
  const snapshot = JSON.parse(await readFile(file, "utf8"));
  const { restoreDatabase } = await import("../src/lib/data/migrate");
  const { createSupabaseRepository } = await import("../src/lib/data/supabase-repo");
  await restoreDatabase(createSupabaseRepository(), snapshot);
  console.log("Database rows were restored from the snapshot. Uploaded storage files were left in place.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
