import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(file: string, override: boolean) {
  const path = resolve(file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!override && process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

loadEnv(".env", false);
loadEnv(".env.local", true);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Supabase is not configured. Local mode seeds the question bank and fictional demo couple on the first request. See README.md.");
    return;
  }
  const { createSupabaseRepository } = await import("../src/lib/data/supabase-repo");
  const { ensureContent, ensureDemo } = await import("../src/lib/demo/seed");
  const repo = createSupabaseRepository();
  await ensureContent(repo);
  console.log("Question bank, tests, cards, and challenges are present.");
  if (process.env.SEED_DEMO === "true") {
    await ensureDemo(repo);
    console.log("Fictional demo couple seeded. Demo login is available only in local mode.");
  } else {
    console.log("Skipped fictional demo profiles. Set SEED_DEMO=true to add them.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
