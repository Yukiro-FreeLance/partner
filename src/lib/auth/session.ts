import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { accountStatusOf } from "@/lib/auth/account-status";
import { rememberMembership } from "@/lib/auth/request-scope";
import { isAdminEmail, isSuperAdminEmail, isSupabaseConfigured } from "@/lib/config";
import { getRepository } from "@/lib/data";
import type { CoupleMember, Profile, UserPreferences } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export const SESSION_COOKIE = "cs_session";
export const IMPERSONATION_COOKIE = "cs_impersonate";
export const PAIR_COOKIE = "cs_pair";

export function safePairPath(value: string | null | undefined) {
  if (!value) return null;
  let path = value.trim();
  if (!path || path.length > 512) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("\0")) return null;
  const pathname = path.split("?")[0]?.split("#")[0] ?? "";
  if (pathname === "/join" || pathname === "/pairing" || pathname.startsWith("/invite/")) return pathname;
  return null;
}

export async function rememberPairPath(value: string | null | undefined) {
  const safe = safePairPath(value);
  if (!safe) return;
  (await cookies()).set(PAIR_COOKIE, safe, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function peekPairPath() {
  return safePairPath((await cookies()).get(PAIR_COOKIE)?.value);
}

export async function consumePairPath() {
  const store = await cookies();
  const safe = safePairPath(store.get(PAIR_COOKIE)?.value);
  if (store.get(PAIR_COOKIE)) store.delete(PAIR_COOKIE);
  return safe;
}

export function isStaffRole(role: Profile["role"]) {
  return role === "admin" || role === "super_admin";
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    throw new Error("AUTH_SECRET is required in production when Supabase Auth is not configured.");
  }
  return new TextEncoder().encode("couplesync-dev-secret-not-for-production");
}

export async function signSession(userId: string, email = "") {
  return new SignJWT({ sub: userId, email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("14d").sign(secret());
}

export async function signAccountTicket(input: { userId: string; email: string; displayName: string; passwordHash: string; purpose: "verify" | "reset" }) {
  return new SignJWT({
    purpose: input.purpose,
    email: input.email,
    name: input.displayName,
    ph: input.passwordHash,
  }).setSubject(input.userId).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(input.purpose === "reset" ? "30m" : "24h").sign(secret());
}

export async function readAccountTicket(token: string, purpose: "verify" | "reset") {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== purpose || typeof payload.sub !== "string") return null;
    if (typeof payload.email !== "string" || typeof payload.ph !== "string") return null;
    return {
      userId: payload.sub,
      email: payload.email.toLowerCase(),
      displayName: typeof payload.name === "string" && payload.name.trim() ? payload.name : payload.email.split("@")[0] || "Partner",
      passwordHash: payload.ph,
    };
  } catch {
    return null;
  }
}

export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, email: typeof payload.email === "string" ? payload.email.toLowerCase() : "" };
  } catch {
    return null;
  }
}

export async function readSessionUserId() {
  return (await readSession())?.userId ?? null;
}

export async function setSessionCookie(userId: string) {
  const repo = await getRepository();
  const profile = await repo.find("profiles", { eq: { id: userId } });
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(userId, profile?.email ?? ""), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(IMPERSONATION_COOKIE);
}

