import Link from "next/link";
import { notFound } from "next/navigation";
import { startArcadeMatchAction } from "@/app/actions-games";
import { GameDemo } from "@/components/games/game-demo";
import { GamePlaySession } from "@/components/games/game-play-session";
import { GameRankingPanel } from "@/components/games/game-ranking-panel";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { arcadeGame, arcadeMatchMode } from "@/lib/games/catalog";
import { activeMembership, otherPartner } from "@/lib/services/access";
import { loadGameMatch } from "@/lib/services/games";
import { gameLeaderboard } from "@/lib/services/games";
import type { ArcadeKind, ArcadeMode, ArcadeSeat } from "@/components/games/arcade-score";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = arcadeGame(slug);
  return { title: game?.title ?? "Game" };
}

export default async function ArcadeGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; kind?: string; match?: string; error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const game = arcadeGame(slug);
  if (!game) notFound();
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const partner = membership ? await otherPartner(repo, membership.coupleId, user.profile.id) : null;
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const match = query.match ? await loadGameMatch(repo, user.profile.id, query.match) : null;
  const mode: ArcadeMode = query.mode === "partner" || match ? "partner" : "solo";
  const kind: ArcadeKind = match?.kind ?? (query.kind === "hotseat" || query.kind === "challenge" ? query.kind : "solo");
  const seat: ArcadeSeat = match && match.guestId === user.profile.id ? "guest" : "host";
  const rankingEnabled = Boolean(user.preferences.showOnGameLeaderboard);
  const rankingRows = await gameLeaderboard(repo, user.profile.id, game.slug);
  const matchMode = arcadeMatchMode(game.slug);

  return (
    <main className="mx-auto grid w-full min-w-0 max-w-[1440px] gap-6 overflow-x-hidden px-3 py-5 pb-28 sm:px-4 sm:pb-8 lg:px-8">
      <header className="max-w-4xl">
        <p className="text-sm text-muted-foreground">
          <Link href="/play/games" className="underline">Arcade games</Link>
          {" · "}
          <Link href={`/play/games/ranks?game=${encodeURIComponent(game.slug)}`} className="underline">Ranking</Link>
        </p>
        <h1 className="mt-2 font-serif text-4xl">{game.emoji} {game.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {kind === "challenge"
            ? `${matchMode === "turn-based" ? "Turn-based match" : "Competitive score race"} against ${partnerProfile?.displayName ?? "your partner"} on two devices.`
            : kind === "hotseat"
              ? `Same device. Pass the turn to ${partnerProfile?.displayName ?? "your partner"}.`
              : `${game.short} ${game.controls}`}
        </p>
        {query.error && <p className="mt-3 text-sm text-destructive" role="alert">{query.error}</p>}
      </header>
      {mode === "solo" && partner && (
        <div className="flex flex-wrap gap-2">
          <form action={startArcadeMatchAction}>
            <input type="hidden" name="slug" value={game.slug} />
            <input type="hidden" name="kind" value="hotseat" />
            <Button type="submit" variant="outline">Play on one device</Button>
          </form>
          <form action={startArcadeMatchAction}>
            <input type="hidden" name="slug" value={game.slug} />
            <input type="hidden" name="kind" value="challenge" />
            <Button type="submit" variant="outline">Challenge {partnerProfile?.displayName.split(" ")[0] ?? "partner"}</Button>
          </form>
        </div>
      )}
      {match?.status === "complete" && partner && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="mr-auto">
            <p className="text-sm font-medium">Round complete</p>
            <p className="text-xs text-muted-foreground">Start a new round with {partnerProfile?.displayName ?? "your partner"} or choose another game.</p>
          </div>
          <form action={startArcadeMatchAction}>
            <input type="hidden" name="slug" value={game.slug} />
            <input type="hidden" name="kind" value="challenge" />
            <Button type="submit" size="sm">New round</Button>
          </form>
          <Button asChild size="sm" variant="outline">
            <Link href="/play/games">New challenge</Link>
          </Button>
        </div>
      )}
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <GamePlaySession
          key={match?.id ?? `${game.slug}-${mode}-${kind}`}
          slug={game.slug}
          title={game.title}
          pvp={game.pvp}
          mode={mode}
          kind={kind}
          seat={seat}
          matchId={match?.id ?? null}
          partnerName={partnerProfile?.displayName ?? null}
          rankingEnabled={rankingEnabled}
          initialTurn={match?.turnSeat ?? "host"}
          initialHostScore={match?.hostScore ?? null}
          initialGuestScore={match?.guestScore ?? null}
          initialRevision={match?.revision ?? 0}
          initialNote={match?.snapshot?.note ?? null}
          initialLiveScore={match?.snapshot?.score ?? null}
          initialHostLiveScore={match?.snapshot?.hostScore ?? null}
          initialGuestLiveScore={match?.snapshot?.guestScore ?? null}
          initialBoard={match?.snapshot?.board ?? null}
          initialTurns={match?.turns ?? []}
          initialStatus={match?.status ?? "open"}
        >
          <GameDemo slug={game.slug} />
        </GamePlaySession>
        <GameRankingPanel gameSlug={game.slug} gameTitle={game.title} rows={rankingRows} />
      </div>
    </main>
  );
}
