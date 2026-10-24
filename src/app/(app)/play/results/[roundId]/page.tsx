import Link from "next/link";
import { shareSoloAction, similarityAction, startQuizAction } from "@/app/actions";
import { CategoryChart, ScoreReveal, ShareResult } from "@/components/quiz-results";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { compareResponses, formatScore, SCORE_DISCLAIMER, summarize } from "@/lib/scoring";
import { otherPartner } from "@/lib/services/access";
import { getRoundResults } from "@/lib/services/quiz";

export const metadata = { title: "Quiz results" };

export default async function ResultsPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const results = await getRoundResults(repo, user.profile.id, roundId);
  if (!results.ok) return <main className="mx-auto max-w-3xl p-6"><h1 className="font-serif text-4xl">{results.error}</h1><Link href="/play" className="mt-4 inline-flex min-h-11 items-center text-sm underline">Back to Play</Link></main>;
  const { round, session, summary, questions, partnerName } = results.data;
  const categories = await repo.list("questionCategories", {});
  const partner = await otherPartner(repo, round.coupleId, user.profile.id);
  const partnerKnowledge = summarize(questions.flatMap((item) => {
    if (!item.mine || !item.partnerPrediction || item.mine.skipped || item.partnerPrediction.skipped) return [];
    return [compareResponses(item.question, { payload: item.mine.payload, skipped: false }, { payload: item.partnerPrediction.payload, skipped: false })];
  }));
  const storedPartnerSummary = partner && partnerKnowledge.eligible === 0 ? (await repo.list("scoreSnapshots", { eq: { userId: partner.userId, roundId: round.id } }))[0] ?? null : null;
  const partnerScore = partnerKnowledge.eligible > 0 ? partnerKnowledge.score : storedPartnerSummary?.score ?? null;
  const waiting = questions.filter((item) => item.myPrediction && !item.myPrediction.skipped && !item.partnerAnswer).length;
  const preference = summarize(questions.flatMap((item) => {
    if (!item.mine || !item.partnerAnswer || item.mine.skipped || item.partnerAnswer.skipped) return [];
    return [compareResponses(item.question, { payload: item.partnerAnswer.payload, skipped: false }, { payload: item.mine.payload, skipped: false })];
  }), "preference");
  const byCategory = new Map<string, { points: number; count: number }>();
  for (const item of questions) {
    if (!item.comparison?.eligible) continue;
    const name = categories.find((category) => category.id === item.question.categoryId)?.name ?? "Quiz";
    const current = byCategory.get(name) ?? { points: 0, count: 0 };
    current.points += item.comparison.points;
    current.count += 1;
    byCategory.set(name, current);
  }
  const chart = [...byCategory.entries()].map(([name, value]) => ({ name, score: Math.round((value.points / value.count) * 100) }));
  const snapshots = (await repo.list("scoreSnapshots", { eq: { userId: user.profile.id } })).filter((item) => item.roundId !== round.id && item.score != null);
  const previous = snapshots.length ? Math.round(snapshots.reduce((sum, item) => sum + (item.score ?? 0), 0) / snapshots.length) : null;
  const achievements = await repo.list("userAchievements", { eq: { userId: user.profile.id } });
  const catalog = await repo.list("achievements", {});
  const seconds = session?.completedAt ? Math.max(0, Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 1000)) : null;
  const share = [
    round.title,
    summary.score == null ? "Not enough comparable answers yet." : `Knowledge score: ${formatScore(summary.score)} (${summary.label}).`,
    SCORE_DISCLAIMER,
    ...questions.filter((item) => item.mine).map((item) => `I answered: ${item.question.selfPrompt} — ${item.mineLabel}`),
  ].join("\n");
  const starters = questions.filter((item) => item.comparison && item.comparison.eligible && item.comparison.points < 1).slice(0, 3);

  return (
    <main className="grid w-full gap-4 px-4 py-6 lg:px-8">
      <p className="text-sm text-muted-foreground">{round.title}</p>
      <h1 className="font-serif text-4xl">What this round showed</h1>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{summary.eligible > 0 ? `You matched ${summary.correct} of ${summary.eligible} scored guesses.` : waiting > 0 ? `${waiting} guess${waiting === 1 ? "" : "es"} ${waiting === 1 ? "is" : "are"} saved and waiting on ${partnerName ?? "your partner"}.` : summary.description} {SCORE_DISCLAIMER}</p>
      {session?.status !== "completed" && (
        <form action={startQuizAction} className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">Your partner can already be finished. Add your answers to open the review.</p>
          <input type="hidden" name="roundId" value={round.id} />
          <Button type="submit">{session ? "Continue this quiz" : "Play this quiz"}</Button>
        </form>
      )}
      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <article className="panel p-5">
          <ScoreReveal score={summary.score == null ? null : Math.round(summary.score)} label={summary.label} />
          {seconds != null && <p className="mt-3 text-center text-xs text-muted-foreground">Finished in {Math.floor(seconds / 60)}m {seconds % 60}s</p>}
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">How the guesses compared</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-emerald-50 p-3"><dt>Matched</dt><dd className="font-serif text-2xl text-emerald-700">{summary.correct}</dd></div>
            <div className="rounded-2xl bg-amber-50 p-3"><dt>Close</dt><dd className="font-serif text-2xl text-amber-700">{summary.close}</dd></div>
            <div className="rounded-2xl bg-rose-50 p-3"><dt>Different</dt><dd className="font-serif text-2xl text-rose-700">{summary.incorrect}</dd></div>
            <div className="rounded-2xl bg-[#f3e8ff] p-3"><dt>Counted</dt><dd className="font-serif text-2xl text-primary">{summary.eligible}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{waiting > 0 ? `${waiting} still waiting on ${partnerName ?? "your partner"}. ` : ""}Skipped and written answers stay out of the percentage until they can be compared. The percentage is how close a guess was to their finished answer.</p>
        </article>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Answer by answer</h2>
        <ol className="mt-4 grid gap-3 lg:grid-cols-2">
          {questions.map((item) => {
            const mark = answerMark(item);
            return (
              <li key={item.question.id} className={`rounded-[1.75rem] border p-4 ${mark.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{categories.find((category) => category.id === item.question.categoryId)?.name}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${mark.badge}`}>{mark.label}</span>
                </div>
                <p className="mt-2 font-medium leading-6">{item.question.selfPrompt}</p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-3"><dt className="text-xs text-muted-foreground">You said</dt><dd className="mt-1 font-medium">{item.mineLabel}</dd></div>
                  <div className="rounded-2xl bg-white/80 p-3"><dt className="text-xs text-muted-foreground">You guessed</dt><dd className="mt-1 font-medium">{item.predictionLabel ?? "No guess yet"}</dd></div>
                  <div className="rounded-2xl bg-white/80 p-3"><dt className="text-xs text-muted-foreground">{partnerName ?? "Partner"} said</dt><dd className="mt-1 font-medium">{item.partnerLabel ?? "Waiting on their finished answer"}</dd></div>
                </dl>
                {item.comparison?.reason === "unscored_text" && (
                  <form action={similarityAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="questionId" value={item.question.id} />
                    <Button name="mark" value="similar" variant="outline" size="sm">Similar</Button>
                    <Button name="mark" value="partial" variant="outline" size="sm">Partly similar</Button>
                    <Button name="mark" value="different" variant="outline" size="sm">Different</Button>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">You and {partnerName ?? "your partner"}</h2>
          <p className="mt-2 text-sm">Your prediction accuracy: {formatScore(summary.score)}</p>
          <p className="text-sm">{partnerScore != null ? `${partnerName ?? "Your partner"}'s prediction accuracy: ${formatScore(partnerScore)}` : `${partnerName ?? "Your partner"}'s score appears after they finish a guess about you.`}</p>
          <p className="mt-3 text-sm">Preference alignment: {formatScore(preference.score)}. {preference.description}</p>
          {previous != null && summary.score != null && <p className="mt-3 text-sm text-muted-foreground">Your earlier counted rounds averaged {previous}%. This round is {Math.round(summary.score)}%.</p>}
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">By category</h2>
          <div className="mt-4"><CategoryChart rows={chart} /></div>
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Worth asking about</h2>
          {starters.map((item) => <p key={item.question.id} className="mt-3 text-sm">Ask about: {item.question.selfPrompt}</p>)}
          {!starters.length && <p className="mt-3 text-sm text-muted-foreground">Nothing here is waiting on a difference. You can still ask what surprised you.</p>}
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">Points and badges</h2>
          <p className="mt-2 text-sm">{summary.points} counted points in this comparison. Badges are for showing up, not for a perfect score.</p>
          <ul className="mt-3 flex flex-wrap gap-2">{achievements.map((item) => <li key={item.id} className="rounded-full bg-secondary px-3 py-1 text-xs">{catalog.find((achievement) => achievement.id === item.achievementId)?.name}</li>)}</ul>
          {!achievements.length && <p className="mt-2 text-sm text-muted-foreground">Finish a round to earn the first badge.</p>}
        </article>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Share a card</h2>
        <p className="mt-2 text-sm text-muted-foreground">The copy stays on your device. Partner answers are left out.</p>
        <div className="mt-3"><ShareResult summary={share} /></div>
      </section>
      <div className="flex flex-wrap gap-3">
        {round.mode === "solo" && !round.resultsShared && <form action={shareSoloAction.bind(null, round.id)}><Button type="submit" variant="secondary">Share this practice round</Button></form>}
        {round.mode !== "daily" && (
          <form action={startQuizAction}>
            <input type="hidden" name="mode" value={round.mode} />
            <input type="hidden" name="size" value={String(round.size)} />
            <input type="hidden" name="title" value={round.title} />
            <input type="hidden" name="difficulty" value={round.difficulty} />
            {round.categories.map((category) => <input key={category} type="hidden" name="categories" value={category} />)}
            {round.includeSensitive && <input type="hidden" name="includeSensitive" value="on" />}
            {round.categories.includes("intimacy") && <input type="hidden" name="adult" value="on" />}
            <Button type="submit" variant="outline">Retake this kind of quiz</Button>
          </form>
        )}
        <Link href="/connection" className="inline-flex min-h-11 items-center text-sm underline">Open the connection report</Link>
        <Link href="/play" className="inline-flex min-h-11 items-center text-sm underline">Back to Play</Link>
      </div>
    </main>
  );
}

function answerMark(item: { partnerAnswer: { skipped: boolean } | null; myPrediction: { skipped: boolean } | null; comparison: { eligible: boolean; points: number } | null }) {
  if (!item.partnerAnswer) return { label: "Waiting", badge: "bg-[#f3e8ff] text-primary", card: "border-[#f1e7f6] bg-white" };
  if (item.partnerAnswer.skipped || item.myPrediction?.skipped) return { label: "Skipped", badge: "bg-secondary text-muted-foreground", card: "border-[#f1e7f6] bg-white" };
  if (item.comparison?.eligible && item.comparison.points === 1) return { label: "Matched", badge: "bg-emerald-100 text-emerald-800", card: "border-emerald-200 bg-[#f3fff8]" };
  if (item.comparison?.eligible && item.comparison.points > 0) return { label: "Close", badge: "bg-amber-100 text-amber-900", card: "border-amber-200 bg-[#fffaf0]" };
  if (item.comparison?.eligible) return { label: "Different", badge: "bg-rose-100 text-rose-800", card: "border-rose-200 bg-[#fff5f8]" };
  return { label: "Saved", badge: "bg-secondary text-primary", card: "border-[#f1e7f6] bg-white" };
}
