import type { Couple, CoupleInvitation, Profile } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId, createInviteCode, createToken } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";
import { activeMembership, assertRateLimit, couplePartners, isBlocked, notifyUser, requireMembership, writeAudit } from "@/lib/services/access";

const INVITE_DAYS = 7;

function now() {
  return new Date().toISOString();
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function expireIfNeeded(repo: Repository, invitation: CoupleInvitation) {
  if (invitation.status === "pending" && invitation.expiresAt <= now()) {
    const updated = await repo.update("coupleInvitations", invitation.id, { status: "expired" });
    return updated;
  }
  return invitation;
}

export async function createCouple(
  repo: Repository,
  userId: string,
  input: { name: string; nickname?: string | null; relationshipStartedOn?: string | null },
): Promise<Result<{ couple: Couple; invitation: CoupleInvitation }>> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) return fail("Give your couple space a name between 2 and 60 characters.");
  const existing = await activeMembership(repo, userId);
  if (existing) return fail("Leave your current couple before creating another one.");

  const couple: Couple = {
    id: createId(),
    name,
    nickname: input.nickname?.trim() || null,
    createdBy: userId,
    status: "active",
    relationshipStartedOn: input.relationshipStartedOn || null,
    createdAt: now(),
    updatedAt: now(),
  };
  await repo.insert("couples", couple);
  await repo.insert("coupleMembers", {
    id: createId(),
    coupleId: couple.id,
    userId,
    status: "active",
    joinedAt: now(),
    leftAt: null,
  });
  const invitation = await insertInvitation(repo, couple.id, userId);
  await writeAudit(repo, userId, "couple.created", couple.id);
  return ok({ couple, invitation });
}

async function insertInvitation(repo: Repository, coupleId: string, userId: string) {
  const invitation: CoupleInvitation = {
    id: createId(),
    coupleId,
    code: createInviteCode(),
    token: createToken(),
    createdBy: userId,
    status: "pending",
    expiresAt: plusDays(INVITE_DAYS),
    acceptedBy: null,
    acceptedAt: null,
    createdAt: now(),
  };
  await repo.insert("coupleInvitations", invitation);
  return invitation;
}

export async function createInvitation(repo: Repository, userId: string, coupleId: string): Promise<Result<CoupleInvitation>> {
  const access = await requireMembership(repo, userId, coupleId);
  if (!access.ok) return access;
  const allowed = await assertRateLimit(repo, `invite:${userId}`, 8, 60 * 60 * 1000);
  if (!allowed) return fail("Too many invitations were created. Please wait a while and try again.");
  const partners = await couplePartners(repo, coupleId);
  if (partners.length >= 2) return fail("This couple already has two partners.");
  const pending = await repo.list("coupleInvitations", { eq: { coupleId, status: "pending" } });
  for (const invitation of pending) {
    if (invitation.expiresAt <= now()) await repo.update("coupleInvitations", invitation.id, { status: "expired" });
  }
  const invitation = await insertInvitation(repo, coupleId, userId);
  await writeAudit(repo, userId, "invitation.created", coupleId);
  return ok(invitation);
}

export async function regenerateInvitation(repo: Repository, userId: string, coupleId: string): Promise<Result<CoupleInvitation>> {
  const pending = (await repo.list("coupleInvitations", { eq: { coupleId, status: "pending" } })).filter((invitation) => invitation.createdBy === userId);
  const created = await createInvitation(repo, userId, coupleId);
  if (!created.ok) return created;
  for (const invitation of pending) {
    if (invitation.id === created.data.id) continue;
    await repo.update("coupleInvitations", invitation.id, { status: "revoked" });
  }
  await writeAudit(repo, userId, "invitation.regenerated", coupleId);
  return created;
}

export async function revokeInvitation(repo: Repository, userId: string, invitationId: string): Promise<Result<CoupleInvitation>> {
  const invitation = await repo.find("coupleInvitations", { eq: { id: invitationId } });
  if (!invitation) return fail("Invitation not found.");
  const access = await requireMembership(repo, userId, invitation.coupleId);
  if (!access.ok) return access;
  if (invitation.status !== "pending") return fail("Only a pending invitation can be revoked.");
  const updated = await repo.update("coupleInvitations", invitation.id, { status: "revoked" });
  await writeAudit(repo, userId, "invitation.revoked", invitation.coupleId);
  return ok(updated);
}

