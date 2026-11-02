"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArcadeScoreProvider, type ArcadeKind, type ArcadeMode, type ArcadeSeat } from "@/components/games/arcade-score";
import { cn } from "@/lib/utils";
import type { GameMatchView } from "@/lib/services/games";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { supabaseAnonKey, supabaseUrl } from "@/lib/config";

type Props = {
  slug: string;
  title: string;
  pvp: boolean;
  mode: ArcadeMode;
  kind: ArcadeKind;
  seat: ArcadeSeat;
  matchId: string | null;
  partnerName: string | null;
  rankingEnabled: boolean;
  initialTurn?: ArcadeSeat;
  initialHostScore?: number | null;
  initialGuestScore?: number | null;
  initialRevision?: number;
  initialNote?: string | null;
  initialLiveScore?: number | null;
  initialHostLiveScore?: number | null;
  initialGuestLiveScore?: number | null;
  initialBoard?: Array<"X" | "O" | null> | null;
  initialTurns?: GameMatchView["turns"];
  initialStatus?: "open" | "complete";
  children: React.ReactNode;
};

type SyncState = "connecting" | "live" | "polling" | "offline";

const SYNC_COPY: Record<SyncState, string> = {
  connecting: "Connecting",
  live: "Live sync",
  polling: "Reconnecting",
  offline: "Offline · retrying",
};

