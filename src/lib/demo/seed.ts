import { compare, hash } from "bcryptjs";
import { superAdminEmails } from "@/lib/config";
import type { UserPreferences } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { achievements, categories, challenges, conversationCards, personalityQuestions, personalityTests, questionOptions, questions, quizTemplates } from "@/lib/content/catalog";
import { calendarDay } from "@/lib/cycle/dates";
import { fictionalCycleSample } from "@/lib/cycle/sample";
import { createId, stableId } from "@/lib/ids";
import { acceptInvitation, createCouple } from "@/lib/services/couples";
import { completePersonality, savePersonalityAnswer, setPersonalityShared, startPersonality } from "@/lib/services/personality";
import { completeQuiz, saveQuizProgress, startQuiz } from "@/lib/services/quiz";

export const DEMO_MAYA_EMAIL = "maya@demo.couplesync.local";
export const DEMO_JORDAN_EMAIL = "jordan@demo.couplesync.local";

const choice = (value: string) => ({ payload: { choice: value }, skipped: false });
const multi = (values: string[]) => ({ payload: { choices: values }, skipped: false });
const text = (value: string) => ({ payload: { text: value }, skipped: false });

const script: Record<string, { maya: { payload: { choice?: string; choices?: string[]; text?: string }; skipped: boolean }; jordan: { payload: { choice?: string; choices?: string[]; text?: string }; skipped: boolean }; mayaGuess: { payload: { choice?: string; choices?: string[]; text?: string }; skipped: boolean }; jordanGuess: { payload: { choice?: string; choices?: string[]; text?: string }; skipped: boolean } }> = {
  "favorite-color": { maya: choice("blue"), jordan: choice("green"), mayaGuess: choice("blue"), jordanGuess: choice("blue") },
  "favorite-food": { maya: choice("pasta"), jordan: choice("adobo"), mayaGuess: choice("adobo"), jordanGuess: choice("pasta") },
  "favorite-drink": { maya: choice("iced-coffee"), jordan: choice("hot-chocolate"), mayaGuess: choice("hot-chocolate"), jordanGuess: choice("tea") },
  "favorite-season": { maya: choice("rainy-season"), jordan: choice("rainy-season"), mayaGuess: choice("rainy-season"), jordanGuess: choice("rainy-season") },
  "morning-night": { maya: choice("night-owl"), jordan: choice("morning-person"), mayaGuess: choice("morning-person"), jordanGuess: choice("night-owl") },
  weekends: { maya: multi(["quiet-time", "food"]), jordan: multi(["quiet-time", "food"]), mayaGuess: multi(["quiet-time", "food"]), jordanGuess: multi(["quiet-time"]) },
  "feel-loved": { maya: multi(["words-of-appreciation", "quality-time"]), jordan: multi(["quality-time", "helpful-actions"]), mayaGuess: multi(["thoughtful-gestures"]), jordanGuess: multi(["words-of-appreciation", "quality-time"]) },
  "travel-style": { maya: choice("loose-plans"), jordan: choice("detailed-itinerary"), mayaGuess: choice("detailed-itinerary"), jordanGuess: choice("loose-plans") },
  superpower: { maya: choice("healing"), jordan: choice("endless-good-sleep"), mayaGuess: choice("flying"), jordanGuess: choice("healing") },
  "dream-country": { maya: text("Japan"), jordan: text("Japan"), mayaGuess: text("Japan"), jordanGuess: text("South Korea") },
};

function preferences(userId: string, locale: UserPreferences["locale"] = "en"): UserPreferences {
  return {
    userId,
    theme: "light",
    locale,
    emailNotifications: false,
    inAppNotifications: true,
    reminderHour: 19,
    streakPaused: false,
    reducedMotion: false,
    dailyStreak: 3,
    lastDailyOn: new Date().toISOString().slice(0, 10),
    points: 0,
    recentCardIds: [],
    onboardingStep: "done",
    onboardingCompleted: true,
  };
}

