import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, Question, QuestionCategory, UserPreferences } from "@/lib/domain";
import { completeQuiz, getOrCreateDaily, getRoundResults, saveQuizProgress, startQuiz } from "@/lib/services/quiz";
import { acceptInvitation, createCouple } from "@/lib/services/couples";

function profile(id: string, name: string): Profile {
  const stamp = "2026-01-01T00:00:00.000Z";
  return {
    id,
    email: `${id}@example.com`,
    displayName: name,
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: "dating",
    relationshipStartedOn: "2024-02-14",
    interests: [],
    preferredCategories: [],
    role: "user",
    isDemo: false,
    emailVerified: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function preferences(userId: string): UserPreferences {
  return {
    userId,
    theme: "light",
    locale: "en",
    emailNotifications: false,
    inAppNotifications: true,
    reminderHour: null,
    streakPaused: false,
    reducedMotion: false,
    dailyStreak: 0,
    lastDailyOn: null,
    points: 0,
    recentCardIds: [],
    onboardingStep: "done",
    onboardingCompleted: true,
  };
}

async function fixture() {
  const repo = createMemoryRepository();
  const stamp = "2026-01-01T00:00:00.000Z";
  await repo.insert("profiles", profile("a", "Avery"));
  await repo.insert("profiles", profile("b", "Blair"));
  await repo.insert("profiles", profile("c", "Casey"));
  for (const id of ["a", "b", "c"]) await repo.insert("userPreferences", preferences(id));
  const category: QuestionCategory = { id: "favorites", slug: "favorites", name: "Favorites", description: "", sortOrder: 1, sensitive: false };
  await repo.insert("questionCategories", category);
  const color: Question = {
    id: "color",
    categoryId: "favorites",
    slug: "favorite-color",
    selfPrompt: "What is your favorite color?",
    guessPrompt: "What is their favorite color?",
    reversePrompt: "What would they guess?",
    answerType: "single",
    difficulty: "easy",
    sensitive: false,
    isActive: true,
    isSystem: true,
    visibility: "public",
    coupleId: null,
    createdBy: null,
    scoringRule: "exact",
    config: {},
    sortOrder: 1,
    locale: "en",
    dependsOn: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const food: Question = { ...color, id: "food", slug: "favorite-food", selfPrompt: "Favorite food?", guessPrompt: "Their favorite food?", sortOrder: 2 };
  const secret: Question = { ...color, id: "secret", slug: "secret", sensitive: true, selfPrompt: "A private preference?", guessPrompt: "Their private preference?", sortOrder: 3 };
  await repo.insert("questions", color);
  await repo.insert("questions", food);
  await repo.insert("questions", secret);
  for (const questionId of ["color", "food", "secret"]) {
    await repo.insert("questionOptions", { id: `${questionId}-blue`, questionId, label: "Blue", value: "blue", imageUrl: null, sortOrder: 1 });
    await repo.insert("questionOptions", { id: `${questionId}-green`, questionId, label: "Green", value: "green", imageUrl: null, sortOrder: 2 });
  }
  const created = await createCouple(repo, "a", { name: "Us" });
  if (!created.ok) throw new Error(created.error);
  await acceptInvitation(repo, "b", created.data.invitation.code);
  return { repo, coupleId: created.data.couple.id };
}

describe("quiz scoring and privacy", () => {
  it("hides partner answers until both finish, then scores predictions separately from self answers", async () => {
    const { repo } = await fixture();
    const started = await startQuiz(repo, "a", { mode: "exchange", questionIds: ["color", "food"], size: 2 });
    if (!started.ok) throw new Error(started.error);
    await saveQuizProgress(repo, "a", { sessionId: started.data.session.id, questionId: "color", currentIndex: 1, selfAnswer: { payload: { choice: "blue" }, skipped: false }, prediction: { payload: { choice: "green" }, skipped: false } });
    await saveQuizProgress(repo, "a", { sessionId: started.data.session.id, questionId: "food", currentIndex: 2, selfAnswer: { payload: { choice: "blue" }, skipped: false }, prediction: { payload: { choice: "blue" }, skipped: true } });
    await completeQuiz(repo, "a", started.data.session.id);

    const early = await getRoundResults(repo, "a", started.data.round.id);
    if (!early.ok) throw new Error(early.error);
    expect(early.data.questions.every((item) => item.partnerAnswer === null)).toBe(true);
    expect(early.data.summary.score).toBeNull();

    const joined = await startQuiz(repo, "b", { mode: "exchange", roundId: started.data.round.id });
    if (!joined.ok) throw new Error(joined.error);
    await saveQuizProgress(repo, "b", { sessionId: joined.data.session.id, questionId: "color", currentIndex: 1, selfAnswer: { payload: { choice: "green" }, skipped: false }, prediction: { payload: { choice: "blue" }, skipped: false } });
    await saveQuizProgress(repo, "b", { sessionId: joined.data.session.id, questionId: "food", currentIndex: 2, selfAnswer: { payload: { choice: "green" }, skipped: false }, prediction: { payload: { choice: "green" }, skipped: false } });
    const finished = await completeQuiz(repo, "b", joined.data.session.id);
    expect(finished.ok).toBe(true);

    const avery = await getRoundResults(repo, "a", started.data.round.id);
    const blair = await getRoundResults(repo, "b", started.data.round.id);
    if (!avery.ok || !blair.ok) throw new Error("results missing");
    expect(avery.data.summary.eligible).toBe(1);
    expect(avery.data.summary.score).toBe(100);
    expect(blair.data.summary.eligible).toBe(2);
    expect(blair.data.summary.score).toBe(50);
    expect(avery.data.questions[0]?.partnerLabel).toBe("Green");
    const outsider = await getRoundResults(repo, "c", started.data.round.id);
    expect(outsider.ok).toBe(false);
  });

  it("scores a finished partner answer from another round of the same questions", async () => {
    const { repo } = await fixture();
    const theirs = await startQuiz(repo, "b", { mode: "exchange", questionIds: ["color"], includeSensitive: true, size: 1 });
    if (!theirs.ok) throw new Error(theirs.error);
    await saveQuizProgress(repo, "b", { sessionId: theirs.data.session.id, questionId: "color", currentIndex: 1, selfAnswer: { payload: { choice: "green" }, skipped: false }, prediction: { payload: { choice: "blue" }, skipped: false } });
    expect((await completeQuiz(repo, "b", theirs.data.session.id)).ok).toBe(true);

    const mine = await startQuiz(repo, "a", { mode: "exchange", questionIds: ["color"], includeSensitive: true, size: 1 });
    if (!mine.ok) throw new Error(mine.error);
    expect(mine.data.round.id).not.toBe(theirs.data.round.id);
    await saveQuizProgress(repo, "a", { sessionId: mine.data.session.id, questionId: "color", currentIndex: 1, selfAnswer: { payload: { choice: "blue" }, skipped: false }, prediction: { payload: { choice: "green" }, skipped: false } });
    expect((await completeQuiz(repo, "a", mine.data.session.id)).ok).toBe(true);

    const view = await getRoundResults(repo, "a", mine.data.round.id);
    if (!view.ok) throw new Error(view.error);
    expect(view.data.questions[0]?.partnerLabel).toBe("Green");
    expect(view.data.summary.score).toBe(100);
    expect(view.data.summary.eligible).toBe(1);
  });

  it("reveals a sensitive answer after both people finish", async () => {
    const { repo } = await fixture();
    const started = await startQuiz(repo, "a", { mode: "exchange", questionIds: ["secret"], includeSensitive: true, size: 1 });
    if (!started.ok) throw new Error(started.error);
    await saveQuizProgress(repo, "a", { sessionId: started.data.session.id, questionId: "secret", currentIndex: 1, selfAnswer: { payload: { choice: "blue", shareWithPartner: false }, skipped: false }, prediction: { payload: { choice: "blue" }, skipped: false } });
    await completeQuiz(repo, "a", started.data.session.id);
    const joined = await startQuiz(repo, "b", { mode: "exchange", roundId: started.data.round.id });
    if (!joined.ok) throw new Error(joined.error);
    await saveQuizProgress(repo, "b", { sessionId: joined.data.session.id, questionId: "secret", currentIndex: 1, selfAnswer: { payload: { choice: "green", shareWithPartner: true }, skipped: false }, prediction: { payload: { choice: "blue" }, skipped: false } });
    await completeQuiz(repo, "b", joined.data.session.id);
    const view = await getRoundResults(repo, "b", started.data.round.id);
    if (!view.ok) throw new Error(view.error);
    expect(view.data.questions[0]?.partnerLabel).toBeTruthy();
    expect(view.data.summary.score).toBe(100);
  });

  it("keeps one daily round and one reward for the same Manila day", async () => {
    const { repo } = await fixture();
    const first = await getOrCreateDaily(repo, "a");
    const second = await getOrCreateDaily(repo, "a");
    if (!first.ok || !second.ok) throw new Error("daily missing");
    expect(second.data.round.id).toBe(first.data.round.id);
    expect(first.data.questions.length).toBeGreaterThan(0);
    expect(first.data.questions.length).toBeLessThanOrEqual(5);
    for (const question of first.data.questions) {
      await saveQuizProgress(repo, "a", {
        sessionId: first.data.session.id,
        questionId: question.id,
        currentIndex: 1,
        selfAnswer: { payload: { choice: "blue" }, skipped: false },
        prediction: { payload: { choice: "green" }, skipped: false },
      });
    }
    expect((await completeQuiz(repo, "a", first.data.session.id)).ok).toBe(true);
    const after = await repo.find("userPreferences", { eq: { userId: "a" } });
    expect((await completeQuiz(repo, "a", first.data.session.id)).ok).toBe(false);
    const again = await getOrCreateDaily(repo, "a");
    if (!again.ok) throw new Error(again.error);
    expect(again.data.round.id).toBe(first.data.round.id);
    expect(again.data.session.status).toBe("completed");
    const prefs = await repo.find("userPreferences", { eq: { userId: "a" } });
    expect(prefs?.points).toBe(after?.points);
    expect(prefs?.points).toBeGreaterThanOrEqual(5);
    expect(prefs?.lastDailyOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("refuses intimacy questions without an adult opt-in", async () => {
    const { repo } = await fixture();
    const blocked = await startQuiz(repo, "a", { mode: "exchange", categories: ["intimacy"], includeSensitive: false, size: 3 });
    expect(blocked.ok).toBe(false);
  });
});
