"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/feedback";
import type { LeaderboardRow } from "@/lib/services/games";

type SortKey = "rank" | "score" | "gamesPlayed" | "winRate" | "highestScore" | "currentStreak";

export function RankingBoard({ rows }: { rows: LeaderboardRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [router]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => !needle || row.displayName.toLowerCase().includes(needle))
      .sort((a, b) => sort === "rank" ? a.rank - b.rank : Number(b[sort]) - Number(a[sort]));
  }, [query, rows, sort]);
  const podium = rows.slice(0, 3);

  return (
    <div className="grid gap-4">
      {podium.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {podium.map((row) => (
            <div key={row.userId} className={`relative overflow-hidden rounded-[1.5rem] border p-4 shadow-[var(--shadow)] ${row.rank === 1 ? "border-amber-300 bg-amber-50/70" : row.rank === 2 ? "border-slate-300 bg-slate-50/70" : "border-orange-300 bg-orange-50/70"}`}>
              <Trophy className="absolute -right-2 -top-2 size-16 rotate-12 opacity-10" aria-hidden />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">#{row.rank} global</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={row.displayName} src={row.avatarUrl} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.displayName}{row.mine && <span className="ml-1 text-xs text-primary">· you</span>}</p>
                  <p className="font-mono text-lg font-semibold tabular-nums">{row.score.toLocaleString()} pts</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-card p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="absolute left-3 size-4 text-muted-foreground" aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" aria-label="Search players" className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground">
            <option value="rank">Rank</option>
            <option value="score">Total points</option>
            <option value="gamesPlayed">Games played</option>
            <option value="winRate">Win rate</option>
            <option value="highestScore">Highest score</option>
            <option value="currentStreak">Streak</option>
          </select>
        </label>
        <span className="text-xs text-emerald-600">● Live updates</span>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[var(--shadow)]">
        {filtered.length === 0 ? <p className="px-5 py-8 text-sm text-muted-foreground">No players match this search.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-border bg-muted/35 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="px-5 py-4">Rank</th><th className="px-3 py-4">Player</th><th className="px-3 py-4 text-right">Points</th><th className="px-3 py-4 text-right">Games</th><th className="px-3 py-4 text-right">Wins</th><th className="px-3 py-4 text-right">Losses</th><th className="px-3 py-4 text-right">Win rate</th><th className="px-3 py-4 text-right">Highest</th><th className="px-5 py-4 text-right">Streak</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => <tr key={row.userId} className={`border-b border-border/60 last:border-0 ${row.mine ? "bg-primary/7" : ""}`}>
                  <td className="px-5 py-4"><span className={`inline-flex size-8 items-center justify-center rounded-full font-semibold tabular-nums ${row.rank <= 3 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>#{row.rank}</span></td>
                  <td className="px-3 py-4"><div className="flex items-center gap-3"><Avatar name={row.displayName} src={row.avatarUrl} className="size-9 text-xs" /><span className="font-medium">{row.displayName}{row.mine && <span className="ml-1 text-xs text-primary">· you</span>}</span></div></td>
                  <td className="px-3 py-4 text-right font-semibold tabular-nums">{row.score.toLocaleString()}</td><td className="px-3 py-4 text-right tabular-nums">{row.gamesPlayed}</td><td className="px-3 py-4 text-right tabular-nums">{row.wins}</td><td className="px-3 py-4 text-right tabular-nums">{row.losses}</td><td className="px-3 py-4 text-right tabular-nums">{row.winRate}%</td><td className="px-3 py-4 text-right tabular-nums">{row.highestScore.toLocaleString()}</td><td className="px-5 py-4 text-right font-medium tabular-nums">{row.currentStreak}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
