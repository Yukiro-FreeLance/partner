import Link from "next/link";
import { shareSoloAction, similarityAction, startQuizAction } from "@/app/actions";
import { CategoryChart, ScoreReveal, ShareResult } from "@/components/quiz-results";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { compareResponses, formatScore, SCORE_DISCLAIMER, summarize } from "@/lib/scoring";
import { otherPartner } from "@/lib/services/access";
import { getRoundResults, personalSummary } from "@/lib/services/quiz";

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
  const partnerSummary = partner && round.resultsShared ? await personalSummary(repo, partner.userId, round.id) : null;
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
    <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6">
      <p className="text-sm text-muted-foreground">{round.title}</p>
      <h1 className="font-serif text-4xl">What this round showed</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{summary.description} {SCORE_DISCLAIMER} A difference is a chance to learn, not a verdict about the relationship.</p>
      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <article className="panel p-5">
          <ScoreReveal score={summary.score == null ? null : Math.round(summary.score)} label={summary.label} />
          {seconds != null && <p className="mt-3 text-center text-xs text-muted-foreground">Finished in {Math.floor(seconds / 60)}m {seconds % 60}s</p>}
        </article>
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">How the guesses compared</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-secondary p-3"><dt>Matched</dt><dd className="font-serif text-2xl">{summary.correct}</dd></div>
            <div className="rounded-2xl bg-secondary p-3"><dt>Close</dt><dd className="font-serif text-2xl">{summary.close}</dd></div>
            <div className="rounded-2xl bg-secondary p-3"><dt>Different</dt><dd className="font-serif text-2xl">{summary.incorrect}</dd></div>
            <div className="rounded-2xl bg-secondary p-3"><dt>Counted</dt><dd className="font-serif text-2xl">{summary.eligible}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Skipped, private, and written answers stay out of the percentage until they can be compared. Subjective preferences are not marked right or wrong. The percentage is how close a guess was to a visible answer.</p>
        </article>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <h2 className="font-serif text-2xl">You and {partnerName ?? "your partner"}</h2>
          <p className="mt-2 text-sm">Your prediction accuracy: {formatScore(summary.score)}</p>
          <p className="text-sm">{partnerSummary ? `${partnerName ?? "Your partner"}'s prediction accuracy: ${formatScore(partnerSummary.score)}` : "Their score appears after they finish and the reveal rules allow it."}</p>
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
        <h2 className="font-serif text-2xl">Review answers</h2>
        <ol className="mt-4 grid gap-3">
          {questions.map((item) => (
            <li key={item.question.id} className="rounded-3xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{categories.find((category) => category.id === item.question.categoryId)?.name}</p>
              <p className="font-medium">{item.question.selfPrompt}</p>
              <p className="mt-2 text-sm">You said: {item.mineLabel}</p>
              {item.predictionLabel && <p className="text-sm">Your guess: {item.predictionLabel}</p>}
              {item.partnerLabel ? <p className="text-sm">{partnerName ?? "Partner"} answered: {item.partnerLabel}</p> : <p className="text-sm text-muted-foreground">Their answer is not visible yet.</p>}
              {item.comparison && <p className="mt-2 text-xs text-muted-foreground">{item.comparison.eligible ? `${Math.round(item.comparison.points * 100)}% · ${item.comparison.reason}` : item.comparison.reason === "unscored_text" ? "Written answers stay unscored until you mark them." : "Not counted."}</p>}
              {item.comparison?.reason === "unscored_text" && (
                <form action={similarityAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="questionId" value={item.question.id} />
                  <Button name="mark" value="similar" variant="outline" size="sm">Similar</Button>
                  <Button name="mark" value="partial" variant="outline" size="sm">Partly similar</Button>
                  <Button name="mark" value="different" variant="outline" size="sm">Different</Button>
                </form>
              )}
            </li>
          ))}
        </ol>
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
