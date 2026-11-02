import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { arcadeGame } from "@/lib/games/catalog";
import { gameMatchView, startGameMatch } from "@/lib/services/games";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to start a rematch." }, { status: 401 });

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a game slug." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!arcadeGame(slug)) return NextResponse.json({ error: "That game is not available." }, { status: 400 });

  const result = await startGameMatch(await getRepository(), user.profile.id, slug, "challenge");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ match: gameMatchView(result.data, user.profile.id) });
}
