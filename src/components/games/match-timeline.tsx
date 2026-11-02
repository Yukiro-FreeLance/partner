"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type MatchTimelineItem = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  kind: "challenge" | "hotseat";
  status: "open" | "complete";
  yourTurn: boolean;
  yours: number | null;
  theirs: number | null;
  updatedAt: string;
};

function when(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function MatchTimeline({ initial, partnerName }: { initial: MatchTimelineItem[]; partnerName: string }) {
  const [matches, setMatches] = useState(initial.slice(0, 10));

  useEffect(() => {
    let stop = false;
    let source: EventSource | null = null;
    let timer: number | null = null;
    let retry: number | null = null;

    async function pull() {
      try {
        const response = await fetch("/api/games/matches", { cache: "no-store" });
        if (!response.ok || stop) return;
        const body = (await response.json()) as { matches?: MatchTimelineItem[] };
         if (body.matches && !stop) setMatches(body.matches.slice(0, 10));
      } catch {
        // The next poll or focus refresh retries.
      }
    }

    function startPolling() {
      if (timer !== null || stop) return;
      void pull();
      timer = window.setInterval(() => void pull(), 10_000);
    }

    function connect() {
      if (stop) return;
      if (typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      source = new EventSource("/api/games/matches/stream");
      source.onopen = () => {
        if (stop) return;
        if (timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
        void pull();
      };
      source.onmessage = (event) => {
        if (stop) return;
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "change") void pull();
        } catch {
          // Ignore a malformed frame; the next change or poll recovers.
        }
      };
      source.onerror = () => {
        if (stop) return;
        source?.close();
        source = null;
        startPolling();
        if (retry === null) {
          retry = window.setTimeout(() => {
            retry = null;
            connect();
          }, 5_000);
        }
      };
    }

    connect();
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
      stop = true;
      source?.close();
      if (timer !== null) window.clearInterval(timer);
      if (retry !== null) window.clearTimeout(retry);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <aside className="h-fit rounded-[1.75rem] bg-card p-4 text-card-foreground shadow-[var(--shadow)] lg:sticky lg:top-24">
      <h2 className="font-serif text-2xl">Match timeline</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Challenges with {partnerName} on two devices, newest first.</p>
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No challenges yet. Challenge {partnerName} from a game card.</p>
      ) : (
        <ol className="mt-4 border-l border-border">
          {matches.map((match) => {
            const label = match.status === "complete"
              ? match.yours === match.theirs ? "Draw" : (match.yours ?? 0) > (match.theirs ?? 0) ? "You won" : "Partner won"
              : match.yours !== null && !match.yourTurn ? "Waiting for partner"
                : match.yourTurn ? "Your turn" : `${partnerName}'s turn`;
            const score = match.yours !== null || match.theirs !== null ? `${match.yours ?? 0}–${match.theirs ?? 0}` : null;
            return (
              <li key={match.id} className="relative pb-4 pl-4 last:pb-0">
                <span className={`absolute top-1.5 -left-[5px] size-2.5 rounded-full ${match.yourTurn && match.status === "open" ? "bg-primary" : "bg-border"}`} aria-hidden />
                <Link href={`/play/games/${match.slug}?mode=partner&kind=${match.kind}&match=${match.id}`} className="block rounded-2xl px-2 py-1 hover:bg-secondary">
                  <p className="text-sm font-medium">{match.emoji} {match.title}</p>
                  <p className={`text-xs ${match.yourTurn && match.status === "open" ? "text-primary" : "text-muted-foreground"}`}>{label}{score ? ` · ${score}` : ""}</p>
                  <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>{match.kind === "hotseat" ? "Same device" : "Two devices"} · {when(match.updatedAt)}</p>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