export async function previewInvitation(repo: Repository, codeOrToken: string) {
  const value = codeOrToken.trim();
  const byCode = await repo.find("coupleInvitations", { eq: { code: value.toUpperCase() } });
  const invitation = byCode ?? (await repo.find("coupleInvitations", { eq: { token: value } }));
  if (!invitation) return fail("That invitation is invalid.");
  const current = await expireIfNeeded(repo, invitation);
  if (current.status === "expired") return fail("This invitation has expired. Ask your partner for a new one.");
  if (current.status === "revoked") return fail("This invitation was revoked.");
  if (current.status === "accepted") return fail("This invitation has already been used.");
  const couple = await repo.find("couples", { eq: { id: current.coupleId } });
  const inviter = await repo.find("profiles", { eq: { id: current.createdBy } });
  if (!couple || couple.status !== "active" || !inviter) return fail("This couple space is no longer available.");
  return ok({ invitation: current, couple, inviter });
}

export async function acceptInvitation(repo: Repository, userId: string, codeOrToken: string): Promise<Result<{ coupleId: string }>> {
  const preview = await previewInvitation(repo, codeOrToken);
  if (!preview.ok) return preview;
  const { invitation, inviter } = preview.data;
  if (invitation.createdBy === userId) return fail("You cannot accept your own invitation.");
  if (await isBlocked(repo, userId, inviter.id)) return fail("This invitation cannot be accepted.");
  const existing = await activeMembership(repo, userId);
  if (existing) return fail("Leave your current couple before joining another one.");
  const partners = await couplePartners(repo, invitation.coupleId);
  if (partners.length >= 2) return fail("This couple already has two partners.");
  if (partners.some((partner) => partner.userId === userId)) return fail("You already belong to this couple.");

  const claimed = await repo.updateWhere(
    "coupleInvitations",
    { eq: { id: invitation.id, status: "pending" } },
    { status: "accepted", acceptedBy: userId, acceptedAt: now() },
  );
  if (!claimed) return fail("This invitation has already been used.");

  const room = await couplePartners(repo, invitation.coupleId);
  if (room.length >= 2) {
    await repo.update("coupleInvitations", invitation.id, { status: "pending", acceptedBy: null, acceptedAt: null });
    return fail("This couple already has two partners.");
  }

  await repo.insert("coupleMembers", {
    id: createId(),
    coupleId: invitation.coupleId,
    userId,
    status: "active",
    joinedAt: now(),
    leftAt: null,
  });
  const joiner = await repo.find("profiles", { eq: { id: userId } });
  await notifyUser(repo, {
    userId: inviter.id,
    coupleId: invitation.coupleId,
    type: "partner_joined",
    title: "Your partner joined",
    body: `${joiner?.displayName ?? "Your partner"} is now in your couple space.`,
    href: "/home",
  });
  await writeAudit(repo, userId, "invitation.accepted", invitation.coupleId);
  return ok({ coupleId: invitation.coupleId });
}

export async function leaveCouple(repo: Repository, userId: string): Promise<Result<{ coupleId: string }>> {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("You are not in a couple right now.");
  await repo.update("coupleMembers", membership.id, { status: "left", leftAt: now() });
  const partner = (await repo.list("coupleMembers", { eq: { coupleId: membership.coupleId, status: "active" } })).find(
    (member) => member.userId !== userId,
  );
  const profile = await repo.find("profiles", { eq: { id: userId } });
  if (partner) {
    await notifyUser(repo, {
      userId: partner.userId,
      coupleId: membership.coupleId,
      type: "partner_left",
      title: "Your partner unlinked",
      body: `${profile?.displayName ?? "Your partner"} left the couple space. Reconnecting takes a yes from both of you.`,
      href: "/settings",
    });
  } else {
    await repo.update("couples", membership.coupleId, { status: "archived", updatedAt: now() });
  }
  const pending = await repo.list("coupleInvitations", { eq: { coupleId: membership.coupleId, status: "pending" } });
  for (const invitation of pending) {
    if (invitation.createdBy === userId) await repo.update("coupleInvitations", invitation.id, { status: "revoked" });
  }
  const ownedGrants = await repo.list("cycleShareGrants", { eq: { ownerId: userId } });
  const receivedGrants = await repo.list("cycleShareGrants", { eq: { partnerId: userId } });
  for (const grant of [...ownedGrants, ...receivedGrants]) {
    if (!grant.revokedAt) await repo.update("cycleShareGrants", grant.id, { revokedAt: now() });
  }
  const cycleProfile = await repo.find("cycleProfiles", { eq: { userId } });
  if (cycleProfile) {
    await repo.update("cycleProfiles", userId, {
      sharePhaseSummary: false,
      sharePeriodSummary: false,
      shareFertileSummary: false,
      shareMoodSummary: false,
      shareSymptomSummary: false,
      shareIntimacySummary: false,
      shareSelectedDetails: false,
      updatedAt: now(),
    });
  }
  await writeAudit(repo, userId, "couple.left", membership.coupleId);
  return ok({ coupleId: membership.coupleId });
}

