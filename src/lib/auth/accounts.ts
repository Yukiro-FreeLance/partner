import "server-only";
import { createHash, randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { fail, ok } from "@/lib/result";
import { assertRateLimit, writeAudit } from "@/lib/services/access";
import { defaultPreferences } from "@/lib/auth/session";

function now() {
  return new Date().toISOString();
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function provisionAccount(repo: Repository, input: { email: string; password: string; displayName: string; role: "user" | "admin" }) {
  const email = input.email.trim().toLowerCase();
  if (email.endsWith("@demo.couplesync.local")) return fail("Demo addresses stay fictional members. Use a real email.");
  if (await repo.find("profiles", { eq: { email } })) return fail("An account with that email already exists.");
  const stamp = now();
  const userId = createId();
  await repo.insert("profiles", {
    id: userId,
    email,
    displayName: input.displayName.trim(),
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: null,
    relationshipStartedOn: null,
    interests: [],
    preferredCategories: [],
    role: input.role,
    isDemo: false,
    emailVerified: true,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("credentials", { userId, passwordHash: await hash(input.password, 12) });
  await repo.insert("userPreferences", defaultPreferences(userId));
  await writeAudit(repo, userId, "account.provisioned");
  return ok({ userId, email });
}

export async function registerAccount(repo: Repository, input: { email: string; password: string; displayName: string }) {
  const email = input.email.trim().toLowerCase();
  const allowed = await assertRateLimit(repo, `register:${email}`, 5, 60 * 60 * 1000);
  if (!allowed) return fail("Too many registration attempts. Please wait and try again.");
  if (await repo.find("profiles", { eq: { email } })) return fail("An account with that email already exists.");
  const stamp = now();
  const userId = createId();
  await repo.insert("profiles", {
    id: userId,
    email,
    displayName: input.displayName.trim(),
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: null,
    relationshipStartedOn: null,
    interests: [],
    preferredCategories: [],
    role: "user",
    isDemo: false,
    emailVerified: false,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("credentials", { userId, passwordHash: await hash(input.password, 12) });
  await repo.insert("userPreferences", defaultPreferences(userId));
  const token = randomBytes(32).toString("hex");
  await repo.insert("emailTokens", {
    id: createId(),
    userId,
    purpose: "verify",
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    usedAt: null,
    createdAt: stamp,
  });
  await writeAudit(repo, userId, "account.registered");
  return ok({ userId, email, verifyToken: token });
}

export async function loginAccount(repo: Repository, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const allowed = await assertRateLimit(repo, `login:${normalized}`, 10, 15 * 60 * 1000);
  if (!allowed) return fail("Too many sign-in attempts. Please wait a few minutes.");
  const profile = await repo.find("profiles", { eq: { email: normalized } });
  const credential = profile ? await repo.find("credentials", { eq: { userId: profile.id } }) : null;
  const matches = credential ? await compare(password, credential.passwordHash) : false;
  if (!profile || !matches) return fail("Email or password is incorrect.");
  if (!profile.emailVerified) return fail("Verify your email before signing in. You can resend the link from the verification page.");
  await writeAudit(repo, profile.id, "account.login");
  return ok(profile);
}

export async function verifyEmailToken(repo: Repository, token: string) {
  const record = await repo.find("emailTokens", { eq: { tokenHash: tokenHash(token), purpose: "verify" } });
  if (!record || record.usedAt || record.expiresAt < now()) return fail("This verification link is invalid or expired.");
  await repo.update("emailTokens", record.id, { usedAt: now() });
  await repo.update("profiles", record.userId, { emailVerified: true, updatedAt: now() });
  return ok({ userId: record.userId });
}

export async function requestPasswordReset(repo: Repository, email: string) {
  const normalized = email.trim().toLowerCase();
  const allowed = await assertRateLimit(repo, `reset:${normalized}`, 5, 60 * 60 * 1000);
  if (!allowed) return fail("Too many reset requests. Please wait and try again.");
  const profile = await repo.find("profiles", { eq: { email: normalized } });
  if (!profile || profile.isDemo) return ok({ token: null });
  const token = randomBytes(32).toString("hex");
  await repo.insert("emailTokens", {
    id: createId(),
    userId: profile.id,
    purpose: "reset",
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    usedAt: null,
    createdAt: now(),
  });
  return ok({ token });
}

export async function resetPassword(repo: Repository, token: string, password: string) {
  const record = await repo.find("emailTokens", { eq: { tokenHash: tokenHash(token), purpose: "reset" } });
  if (!record || record.usedAt || record.expiresAt < now()) return fail("This reset link is invalid or expired.");
  await repo.update("credentials", record.userId, { passwordHash: await hash(password, 12) });
  await repo.update("emailTokens", record.id, { usedAt: now() });
  await writeAudit(repo, record.userId, "account.password_reset");
  return ok({ userId: record.userId });
}

export async function resendVerification(repo: Repository, email: string) {
  const profile = await repo.find("profiles", { eq: { email: email.trim().toLowerCase() } });
  if (!profile || profile.emailVerified) return ok({ token: null });
  const token = randomBytes(32).toString("hex");
  await repo.insert("emailTokens", {
    id: createId(),
    userId: profile.id,
    purpose: "verify",
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    usedAt: null,
    createdAt: now(),
  });
  return ok({ token });
}
