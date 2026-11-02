import Link from "next/link";
import { startArcadeMatchAction } from "@/app/actions-games";
import { MatchTimeline, type MatchTimelineItem } from "@/components/games/match-timeline";
import { GameCover } from "@/components/games/game-cover";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { arcadeGame, arcadeMatchMode, ARCADE_GAMES } from "@/lib/games/catalog";
import { activeMembership, otherPartner } from "@/lib/services/access";
import { listGameMatchHistory, listOpenGameMatches, myBestScores } from "@/lib/services/games";

export const metadata = { title: "Games" };

export default async function GamesPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const partner = membership ? await otherPartner(repo, membership.coupleId, user.profile.id) : null;
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const [history, best, openMatches] = await Promise.all([
    listGameMatchHistory(repo, user.profile.id),
    myBestScores(repo, user.profile.id),
    listOpenGameMatches(repo, user.profile.id),
  ]);
  const partnerFirst = partnerProfile?.displayName.split(" ")[0] ?? "your partner";
  const timeline: MatchTimelineItem[] = history.map((match) => {
    const game = arcadeGame(match.gameSlug);
    const seat = match.guestId === user.profile.id ? "guest" : "host";
    const yourScore = seat === "host" ? match.hostScore : match.guestScore;
    const yourTurn = match.status === "open" && match.kind === "challenge"
      ? arcadeMatchMode(match.gameSlug) === "score-race" ? yourScore === null : match.turnSeat === seat
      : match.status === "open" && (seat === "host" ? match.hostScore : match.guestScore) === null;
    return {
      id: match.id,
      slug: match.gameSlug,
      title: game?.title ?? match.gameSlug,
      emoji: game?.emoji ?? "🎮",
      kind: match.kind,
      status: match.status,
      yourTurn,
      yours: seat === "host" ? match.hostScore : match.guestScore,
      theirs: seat === "host" ? match.guestScore : match.hostScore,
      updatedAt: match.updatedAt,
    };
  });
  const paired = Boolean(partner);
  const completed = history.filter((match) => match.status === "complete");
  const wins = completed.filter((match) => {
    const yours = match.guestId === user.profile.id ? match.guestScore : match.hostScore;
    const theirs = match.guestId === user.profile.id ? match.hostScore : match.guestScore;
    return (yours ?? 0) > (theirs ?? 0);
  }).length;
  const draws = completed.filter((match) => match.hostScore === match.guestScore).length;
  const losses = completed.length - wins - draws;

  return (
    <main className="grid w-full gap-6 px-4 py-5 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          <Link href="/play" className="underline">Play</Link>
          {" · "}
          <Link href="/play/games/ranks" className="underline">Global ranking</Link>
        </p>
        <h1 className="mt-2 font-serif text-4xl">Arcade games</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The WenDev portfolio games, playable here as 1 player or with your partner. Scores stay on your account. Names appear on the global board only if you allow it in Settings.
        </p>
      </header>
      <section className="grid max-w-3xl grid-cols-3 gap-2 sm:gap-3" aria-label="Partner challenge record">
        {[['Wins', wins, 'text-emerald-600'], ['Draws', draws, 'text-amber-600'], ['Losses', losses, 'text-rose-600']].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl border border-border bg-card px-3 py-3 text-center shadow-[var(--shadow)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ARCADE_GAMES.map((game) => (
          <article key={game.slug} className="panel group flex flex-col gap-3 p-3">
            <GameCover slug={game.slug} title={game.title} emoji={game.emoji} />
            <div className="flex min-w-0 flex-1 flex-col px-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{game.genre} · {game.difficulty} · {game.minutes}</p>
                  {best.has(game.slug) && <p className="shrink-0 text-xs font-medium">Best {best.get(game.slug)}</p>}
                </div>
                {(() => {
                  const active = openMatches.find((match) => match.gameSlug === game.slug);
                  return active ? (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-primary"><span className="size-2 animate-pulse rounded-full bg-primary" />In progress</span>
                      <Button asChild size="sm" className="h-8 px-3 text-xs"><Link href={`/play/games/${game.slug}?mode=partner&kind=${active.kind}&match=${encodeURIComponent(active.id)}`}>Continue</Link></Button>
                    </div>
                  ) : null;
                })()}
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">{arcadeMatchMode(game.slug) === "turn-based" ? "Turn-based challenge" : "Score race challenge"}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{game.short}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 px-1 pb-1">
              <Button asChild className="shrink-0">
                <Link href={`/play/games/${game.slug}?mode=solo`}>1 player</Link>
              </Button>
              {paired ? (
                <>
                  <form action={startArcadeMatchAction}>
                    <input type="hidden" name="slug" value={game.slug} />
                    <input type="hidden" name="kind" value="hotseat" />
                    <Button type="submit" variant="outline">Same device</Button>
                  </form>
                  <form action={startArcadeMatchAction}>
                    <input type="hidden" name="slug" value={game.slug} />
                    <input type="hidden" name="kind" value="challenge" />
                    <Button type="submit" variant="outline">Challenge {partnerFirst}</Button>
                  </form>
                </>
              ) : (
                <p className="self-center text-xs text-muted-foreground">Pair to play with a partner.</p>
              )}
            </div>
          </article>
        ))}
      </section>
      <MatchTimeline initial={timeline} partnerName={partnerFirst} />
      </div>
    </main>
  );
}
