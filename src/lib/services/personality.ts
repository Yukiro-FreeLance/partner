import type { AnswerPayload, PersonalityQuestion, PersonalityResult, PersonalityTest } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";
import { activeMembership, notifyUser, otherPartner } from "@/lib/services/access";
import { grantAchievements } from "@/lib/services/achievements";

const copy: Record<string, { low: string; high: string; meaning: string }> = {
  social: { low: "You often recharge in quieter settings.", high: "You often feel energized around people.", meaning: "Social energy can change with the week. Neither side is more loving." },
  planning: { low: "You leave room for a plan to change.", high: "A plan helps you relax.", meaning: "Planning and spontaneity can take turns in the same relationship." },
  decisions: { low: "Feelings and context matter when you choose.", high: "Practical details help you choose.", meaning: "Both ways of deciding can be thoughtful." },
  imagination: { low: "You tend to start from what is practical.", high: "You like room for imagination.", meaning: "Practical and imaginative are styles, not ranks." },
  communication: { low: "You may want a moment before speaking.", high: "You like to talk while the feeling is present.", meaning: "Timing is a preference you can name." },
  words: { low: "Words are not the main way care lands for you.", high: "Specific words of appreciation matter to you.", meaning: "Wanting words does not mean other kinds of care are unwelcome." },
  time: { low: "Time together is one part of care, not the whole story.", high: "Unhurried time is especially meaningful.", meaning: "Quality time can be quiet. It does not have to be an event." },
  gestures: { low: "Gestures are pleasant, not essential.", high: "Thoughtful gestures stay with you.", meaning: "A gesture can be small." },
  help: { low: "Practical help is not your first signal of care.", high: "Helpful actions can feel deeply caring.", meaning: "Help lands best when it is wanted." },
  closeness: { low: "Closeness is welcome only when it is chosen.", high: "Appropriate closeness is one way you feel connected.", meaning: "Physical affection should stay consensual and specific to what you want." },
  direct: { low: "A softer ramp into a topic can help.", high: "Kind directness helps you understand the point.", meaning: "Direct does not have to mean harsh." },
  pause: { low: "You can often answer in the moment.", high: "A pause helps you answer more honestly.", meaning: "Taking time is not the same as refusing to talk." },
  reassurance: { low: "Reassurance is occasional for you.", high: "Words that steady you are useful.", meaning: "Asking for reassurance is allowed." },
  listening: { low: "You may want a path toward a fix.", high: "You want to be heard before anyone solves it.", meaning: "Listening and problem-solving can happen in sequence." },
  timing: { low: "You may not want to talk at the peak of a disagreement.", high: "You usually want to talk sooner.", meaning: "Soon and later can both be respectful if you agree on a time." },
  repair: { low: "Repair for you may be quieter than a speech.", high: "A clear apology and a change matter.", meaning: "An apology is about care and responsibility, not winning." },
  trust: { low: "Trust for you may be about more than follow-through alone.", high: "Consistent follow-through rebuilds trust.", meaning: "Trust is personal. This is not a diagnosis." },
  space: { low: "You may like a lot of togetherness.", high: "Personal space helps you stay close.", meaning: "Space can be a way of taking care of the relationship." },
  privacy: { low: "You may share thoughts as they happen.", high: "Some things stay private until you choose them.", meaning: "Privacy is not secrecy by default. You decide what to share." },
  sharedDecisions: { low: "Some decisions can stay individual.", high: "Important decisions feel better when they are shared.", meaning: "Mutual decisions work best when both people can say what they need." },
};

function scoreValue(question: PersonalityQuestion, payload: AnswerPayload) {
  if (question.answerType === "multi") return null;
  const raw = payload.scale ?? Number(payload.choice);
  if (!Number.isFinite(raw)) return null;
  const value = question.reverse ? 6 - raw : raw;
  return ((value - 1) / 4) * 100;
}

