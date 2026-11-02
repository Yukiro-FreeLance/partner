import Link from "next/link";
import { Avatar } from "@/components/ui/feedback";
import type { LeaderboardRow } from "@/lib/services/games";

export function GameRankingPanel({
  gameSlug,
  gameTitle,
  rows,
}: {
  gameSlug: string;
  gameTitle: string;
  rows: LeaderboardRow[];
}) {
  return (
    <aside className="lg:sticky lg:top-5" aria-label={`${gameTitle} ranking`}>
      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow)]">
        <div className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-card to-card px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Leaderboard</p>
              <h2 className="mt-1 font-serif text-2xl">{gameTitle} ranking</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Top 5</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Best public scores from players who opted in.</p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-medium">No scores yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Finish a round to start this board.</p>
          </div>
        ) : (
          <ol>
            {rows.slice(0, 5).map((row) => (
              <li key={row.userId} className="flex items-center gap-3 border-b border-border/60 px-5 py-3 last:border-b-0">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${row.rank === 1 ? "bg-amber-400/20 text-amber-700" : row.rank === 2 ? "bg-slate-400/20 text-slate-600" : row.rank === 3 ? "bg-orange-400/20 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                  {row.rank}
                </span>
                <Avatar name={row.displayName} src={row.avatarUrl} className="size-9 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {row.displayName}
                  {row.mine && <span className="ml-1 text-xs text-primary">· you</span>}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">{row.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="border-t border-border/70 bg-muted/20 px-5 py-4">
          <Link href={`/play/games/ranks?game=${encodeURIComponent(gameSlug)}`} className="text-sm font-medium text-primary hover:underline">
            View full ranking <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </aside>
  );
}
