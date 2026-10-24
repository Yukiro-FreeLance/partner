import "server-only";
import { isSupabaseConfigured } from "@/lib/config";
import { getLocalRepository } from "@/lib/data/local";
import type { Repository } from "@/lib/data/repository";
import { createSupabaseRepository } from "@/lib/data/supabase-store";
import { ensureContent, ensureOperator } from "@/lib/demo/seed";

const staff = globalThis as { __couplesyncStaffReady?: Promise<void> };

export async function getRepository(): Promise<Repository> {
  const repo = isSupabaseConfigured() ? createSupabaseRepository() : await getLocalRepository();
  staff.__couplesyncStaffReady ??= (async () => {
    const sample = await repo.list("questions", {}, { limit: 1 });
    if (sample.length === 0) await ensureContent(repo);
    await ensureOperator(repo);
  })().then(
    () => undefined,
    (error) => {
      staff.__couplesyncStaffReady = undefined;
      console.error("Operator setup failed", error instanceof Error ? error.message : "unknown error");
    },
  );
  await staff.__couplesyncStaffReady;
  return repo;
}