export function GamePlaySession({
  slug,
  title,
  pvp,
  mode,
  kind,
  seat,
  matchId,
  partnerName,
  rankingEnabled,
  initialTurn = "host",
  initialHostScore = null,
  initialGuestScore = null,
  initialRevision = 0,
  initialNote = null,
  initialLiveScore = null,
  initialHostLiveScore = null,
  initialGuestLiveScore = null,
  initialBoard = null,
  initialTurns = [],
  initialStatus = "open",
  children,
}: Props) {
  const router = useRouter();
  const challenge = kind === "challenge" && Boolean(matchId);
  const sharedBoard = challenge && slug === "tic-tac-toe";
  const [currentSeat, setCurrentSeat] = useState<ArcadeSeat>(kind === "hotseat" ? "host" : seat);
  const [turnSeat, setTurnSeat] = useState<ArcadeSeat>(initialTurn);
  const [hostScore, setHostScore] = useState<number | null>(initialHostScore);
  const [guestScore, setGuestScore] = useState<number | null>(initialGuestScore);
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [liveNote, setLiveNote] = useState(initialNote);
  const [liveScore, setLiveScore] = useState<number | null>(initialLiveScore);
  const [hostLiveScore, setHostLiveScore] = useState<number | null>(initialHostLiveScore);
  const [guestLiveScore, setGuestLiveScore] = useState<number | null>(initialGuestLiveScore);
  const [board, setBoard] = useState<Array<"X" | "O" | null> | null>(initialBoard);
  const [turns, setTurns] = useState<GameMatchView["turns"]>(initialTurns);
  const [activeMatch, setActiveMatch] = useState(matchId);
  const [syncState, setSyncState] = useState<SyncState>(challenge ? "connecting" : "live");
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [pendingMove, setPendingMove] = useState(false);
  const turnRef = useRef(initialTurn);
  const revisionRef = useRef(initialRevision);
  const progressTimer = useRef<number | null>(null);
  const movePending = useRef(false);

  const applyView = useCallback((view: GameMatchView) => {
    if (view.revision < revisionRef.current) return;
    const isNewRevision = view.revision !== revisionRef.current;
    // The turn just moved from the partner to this player. Remount the game so
    // the new round starts from a clean state without a manual refresh.
    const arrived = isNewRevision && view.status === "open" && view.turnSeat === seat && turnRef.current !== seat;
    turnRef.current = view.turnSeat;
    revisionRef.current = view.revision;
    setTurnSeat(view.turnSeat);
    setHostScore(view.hostScore);
    setGuestScore(view.guestScore);
    setMatchStatus(view.status);
    setLiveNote(view.snapshot.note);
    setLiveScore(view.snapshot.score);
    setHostLiveScore(view.snapshot.hostScore ?? null);
    setGuestLiveScore(view.snapshot.guestScore ?? null);
    setBoard(view.snapshot.board);
    setTurns(view.turns);
    if (arrived && slug !== "tic-tac-toe") {
      setPendingMove(false);
      setRun((value) => value + 1);
    }
  }, [seat, slug]);

  useEffect(() => {
    if (!challenge || !activeMatch) return;

    let stopped = false;
    let source: EventSource | null = null;
    const realtime = supabaseUrl() && supabaseAnonKey() ? createBrowserSupabase() : null;
    const realtimeChannel = realtime
      ?.channel(`game-match:${activeMatch}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_matches", filter: `id=eq.${activeMatch}` },
        () => {
          // Re-read through the authenticated API. This keeps the client-side
          // view shaped consistently for both custom-auth and Supabase-auth users.
          void pull();
        },
      );
    let pollTimer: number | null = null;
    let retryTimer: number | null = null;
    const matchEndpoint = `/api/games/match?id=${encodeURIComponent(activeMatch)}`;
    const streamEndpoint = `/api/games/match/stream?id=${encodeURIComponent(activeMatch)}`;

    async function pull() {
      try {
        const response = await fetch(matchEndpoint, { cache: "no-store" });
        if (!response.ok || stopped) return;
        const body = (await response.json()) as { match?: GameMatchView };
        if (body.match && !stopped) applyView(body.match);
        if (!stopped) setSyncState((current) => (current === "offline" ? "polling" : current));
      } catch {
        if (!stopped) setSyncState((current) => (current === "live" ? current : "offline"));
      }
    }

    function stopPolling() {
      if (pollTimer === null) return;
      window.clearInterval(pollTimer);
      pollTimer = null;
    }

    function startPolling() {
      if (pollTimer !== null || stopped) return;
      void pull();
      pollTimer = window.setInterval(() => void pull(), 2_500);
    }

    function connect() {
      if (stopped) return;
      if (typeof EventSource === "undefined") {
        setSyncState("polling");
        startPolling();
        return;
      }
      source = new EventSource(streamEndpoint);
      source.onopen = () => {
        if (stopped) return;
        setSyncState("live");
        stopPolling();
        void pull();
      };
      source.onmessage = (event) => {
        if (stopped) return;
        try {
          const payload = JSON.parse(event.data) as { type?: string; match?: GameMatchView };
          if (payload.type === "match" && payload.match) {
            applyView(payload.match);
            setSyncState("live");
          }
        } catch {
          // Ignore a malformed frame; the next real update or poll recovers.
        }
      };
      source.onerror = () => {
        if (stopped) return;
        source?.close();
        source = null;
        setSyncState("polling");
        startPolling();
        if (retryTimer === null) {
          retryTimer = window.setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5_000);
        }
      };
    }

    void pull();
    connect();
    if (realtimeChannel) void realtimeChannel.subscribe();

    const onFocus = () => {
      void pull();
      if (!source) connect();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      source?.close();
      if (realtime && realtimeChannel) void realtime.removeChannel(realtimeChannel);
      stopPolling();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [challenge, activeMatch, applyView]);

  useEffect(() => {
    return () => {
      if (progressTimer.current) window.clearTimeout(progressTimer.current);
    };
  }, []);

  const raceChallenge = challenge && slug !== "tic-tac-toe";
  const ownScore = seat === "host" ? hostScore : guestScore;
  const ownLiveScore = seat === "host" ? hostLiveScore : guestLiveScore;
  const partnerLiveScore = seat === "host" ? guestLiveScore : hostLiveScore;
  const completedYourRun = raceChallenge && ownScore !== null;
  const complete = Boolean(matchId) && matchStatus === "complete";
  const waitingForPartner = Boolean(completedYourRun && !complete);
  const canPlay = !challenge || (matchStatus === "open" && (raceChallenge ? !completedYourRun : turnSeat === seat));
  const mine = ownScore ?? ownLiveScore;
  const theirs = (seat === "host" ? guestScore : hostScore) ?? partnerLiveScore;
  const name = partnerName ?? "your partner";
  const yourTurn = mode !== "solo" && !complete && (kind === "hotseat" ? currentSeat === "host" : raceChallenge ? !waitingForPartner : canPlay);
  const turnHeading = mode === "solo"
    ? "Solo Run"
    : complete
      ? "Challenge Completed"
      : waitingForPartner
        ? "You Completed the Challenge"
        : yourTurn
          ? "Your Turn"
          : "Partner's Turn";
  const turnDetail =
    mode === "solo"
      ? `${title} scores save when a round ends.`
        : complete
        ? `${title} is finished. The final scores are locked in.`
        : waitingForPartner
          ? `Your score is saved. Waiting for ${name} to finish their challenge.`
          : kind === "hotseat"
          ? yourTurn
            ? "Make your move, then hand the device to your partner."
            : `Hand the device to ${name}. It is their turn.`
          : yourTurn
            ? `Make your move — ${name} sees it instantly.`
            : `${name} is playing on their device. Your turn starts automatically when they finish.`;
  const scoreSummary = `${mine ?? 0}–${theirs ?? 0}`;
  const result = complete
    ? (mine ?? 0) > (theirs ?? 0) ? "You Win" : (mine ?? 0) < (theirs ?? 0) ? "You Lose" : "Draw"
    : null;

  const startRematch = useCallback(async () => {
    setRematchBusy(true);
    try {
      const response = await fetch("/api/games/rematch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { error?: string; match?: { id: string } };
      if (!response.ok || !body.match) {
        setStatus(body.error ?? "Could not start a new round.");
        return;
      }
      router.push(`/play/games/${encodeURIComponent(slug)}?mode=partner&kind=challenge&match=${encodeURIComponent(body.match.id)}`);
      router.refresh();
    } catch {
      setStatus("Could not start a new round.");
    } finally {
      setRematchBusy(false);
    }
  }, [router, slug]);

  const save = useCallback(
    async (nextSeat: ArcadeSeat, score: number) => {
      setBusy(true);
      try {
        const response = await fetch("/api/games/score", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, score, mode, kind, matchId: activeMatch, seat: nextSeat, note: "Round finished" }),
        });
        const body = (await response.json()) as { error?: string; matchId?: string; match?: GameMatchView | null };
        if (!response.ok) {
          setStatus(body.error ?? "Could not save that score.");
          return;
        }
        if (body.matchId) setActiveMatch(body.matchId);
        if (body.match) applyView(body.match);
        setStatus(
          kind === "challenge"
            ? "Round saved. The turn has passed to your partner."
            : rankingEnabled
              ? "Score saved. If this is a new best, it can appear on the global board."
              : "Score saved privately. Turn on global ranking in Settings if you want others to see you.",
        );
      } catch {
        setStatus("Could not save that score.");
      } finally {
        setBusy(false);
      }
    },
    [slug, mode, kind, activeMatch, rankingEnabled, applyView],
  );

  const reportScore = useCallback(
    (score: number) => {
      if (challenge && !canPlay) return;
      // A debounced progress snapshot must never race the final round score.
      if (progressTimer.current) {
        window.clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      if (kind === "hotseat" && pvp) {
        const guest = score === 50 ? 50 : Math.max(0, 100 - score);
        setHostScore(score);
        setGuestScore(guest);
        void save("host", score).then(() => save("guest", guest));
        return;
      }
      if (kind === "hotseat" && currentSeat === "host") {
        setHostScore(score);
        void save("host", score);
        setCurrentSeat("guest");
        setRun((value) => value + 1);
        setStatus(`Hand the device to ${name}. It is their turn.`);
        return;
      }
      if (kind === "hotseat") {
        setGuestScore(score);
        void save("host", hostScore ?? 0).then(() => save("guest", score));
        return;
      }
      if (seat === "host") setHostScore(score);
      else setGuestScore(score);
      void save(seat, score);
    },
    [challenge, canPlay, kind, pvp, currentSeat, hostScore, name, save, seat],
  );

  const reportProgress = useCallback((note: string, score?: number) => {
    if (!challenge || !activeMatch || !canPlay) return;
    if (progressTimer.current) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(() => {
      void fetch("/api/games/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: activeMatch, op: "progress", note, score: score ?? null }),
      }).then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { match?: GameMatchView };
        if (body.match) applyView(body.match);
      }).catch(() => undefined);
    }, 120);
  }, [challenge, activeMatch, canPlay, applyView]);

  const playMove = useCallback((cell: number) => {
    if (!challenge || !activeMatch || !canPlay || movePending.current) return;
    movePending.current = true;
    setPendingMove(true);
    void fetch("/api/games/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: activeMatch, op: "move", cell }),
    }).then(async (response) => {
      const body = (await response.json()) as { error?: string; match?: GameMatchView };
      if (!response.ok) {
        setStatus(body.error ?? "That move was not accepted.");
        if (body.match) applyView(body.match);
        return;
      }
      if (body.match) applyView(body.match);
      setStatus(body.match?.status === "complete" ? "Match finished." : body.match?.yourTurn ? "Your Turn" : "Partner's Turn");
    }).catch(() => setStatus("That move could not be sent."))
      .finally(() => {
        movePending.current = false;
        setPendingMove(false);
      });
  }, [challenge, activeMatch, canPlay, applyView]);

  const finish = useCallback(() => {
    if (!activeMatch || (challenge && !canPlay)) return;
    void fetch("/api/games/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: activeMatch, op: "finish" }),
    }).then(async (response) => {
      const body = (await response.json()) as { error?: string; match?: GameMatchView };
      if (!response.ok) {
        setStatus(body.error ?? "The match could not be finished.");
        return;
      }
      if (body.match) applyView(body.match);
      setStatus("Match finished.");
    }).catch(() => setStatus("The match could not be finished."));
  }, [activeMatch, applyView, canPlay, challenge]);

  const value = useMemo(
    () => ({
      mode,
      kind,
      seat: kind === "hotseat" ? currentSeat : seat,
      pvp: kind === "hotseat" && pvp,
      canPlay,
      pending: busy || pendingMove,
      partnerName,
      board: sharedBoard ? (board ?? Array(9).fill(null)) : null,
      reportScore,
      reportProgress,
      playMove,
    }),
    [mode, kind, currentSeat, seat, pvp, canPlay, busy, pendingMove, partnerName, sharedBoard, board, reportScore, reportProgress, playMove],
  );

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          "rounded-2xl border px-4 py-4 shadow-[var(--shadow)] transition-colors",
          yourTurn ? "border-primary/35 bg-primary/5" : "border-border bg-card",
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative mt-1 flex size-3 shrink-0" aria-hidden>
              {yourTurn && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />}
              <span className={cn("relative inline-flex size-3 rounded-full", yourTurn ? "bg-primary" : complete ? "bg-muted-foreground" : "bg-amber-500")} />
            </span>
            <div className="min-w-0">
              <p className={cn("font-serif text-xl leading-tight", yourTurn && "text-primary")}>{turnHeading}</p>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{turnDetail}</p>
              {challenge && liveNote && (
                <p className="mt-1 text-xs text-foreground">
                  <span className={cn("font-medium", canPlay ? "text-primary" : "text-amber-600")}>{canPlay ? "You" : partnerName ?? "Partner"}</span>
                  {` · ${liveNote}`}{liveScore !== null ? ` · ${liveScore}` : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {challenge && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  syncState === "live" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700",
                )}
              >
                <span className={cn("size-1.5 rounded-full", syncState === "live" ? "bg-emerald-500" : "animate-pulse bg-amber-500")} aria-hidden />
                {SYNC_COPY[syncState]}
              </span>
            )}
            {mode !== "solo" && (
              <div className="flex flex-wrap justify-end gap-2 text-xs">
                <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-secondary-foreground">You {mine ?? "—"}</span>
                <span className="whitespace-nowrap rounded-full bg-muted px-3 py-1">{partnerName ?? "Partner"} {theirs ?? "—"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {status && <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground" role="status">{status}{busy ? " Saving…" : ""}</p>}

      {challenge && turns.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-medium">Recent turns</p>
          <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
            {turns.slice(-4).map((turn, index) => (
              <li key={`${turn.at}-${turn.seat}-${index}`}>
                <span className="text-foreground">{turn.seat === seat ? "You" : partnerName ?? "Partner"}</span>
                {` · ${turn.note}`}{turn.score ? ` · ${turn.score}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div
          className={cn(
            "rounded-[1.75rem] border px-6 py-5 text-center shadow-[var(--shadow)]",
            result === "You Win" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            result === "You Lose" && "border-rose-200 bg-rose-50 text-rose-800",
            result === "Draw" && "border-amber-200 bg-amber-50 text-amber-800",
          )}
          role="status"
          aria-live="polite"
        >
          <p className="font-serif text-3xl">{result}</p>
          <p className="mt-1 text-sm">Final score · You {scoreSummary} {partnerName ?? "Partner"}</p>
          {challenge && <Button type="button" className="mt-4" onClick={() => void startRematch()} disabled={rematchBusy}>{rematchBusy ? "Starting…" : "Rematch"}</Button>}
        </div>
      )}

      <ArcadeScoreProvider value={value}>
        {complete && !sharedBoard && challenge ? (
          <div className="rounded-[1.75rem] border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow)]">
            <p className="font-serif text-2xl">Round complete</p>
            <p className="mt-2 text-sm text-muted-foreground">Your result is shown above. Start another round whenever you&apos;re ready.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/play/games">Back to games</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/play/games/ranks">Global ranking</Link>
              </Button>
            </div>
          </div>
        ) : canPlay || sharedBoard || !challenge ? (
          <div key={sharedBoard ? "shared" : run}>{children}</div>
        ) : (
          <div className="rounded-[1.75rem] border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow)]" aria-live="polite">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10" aria-hidden>
              <span className="size-3 animate-pulse rounded-full bg-amber-500" />
            </span>
            <p className="mt-4 font-serif text-2xl">Partner&apos;s Turn</p>
            <p className="mt-2 text-sm text-muted-foreground">{partnerName ?? "Your partner"} is playing. This screen updates automatically the moment they finish.</p>
            <p className="mt-4 text-xs text-muted-foreground">No actions can be sent until it is your turn.</p>
          </div>
        )}
      </ArcadeScoreProvider>

      <p className="text-xs text-muted-foreground">
        Global names stay hidden unless you opt in under{" "}
        <Link href="/settings#game-ranking" className="underline">
          Settings
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/play/games">All games</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/play/games/ranks">Global ranking</Link>
        </Button>
        {challenge && canPlay && matchStatus === "open" && (hostScore !== null || guestScore !== null) && (
          <Button type="button" variant="outline" onClick={finish}>End match</Button>
        )}
      </div>
    </div>
  );
}
