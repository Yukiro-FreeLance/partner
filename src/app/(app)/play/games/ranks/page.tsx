import Link from "next/link";
import { Avatar } from "@/components/ui/feedback";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { ARCADE_GAMES, arcadeGame } from "@/lib/games/catalog";
import { gameLeaderboard } from "@/lib/services/games";

export const metadata = { title: "Game ranking" };

export default async function GameRanksPage({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
  const { game: selected } = await searchParams;
  const slug = selected && arcadeGame(selected) ? selected : undefined;
  const user = await requireUser();
  const rows = await gameLeaderboard(await getRepository(), user.profile.id, slug);
  const visible = Boolean(user.preferences.showOnGameLeaderboard);

  return (
    <main className="grid w-full gap-6 px-4 py-5 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          <Link href="/play/games" className="underline">Arcade games</Link>
        </p>
        <h1 className="mt-2 font-serif text-4xl">Global ranking</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Best scores from people who allow their name on this board. Quiz answers and personality results stay out of it.
        </p>
        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-[var(--shadow)]">
          {visible
            ? "Your display name can appear here."
            : "You are hidden from other players. You can still see your own rank."}{" "}
          <Link href="/settings#game-ranking" className="underline">Change this in Settings</Link>.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Game boards">
        <Link href="/play/games/ranks" className={`rounded-full px-3 py-1 text-sm ${!slug ? "bg-primary text-primary-foreground" : "bg-white shadow-[var(--shadow)]"}`}>All games</Link>
        {ARCADE_GAMES.map((item) => (
          <Link key={item.slug} href={`/play/games/ranks?game=${encodeURIComponent(item.slug)}`} className={`rounded-full px-3 py-1 text-sm ${slug === item.slug ? "bg-primary text-primary-foreground" : "bg-white shadow-[var(--shadow)]"}`}>
            {item.emoji} {item.title}
          </Link>
        ))}
      </nav>
      <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No public scores yet. Play a game, then opt in if you want to show up.</p>}
        <ol>
          {rows.map((row) => (
            <li key={row.userId} className="flex min-h-14 items-center gap-3 border-b border-[#f6eef8] px-4 last:border-b-0">
              <span className="w-8 text-sm font-medium tabular-nums">{row.rank}</span>
              <Avatar name={row.displayName} src={row.avatarUrl} className="size-9 text-xs" />
              <span className="flex-1 text-sm">{row.displayName}{row.mine ? " · you" : ""}</span>
              <span className="font-medium tabular-nums">{row.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