export async function ensureContent(repo: Repository) {
  const existingCategories = new Set((await repo.list("questionCategories", {})).map((category) => category.id));
  for (const category of categories) {
    if (!existingCategories.has(category.id)) await repo.insert("questionCategories", category);
  }
  const existingQuestions = new Set((await repo.list("questions", { eq: { isSystem: true } })).map((question) => question.id));
  for (const question of questions) {
    if (!existingQuestions.has(question.id)) await repo.insert("questions", question);
  }
  const existingOptions = new Set((await repo.list("questionOptions", {})).map((option) => option.id));
  for (const option of questionOptions) {
    if (!existingOptions.has(option.id)) await repo.insert("questionOptions", option);
  }
  const existingTemplates = new Set((await repo.list("quizTemplates", {})).map((template) => template.id));
  for (const template of quizTemplates) {
    if (!existingTemplates.has(template.id)) await repo.insert("quizTemplates", template);
  }
  if ((await repo.list("achievements", {})).length === 0) for (const achievement of achievements) await repo.insert("achievements", achievement);
  if ((await repo.list("coupleChallenges", {})).length === 0) for (const challenge of challenges) await repo.insert("coupleChallenges", challenge);
  if ((await repo.list("conversationCards", { eq: { isSystem: true } })).length === 0) for (const card of conversationCards) await repo.insert("conversationCards", card);
  if ((await repo.list("personalityTests", {})).length === 0) {
    for (const test of personalityTests) await repo.insert("personalityTests", test);
    for (const question of personalityQuestions) await repo.insert("personalityQuestions", question);
  }
}

async function demoPasswordHash() {
  const password = process.env.DEMO_PASSWORD ?? "";
  if (password.length >= 8) return hash(password, 12);
  return hash(createId(), 12);
}

export async function ensureDemoCycle(repo: Repository) {
  const maya = await repo.find("profiles", { eq: { email: DEMO_MAYA_EMAIL } });
  if (!maya?.isDemo) return;
  const existing = await repo.list("cyclePeriods", { eq: { userId: maya.id } }, { limit: 1 });
  if (existing.length) return;
  const membership = await repo.find("coupleMembers", { eq: { userId: maya.id, status: "active" } });
  const sample = fictionalCycleSample(maya.id, calendarDay("Asia/Manila"), new Date().toISOString());
  if (membership) sample.event.coupleId = membership.coupleId;
  const profile = await repo.find("cycleProfiles", { eq: { userId: maya.id } });
  if (!profile) await repo.insert("cycleProfiles", sample.profile);
  for (const period of sample.periods) await repo.insert("cyclePeriods", period);
  for (const entry of sample.checkIns) await repo.insert("cycleCheckIns", entry);
  await repo.insert("cycleEvents", sample.event);
}

