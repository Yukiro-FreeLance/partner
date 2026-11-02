import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, UserPreferences } from "@/lib/domain";
import { acceptInvitation, createCouple } from "@/lib/services/couples";
import { gameLeaderboard, startGameMatch, submitGameScore } from "@/lib/services/games";

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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function preferences(userId: string, showOnGameLeaderboard = false): UserPreferences {
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
    showOnGameLeaderboard,
  };
}

async function couple() {
  const repo = createMemoryRepository();
  await repo.insert("profiles", profile("a", "Avery"));
  await repo.insert("profiles", profile("b", "Blair"));
  await repo.insert("profiles", profile("c", "Casey"));
  await repo.insert("userPreferences", preferences("a", true));
  await repo.insert("userPreferences", preferences("b", false));
  await repo.insert("userPreferences", preferences("c", true));
  const created = await createCouple(repo, "a", { name: "Avery and Blair" });
  if (!created.ok) throw new Error(created.error);
  const accepted = await acceptInvitation(repo, "b", created.data.invitation.code);
  if (!accepted.ok) throw new Error(accepted.error);
  return repo;
}

describe("arcade games", () => {
  it("saves a solo score", async () => {
    const repo = await couple();
    const saved = await submitGameScore(repo, {
      userId: "a",
      slug: "tetris",
      score: 1200,
      mode: "solo",
      kind: "solo",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.data.score).toBe(1200);
    expect(saved.data.userId).toBe("a");
  });

  it("hides opted-out players from global ranking", async () => {
    const repo = await couple();
    await submitGameScore(repo, { userId: "a", slug: "tetris", score: 100, mode: "solo", kind: "solo" });
    await submitGameScore(repo, { userId: "b", slug: "tetris", score: 9000, mode: "solo", kind: "solo" });
    await submitGameScore(repo, { userId: "c", slug: "tetris", score: 400, mode: "solo", kind: "solo" });
    const forAvery = await gameLeaderboard(repo, "a", "tetris");
    expect(forAvery.map((row) => row.userId)).toEqual(["c", "a"]);
    expect(forAvery.find((row) => row.userId === "b")).toBeUndefined();
    const forBlair = await gameLeaderboard(repo, "b", "tetris");
    expect(forBlair.some((row) => row.userId === "b")).toBe(true);
    expect(forBlair.find((row) => row.userId === "b")?.displayName).toContain("hidden");
  });

  it("records a partner challenge on both seats", async () => {
    const repo = await couple();
    const match = await startGameMatch(repo, "a", "memory", "challenge");
    expect(match.ok).toBe(true);
    if (!match.ok) return;
    const host = await submitGameScore(repo, {
      userId: "a",
      slug: "memory",
      score: 720,
      mode: "partner",
      kind: "challenge",
      matchId: match.data.id,
      seat: "host",
    });
    const guest = await submitGameScore(repo, {
      userId: "b",
      slug: "memory",
      score: 640,
      mode: "partner",
      kind: "challenge",
      matchId: match.data.id,
      seat: "guest",
    });
    expect(host.ok && guest.ok).toBe(true);
    const finished = await repo.find("gameMatches", { eq: { id: match.data.id } });
    expect(finished?.status).toBe("complete");
    expect(finished?.hostScore).toBe(720);
    expect(finished?.guestScore).toBe(640);
  });

  it("rejects an unknown game", async () => {
    const repo = await couple();
    const saved = await submitGameScore(repo, {
      userId: "a",
      slug: "not-a-game",
      score: 10,
      mode: "solo",
      kind: "solo",
    });
    expect(saved.ok).toBe(false);
  });
});
