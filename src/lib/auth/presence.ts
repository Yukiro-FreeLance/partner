import { isMissingColumn } from "@/lib/cycle/errors";
import type { Profile } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";

export const ONLINE_MS = 10 * 60 * 1000;
const TOUCH_MS = 2 * 60 * 1000;

const store = globalThis as { __presenceAt?: Map<string, number> };

function stamps() {
  store.__presenceAt ??= new Map();
  return store.__presenceAt;
}

export function isCurrentlyActive(lastSeenAt: string | null | undefined, now = Date.now()) {
  if (!lastSeenAt) return false;
  const at = Date.parse(lastSeenAt);
  return Number.isFinite(at) && now - at < ONLINE_MS;
}

export function formatWhen(value: string | null | undefined, now = Date.now()) {
  if (!value) return "Never";
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return "Never";
  const delta = Math.max(0, now - at);
  if (delta < 45_000) return "Just now";
  if (delta < 60 * 60_000) return `${Math.max(1, Math.round(delta / 60_000))} min ago`;
  if (delta < 24 * 60 * 60_000) return `${Math.max(1, Math.round(delta / 3_600_000))} hr ago`;
  return new Date(at).toLocaleString("en", { month: "short", day: "numeric", year: "numeric" });
}

export async function recordSignIn(repo: Repository, userId: string) {
  const stamp = new Date().toISOString();
  stamps().set(userId, Date.now());
  try {
    await repo.update("profiles", userId, { lastLoginAt: stamp, lastSeenAt: stamp, updatedAt: stamp });
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
  }
}

export async function touchPresence(repo: Repository, userId: string) {
  const last = stamps().get(userId) ?? 0;
  if (Date.now() - last < TOUCH_MS) return;
  stamps().set(userId, Date.now());
  const stamp = new Date().toISOString();
  try {
    await repo.update("profiles", userId, { lastSeenAt: stamp });
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
  }
}

export function lastLoginOf(profile: Pick<Profile, "lastLoginAt">, auditLoginAt?: string | null) {
  const stamps = [profile.lastLoginAt, auditLoginAt].filter((value): value is string => Boolean(value));
  if (!stamps.length) return null;
  return stamps.sort((left, right) => right.localeCompare(left))[0] ?? null;
}
