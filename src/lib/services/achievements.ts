import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { compareResponses } from "@/lib/scoring";
import { notifyUser } from "@/lib/services/access";

export async function grantAchievements(repo: Repository, userId: string, coupleId: string | null) {
  const [catalog, owned, sessions, snapshots, preferences, reflections, cards] = await Promise.all([
    repo.list("achievements", {}),
    repo.list("userAchievements", { eq: { userId } }),
    repo.list("quizSessions", { eq: { userId, status: "completed" } }),
    repo.list("scoreSnapshots", { eq: { userId } }),
    repo.find("userPreferences", { eq: { userId } }),
    repo.list("cardActivity", { eq: { userId, answered: true } }),
    repo.list("conversationCards", {}),
  ]);
  const ownedIds = new Set(owned.map((item) => item.achievementId));
  let points = preferences?.points ?? 0;
  const earned = new Set<string>();

  if (sessions.length > 0) earned.add("first-quiz");
  if (snapshots.some((snapshot) => snapshot.correct > 0)) earned.add("first-perfect");
  if (snapshots.reduce((sum, snapshot) => sum + snapshot.incorrect, 0) >= 10) earned.add("ten-learned");
  if ((preferences?.dailyStreak ?? 0) >= 7) earned.add("seven-day-streak");

  if (reflections.some((activity) => cards.find((card) => card.id === activity.cardId)?.depth === "emotional")) earned.add("deep-conversation");

  if (coupleId) {
    const partner = (await repo.list("coupleMembers", { eq: { coupleId, status: "active" } })).find((member) => member.userId !== userId);
    const sharedTests = await repo.list("personalityResults", { eq: { userId, shared: true } });
    if (partner) {
      const partnerShared = await repo.list("personalityResults", { eq: { userId: partner.userId, shared: true } });
      if (sharedTests.some((result) => partnerShared.some((item) => item.testId === result.testId))) earned.add("first-personality-comparison");
      const [mine, theirs] = await Promise.all([
        repo.list("userAnswers", { eq: { userId, coupleId } }),
        repo.list("userAnswers", { eq: { userId: partner.userId, coupleId } }),
      ]);
      const questions = mine.length ? await repo.list("questions", { in: { id: mine.map((answer) => answer.questionId) } }) : [];
      let shared = 0;
      for (const answer of mine) {
        const other = theirs.find((item) => item.questionId === answer.questionId && !item.skipped && !answer.skipped);
        const question = questions.find((item) => item.id === answer.questionId);
        if (!other || !question) continue;
        const comparison = compareResponses(question, answer, other);
        if (comparison.eligible && comparison.points === 1) shared += 1;
      }
      if (shared >= 5) earned.add("five-shared-interests");
    }
  }

  for (const slug of earned) {
    const achievement = catalog.find((item) => item.slug === slug);
    if (!achievement || ownedIds.has(achievement.id)) continue;
    await repo.insert("userAchievements", { id: createId(), userId, achievementId: achievement.id, coupleId, earnedAt: new Date().toISOString() });
    points += achievement.points;
    if (preferences) await repo.update("userPreferences", userId, { points });
    await notifyUser(repo, {
      userId,
      coupleId,
      type: "achievement",
      title: "Achievement unlocked",
      body: achievement.name,
      href: "/home",
    });
  }
}
