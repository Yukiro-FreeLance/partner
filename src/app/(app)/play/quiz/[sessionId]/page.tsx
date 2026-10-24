import { notFound } from "next/navigation";
import { QuizPlayer, type PlayerQuestion } from "@/components/quiz-player";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { otherPartner } from "@/lib/services/access";
import { joinRound } from "@/lib/services/quiz";

export const metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const session = await repo.find("quizSessions", { eq: { id: sessionId, userId: user.profile.id } });
  if (!session) notFound();
  const view = await joinRound(repo, user.profile.id, session.roundId);
  if (!view.ok) notFound();
  if (view.data.session.status === "completed") {
    const { redirect } = await import("next/navigation");
    redirect(`/play/results/${view.data.round.id}`);
  }
  const partner = await otherPartner(repo, view.data.round.coupleId, user.profile.id);
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const categories = await repo.list("questionCategories", {});
  const questions: PlayerQuestion[] = view.data.questions.map((question) => ({
    id: question.id,
    selfPrompt: question.selfPrompt,
    guessPrompt: question.guessPrompt,
    reversePrompt: question.reversePrompt,
    answerType: question.answerType,
    sensitive: question.sensitive,
    options: question.options,
    config: question.config,
    category: categories.find((category) => category.id === question.categoryId)?.name ?? "Quiz",
    difficulty: question.difficulty,
  }));
  const initial: Record<string, { self?: { payload: typeof view.data.answers[number]["payload"]; skipped: boolean }; guess?: { payload: typeof view.data.predictions[number]["payload"]; skipped: boolean } }> = {};
  for (const answer of view.data.answers) initial[answer.questionId] = { ...initial[answer.questionId], self: { payload: answer.payload, skipped: answer.skipped } };
  for (const prediction of view.data.predictions) initial[prediction.questionId] = { ...initial[prediction.questionId], guess: { payload: prediction.payload, skipped: prediction.skipped } };
  return <QuizPlayer sessionId={view.data.session.id} mode={view.data.round.mode} title={view.data.round.title} questions={questions} partnerName={partnerProfile?.displayName ?? "your partner"} timerSeconds={view.data.round.timerSeconds} initialIndex={view.data.session.currentIndex} initial={initial} />;
}
