import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { submitGameScore, type ArcadeKind } from "@/lib/services/games";
import type { GameMatchSeat, GameScoreMode } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a score." }, { status: 401 });
  let body: {
    slug?: string;
    score?: number;
    mode?: GameScoreMode;
    kind?: ArcadeKind;
    matchId?: string | null;
    seat?: GameMatchSeat;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON score." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  const score = typeof body.score === "number" ? body.score : Number(body.score);
  const mode: GameScoreMode = body.mode === "partner" ? "partner" : "solo";
  const kind: ArcadeKind = body.kind === "challenge" || body.kind === "hotseat" ? body.kind : "solo";
  const result = await submitGameScore(await getRepository(), {
    userId: user.profile.id,
    slug,
    score,
    mode,
    kind,
    matchId: typeof body.matchId === "string" ? body.matchId : null,
    seat: body.seat === "guest" ? "guest" : "host",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, matchId: result.data.matchId, score: result.data.score });
}
