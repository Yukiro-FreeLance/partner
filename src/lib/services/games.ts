import type { GameMatch, GameMatchKind, GameMatchSeat, GameMatchSnapshot, GameMatchStatus, GameScore, GameScoreMode, Profile, UserPreferences } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { arcadeGame, isArcadeSlug } from "@/lib/games/catalog";
import { publishMatchUpdate } from "@/lib/games/match-events";
import { createId } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";
import { activeMembership, notifyUser, otherPartner } from "@/lib/services/access";

function isMissingGameStore(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /game_scores|game_matches|show_on_game_leaderboard|turn_seat|snapshot|revision/i.test(message) && /schema cache|does not exist|Could not find the table|Could not find the '.*' column/i.test(message);
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
  note?: string;
};

export type GameMatchView = {
  id: string;
  turnSeat: GameMatchSeat;
  hostScore: number | null;
  guestScore: number | null;
  status: GameMatch["status"];
  revision: number;
  turns: GameMatch["turns"];
  snapshot: GameMatchSnapshot;
  yourTurn: boolean;
  seat: GameMatchSeat;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  gameSlug: string | null;
  mine: boolean;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  highestScore: number;
  currentStreak: number;
  achievementPoints: number | null;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, Math.round(value)));
}

function stamp() {
  return new Date().toISOString();
}

const EMPTY_SNAPSHOT: GameMatchSnapshot = { note: null, score: null, board: null };

function isTurnBasedChallenge(match: GameMatch) {
  return match.gameSlug === "tic-tac-toe";
}

function freshSnapshot(slug: string): GameMatchSnapshot {
  return slug === "tic-tac-toe" ? { note: null, score: null, board: Array(9).fill(null) } : { ...EMPTY_SNAPSHOT };
}

export function normalizeGameMatch(match: GameMatch): GameMatch {
  const board = match.snapshot?.board;
  return {
    ...match,
    turnSeat: match.turnSeat === "guest" ? "guest" : "host",
    revision: match.revision ?? 0,
    turns: Array.isArray(match.turns) ? match.turns : [],
    snapshot: {
      note: match.snapshot?.note ?? null,
      score: typeof match.snapshot?.score === "number" ? match.snapshot.score : null,
      board: Array.isArray(board) ? board : match.gameSlug === "tic-tac-toe" ? Array(9).fill(null) : null,
      hostScore: typeof match.snapshot?.hostScore === "number" ? match.snapshot.hostScore : null,
      guestScore: typeof match.snapshot?.guestScore === "number" ? match.snapshot.guestScore : null,
      hostStatus: match.snapshot?.hostStatus ?? "playing",
      guestStatus: match.snapshot?.guestStatus ?? "playing",
    },
  };
}

export function gameMatchView(match: GameMatch, userId: string): GameMatchView {
  const row = normalizeGameMatch(match);
  const seat: GameMatchSeat = row.guestId === userId ? "guest" : "host";
  return {
    id: row.id,
    turnSeat: row.turnSeat,
    hostScore: row.hostScore,
    guestScore: row.guestScore,
    status: row.status,
    revision: row.revision,
    turns: row.turns,
    snapshot: row.snapshot,
    yourTurn: row.status === "open" && row.turnSeat === seat,
    seat,
  };
}

function seatOf(match: GameMatch, userId: string): GameMatchSeat | null {
  if (match.hostId === userId) return "host";
  if (match.guestId === userId) return "guest";
  return null;
}

