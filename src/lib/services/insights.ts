import type { AnswerPayload, Question, UserAnswer } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { describeAnswer } from "@/lib/answers";
import { compareResponses, combineSummaries, summarize, type Comparison, type ScoreSummary } from "@/lib/scoring";
import { activeMembership, otherPartner } from "@/lib/services/access";

export type Insight = {
  id: string;
  kind: "common" | "different" | "surprise" | "ask" | "learned" | "interest";
  title: string;
  explanation: string;
  questionId: string;
};

export type ConnectionReport = {
  knowledge: ScoreSummary;
  mine: ScoreSummary;
  partnerKnowledge: ScoreSummary | null;
  preferences: ScoreSummary;
  insights: Insight[];
  partnerName: string | null;
  eligibleNotice: string | null;
};

function latest<T extends { questionId: string; updatedAt: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const current = map.get(row.questionId);
    if (!current || row.updatedAt >= current.updatedAt) map.set(row.questionId, row);
  }
  return map;
}

export async function getConnectionReport(repo: Repository, viewerId: string): Promise<ConnectionReport | null> {
  const membership = await activeMembership(repo, viewerId);
  if (!membership) return null;
  const partner = await otherPartner(repo, membership.coupleId, viewerId);
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const questions = await repo.list("questions", {});
  const options = await repo.list("questionOptions", {});
  const categories = await repo.list("questionCategories", {});
  const myAnswers = latest(await repo.list("userAnswers", { eq: { userId: viewerId, coupleId: membership.coupleId } }));
  const partnerAnswers = partner ? latest(await repo.list("userAnswers", { eq: { userId: partner.userId, coupleId: membership.coupleId } })) : new Map<string, UserAnswer>();
  const reveals = await repo.list("answerReveals", { eq: { coupleId: membership.coupleId } });
  const visible = new Set(reveals.filter((reveal) => reveal.viewerId === viewerId).map((reveal) => `${reveal.ownerId}:${reveal.questionId}`));
  const predictions = await repo.list("answerPredictions", { eq: { predictorId: viewerId, coupleId: membership.coupleId, kind: "partner" } });
  const partnerPredictions = partner
    ? await repo.list("answerPredictions", { eq: { predictorId: partner.userId, coupleId: membership.coupleId, kind: "partner" } })
    : [];
  const rounds = await repo.list("quizRounds", { eq: { coupleId: membership.coupleId, resultsShared: true } });
  const sharedRounds = new Set(rounds.map((round) => round.id));
  const marks = await repo.list("similarityMarks", { eq: { coupleId: membership.coupleId } });

  const mineComparisons: Comparison[] = [];
  const partnerComparisons: Comparison[] = [];
  const preferenceComparisons: Comparison[] = [];
  const insights: Insight[] = [];

  for (const question of questions) {
    const actual = partner ? partnerAnswers.get(question.id) : undefined;
    const visibleActual = partner && visible.has(`${partner.userId}:${question.id}`) ? actual : undefined;
    const guesses = predictions.filter((item) => item.questionId === question.id && item.subjectId === partner?.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const guess = guesses[0];
    const mark = marks.find((item) => item.questionId === question.id)?.mark ?? null;
    if (guess && visibleActual) {
      const comparison = compareResponses(question, visibleActual, guess, mark);
      mineComparisons.push(comparison);
      pushKnowledgeInsights(insights, question, comparison, partnerProfile?.displayName ?? "your partner");
    } else if (guess && !visibleActual) {
      insights.push({
        id: `ask-${question.id}`,
        kind: "ask",
        title: "Still waiting on an answer",
        explanation: "You made a guess, and there is not a shareable answer to compare it with yet.",
        questionId: question.id,
      });
    }

    if (partner) {
      const myAnswer = myAnswers.get(question.id);
      const theirGuess = partnerPredictions.filter((item) => item.questionId === question.id && item.subjectId === viewerId && sharedRounds.has(item.roundId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const theyCanSeeMe = reveals.some((reveal) => reveal.ownerId === viewerId && reveal.viewerId === partner.userId && reveal.questionId === question.id);
      if (theirGuess && myAnswer && theyCanSeeMe) {
        partnerComparisons.push(compareResponses(question, myAnswer, theirGuess, mark));
      }
      const mutual = myAnswer && visibleActual && reveals.some((reveal) => reveal.ownerId === viewerId && reveal.viewerId === partner.userId && reveal.questionId === question.id);
      if (mutual && myAnswer && visibleActual) {
        const preference = compareResponses(question, myAnswer, visibleActual, mark);
        preferenceComparisons.push(preference);
        pushPreferenceInsights(insights, question, preference, categories.find((category) => category.id === question.categoryId)?.slug ?? "", options.filter((option) => option.questionId === question.id), myAnswer.payload);
      } else if (myAnswer && !visibleActual) {
        insights.push({
          id: `ask-self-${question.id}`,
          kind: "ask",
          title: "Something to ask about",
          explanation: "You answered this, and your partner's answer is not visible yet.",
          questionId: question.id,
        });
      }
    }
  }

  const mine = summarize(mineComparisons, "knowledge");
  const partnerKnowledge = partner ? summarize(partnerComparisons, "knowledge") : null;
  const knowledge = partnerKnowledge ? combineSummaries(mine, partnerKnowledge) : mine;
  const preferences = summarize(preferenceComparisons, "preference");
  return {
    knowledge,
    mine,
    partnerKnowledge,
    preferences,
    insights: dedupe(insights).slice(0, 24),
    partnerName: partnerProfile?.displayName ?? null,
    eligibleNotice: mine.eligible < 3 ? "Not enough answers yet for a meaningful comparison. A few more shared quizzes will make this clearer." : null,
  };
}

function pushKnowledgeInsights(insights: Insight[], question: Question, comparison: Comparison, partnerName: string) {
  if (!comparison.eligible || comparison.points === 1) return;
  insights.push({
    id: `learned-${question.id}`,
    kind: "learned",
    title: "Something new about them",
    explanation: `Your guess and ${partnerName}'s answer were not the same. ${comparison.reason}`,
    questionId: question.id,
  });
  if (comparison.points === 0) {
    insights.push({
      id: `surprise-${question.id}`,
      kind: "surprise",
      title: "A surprise answer",
      explanation: `This guess missed ${partnerName}'s answer. Different answers are a chance to learn, not a verdict.`,
      questionId: question.id,
    });
  }
}

function pushPreferenceInsights(insights: Insight[], question: Question, comparison: Comparison, categorySlug: string, options: { value: string; label: string }[], sharedPayload: AnswerPayload) {
  if (!comparison.eligible) return;
  const prompt = question.selfPrompt;
  if (comparison.points === 1) {
    insights.push({
      id: `common-${question.id}`,
      kind: "common",
      title: "You have this in common",
      explanation: `You both answered “${prompt}” the same way. ${comparison.reason}`,
      questionId: question.id,
    });
    if (categorySlug === "favorites") {
      insights.push({
        id: `interest-${question.id}`,
        kind: "interest",
        title: "A shared favorite",
        explanation: `This favorite matched exactly: ${describeAnswer(question.answerType, sharedPayload, options)}.`,
        questionId: question.id,
      });
    }
  } else {
    insights.push({
      id: `different-${question.id}`,
      kind: "different",
      title: "You see this differently",
      explanation: `Your own answers are not the same. That is a difference to understand, not a problem to fix. ${comparison.reason}`,
      questionId: question.id,
    });
  }
}

function dedupe(insights: Insight[]) {
  const seen = new Set<string>();
  return insights.filter((insight) => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });
}
