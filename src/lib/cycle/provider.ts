import "server-only";
import { applyExternalEstimate, predictLocal, type ExternalDates, type PredictionInput } from "@/lib/cycle/predict";

export type ProviderConfig = {
  mode: "local" | "apiverve";
  endpoint: string;
  apiKey: string;
};

export function cycleProviderConfig(): ProviderConfig {
  const requested = (process.env.CYCLE_PREDICTION_PROVIDER || "local").toLowerCase();
  const apiKey = process.env.CYCLE_PREDICTION_API_KEY || "";
  const endpoint = process.env.CYCLE_PREDICTION_API_URL || "https://api.apiverve.com/v1/menstrualcycle";
  return {
    mode: requested === "apiverve" && apiKey ? "apiverve" : "local",
    endpoint,
    apiKey,
  };
}

type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export function parseApivervePayload(payload: unknown, lastPeriod: string): ExternalDates | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const cycles = (data as { cycles?: unknown }).cycles;
  if (!Array.isArray(cycles)) return null;
  const matchIndex = cycles.findIndex((cycle) => cycle && typeof cycle === "object" && (cycle as { period?: { start_date?: string } }).period?.start_date === lastPeriod);
  const current = (matchIndex >= 0 ? cycles[matchIndex] : cycles[0]) as {
    ovulation?: { date?: string };
    fertile_window?: { start_date?: string; end_date?: string };
  };
  const following = cycles[(matchIndex >= 0 ? matchIndex : 0) + 1] as { period?: { start_date?: string } } | undefined;
  const nextPeriodStart = following?.period?.start_date;
  const ovulationDate = current?.ovulation?.date;
  const fertileStart = current?.fertile_window?.start_date;
  const fertileEnd = current?.fertile_window?.end_date;
  if (!nextPeriodStart || !ovulationDate || !fertileStart || !fertileEnd) return null;
  const cycleLength = (data as { cycle_length?: unknown }).cycle_length;
  return {
    nextPeriodStart,
    ovulationDate,
    fertileStart,
    fertileEnd,
    cycleLength: typeof cycleLength === "number" ? cycleLength : undefined,
  };
}

export async function fetchApiverveEstimate(input: {
  endpoint: string;
  apiKey: string;
  lastPeriod: string;
  cycleLength: number;
  periodLength: number;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}) {
  const url = new URL(input.endpoint);
  url.searchParams.set("last_period", input.lastPeriod);
  url.searchParams.set("cycle_length", String(input.cycleLength));
  url.searchParams.set("period_length", String(input.periodLength));
  url.searchParams.set("cycles", "3");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 4000);
  try {
    const response = await (input.fetchImpl ?? fetch)(url.toString(), {
      headers: { "x-api-key": input.apiKey, accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false as const, reason: "unavailable" };
    const payload = await response.json();
    const data = parseApivervePayload(payload, input.lastPeriod);
    if (!data) return { ok: false as const, reason: "unusable" };
    return { ok: true as const, data, url: url.toString() };
  } catch {
    return { ok: false as const, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveEstimate(input: PredictionInput, consent: boolean, fetchImpl?: FetchLike) {
  const local = predictLocal(input);
  const config = cycleProviderConfig();
  if (!consent || config.mode !== "apiverve" || !local.lastPeriodStart || !local.cycleLength || !local.periodLength) return local;
  if (local.cycleLength < 21 || local.cycleLength > 35) {
    return { ...local, notes: [...local.notes, "The optional external calculator only accepts cycle lengths from 21 to 35 days, so this estimate stays in CoupleSync."] };
  }
  const remote = await fetchApiverveEstimate({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    lastPeriod: local.lastPeriodStart,
    cycleLength: local.cycleLength,
    periodLength: local.periodLength,
    fetchImpl,
  });
  if (!remote.ok) {
    return { ...local, source: "local_fallback" as const, notes: [...local.notes, "The external calculator was unavailable. This estimate was calculated in CoupleSync."] };
  }
  return applyExternalEstimate(local, remote.data);
}