export function scorePersonality(questions: PersonalityQuestion[], answers: { questionId: string; payload: AnswerPayload; skipped: boolean }[]) {
  const buckets = new Map<string, number[]>();
  for (const question of questions) {
    const answer = answers.find((item) => item.questionId === question.id && !item.skipped);
    if (!answer) continue;
    if (question.answerType === "multi") {
      for (const choice of answer.payload.choices ?? []) {
        const option = question.options.find((item) => item.value === choice);
        const dimension = option?.dimension ?? choice;
        buckets.set(dimension, [...(buckets.get(dimension) ?? []), 100]);
      }
      continue;
    }
    const value = scoreValue(question, answer.payload);
    if (value === null) continue;
    buckets.set(question.dimension, [...(buckets.get(question.dimension) ?? []), value]);
  }
  const scores: Record<string, number> = {};
  for (const [dimension, values] of buckets) {
    scores[dimension] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  const lines = Object.entries(scores).map(([dimension, score]) => {
    const text = copy[dimension];
    if (!text) return `${dimension}: ${score}`;
    return `${score >= 60 ? text.high : text.low} ${text.meaning}`;
  });
  const summary = lines.length
    ? lines.join(" ")
    : "There is not enough here for a reflection yet. You can answer a few more prompts or skip the ones that do not fit.";
  const suggestions = [
    "Tell your partner which sentence sounds most like you, and which one they should not assume.",
    "Ask what kind of care would feel good this week, without treating a high score as a permanent job.",
    "If a result feels off, your own correction matters more than the score.",
  ];
  return { scores, summary, suggestions };
}

export function dimensionLabel(dimension: string) {
  return copy[dimension]?.meaning ?? "A preference, not a diagnosis.";
}

export async function startPersonality(repo: Repository, userId: string, slug: string) {
  const test = await repo.find("personalityTests", { eq: { slug, isActive: true } });
  if (!test) return fail("That reflection is not available.");
  const membership = await activeMembership(repo, userId);
  const existing = (await repo.list("personalitySessions", { eq: { userId, testId: test.id, status: "in_progress" } }))[0];
  const session = existing ?? (await repo.insert("personalitySessions", {
    id: createId(),
    testId: test.id,
    userId,
    coupleId: membership?.coupleId ?? null,
    status: "in_progress",
    currentIndex: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }));
  const questions = (await repo.list("personalityQuestions", { eq: { testId: test.id } })).sort((a, b) => a.sortOrder - b.sortOrder);
  const answers = await repo.list("personalityAnswers", { eq: { sessionId: session.id } });
  return ok({ test, session, questions, answers });
}

export async function savePersonalityAnswer(repo: Repository, userId: string, sessionId: string, questionId: string, payload: AnswerPayload, skipped: boolean) {
  const session = await repo.find("personalitySessions", { eq: { id: sessionId, userId } });
  if (!session || session.status === "completed") return fail("This reflection is closed.");
  const existing = await repo.find("personalityAnswers", { eq: { sessionId, questionId } });
  if (existing) await repo.update("personalityAnswers", existing.id, { payload, skipped, updatedAt: new Date().toISOString() });
  else {
    await repo.insert("personalityAnswers", { id: createId(), sessionId, questionId, userId, payload, skipped, updatedAt: new Date().toISOString() });
  }
  return ok({ saved: true });
}

export async function completePersonality(repo: Repository, userId: string, sessionId: string): Promise<Result<PersonalityResult>> {
  const session = await repo.find("personalitySessions", { eq: { id: sessionId, userId, status: "in_progress" } });
  if (!session) return fail("Reflection not found.");
  const questions = await repo.list("personalityQuestions", { eq: { testId: session.testId } });
  const answers = await repo.list("personalityAnswers", { eq: { sessionId } });
  if (answers.length === 0) return fail("Answer or skip at least one prompt.");
  const scored = scorePersonality(questions, answers);
  await repo.update("personalitySessions", session.id, { status: "completed", completedAt: new Date().toISOString(), currentIndex: questions.length });
  const result: PersonalityResult = {
    id: createId(),
    sessionId,
    testId: session.testId,
    userId,
    coupleId: session.coupleId,
    scores: scored.scores,
    summary: scored.summary,
    suggestions: scored.suggestions,
    shared: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await repo.insert("personalityResults", result);
  const preferences = await repo.find("userPreferences", { eq: { userId } });
  if (preferences) await repo.update("userPreferences", userId, { points: preferences.points + 25 });
  if (session.coupleId) await grantAchievements(repo, userId, session.coupleId);
  return ok(result);
}

export async function setPersonalityShared(repo: Repository, userId: string, resultId: string, shared: boolean) {
  const result = await repo.find("personalityResults", { eq: { id: resultId, userId } });
  if (!result) return fail("Result not found.");
  const updated = await repo.update("personalityResults", result.id, { shared, updatedAt: new Date().toISOString() });
  if (shared && result.coupleId) {
    const partner = await otherPartner(repo, result.coupleId, userId);
    const profile = await repo.find("profiles", { eq: { id: userId } });
    if (partner) {
      await notifyUser(repo, {
        userId: partner.userId,
        coupleId: result.coupleId,
        type: "personality_shared",
        title: "A reflection was shared",
        body: `${profile?.displayName ?? "Your partner"} chose to share a personality reflection. The details are in the app, not in this notification.`,
        href: "/connection/personality",
      });
    }
    await grantAchievements(repo, userId, result.coupleId);
  }
  return ok(updated);
}

export async function personalityComparison(repo: Repository, userId: string, slug: string) {
  const test = await repo.find("personalityTests", { eq: { slug } });
  if (!test) return fail("Reflection not found.");
  const membership = await activeMembership(repo, userId);
  const mine = (await repo.list("personalityResults", { eq: { userId, testId: test.id } })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const partner = membership ? await otherPartner(repo, membership.coupleId, userId) : null;
  const partnerResult = partner
    ? (await repo.list("personalityResults", { eq: { userId: partner.userId, testId: test.id, shared: true } })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    : null;
  const visiblePartner = mine?.shared ? partnerResult : null;
  return ok({ test, mine, partner: visiblePartner, partnerName: partner ? (await repo.find("profiles", { eq: { id: partner.userId } }))?.displayName ?? null : null });
}

export type { PersonalityTest };
