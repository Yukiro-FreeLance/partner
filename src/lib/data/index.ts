import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { getLocalRepository } from "@/lib/data/local";
import type { Repository } from "@/lib/data/repository";
import { createSupabaseRepository } from "@/lib/data/supabase-store";
import { ensureContent, ensureDemoCycle, ensureDemoIdentity, ensureOperator } from "@/lib/demo/seed";
import { isMissingColumn, isMissingCycleTable } from "@/lib/cycle/errors";

const staff = globalThis as { __couplesyncReady?: Promise<void> };

export const getRepository = cache(async function getRepository(): Promise<Repository> {
  const repo = isSupabaseConfigured() ? createSupabaseRepository() : await getLocalRepository();
  staff.__couplesyncReady ??= (async () => {
    const sample = await repo.list("questions", {}, { limit: 1 });
    if (sample.length === 0) await ensureContent(repo);
    await ensureOperator(repo);
    try {
      await ensureDemoCycle(repo);
      await ensureDemoIdentity(repo);
    } catch (error) {
      if (!isMissingCycleTable(error) && !isMissingColumn(error)) throw error;
    }
  })().then(
    () => undefined,
    (error) => {
      staff.__couplesyncReady = undefined;
      console.error("Operator setup failed", error instanceof Error ? error.message : "unknown error");
    },
  );
  await staff.__couplesyncReady;
  return repo;
});
