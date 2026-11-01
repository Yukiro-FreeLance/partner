import { NextResponse } from "next/server";
import { readEffectiveUserId } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { saveQuizProgress } from "@/lib/services/quiz";

export async function POST(request: Request) {
  const userId = await readEffectiveUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in to save." }, { status: 401 });
  const input = await request.json();
  const repo = await getRepository();
  return NextResponse.json(await saveQuizProgress(repo, userId, input));
}
