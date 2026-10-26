import { rememberedMembership } from "@/lib/auth/request-scope";
import type { CoupleMember } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { sendNotice } from "@/lib/email";
import { fail, ok, type Result } from "@/lib/result";

export async function activeMembership(repo: Repository, userId: string) {
  const remembered = rememberedMembership(userId);
  if (remembered.hit) return remembered.membership;
  return repo.find("coupleMembers", { eq: { userId, status: "active" } });
}

export async function requireMembership(repo: Repository, userId: string, coupleId: string): Promise<Result<CoupleMember>> {
  const member = await repo.find("coupleMembers", { eq: { userId, coupleId, status: "active" } });
  if (!member) return fail("You do not have access to this couple space.");
  return ok(member);
}

export async function couplePartners(repo: Repository, coupleId: string) {
  return repo.list("coupleMembers", { eq: { coupleId, status: "active" } });
}

export async function otherPartner(repo: Repository, coupleId: string, userId: string) {
  const members = await couplePartners(repo, coupleId);
  return members.find((member) => member.userId !== userId) ?? null;
}

export async function isBlocked(repo: Repository, leftId: string, rightId: string) {
  const [left, right] = await Promise.all([
    repo.find("userBlocks", { eq: { blockerId: leftId, blockedId: rightId } }),
    repo.find("userBlocks", { eq: { blockerId: rightId, blockedId: leftId } }),
  ]);
  return Boolean(left || right);
}

export async function writeAudit(repo: Repository, userId: string | null, action: string, coupleId: string | null = null) {
  await repo.insert("auditEvents", {
    id: crypto.randomUUID(),
    userId,
    action,
    coupleId,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyUser(
  repo: Repository,
  input: { userId: string; coupleId?: string | null; type: string; title: string; body: string; href?: string | null },
) {
  const preferences = await repo.find("userPreferences", { eq: { userId: input.userId } });
  if (!preferences || preferences.inAppNotifications) {
    await repo.insert("notifications", {
      id: crypto.randomUUID(),
      userId: input.userId,
      coupleId: input.coupleId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  }
  if (!preferences?.emailNotifications) return;
  const profile = await repo.find("profiles", { eq: { id: input.userId } });
  if (!profile || profile.isDemo) return;
  void sendNotice({ to: profile.email, subject: input.title, body: input.body, href: input.href });
}

export async function assertRateLimit(repo: Repository, key: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const recent = (await repo.list("loginAttempts", { eq: { key } })).filter((attempt) => attempt.createdAt >= since);
  if (recent.length >= limit) return false;
  await repo.insert("loginAttempts", { id: crypto.randomUUID(), key, createdAt: new Date().toISOString() });
  return true;
}