export async function requestReconnect(repo: Repository, userId: string, coupleId: string): Promise<Result<{ requestId: string }>> {
  if (await activeMembership(repo, userId)) return fail("Leave your current couple before reconnecting.");
  const previous = await repo.find("coupleMembers", { eq: { userId, coupleId, status: "left" } });
  if (!previous) return fail("There is no previous couple membership to reconnect.");
  const couple = await repo.find("couples", { eq: { id: coupleId, status: "active" } });
  if (!couple) return fail("That couple space is not open.");
  const partners = await couplePartners(repo, coupleId);
  if (partners.length >= 2) return fail("That couple already has two partners.");
  const partner = partners[0];
  if (!partner) return fail("Your former partner is no longer in this space.");
  if (await isBlocked(repo, userId, partner.userId)) return fail("Reconnecting is not available.");
  const existing = await repo.find("reconnectRequests", { eq: { coupleId, requesterId: userId, status: "pending" } });
  if (existing) return ok({ requestId: existing.id });
  const requestId = createId();
  await repo.insert("reconnectRequests", {
    id: requestId,
    coupleId,
    requesterId: userId,
    partnerId: partner.userId,
    status: "pending",
    createdAt: now(),
    resolvedAt: null,
  });
  const profile = await repo.find("profiles", { eq: { id: userId } });
  await notifyUser(repo, {
    userId: partner.userId,
    coupleId,
    type: "reconnect_request",
    title: "Reconnect request",
    body: `${profile?.displayName ?? "Your former partner"} asked to reconnect. Nothing changes unless you approve it.`,
    href: "/settings",
  });
  await writeAudit(repo, userId, "couple.reconnect_requested", coupleId);
  return ok({ requestId });
}

export async function respondReconnect(
  repo: Repository,
  userId: string,
  requestId: string,
  decision: "approved" | "declined",
): Promise<Result<{ coupleId: string }>> {
  const request = await repo.find("reconnectRequests", { eq: { id: requestId } });
  if (!request || request.partnerId !== userId) return fail("Reconnect request not found.");
  if (request.status !== "pending") return fail("This request was already resolved.");
  if (decision === "declined") {
    await repo.update("reconnectRequests", request.id, { status: "declined", resolvedAt: now() });
    return ok({ coupleId: request.coupleId });
  }
  const access = await requireMembership(repo, userId, request.coupleId);
  if (!access.ok) return access;
  if (await activeMembership(repo, request.requesterId)) return fail("Your partner already belongs to another couple.");
  const partners = await couplePartners(repo, request.coupleId);
  if (partners.length >= 2) return fail("This couple already has two partners.");
  const previous = await repo.find("coupleMembers", { eq: { userId: request.requesterId, coupleId: request.coupleId, status: "left" } });
  if (!previous) return fail("The previous membership could not be found.");
  await repo.update("coupleMembers", previous.id, { status: "active", leftAt: null, joinedAt: now() });
  await repo.update("reconnectRequests", request.id, { status: "approved", resolvedAt: now() });
  await notifyUser(repo, {
    userId: request.requesterId,
    coupleId: request.coupleId,
    type: "reconnect_approved",
    title: "You are reconnected",
    body: "Your partner approved the reconnect request.",
    href: "/home",
  });
  await writeAudit(repo, userId, "couple.reconnected", request.coupleId);
  return ok({ coupleId: request.coupleId });
}

export function toPublicProfile(profile: Profile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    relationshipStatus: profile.relationshipStatus,
    relationshipStartedOn: profile.relationshipStartedOn,
    interests: profile.interests,
    preferredCategories: profile.preferredCategories,
    isDemo: profile.isDemo,
  };
}
