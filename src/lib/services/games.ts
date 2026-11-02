import type { GameMatch, GameMatchKind, GameMatchSeat, GameScore, GameScoreMode, Profile, UserPreferences } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { isArcadeSlug } from "@/lib/games/catalog";
import { createId } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";
import { activeMembership, notifyUser, otherPartner } from "@/lib/services/access";

function isMissingGameStore(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /game_scores|game_matches|show_on_game_leaderboard/i.test(message) && /schema cache|does not exist|Could not find the table|Could not find the '.*' column/i.test(message);
}

const MAX_SCORE = 10_000_000;

export type ArcadeKind = "solo" | GameMatchKind;

export type SubmitGameScoreInput = {
  userId: string;
  slug: string;
  score: number;
  mode: GameScoreMode;
  kind: ArcadeKind;
  matchId?: string | null;
  seat?: GameMatchSeat;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  gameSlug: string | null;
  mine: boolean;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, Math.round(value)));
}

function stamp() {
  return new Date().toISOString();
}

export async function startGameMatch(
  repo: Repository,
  userId: string,
  slug: string,
  kind: GameMatchKind,
): Promise<Result<GameMatch>> {
  if (!isArcadeSlug(slug)) return fail("That game is not in the arcade.");
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Pair with a partner before a partner match.");
  const partner = await otherPartner(repo, membership.coupleId, userId);
  if (!partner) return fail("Your partner needs to join this couple space first.");
  const now = stamp();
  let match: GameMatch;
  try {
    match = await repo.insert("gameMatches", {
    id: createId(),
    coupleId: membership.coupleId,
    gameSlug: slug,
    kind,
    hostId: userId,
    guestId: partner.userId,
    hostScore: null,
    guestScore: null,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
  if (kind === "challenge") {
    const host = await repo.find("profiles", { eq: { id: userId } });
    await notifyUser(repo, {
      userId: partner.userId,
      coupleId: membership.coupleId,
      type: "game.challenge",
      title: `${host?.displayName ?? "Your partner"} challenged you`,
      body: "Play the same arcade game and compare scores.",
      href: `/play/games/${encodeURIComponent(slug)}?mode=partner&kind=challenge&match=${encodeURIComponent(match.id)}`,
    });
  }
  return ok(match);
}

export async function submitGameScore(repo: Repository, input: SubmitGameScoreInput): Promise<Result<GameScore>> {
  if (!isArcadeSlug(input.slug)) return fail("That game is not in the arcade.");
  try {
  const score = clampScore(input.score);
  const membership = await activeMembership(repo, input.userId);
  const coupleId = input.mode === "partner" ? membership?.coupleId ?? null : membership?.coupleId ?? null;
  let match: GameMatch | null = null;
  let scoredUserId = input.userId;

  if (input.kind !== "solo") {
    if (!membership) return fail("Pair with a partner before a partner match.");
    if (input.matchId) {
      match = await repo.find("gameMatches", { eq: { id: input.matchId } });
      if (!match || match.coupleId !== membership.coupleId) return fail("That match is not in your couple space.");
      if (match.gameSlug !== input.slug) return fail("This score belongs to a different game.");
    } else {
      const started = await startGameMatch(repo, input.userId, input.slug, input.kind);
      if (!started.ok) return started;
      match = started.data;
    }

    const seat: GameMatchSeat = input.seat === "guest" ? "guest" : "host";
    const hotseatGuest = match.kind === "hotseat" && seat === "guest" && match.hostId === input.userId;
    if (seat === "host" && match.hostId !== input.userId) return fail("This seat belongs to your partner.");
    if (seat === "guest" && match.guestId !== input.userId && !hotseatGuest) return fail("This seat belongs to your partner.");
    scoredUserId = seat === "guest" ? match.guestId : match.hostId;
    const already = seat === "host" ? match.hostScore : match.guestScore;
    if (already !== null && already >= score) {
      // keep the better score on the match, still record the attempt
    } else {
      const nextHost = seat === "host" ? score : match.hostScore;
      const nextGuest = seat === "guest" ? score : match.guestScore;
      const complete = nextHost !== null && nextGuest !== null;
      match = await repo.update("gameMatches", match.id, {
        hostScore: nextHost,
        guestScore: nextGuest,
        status: complete ? "complete" : "open",
        updatedAt: stamp(),
      });
      if (complete) {
        const host = await repo.find("profiles", { eq: { id: match.hostId } });
        const guest = await repo.find("profiles", { eq: { id: match.guestId } });
        const hostWins = (match.hostScore ?? 0) > (match.guestScore ?? 0);
        const tie = match.hostScore === match.guestScore;
        const summary = tie
          ? `You tied at ${match.hostScore}.`
          : hostWins
            ? `${host?.displayName ?? "Host"} won ${match.hostScore}–${match.guestScore}.`
            : `${guest?.displayName ?? "Partner"} won ${match.guestScore}–${match.hostScore}.`;
        for (const userId of [match.hostId, match.guestId]) {
          await notifyUser(repo, {
            userId,
            coupleId: match.coupleId,
            type: "game.match",
            title: tie ? "Arcade match tied" : "Arcade match finished",
            body: summary,
            href: `/play/games/${encodeURIComponent(match.gameSlug)}`,
          });
        }
      }
    }
  }

  const row = await repo.insert("gameScores", {
    id: createId(),
    userId: scoredUserId,
    coupleId: coupleId,
    gameSlug: input.slug,
    mode: input.mode,
    kind: input.kind,
    score,
    matchId: match?.id ?? null,
    createdAt: stamp(),
  });
  return ok(row);
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
}

export async function listOpenGameMatches(repo: Repository, userId: string) {
  try {
    const membership = await activeMembership(repo, userId);
    if (!membership) return [];
    const matches = await repo.list("gameMatches", { eq: { coupleId: membership.coupleId, status: "open" } });
    return matches.filter((match) => match.hostId === userId || match.guestId === userId);
  } catch (error) {
    if (isMissingGameStore(error)) return [];
    throw error;
  }
}

export async function loadGameMatch(repo: Repository, userId: string, matchId: string) {
  try {
    const membership = await activeMembership(repo, userId);
    if (!membership) return null;
    return repo.find("gameMatches", { eq: { id: matchId, coupleId: membership.coupleId } });
  } catch (error) {
    if (isMissingGameStore(error)) return null;
    throw error;
  }
}

function bestByUser(rows: GameScore[], slug?: string) {
  const filtered = slug ? rows.filter((row) => row.gameSlug === slug) : rows;
  const best = new Map<string, { userId: string; score: number; gameSlug: string }>();
  if (slug) {
    for (const row of filtered) {
      const current = best.get(row.userId);
      if (!current || row.score > current.score) best.set(row.userId, { userId: row.userId, score: row.score, gameSlug: row.gameSlug });
    }
    return [...best.values()];
  }
  const perGame = new Map<string, number>();
  for (const row of filtered) {
    const key = `${row.userId}:${row.gameSlug}`;
    const current = perGame.get(key) ?? 0;
    if (row.score > current) perGame.set(key, row.score);
  }
  const totals = new Map<string, { userId: string; score: number; gameSlug: string }>();
  for (const [key, score] of perGame) {
    const userId = key.split(":")[0]!;
    const current = totals.get(userId);
    totals.set(userId, { userId, score: (current?.score ?? 0) + score, gameSlug: "all" });
  }
  return [...totals.values()];
}

export async function gameLeaderboard(
  repo: Repository,
  viewerId: string,
  slug?: string,
): Promise<LeaderboardRow[]> {
  let scores: GameScore[];
  let preferences: UserPreferences[];
  let profiles: Profile[];
  try {
    [scores, preferences, profiles] = await Promise.all([
      repo.list("gameScores", slug ? { eq: { gameSlug: slug } } : {}),
      repo.list("userPreferences", {}),
      repo.list("profiles", {}),
    ]);
  } catch (error) {
    if (isMissingGameStore(error)) return [];
    throw error;
  }
  const visible = new Set(
    preferences.filter((row) => row.showOnGameLeaderboard).map((row) => row.userId),
  );
  const allowed = scores.filter((row) => visible.has(row.userId) || row.userId === viewerId);
  const ranked = bestByUser(allowed, slug)
    .filter((row) => visible.has(row.userId) || row.userId === viewerId)
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .slice(0, 50);
  return ranked.map((row, index) => {
    const profile = profiles.find((item) => item.id === row.userId);
    return {
      rank: index + 1,
      userId: row.userId,
      displayName: visible.has(row.userId) ? profile?.displayName ?? "Player" : "You (hidden from others)",
      avatarUrl: visible.has(row.userId) ? profile?.avatarUrl ?? null : null,
      score: row.score,
      gameSlug: slug ?? null,
      mine: row.userId === viewerId,
    };
  });
}

export async function myBestScores(repo: Repository, userId: string) {
  let scores: GameScore[];
  try {
    scores = await repo.list("gameScores", { eq: { userId } });
  } catch (error) {
    if (isMissingGameStore(error)) return new Map<string, number>();
    throw error;
  }
  const best = new Map<string, number>();
  for (const row of scores) {
    const current = best.get(row.gameSlug) ?? 0;
    if (row.score > current) best.set(row.gameSlug, row.score);
  }
  return best;
}