function lineWinner(board: Array<"X" | "O" | null>) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw" as const;
  return null;
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
  const partnerPreferences = await repo.find("userPreferences", { eq: { userId: partner.userId } });
  if (partnerPreferences?.allowGameChallenges === false) return fail("Your partner is not accepting game challenges right now.");
  const challenger = await repo.find("profiles", { eq: { id: userId } });
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
    turnSeat: "host",
    revision: 0,
    turns: [],
    snapshot: freshSnapshot(slug),
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
  publishMatchUpdate(normalizeGameMatch(match));
  if (kind === "challenge") {
    await notifyUser(repo, {
      userId: partner.userId,
      coupleId: membership.coupleId,
      type: "game.challenge",
      title: `${challenger?.displayName ?? "Your partner"} challenged you to ${arcadeGame(slug)?.title ?? "a game"}`,
      body: "Open it on your own device. They go first.",
      href: `/play/games/${encodeURIComponent(slug)}?mode=partner&kind=challenge&match=${encodeURIComponent(match.id)}`,
      metadata: { challengerId: userId, gameSlug: slug, matchId: match.id, challengerName: challenger?.displayName ?? "Your partner", challengerAvatarUrl: challenger?.avatarUrl ?? "" },
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

    match = normalizeGameMatch(match);
    if (match.kind === "challenge") {
      if (match.status === "complete") return fail("This challenge is already finished.");
      const caller = seatOf(match, input.userId);
      if (!caller) return fail("This seat belongs to your partner.");
      if (isTurnBasedChallenge(match) && caller !== match.turnSeat) return fail("It is your partner's turn.");
      const note = input.note?.trim() || "Round finished";
      if (!isTurnBasedChallenge(match)) {
        let current = match;
        let changed: GameMatch | null = null;
        let complete = false;
        for (let attempt = 0; attempt < 2 && !changed; attempt += 1) {
          const ownScore = caller === "host" ? current.hostScore : current.guestScore;
          if (ownScore !== null) return fail("You already completed this challenge.");
          const nextHost = caller === "host" ? score : current.hostScore;
          const nextGuest = caller === "guest" ? score : current.guestScore;
          complete = nextHost !== null && nextGuest !== null;
          changed = await repo.updateWhere(
            "gameMatches",
            { eq: { id: current.id, revision: current.revision, [caller === "host" ? "hostScore" : "guestScore"]: null } },
            {
              hostScore: nextHost,
              guestScore: nextGuest,
              status: complete ? "complete" : "open",
              revision: current.revision + 1,
              turns: [...current.turns, { seat: caller, score, note, at: stamp() }].slice(-24),
              snapshot: {
                ...current.snapshot,
                note: null,
                score: null,
                hostScore: nextHost,
                guestScore: nextGuest,
                hostStatus: caller === "host" ? (score > 0 ? "completed" : "failed") : current.snapshot.hostStatus,
                guestStatus: caller === "guest" ? (score > 0 ? "completed" : "failed") : current.snapshot.guestStatus,
              },
              updatedAt: stamp(),
            },
          );
          if (!changed) {
            const reread = await repo.find("gameMatches", { eq: { id: current.id } });
            if (!reread) return fail("That match is no longer available.");
            current = normalizeGameMatch(reread);
          }
        }
        if (!changed) return fail("That challenge changed. Please refresh and try again.");
        match = normalizeGameMatch(changed);
        publishMatchUpdate(match);
        if (complete) void notifyChallengeComplete(repo, match);
        scoredUserId = caller === "guest" ? match.guestId : match.hostId;
      } else {
      // Compare-and-swap on revision + turn seat. Two fast taps (or two tabs) can
      // never both pass the turn check, so exactly one move is committed.
      let current = match;
      let changed: GameMatch | null = null;
      for (let attempt = 0; attempt < 2 && !changed; attempt += 1) {
        if (current.status === "complete") return fail("This challenge is already finished.");
        if (current.turnSeat !== caller) return fail("It is your partner's turn.");
        const nextHost = caller === "host" ? (current.hostScore ?? 0) + score : current.hostScore;
        const nextGuest = caller === "guest" ? (current.guestScore ?? 0) + score : current.guestScore;
        const nextTurn: GameMatchSeat = caller === "host" ? "guest" : "host";
        changed = await repo.updateWhere(
          "gameMatches",
          { eq: { id: current.id, revision: current.revision, turnSeat: current.turnSeat } },
          {
            hostScore: nextHost,
            guestScore: nextGuest,
            turnSeat: nextTurn,
            revision: current.revision + 1,
            turns: [...current.turns, { seat: caller, score, note, at: stamp() }].slice(-24),
            snapshot: { note: null, score: null, board: current.snapshot.board },
            status: "open",
            updatedAt: stamp(),
          },
        );
        if (!changed) {
          // A live progress snapshot can bump the revision without passing the
          // turn. Retry from the fresh row so the final score is never lost; a
          // real competing move still fails the turn check above.
          const reread = await repo.find("gameMatches", { eq: { id: current.id } });
          if (!reread) return fail("That match is no longer available.");
          current = normalizeGameMatch(reread);
        }
      }
      if (!changed) return fail("That turn already changed. Refresh the match and try again.");
      match = normalizeGameMatch(changed);
      publishMatchUpdate(match);
      const partnerId = match.turnSeat === "host" ? match.hostId : match.guestId;
      const actor = await repo.find("profiles", { eq: { id: input.userId } });
      void notifyUser(repo, {
        userId: partnerId,
        coupleId: match.coupleId,
        type: "game.turn",
        title: "Your turn",
        body: `${actor?.displayName ?? "Your partner"} scored ${score}. ${note}`,
        href: `/play/games/${encodeURIComponent(match.gameSlug)}?mode=partner&kind=challenge&match=${encodeURIComponent(match.id)}`,
      }).catch(() => undefined);
      scoredUserId = caller === "guest" ? match.guestId : match.hostId;
      }
    } else {
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
      const changed = await repo.updateWhere(
        "gameMatches",
        { eq: { id: match.id, revision: match.revision } },
        {
          hostScore: nextHost,
          guestScore: nextGuest,
          status: complete ? "complete" : "open",
          revision: match.revision + 1,
          updatedAt: stamp(),
        },
      );
      if (!changed) return fail("That match already changed. Refresh and try again.");
      match = normalizeGameMatch(changed);
      publishMatchUpdate(match);
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
          void notifyUser(repo, {
            userId,
            coupleId: match.coupleId,
            type: "game.match",
            title: tie ? "Arcade match tied" : "Arcade match finished",
            body: summary,
            href: `/play/games/${encodeURIComponent(match.gameSlug)}`,
          }).catch(() => undefined);
        }
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

async function ownedMatch(repo: Repository, userId: string, matchId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Pair with a partner before a partner match.");
  const found = await repo.find("gameMatches", { eq: { id: matchId } });
  if (!found || found.coupleId !== membership.coupleId) return fail("That match is not in your couple space.");
  return ok(normalizeGameMatch(found));
}

export async function updateMatchProgress(
  repo: Repository,
  userId: string,
  matchId: string,
  note: string,
  score: number | null,
): Promise<Result<GameMatch>> {
  try {
    const owned = await ownedMatch(repo, userId, matchId);
    if (!owned.ok) return owned;
    const match = owned.data;
    if (match.kind !== "challenge") return fail("Progress is shared on a partner challenge.");
    if (match.status === "complete") return fail("This challenge is already finished.");
    const caller = seatOf(match, userId);
    if (!caller) return fail("This seat belongs to your partner.");
    if (!isTurnBasedChallenge(match)) {
      const next = await repo.updateWhere(
        "gameMatches",
        { eq: { id: match.id, revision: match.revision } },
        {
          revision: match.revision + 1,
          snapshot: {
            ...match.snapshot,
            note: note.trim().slice(0, 80) || null,
            score: score === null ? null : clampScore(score),
            hostScore: caller === "host" ? score : match.snapshot.hostScore,
            guestScore: caller === "guest" ? score : match.snapshot.guestScore,
          },
          updatedAt: stamp(),
        },
      );
      if (!next) return fail("That progress update was superseded. Continue playing.");
      const updated = normalizeGameMatch(next);
      publishMatchUpdate(updated);
      return ok(updated);
    }
    if (caller !== match.turnSeat) return fail("It is your partner's turn.");
    const next = await repo.updateWhere(
      "gameMatches",
      { eq: { id: match.id, revision: match.revision, turnSeat: match.turnSeat } },
      {
        revision: match.revision + 1,
        snapshot: {
          note: note.trim().slice(0, 80) || null,
          score: score === null ? null : clampScore(score),
          board: match.snapshot.board,
        },
        updatedAt: stamp(),
      },
    );
    if (!next) return fail("That turn already changed. Refresh the match and try again.");
    const updated = normalizeGameMatch(next);
    publishMatchUpdate(updated);
    return ok(updated);
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
}

export async function playMatchMove(repo: Repository, userId: string, matchId: string, cell: number): Promise<Result<GameMatch>> {
  try {
    const owned = await ownedMatch(repo, userId, matchId);
    if (!owned.ok) return owned;
    const match = owned.data;
    if (match.gameSlug !== "tic-tac-toe" || match.kind !== "challenge") return fail("This match does not share a board.");
    if (match.status === "complete") return fail("This challenge is already finished.");
    const caller = seatOf(match, userId);
    if (!caller) return fail("This seat belongs to your partner.");
    if (caller !== match.turnSeat) return fail("It is your partner's turn.");
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) return fail("That square is not on the board.");
    const board = [...(match.snapshot.board ?? Array(9).fill(null))];
    if (board[cell]) return fail("That square is taken.");
    const mark = caller === "host" ? "X" : "O";
    board[cell] = mark;
    const winner = lineWinner(board);
    let hostScore = match.hostScore;
    let guestScore = match.guestScore;
    let status: GameMatchStatus = match.status;
    let turnSeat: GameMatchSeat = caller === "host" ? "guest" : "host";
    let note = `${mark} played`;
    if (winner === "X" || winner === "O") {
      if (winner === "X") hostScore = (hostScore ?? 0) + 100;
      else guestScore = (guestScore ?? 0) + 100;
      status = "complete";
      turnSeat = caller;
      note = `${winner} wins`;
    } else if (winner === "draw") {
      hostScore = (hostScore ?? 0) + 50;
      guestScore = (guestScore ?? 0) + 50;
      status = "complete";
      turnSeat = caller;
      note = "Draw";
    }
    const changed = await repo.updateWhere(
      "gameMatches",
      { eq: { id: match.id, revision: match.revision, turnSeat: match.turnSeat, status: "open" } },
      {
        hostScore,
        guestScore,
        turnSeat,
        status,
        revision: match.revision + 1,
        turns: [...match.turns, { seat: caller, score: winner ? (caller === "host" ? hostScore ?? 0 : guestScore ?? 0) : 0, note, at: stamp() }].slice(-24),
        snapshot: { note, score: null, board },
        updatedAt: stamp(),
      },
    );
    if (!changed) return fail("That move was already played. Refresh the board.");
    const next = normalizeGameMatch(changed);
    publishMatchUpdate(next);
    if (status === "complete") {
      const summary = winner === "draw" ? "The board is a draw. Each player scores 50." : `${winner} wins the shared board.`;
      for (const id of [match.hostId, match.guestId]) {
        await notifyUser(repo, {
          userId: id,
          coupleId: match.coupleId,
          type: "game.match",
          title: winner === "draw" ? "Arcade match tied" : "Arcade match finished",
          body: summary,
          href: `/play/games/tic-tac-toe?mode=partner&kind=challenge&match=${encodeURIComponent(match.id)}`,
        });
      }
    }
    return ok(next);
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
}

export async function finishGameMatch(repo: Repository, userId: string, matchId: string): Promise<Result<GameMatch>> {
  try {
    const owned = await ownedMatch(repo, userId, matchId);
    if (!owned.ok) return owned;
    const match = owned.data;
    if (match.status === "complete") return ok(match);
    const caller = seatOf(match, userId);
    if (!caller) return fail("This seat belongs to your partner.");
    if (match.kind === "challenge" && caller !== match.turnSeat) return fail("It is your partner's turn.");
    let current = match;
    let changed: GameMatch | null = null;
    for (let attempt = 0; attempt < 2 && !changed; attempt += 1) {
      if (current.status === "complete") return ok(current);
      changed = await repo.updateWhere(
        "gameMatches",
        { eq: { id: current.id, revision: current.revision, status: "open" } },
        {
          status: "complete",
          revision: current.revision + 1,
          updatedAt: stamp(),
        },
      );
      if (!changed) {
        const reread = await repo.find("gameMatches", { eq: { id: current.id } });
        if (!reread) return fail("That match is no longer available.");
        current = normalizeGameMatch(reread);
      }
    }
    if (!changed) return fail("That match already changed. Refresh and try again.");
    const next = normalizeGameMatch(changed);
    publishMatchUpdate(next);
    const host = await repo.find("profiles", { eq: { id: next.hostId } });
    const guest = await repo.find("profiles", { eq: { id: next.guestId } });
    const hostScore = next.hostScore ?? 0;
    const guestScore = next.guestScore ?? 0;
    const tie = hostScore === guestScore;
    const summary = tie
      ? `You tied at ${hostScore}.`
      : hostScore > guestScore
        ? `${host?.displayName ?? "Host"} won ${hostScore}–${guestScore}.`
        : `${guest?.displayName ?? "Partner"} won ${guestScore}–${hostScore}.`;
    for (const id of [next.hostId, next.guestId]) {
      await notifyUser(repo, {
        userId: id,
        coupleId: next.coupleId,
        type: "game.match",
        title: tie ? "Arcade match tied" : "Arcade match finished",
        body: summary,
        href: `/play/games/${encodeURIComponent(next.gameSlug)}`,
      });
    }
    return ok(next);
  } catch (error) {
    if (isMissingGameStore(error)) return fail("Arcade scores are not available on this database yet.");
    throw error;
  }
}

async function notifyChallengeComplete(repo: Repository, match: GameMatch) {
  const hostScore = match.hostScore ?? 0;
  const guestScore = match.guestScore ?? 0;
  const title = hostScore === guestScore ? "Challenge complete · draw" : "Challenge complete";
  await Promise.all([match.hostId, match.guestId].map((userId) => notifyUser(repo, {
    userId,
    coupleId: match.coupleId,
    type: "game.match",
    title,
    body: hostScore === guestScore ? `You both scored ${hostScore}.` : `Final score ${hostScore}–${guestScore}.`,
    href: `/play/games/${encodeURIComponent(match.gameSlug)}?mode=partner&kind=challenge&match=${encodeURIComponent(match.id)}`,
  })));
}

export async function listGameMatchHistory(repo: Repository, userId: string) {
  try {
    const membership = await activeMembership(repo, userId);
    if (!membership) return [];
    const matches = await repo.list("gameMatches", { eq: { coupleId: membership.coupleId } });
    return matches
      .filter((match) => match.hostId === userId || match.guestId === userId)
      .map(normalizeGameMatch)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 24);
  } catch (error) {
    if (isMissingGameStore(error)) return [];
    throw error;
  }
}

export async function listOpenGameMatches(repo: Repository, userId: string) {
  try {
    const membership = await activeMembership(repo, userId);
    if (!membership) return [];
    const matches = await repo.list("gameMatches", { eq: { coupleId: membership.coupleId, status: "open" } });
    return matches.filter((match) => match.hostId === userId || match.guestId === userId).map(normalizeGameMatch);
  } catch (error) {
    if (isMissingGameStore(error)) return [];
    throw error;
  }
}

export async function loadGameMatch(repo: Repository, userId: string, matchId: string) {
  try {
    const membership = await activeMembership(repo, userId);
    if (!membership) return null;
    const match = await repo.find("gameMatches", { eq: { id: matchId, coupleId: membership.coupleId } });
    return match ? normalizeGameMatch(match) : null;
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
  let matches: GameMatch[];
  try {
    [scores, preferences, profiles, matches] = await Promise.all([
      repo.list("gameScores", slug ? { eq: { gameSlug: slug } } : {}),
      repo.list("userPreferences", {}),
      repo.list("profiles", {}),
      repo.list("gameMatches", {}),
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
    const preference = preferences.find((item) => item.userId === row.userId);
    const played = matches
      .filter((match) => match.status === "complete" && (!slug || match.gameSlug === slug) && (match.hostId === row.userId || match.guestId === row.userId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    let wins = 0;
    let losses = 0;
    for (const match of played) {
      const yours = match.hostId === row.userId ? match.hostScore ?? 0 : match.guestScore ?? 0;
      const theirs = match.hostId === row.userId ? match.guestScore ?? 0 : match.hostScore ?? 0;
      if (yours > theirs) wins += 1;
      else if (yours < theirs) losses += 1;
    }
    let currentStreak = 0;
    for (const match of played) {
      const yours = match.hostId === row.userId ? match.hostScore ?? 0 : match.guestScore ?? 0;
      const theirs = match.hostId === row.userId ? match.guestScore ?? 0 : match.hostScore ?? 0;
      if (yours <= theirs) break;
      currentStreak += 1;
    }
    const showStats = row.userId === viewerId || preference?.showGameStats === true;
    const showAchievements = row.userId === viewerId || preference?.showGameAchievements === true;
    return {
      rank: index + 1,
      userId: row.userId,
      displayName: visible.has(row.userId) ? profile?.displayName ?? "Player" : "You (hidden from others)",
      avatarUrl: visible.has(row.userId) ? profile?.avatarUrl ?? null : null,
      score: row.score,
      gameSlug: slug ?? null,
      mine: row.userId === viewerId,
      gamesPlayed: showStats ? played.length : 0,
      wins: showStats ? wins : 0,
      losses: showStats ? losses : 0,
      winRate: showStats && played.length ? Math.round((wins / played.length) * 100) : 0,
      highestScore: showStats ? row.score : 0,
      currentStreak: showStats ? currentStreak : 0,
      achievementPoints: showAchievements ? preference?.points ?? 0 : null,
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
