import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, UserPreferences } from "@/lib/domain";
import { acceptInvitation, createCouple, createInvitation, leaveCouple, requestReconnect, respondReconnect, revokeInvitation } from "@/lib/services/couples";

function profile(id: string, name: string): Profile {
  return {
    id,
    email: `${name}@example.com`,
    displayName: name,
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: "dating",
    relationshipStartedOn: "2024-02-14",
    interests: [],
    preferredCategories: [],
    role: "user",
    isDemo: false,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function preferences(userId: string): UserPreferences {
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
    onboardingStep: "done",
    onboardingCompleted: true,
  };
}

async function seedUsers() {
  const repo = createMemoryRepository();
  await repo.insert("profiles", profile("a", "Avery"));
  await repo.insert("profiles", profile("b", "Blair"));
  await repo.insert("profiles", profile("c", "Casey"));
  await repo.insert("userPreferences", preferences("a"));
  await repo.insert("userPreferences", preferences("b"));
  await repo.insert("userPreferences", preferences("c"));
  return repo;
}

describe("couple pairing", () => {
  it("lets the first partner create a space before anyone else registers", async () => {
    const repo = await seedUsers();
    const created = await createCouple(repo, "a", { name: "Avery and Blair" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.invitation.status).toBe("pending");
    const members = await repo.list("coupleMembers", { eq: { coupleId: created.data.couple.id, status: "active" } });
    expect(members).toHaveLength(1);
  });

  it("links the second partner and refuses a duplicate acceptance", async () => {
    const repo = await seedUsers();
    const created = await createCouple(repo, "a", { name: "Us" });
    if (!created.ok) throw new Error(created.error);
    const accepted = await acceptInvitation(repo, "b", created.data.invitation.code);
    expect(accepted.ok).toBe(true);
    const again = await acceptInvitation(repo, "c", created.data.invitation.code);
    expect(again.ok).toBe(false);
    const members = await repo.list("coupleMembers", { eq: { coupleId: created.data.couple.id, status: "active" } });
    expect(members.map((member) => member.userId).sort()).toEqual(["a", "b"]);
  });

  it("blocks a second active couple, expired codes, revoked codes, and self acceptance", async () => {
    const repo = await seedUsers();
    const first = await createCouple(repo, "a", { name: "First" });
    const second = await createCouple(repo, "b", { name: "Second" });
    if (!first.ok || !second.ok) throw new Error("setup failed");
    const blocked = await acceptInvitation(repo, "a", second.data.invitation.code);
    expect(blocked.ok).toBe(false);

    await repo.update("coupleInvitations", second.data.invitation.id, { expiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = await acceptInvitation(repo, "c", second.data.invitation.token);
    expect(expired.ok).toBe(false);

    const fresh = await createInvitation(repo, "b", second.data.couple.id);
    if (!fresh.ok) throw new Error(fresh.error);
    await revokeInvitation(repo, "b", fresh.data.id);
    const revoked = await acceptInvitation(repo, "c", fresh.data.code);
    expect(revoked.ok).toBe(false);

    const own = await acceptInvitation(repo, "b", fresh.data.code);
    expect(own.ok).toBe(false);
  });

  it("requires both people to agree before reconnecting", async () => {
    const repo = await seedUsers();
    const created = await createCouple(repo, "a", { name: "Us" });
    if (!created.ok) throw new Error(created.error);
    await acceptInvitation(repo, "b", created.data.invitation.code);
    await leaveCouple(repo, "b");
    const request = await requestReconnect(repo, "b", created.data.couple.id);
    expect(request.ok).toBe(true);
    if (!request.ok) return;
    const stillOut = await repo.find("coupleMembers", { eq: { userId: "b", status: "active" } });
    expect(stillOut).toBeNull();
    const approved = await respondReconnect(repo, "a", request.data.requestId, "approved");
    expect(approved.ok).toBe(true);
    const restored = await repo.find("coupleMembers", { eq: { userId: "b", coupleId: created.data.couple.id, status: "active" } });
    expect(restored).not.toBeNull();
  });
});
