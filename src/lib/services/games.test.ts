import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, UserPreferences } from "@/lib/domain";
import { acceptInvitation, createCouple } from "@/lib/services/couples";
import { finishGameMatch, gameLeaderboard, playMatchMove, startGameMatch, submitGameScore, updateMatchProgress } from "@/lib/services/games";

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

  it("runs score-race challenges concurrently and completes after both scores", async () => {
    const repo = await couple();
    const match = await startGameMatch(repo, "a", "memory", "challenge");
    expect(match.ok).toBe(true);
    if (!match.ok) return;
    const peek = await updateMatchProgress(repo, "b", match.data.id, "Pair 1/8", 10);
    expect(peek.ok).toBe(true);
    const host = await submitGameScore(repo, {
      userId: "a",
      slug: "memory",
      score: 720,
      mode: "partner",
      kind: "challenge",
      matchId: match.data.id,
      seat: "host",
      note: "Round finished",
    });
    expect(host.ok).toBe(true);
    const afterHost = await repo.find("gameMatches", { eq: { id: match.data.id } });
    expect(afterHost?.status).toBe("open");
    expect(afterHost?.turnSeat).toBe("host");
    expect(afterHost?.hostScore).toBe(720);
    expect(afterHost?.guestScore).toBe(null);
    const guest = await submitGameScore(repo, {
      userId: "b",
      slug: "memory",
      score: 640,
      mode: "partner",
      kind: "challenge",
      matchId: match.data.id,
      seat: "guest",
    });
    expect(guest.ok).toBe(true);
    const finished = await repo.find("gameMatches", { eq: { id: match.data.id } });
    expect(finished?.status).toBe("complete");
    expect(finished?.turnSeat).toBe("host");
    expect(finished?.hostScore).toBe(720);
    expect(finished?.guestScore).toBe(640);
  });

  it("keeps a final score when a live progress update bumps the revision", async () => {
    const repo = await couple();
    const match = await startGameMatch(repo, "a", "tic-tac-toe", "challenge");
    expect(match.ok).toBe(true);
    if (!match.ok) return;
    const base = repo.updateWhere.bind(repo);
    let injected = false;
    repo.updateWhere = (async (table, where, patch) => {
      if (!injected && table === "gameMatches") {
        injected = true;
        // Simulate the partner's progress snapshot landing between our read
        // and the score write. The turn stays with the host.
        await base("gameMatches", { eq: { id: match.data.id } }, {
          revision: match.data.revision + 1,
          snapshot: { note: "Pair 1/8", score: 1, board: null },
          updatedAt: new Date().toISOString(),
        });
      }
      return base(table, where, patch);
    }) as typeof repo.updateWhere;
    const saved = await submitGameScore(repo, {
      userId: "a",
      slug: "tic-tac-toe",
      score: 720,
      mode: "partner",
      kind: "challenge",
      matchId: match.data.id,
      seat: "host",
    });
    expect(saved.ok).toBe(true);
    const after = await repo.find("gameMatches", { eq: { id: match.data.id } });
    expect(after?.hostScore).toBe(720);
    expect(after?.turnSeat).toBe("guest");
    expect(after?.revision).toBe(match.data.revision + 2);
  });

  it("shares a tic-tac-toe board and only accepts the active seat", async () => {
    const repo = await couple();
    const match = await startGameMatch(repo, "a", "tic-tac-toe", "challenge");
    expect(match.ok).toBe(true);
    if (!match.ok) return;
    const blocked = await playMatchMove(repo, "b", match.data.id, 0);
    expect(blocked.ok).toBe(false);
    const first = await playMatchMove(repo, "a", match.data.id, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.snapshot.board?.[0]).toBe("X");
    expect(first.data.turnSeat).toBe("guest");
    const taken = await playMatchMove(repo, "b", match.data.id, 0);
    expect(taken.ok).toBe(false);
    await playMatchMove(repo, "b", match.data.id, 4);
    await playMatchMove(repo, "a", match.data.id, 1);
    await playMatchMove(repo, "b", match.data.id, 5);
    const win = await playMatchMove(repo, "a", match.data.id, 2);
    expect(win.ok).toBe(true);
    if (!win.ok) return;
    expect(win.data.status).toBe("complete");
    expect(win.data.hostScore).toBe(100);
  });

  it("does not let the waiting player finish a challenge", async () => {
    const repo = await couple();
    const match = await startGameMatch(repo, "a", "tic-tac-toe", "challenge");
    expect(match.ok).toBe(true);
    if (!match.ok) return;

    const blocked = await finishGameMatch(repo, "b", match.data.id);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("It is your partner's turn.");

    const finished = await finishGameMatch(repo, "a", match.data.id);
    expect(finished.ok).toBe(true);
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
