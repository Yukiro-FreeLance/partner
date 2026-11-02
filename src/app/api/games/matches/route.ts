import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { arcadeGame, arcadeMatchMode } from "@/lib/games/catalog";
import { listGameMatchHistory } from "@/lib/services/games";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ matches: [] }, { status: 401 });
  const matches = await listGameMatchHistory(await getRepository(), user.profile.id);
  return NextResponse.json({
    matches: matches.slice(0, 10).map((match) => {
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
    }),
  });
}