export async function ensureDemo(repo: Repository) {
  await ensureContent(repo);
  if (await repo.find("profiles", { eq: { email: DEMO_MAYA_EMAIL } })) {
    await ensureDemoCycle(repo);
    return;
  }
  const stamp = new Date().toISOString();
  const passwordHash = await demoPasswordHash();
  const mayaId = stableId(DEMO_MAYA_EMAIL);
  const jordanId = stableId(DEMO_JORDAN_EMAIL);
  await repo.insert("profiles", {
    id: mayaId,
    email: DEMO_MAYA_EMAIL,
    displayName: "Maya Chen",
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: "In a relationship",
    relationshipStartedOn: "2024-02-14",
    interests: ["Music", "Food", "Quiet nights"],
    preferredCategories: ["favorites", "affection", "dreams"],
    role: "user",
    isDemo: true,
    emailVerified: true,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("profiles", {
    id: jordanId,
    email: DEMO_JORDAN_EMAIL,
    displayName: "Jordan Reyes",
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: "In a relationship",
    relationshipStartedOn: "2024-02-14",
    interests: ["Food", "Outdoors", "Movies"],
    preferredCategories: ["favorites", "habits", "playful"],
    role: "user",
    isDemo: true,
    emailVerified: true,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("credentials", { userId: mayaId, passwordHash });
  await repo.insert("credentials", { userId: jordanId, passwordHash });
  await repo.insert("userPreferences", preferences(mayaId));
  await repo.insert("userPreferences", preferences(jordanId, "fil"));

  const created = await createCouple(repo, mayaId, { name: "Maya & Jordan", nickname: "Fictional demo couple", relationshipStartedOn: "2024-02-14" });
  if (!created.ok) throw new Error(created.error);
  const accepted = await acceptInvitation(repo, jordanId, created.data.invitation.code);
  if (!accepted.ok) throw new Error(accepted.error);
  const coupleId = created.data.couple.id;
  const ids = Object.keys(script);
  const started = await startQuiz(repo, mayaId, { mode: "exchange", title: "Fictional sample quiz", questionIds: ids, size: ids.length });
  if (!started.ok) throw new Error(started.error);
  for (const [index, id] of ids.entries()) {
    const row = script[id];
    if (!row) continue;
    await saveQuizProgress(repo, mayaId, { sessionId: started.data.session.id, questionId: id, currentIndex: index + 1, selfAnswer: row.maya, prediction: row.mayaGuess });
  }
  await completeQuiz(repo, mayaId, started.data.session.id);
  const joined = await startQuiz(repo, jordanId, { mode: "exchange", roundId: started.data.round.id });
  if (!joined.ok) throw new Error(joined.error);
  for (const [index, id] of ids.entries()) {
    const row = script[id];
    if (!row) continue;
    await saveQuizProgress(repo, jordanId, { sessionId: joined.data.session.id, questionId: id, currentIndex: index + 1, selfAnswer: row.jordan, prediction: row.jordanGuess });
  }
  await completeQuiz(repo, jordanId, joined.data.session.id);

  for (const userId of [mayaId, jordanId]) {
    const reflection = await startPersonality(repo, userId, "style");
    if (!reflection.ok) continue;
    for (const question of reflection.data.questions) {
      const value = userId === mayaId ? 4 : 2;
      await savePersonalityAnswer(repo, userId, reflection.data.session.id, question.id, { scale: question.reverse ? 5 : value }, false);
    }
    const result = await completePersonality(repo, userId, reflection.data.session.id);
    if (result.ok) await setPersonalityShared(repo, userId, result.data.id, true);
  }

  await repo.insert("coupleMemories", {
    id: createId(),
    coupleId,
    authorId: mayaId,
    title: "Fictional first merienda",
    body: "Sample memory: Maya and Jordan are fictional. They split a mango float and missed the rain on purpose.",
    kind: "moment",
    occurredOn: "2024-02-14",
    visibility: "shared",
    remindOn: null,
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("cardActivity", {
    id: createId(),
    userId: mayaId,
    coupleId,
    cardId: "card-16",
    answered: true,
    hidden: false,
    note: "Fictional note: we liked this question.",
    updatedAt: stamp,
  });
  await repo.insert("sharedReflections", {
    id: createId(),
    coupleId,
    cardId: "card-16",
    questionId: null,
    authorId: jordanId,
    body: "Fictional reflection: listening first made the conversation easier.",
    createdAt: stamp,
    updatedAt: stamp,
  });
  await repo.insert("notifications", {
    id: createId(),
    userId: mayaId,
    coupleId,
    type: "demo",
    title: "This is fictional sample data",
    body: "Maya and Jordan are not real people. Their answers exist so you can explore the product.",
    href: "/home",
    readAt: null,
    createdAt: stamp,
  });
  await ensureDemoCycle(repo);
}

export async function ensureOperator(repo: Repository) {
  let changed = false;
  const stamp = new Date().toISOString();
  for (const profile of await repo.list("profiles", {})) {
    if (!profile.isDemo || profile.role === "user") continue;
    await repo.update("profiles", profile.id, { role: "user", updatedAt: stamp });
    changed = true;
  }
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  for (const email of superAdminEmails()) {
    if (email.endsWith("@demo.couplesync.local")) continue;
    const existing = await repo.find("profiles", { eq: { email } });
    if (existing?.isDemo) continue;
    if (existing) {
      if (existing.role === "super_admin" && existing.emailVerified) continue;
      await repo.update("profiles", existing.id, { role: "super_admin", isDemo: false, emailVerified: true, updatedAt: stamp });
      changed = true;
      continue;
    }
    if (password.length < 8) continue;
    const userId = stableId(email);
    await repo.insert("profiles", {
      id: userId,
      email,
      displayName: "Platform owner",
      avatarUrl: null,
      bannerUrl: null,
      relationshipStatus: null,
      relationshipStartedOn: null,
      interests: [],
      preferredCategories: [],
      role: "super_admin",
      isDemo: false,
      emailVerified: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
    await repo.insert("credentials", { userId, passwordHash: await hash(password, 12) });
    await repo.insert("userPreferences", preferences(userId));
    changed = true;
  }
  const demoPassword = process.env.DEMO_PASSWORD ?? "";
  if (demoPassword.length >= 8) {
    const passwordHash = await hash(demoPassword, 12);
    for (const email of [DEMO_MAYA_EMAIL, DEMO_JORDAN_EMAIL]) {
      const profile = await repo.find("profiles", { eq: { email, isDemo: true } });
      if (!profile) continue;
      const credential = await repo.find("credentials", { eq: { userId: profile.id } });
      if (credential && (await compare(demoPassword, credential.passwordHash))) continue;
      if (credential) await repo.update("credentials", profile.id, { passwordHash });
      else await repo.insert("credentials", { userId: profile.id, passwordHash });
      changed = true;
    }
  }
  return changed;
}

export async function resetDemo(repo: Repository) {
  const maya = await repo.find("profiles", { eq: { email: DEMO_MAYA_EMAIL } });
  const jordan = await repo.find("profiles", { eq: { email: DEMO_JORDAN_EMAIL } });
  const ids = [maya?.id, jordan?.id].filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    await ensureDemo(repo);
    return;
  }
  const memberships = (await repo.list("coupleMembers", {})).filter((member) => ids.includes(member.userId));
  const coupleIds = [...new Set(memberships.map((member) => member.coupleId))];
  for (const coupleId of coupleIds) {
    const rounds = await repo.list("quizRounds", { eq: { coupleId } });
    for (const round of rounds) {
      await repo.removeWhere("quizRoundQuestions", { eq: { roundId: round.id } });
      await repo.removeWhere("quizSessions", { eq: { roundId: round.id } });
      await repo.removeWhere("answerPredictions", { eq: { roundId: round.id } });
      await repo.remove("quizRounds", round.id);
    }
    for (const table of ["coupleInvitations", "reconnectRequests", "coupleMemories", "sharedReflections", "notifications", "answerReveals", "similarityMarks", "scoreSnapshots", "challengeProgress", "userAnswers", "answerPredictions", "coupleMembers"] as const) {
      await repo.removeWhere(table, { eq: { coupleId } });
    }
    await repo.remove("couples", coupleId);
  }
  for (const id of ids) {
    await repo.removeWhere("cyclePeriods", { eq: { userId: id } });
    await repo.removeWhere("cycleCheckIns", { eq: { userId: id } });
    await repo.removeWhere("cyclePregnancyLogs", { eq: { userId: id } });
    await repo.removeWhere("cycleReminders", { eq: { userId: id } });
    await repo.removeWhere("cycleEvents", { eq: { userId: id } });
    await repo.removeWhere("cycleShareGrants", { eq: { ownerId: id } });
    await repo.removeWhere("cycleShareGrants", { eq: { partnerId: id } });
    if (await repo.find("cycleProfiles", { eq: { userId: id } })) await repo.remove("cycleProfiles", id);
    await repo.removeWhere("personalitySessions", { eq: { userId: id } });
    await repo.removeWhere("personalityAnswers", { eq: { userId: id } });
    await repo.removeWhere("personalityResults", { eq: { userId: id } });
    await repo.removeWhere("userAchievements", { eq: { userId: id } });
    await repo.removeWhere("cardActivity", { eq: { userId: id } });
    await repo.removeWhere("notifications", { eq: { userId: id } });
    await repo.remove("credentials", id);
    await repo.remove("userPreferences", id);
    await repo.remove("profiles", id);
  }
  await ensureDemo(repo);
}
