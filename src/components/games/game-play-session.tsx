"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArcadeScoreProvider, type ArcadeKind, type ArcadeMode, type ArcadeSeat } from "@/components/games/arcade-score";
import { cn } from "@/lib/utils";

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
  children: React.ReactNode;
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
  children,
}: Props) {
  const [currentSeat, setCurrentSeat] = useState<ArcadeSeat>(seat);
  const [hostScore, setHostScore] = useState<number | null>(null);
  const [guestScore, setGuestScore] = useState<number | null>(null);
  const [activeMatch, setActiveMatch] = useState(matchId);
  const [run, setRun] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = useCallback(
    async (nextSeat: ArcadeSeat, score: number) => {
      setBusy(true);
      try {
        const response = await fetch("/api/games/score", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, score, mode, kind, matchId: activeMatch, seat: nextSeat }),
        });
        const body = (await response.json()) as { error?: string; matchId?: string };
        if (!response.ok) {
          setStatus(body.error ?? "Could not save that score.");
          return;
        }
        if (body.matchId) setActiveMatch(body.matchId);
        setStatus(
          rankingEnabled
            ? "Score saved. If this is a new best, it can appear on the global board."
            : "Score saved privately. Turn on global ranking in Settings if you want others to see you.",
        );
      } catch {
        setStatus("Could not save that score.");
      } finally {
        setBusy(false);
      }
    },
    [slug, mode, kind, activeMatch, rankingEnabled],
  );

  const reportScore = useCallback(
    (score: number) => {
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
        setStatus(`Hand the device to ${partnerName ?? "your partner"} and play the same game.`);
        return;
      }
      if (kind === "hotseat") {
        setGuestScore(score);
        void save("host", hostScore ?? 0).then(() => save("guest", score));
        return;
      }
      if (currentSeat === "host") setHostScore(score);
      else setGuestScore(score);
      void save(currentSeat, score);
    },
    [kind, pvp, currentSeat, hostScore, partnerName, save],
  );

  const value = useMemo(
    () => ({ mode, kind, seat: currentSeat, pvp: kind === "hotseat" && pvp, reportScore }),
    [mode, kind, currentSeat, pvp, reportScore],
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow)]">
        <div>
          <p className="text-sm font-medium">
            {mode === "solo" ? "1 player" : kind === "hotseat" ? `Partner · same device · ${currentSeat === "host" ? "You" : partnerName ?? "Partner"}` : `Partner challenge · ${currentSeat === "host" ? "Your run" : `${partnerName ?? "Partner"}'s run`}`}
          </p>
          <p className="text-xs text-muted-foreground">{title} scores save when a round ends.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {hostScore !== null && <span className="rounded-full bg-secondary px-3 py-1">You {hostScore}</span>}
          {guestScore !== null && <span className="rounded-full bg-secondary px-3 py-1">{partnerName ?? "Partner"} {guestScore}</span>}
        </div>
      </div>
      {status && <p className={cn("rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800")} role="status">{status}{busy ? " Saving…" : ""}</p>}
      <ArcadeScoreProvider value={value}>
        <div key={run}>{children}</div>
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
      </div>
    </div>
  );
}
