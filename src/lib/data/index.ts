import "server-only";
import { isSupabaseConfigured } from "@/lib/config";
import { getLocalRepository } from "@/lib/data/local";
import type { Repository } from "@/lib/data/repository";
import { createSupabaseRepository } from "@/lib/data/supabase-store";
import { ensureOperator } from "@/lib/demo/seed";

const staff = globalThis as { __couplesyncStaffReady?: Promise<void> };

export async function getRepository(): Promise<Repository> {
  if (isSupabaseConfigured()) return createSupabaseRepository();
  const repo = await getLocalRepository();
  staff.__couplesyncStaffReady ??= ensureOperator(repo).then(
    () => undefined,
    (error) => {
      staff.__couplesyncStaffReady = undefined;
      console.error("Operator setup failed", error instanceof Error ? error.message : "unknown error");
    },
  );
  await staff.__couplesyncStaffReady;
  return repo;
}
