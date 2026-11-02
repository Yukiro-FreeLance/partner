import Link from "next/link";
import { startArcadeMatchAction } from "@/app/actions-games";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { ARCADE_GAMES } from "@/lib/games/catalog";
import { activeMembership, otherPartner } from "@/lib/services/access";
import { listOpenGameMatches, myBestScores } from "@/lib/services/games";

export const metadata = { title: "Games" };

export default async function GamesPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const partner = membership ? await otherPartner(repo, membership.coupleId, user.profile.id) : null;
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const [open, best] = await Promise.all([listOpenGameMatches(repo, user.profile.id), myBestScores(repo, user.profile.id)]);
  const paired = Boolean(partner);

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
      {open.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-serif text-2xl">Open partner matches</h2>
          {open.map((match) => {
            const mine = match.hostId === user.profile.id ? match.hostScore : match.guestScore;
            const waiting = mine === null;
            return (
              <Link key={match.id} href={`/play/games/${match.gameSlug}?mode=partner&kind=${match.kind}&match=${match.id}`} className="rounded-2xl border bg-card px-4 py-3 text-sm">
                {ARCADE_GAMES.find((game) => game.slug === match.gameSlug)?.title ?? match.gameSlug}
                {waiting ? " · Your turn" : " · Waiting on your partner"}
              </Link>
            );
          })}
        </section>
      )}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ARCADE_GAMES.map((game) => (
          <article key={game.slug} className="panel flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl" aria-hidden>
                {game.emoji}
              </span>
              <div className="min-w-0">
                <h2 className="font-serif text-xl leading-tight">{game.title}</h2>
                <p className="text-xs text-muted-foreground">{game.genre} · {game.difficulty} · {game.minutes}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{game.short}</p>
                {best.has(game.slug) && <p className="mt-1 text-xs">Your best {best.get(game.slug)}</p>}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
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
                    <Button type="submit" variant="outline">Challenge {partnerProfile?.displayName.split(" ")[0] ?? "partner"}</Button>
                  </form>
                </>
              ) : (
                <p className="self-center text-xs text-muted-foreground">Pair to play with a partner.</p>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
