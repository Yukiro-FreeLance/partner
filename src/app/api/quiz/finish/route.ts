import { NextResponse } from "next/server";
import type { AnswerPayload } from "@/lib/domain";
import { readEffectiveUserId } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { completeQuiz, saveQuizBatch } from "@/lib/services/quiz";

type Draft = { payload: AnswerPayload; skipped: boolean };

export async function POST(request: Request) {
  const userId = await readEffectiveUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to submit." }, { status: 401 });
  const input = (await request.json()) as {
    sessionId: string;
    currentIndex: number;
    answers?: { questionId: string; selfAnswer?: Draft | null; prediction?: Draft | null }[];
  };
  const repo = await getRepository();
  if (input.answers?.length) {
    const saved = await saveQuizBatch(repo, userId, { sessionId: input.sessionId, currentIndex: input.currentIndex, answers: input.answers });
    if (!saved.ok) return NextResponse.json({ error: saved.error });
    if (saved.data.added.length) return NextResponse.json({ added: saved.data.added });
  }
  const result = await completeQuiz(repo, userId, input.sessionId);
  if (!result.ok) return NextResponse.json({ error: result.error });
  return NextResponse.json({ roundId: result.data.roundId });
}
