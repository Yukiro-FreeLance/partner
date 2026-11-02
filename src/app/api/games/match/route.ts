import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { finishGameMatch, gameMatchView, loadGameMatch, playMatchMove, updateMatchProgress } from "@/lib/services/games";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to follow a match." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const match = await loadGameMatch(await getRepository(), user.profile.id, id);
  if (!match) return NextResponse.json({ error: "That match is not in your couple space." }, { status: 404 });
  return NextResponse.json({ match: gameMatchView(match, user.profile.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to play this match." }, { status: 401 });
  let body: { matchId?: string; op?: string; note?: string; score?: number | null; cell?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON match update." }, { status: 400 });
  }
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const repo = await getRepository();
  const result = body.op === "move"
    ? await playMatchMove(repo, user.profile.id, matchId, Number(body.cell))
    : body.op === "finish"
      ? await finishGameMatch(repo, user.profile.id, matchId)
      : await updateMatchProgress(
          repo,
          user.profile.id,
          matchId,
          typeof body.note === "string" ? body.note : "",
          typeof body.score === "number" ? body.score : null,
        );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ match: gameMatchView(result.data, user.profile.id) });
}