export function impersonationCookieOptions(maxAge = 60 * 60 * 8) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function signImpersonation(targetId: string, actorId: string) {
  return new SignJWT({ sub: targetId, act: actorId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
}

export async function setImpersonationCookie(targetId: string, actorId: string) {
  const token = await signImpersonation(targetId, actorId);
  (await cookies()).set(IMPERSONATION_COOKIE, token, impersonationCookieOptions());
}

export async function clearImpersonationCookie() {
  (await cookies()).delete(IMPERSONATION_COOKIE);
}

export type CurrentUser = { profile: Profile; preferences: UserPreferences; actor: Profile | null };

function roleFor(email: string): Profile["role"] {
  if (isSuperAdminEmail(email)) return "super_admin";
  if (isAdminEmail(email)) return "admin";
  return "user";
}

async function syncAdmin(profile: Profile) {
  const repo = await getRepository();
  const stamp = new Date().toISOString();
  if (profile.isDemo) {
    if (profile.role === "user") return profile;
    return repo.update("profiles", profile.id, { role: "user", updatedAt: stamp });
  }
  if (isSuperAdminEmail(profile.email)) {
    if (profile.role === "super_admin") return profile;
    return repo.update("profiles", profile.id, { role: "super_admin", updatedAt: stamp });
  }
  if (isAdminEmail(profile.email) && profile.role === "user") {
    return repo.update("profiles", profile.id, { role: "admin", updatedAt: stamp });
  }
  return profile;
}

async function impersonatedUser(real: Profile) {
  if (real.role !== "super_admin") return null;
  const token = (await cookies()).get(IMPERSONATION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.act !== real.id || typeof payload.sub !== "string" || payload.sub === real.id) return null;
    const repo = await getRepository();
    const target = await repo.find("profiles", { eq: { id: payload.sub } });
    if (!target || target.role === "super_admin" || accountStatusOf(target) !== "active") return null;
    return target;
  } catch {
    return null;
  }
}

async function restoreSessionProfile(repo: Awaited<ReturnType<typeof getRepository>>, userId: string, email: string) {
  const stamp = new Date().toISOString();
  const profile = await repo.insert("profiles", {
    id: userId,
    email,
    displayName: email.split("@")[0] || "Partner",
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: null,
    relationshipStartedOn: null,
    interests: [],
    preferredCategories: [],
    role: email.endsWith("@demo.couplesync.local") ? "user" : roleFor(email),
    isDemo: email.endsWith("@demo.couplesync.local"),
    emailVerified: true,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("userPreferences", defaultPreferences(userId));
  return profile;
}

export type AppSession = { user: CurrentUser; membership: CoupleMember | null; unread: number };

const SESSION_FRESH_MS = 60_000;
const sessionCache = globalThis as { __appSessions?: Map<string, { at: number; value: AppSession }> };

function cachedSessions() {
  sessionCache.__appSessions ??= new Map();
  return sessionCache.__appSessions;
}

export function forgetAppSession(userId: string) {
  cachedSessions().delete(userId);
}

async function shellFor(repo: Awaited<ReturnType<typeof getRepository>>, userId: string) {
  const [membership, unread] = await Promise.all([
    repo.find("coupleMembers", { eq: { userId, status: "active" } }),
    repo.count("notifications", { eq: { userId, readAt: null } }),
  ]);
  return { membership, unread };
}

export const loadAppSession = cache(async function loadAppSession(): Promise<AppSession | null> {
  const session = await readSession();
  if (session) {
    const impersonating = Boolean((await cookies()).get(IMPERSONATION_COOKIE)?.value);
    if (!impersonating) {
      const hit = cachedSessions().get(session.userId);
      if (hit && Date.now() - hit.at < SESSION_FRESH_MS) {
        rememberMembership(hit.value.user.profile.id, hit.value.membership);
        return hit.value;
      }
    }
    const repo = await getRepository();
    const [byId, storedPreferences, actorShell] = await Promise.all([
      repo.find("profiles", { eq: { id: session.userId } }),
      repo.find("userPreferences", { eq: { userId: session.userId } }),
      shellFor(repo, session.userId),
    ]);
    let profile = byId;
    if (!profile && session.email) profile = await repo.find("profiles", { eq: { email: session.email } });
    if (!profile && session.email) profile = await restoreSessionProfile(repo, session.userId, session.email);
    if (!profile || accountStatusOf(profile) !== "active") return null;
    const synced = await syncAdmin(profile);
    const target = await impersonatedUser(synced);
    const effective = target ?? synced;
    const samePerson = effective.id === session.userId;
    const preferences = samePerson && storedPreferences ? storedPreferences : await preferencesFor(repo, effective.id);
    const shell = samePerson ? actorShell : await shellFor(repo, effective.id);
    rememberMembership(effective.id, shell.membership);
    const loaded = { user: { profile: effective, preferences, actor: target ? synced : null }, membership: shell.membership, unread: shell.unread };
    if (!loaded.user.actor) cachedSessions().set(loaded.user.profile.id, { at: Date.now(), value: loaded });
    return loaded;
  }
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const repo = await getRepository();
    const [found, storedPreferences, actorShell] = await Promise.all([
      repo.find("profiles", { eq: { id: data.user.id } }),
      repo.find("userPreferences", { eq: { userId: data.user.id } }),
      shellFor(repo, data.user.id),
    ]);
    let profile = found;
    if (!profile) {
      const stamp = new Date().toISOString();
      profile = await repo.insert("profiles", {
        id: data.user.id,
        email: data.user.email ?? "",
        displayName: String(data.user.user_metadata?.display_name ?? data.user.email?.split("@")[0] ?? "Partner"),
        avatarUrl: null,
        bannerUrl: null,
        relationshipStatus: null,
        relationshipStartedOn: null,
        interests: [],
        preferredCategories: [],
        role: "user",
        isDemo: false,
        emailVerified: Boolean(data.user.email_confirmed_at),
        createdAt: stamp,
        updatedAt: stamp,
      });
      await repo.insert("userPreferences", defaultPreferences(profile.id));
    }
    if (accountStatusOf(profile) !== "active") return null;
    profile = await syncAdmin(profile);
    const target = await impersonatedUser(profile);
    const effective = target ?? profile;
    const samePerson = effective.id === data.user.id;
    const preferences = samePerson && storedPreferences ? storedPreferences : await preferencesFor(repo, effective.id);
    const shell = samePerson ? actorShell : await shellFor(repo, effective.id);
    rememberMembership(effective.id, shell.membership);
    return { user: { profile: effective, preferences, actor: target ? profile : null }, membership: shell.membership, unread: shell.unread };
  }
  return null;
});

export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await loadAppSession())?.user ?? null;
});

async function preferencesFor(repo: Awaited<ReturnType<typeof getRepository>>, userId: string) {
  const existing = await repo.find("userPreferences", { eq: { userId } });
  if (existing) return existing;
  return repo.insert("userPreferences", defaultPreferences(userId));
}

export function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    theme: "light",
    locale: "en",
    emailNotifications: false,
    inAppNotifications: true,
    reminderHour: null,
    streakPaused: false,
    reducedMotion: false,
    dailyStreak: 0,
    lastDailyOn: null,
    points: 0,
    recentCardIds: [],
    onboardingStep: "profile",
    onboardingCompleted: false,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
