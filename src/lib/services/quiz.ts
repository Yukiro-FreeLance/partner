import type {
  AnswerPayload,
  AnswerPrediction,
  Question,
  QuestionOption,
  QuizMode,
  QuizRound,
  QuizSession,
  UserAnswer,
} from "@/lib/domain";
import { runWrite, type Repository } from "@/lib/data/repository";
import { dependencyMet, describeAnswer } from "@/lib/answers";
import { createId } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";
import { DAILY_TIME_ZONE, dayKey, nextDailyReset, previousDayKey } from "@/lib/daily";
import { compareResponses, isPartnerPrediction, summarize, type Comparison, type ScoreSummary } from "@/lib/scoring";
import { activeMembership, notifyUser, otherPartner, requireMembership, writeAudit } from "@/lib/services/access";
import { grantAchievements } from "@/lib/services/achievements";

const MUTUAL: QuizMode[] = ["exchange", "reveal", "daily"];

function now() {
  return new Date().toISOString();
}

function todayKey(date = new Date()) {
  return dayKey(date);
}

function yesterdayKey(date = new Date()) {
  return previousDayKey(dayKey(date));
}

export type QuizQuestion = Question & { options: QuestionOption[] };

export type RoundView = {
  round: QuizRound;
  session: QuizSession;
  questions: QuizQuestion[];
  answers: UserAnswer[];
  predictions: AnswerPrediction[];
};

async function questionsByIds(repo: Repository, ids: string[]): Promise<QuizQuestion[]> {
  if (ids.length === 0) return [];
  const questions = await repo.list("questions", { in: { id: ids } });
  const options = await repo.list("questionOptions", { in: { questionId: ids } });
  const order = new Map(ids.map((id, index) => [id, index]));
  return questions
    .map((question) => ({
      ...question,
      options: options.filter((option) => option.questionId === question.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function roundQuestions(repo: Repository, roundId: string) {
  const links = await repo.list("quizRoundQuestions", { eq: { roundId } });
  const ordered = links.sort((a, b) => a.position - b.position);
  return questionsByIds(repo, ordered.map((link) => link.questionId));
}

export async function startQuiz(
  source: Repository,
  userId: string,
  input: {
    mode: QuizMode;
    title?: string;
    size?: number;
    categories?: string[];
    difficulty?: QuizRound["difficulty"];
    timerSeconds?: number | null;
    includeSensitive?: boolean;
    questionIds?: string[];
    roundId?: string;
  },
): Promise<Result<RoundView>> {
  return runWrite(source, async (repo) => {
  if (repo !== source) return startQuiz(repo, userId, input);
  if (input.roundId) return joinRound(repo, userId, input.roundId);
  const membershipForJoin = await activeMembership(repo, userId);
  if (membershipForJoin && !input.questionIds?.length) {
    const openRound = await findPartnerRound(repo, userId, membershipForJoin.coupleId, input);
    if (openRound) return joinRound(repo, userId, openRound.id);
  }
  if ((input.categories ?? []).includes("intimacy") && !input.includeSensitive) {
    return fail("Closeness questions stay off until you confirm you are 18 or older and choose to include them.");
  }
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Create or join a couple before playing.");
  const selected = await selectQuestions(repo, userId, membership.coupleId, input);
  if (selected.length === 0) return fail("No questions match those filters yet.");
  const createdAt = now();
  const round: QuizRound = {
    id: createId(),
    coupleId: membership.coupleId,
    createdBy: userId,
    mode: input.mode,
    title: input.title?.trim() || defaultTitle(input.mode),
    status: "active",
    size: selected.length,
    categories: input.categories ?? [],
    difficulty: input.difficulty ?? "mixed",
    timerSeconds: input.timerSeconds ?? null,
    includeSensitive: Boolean(input.includeSensitive),
    resultsShared: false,
    createdAt,
    updatedAt: createdAt,
  };
  await repo.insert("quizRounds", round);
  for (const [position, question] of selected.entries()) {
    await repo.insert("quizRoundQuestions", { id: createId(), roundId: round.id, questionId: question.id, position });
  }
  const session = await insertSession(repo, round.id, userId);
  await writeAudit(repo, userId, "quiz.started", membership.coupleId);
  return ok({ round, session, questions: selected, answers: [], predictions: [] });
  });
}

async function selectQuestions(
  repo: Repository,
  userId: string,
  coupleId: string,
  input: { size?: number; categories?: string[]; difficulty?: QuizRound["difficulty"]; includeSensitive?: boolean; questionIds?: string[] },
) {
  const categories = await repo.list("questionCategories", {});
  const allowedCategories = new Set(
    (input.categories ?? []).map((value) => categories.find((category) => category.id === value || category.slug === value)?.id).filter(Boolean),
  );
  let pool = (await repo.list("questions", { eq: { isActive: true } })).filter((question) => {
    if (question.dependsOn) return false;
    if (!input.includeSensitive && question.sensitive) return false;
    if (question.visibility === "private" && question.createdBy !== userId) return false;
    if (question.visibility === "couple" && question.coupleId !== coupleId && question.createdBy !== userId) return false;
    if (allowedCategories.size > 0 && !allowedCategories.has(question.categoryId)) return false;
    if (input.difficulty && input.difficulty !== "mixed" && question.difficulty !== input.difficulty) return false;
    return true;
  });
  if (input.questionIds?.length) {
    const wanted = new Set(input.questionIds);
    pool = input.questionIds.map((id) => pool.find((question) => question.id === id)).filter((question): question is Question => Boolean(question && wanted.has(question.id)));
    return questionsByIds(repo, pool.map((question) => question.id));
  }
  const recent = await repo.list("quizRounds", { eq: { coupleId } }, { orderBy: "createdAt", descending: true, limit: 2 });
  const recentIds = new Set<string>();
  for (const round of recent.slice(0, 2)) {
    const links = await repo.list("quizRoundQuestions", { eq: { roundId: round.id } });
    links.forEach((link) => recentIds.add(link.questionId));
  }
  const fresh = pool.filter((question) => !recentIds.has(question.id));
  const source = fresh.length >= (input.size ?? 5) ? fresh : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const size = Math.max(1, input.size ?? 10);
  return questionsByIds(repo, shuffled.slice(0, size).map((question) => question.id));
}

async function findPartnerRound(
  repo: Repository,
  userId: string,
  coupleId: string,
  input: { mode: QuizMode; title?: string; categories?: string[] },
) {
  const title = input.title?.trim() || defaultTitle(input.mode);
  const categories = [...(input.categories ?? [])].sort().join(",");
  const rounds = (await repo.list("quizRounds", { eq: { coupleId, mode: input.mode } }))
    .filter((round) => round.title === title && [...round.categories].sort().join(",") === categories)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sessions = await repo.list("quizSessions", {});
  for (const round of rounds) {
    const mine = sessions.find((session) => session.roundId === round.id && session.userId === userId);
    if (mine?.status === "completed") continue;
    const partnerPlayed = sessions.some((session) => session.roundId === round.id && session.userId !== userId);
    if (partnerPlayed) return round;
  }
  return null;
}

function defaultTitle(mode: QuizMode) {
  const titles: Record<QuizMode, string> = {
    guess: "Partner guess",
    reveal: "Answer together",
    solo: "Solo practice",
    reverse: "Reverse quiz",
    daily: "Today's Couple Challenge",
    exchange: "How well do you know your partner?",
  };
  return titles[mode];
}

async function insertSession(repo: Repository, roundId: string, userId: string) {
  const session: QuizSession = {
    id: createId(),
    roundId,
    userId,
    status: "in_progress",
    currentIndex: 0,
    startedAt: now(),
    completedAt: null,
    updatedAt: now(),
  };
  await repo.insert("quizSessions", session);
  return session;
}

export async function joinRound(repo: Repository, userId: string, roundId: string): Promise<Result<RoundView>> {
  const round = await repo.find("quizRounds", { eq: { id: roundId } });
  if (!round) return fail("Quiz not found.");
  const access = await requireMembership(repo, userId, round.coupleId);
  if (!access.ok) return access;
  if (round.mode === "solo" && round.createdBy !== userId) return fail("This practice quiz is private.");
  let session = await repo.find("quizSessions", { eq: { roundId, userId } });
  if (!session) session = await insertSession(repo, roundId, userId);
  const questions = await roundQuestions(repo, roundId);
  const answers = await repo.list("userAnswers", { eq: { userId, roundId } });
  const predictions = await repo.list("answerPredictions", { eq: { predictorId: userId, roundId } });
  return ok({ round, session, questions, answers, predictions });
}

export async function saveQuizProgress(
  source: Repository,
  userId: string,
  input: {
    sessionId: string;
    questionId: string;
    currentIndex: number;
    selfAnswer?: { payload: AnswerPayload; skipped: boolean } | null;
    prediction?: { payload: AnswerPayload; skipped: boolean; kind?: "partner" | "reverse" } | null;
  },
): Promise<Result<{ nextQuestion: QuizQuestion | null }>> {
  return runWrite(source, async (repo) => {
  if (repo !== source) return saveQuizProgress(repo, userId, input);
  const session = await repo.find("quizSessions", { eq: { id: input.sessionId, userId } });
  if (!session) return fail("Quiz session not found.");
  if (session.status === "completed") return fail("This quiz has already been submitted.");
  const round = await repo.find("quizRounds", { eq: { id: session.roundId } });
  if (!round) return fail("Quiz not found.");
  const access = await requireMembership(repo, userId, round.coupleId);
  if (!access.ok) return access;
  const questions = await roundQuestions(repo, round.id);
  const question = questions.find((item) => item.id === input.questionId);
  if (!question) return fail("That question is not part of this quiz.");

  if (input.selfAnswer && (round.mode === "reveal" || round.mode === "exchange" || round.mode === "daily")) {
    await upsertAnswer(repo, {
      userId,
      coupleId: round.coupleId,
      questionId: question.id,
      roundId: round.id,
      payload: input.selfAnswer.skipped ? input.selfAnswer.payload : { ...input.selfAnswer.payload, shareWithPartner: true },
      skipped: input.selfAnswer.skipped,
    });
  }
  if (input.prediction && (round.mode === "guess" || round.mode === "solo" || round.mode === "exchange" || round.mode === "daily" || round.mode === "reverse")) {
    const partner = await otherPartner(repo, round.coupleId, userId);
    const kind = input.prediction.kind ?? (round.mode === "reverse" ? "reverse" : "partner");
    const subjectId = kind === "reverse" ? userId : partner?.userId;
    if (!subjectId) return fail("Invite your partner before guessing their answers.");
    await upsertPrediction(repo, {
      predictorId: userId,
      subjectId,
      coupleId: round.coupleId,
      questionId: question.id,
      roundId: round.id,
      kind,
      payload: input.prediction.payload,
      skipped: input.prediction.skipped,
    });
  }
  await maybeInsertConditional(repo, round.id, question, input.selfAnswer ?? input.prediction);
  await repo.update("quizSessions", session.id, { currentIndex: input.currentIndex, updatedAt: now() });
  const refreshed = await roundQuestions(repo, round.id);
  const position = refreshed.findIndex((item) => item.id === question.id);
  return ok({ nextQuestion: refreshed[position + 1] ?? null });
  });
}

async function upsertAnswer(
  repo: Repository,
  input: { userId: string; coupleId: string; questionId: string; roundId: string; payload: AnswerPayload; skipped: boolean },
) {
  const existing = await repo.find("userAnswers", { eq: { userId: input.userId, coupleId: input.coupleId, questionId: input.questionId } });
  if (existing) {
    await repo.update("userAnswers", existing.id, { payload: input.payload, skipped: input.skipped, roundId: input.roundId, updatedAt: now() });
    return;
  }
  await repo.insert("userAnswers", { id: createId(), ...input, createdAt: now(), updatedAt: now() });
}

async function upsertPrediction(
  repo: Repository,
  input: AnswerPrediction extends infer T ? Omit<T, "id" | "createdAt" | "updatedAt"> : never,
) {
  const existing = await repo.find("answerPredictions", {
    eq: { predictorId: input.predictorId, roundId: input.roundId, questionId: input.questionId, kind: input.kind },
  });
  if (existing) {
    await repo.update("answerPredictions", existing.id, { payload: input.payload, skipped: input.skipped, subjectId: input.subjectId, updatedAt: now() });
    return;
  }
  await repo.insert("answerPredictions", { id: createId(), ...input, createdAt: now(), updatedAt: now() });
}

async function maybeInsertConditional(
  repo: Repository,
  roundId: string,
  current: Question,
  response?: { payload: AnswerPayload; skipped: boolean } | null,
) {
  if (!response) return;
  const links = (await repo.list("quizRoundQuestions", { eq: { roundId } })).sort((a, b) => a.position - b.position);
  const followers = (await repo.list("questions", { eq: { isActive: true } })).filter((question) => question.dependsOn?.questionId === current.id);
  let inserted = 0;
  for (const follower of followers) {
    if (links.some((link) => link.questionId === follower.id)) continue;
    if (!dependencyMet(follower.dependsOn, response.payload, response.skipped)) continue;
    const position = (links.find((link) => link.questionId === current.id)?.position ?? 0) + 1 + inserted;
    for (const link of links) {
      if (link.position >= position) await repo.update("quizRoundQuestions", link.id, { position: link.position + 1 });
    }
    await repo.insert("quizRoundQuestions", { id: createId(), roundId, questionId: follower.id, position });
    inserted += 1;
  }
}

export async function completeQuiz(source: Repository, userId: string, sessionId: string): Promise<Result<{ roundId: string; summary: ScoreSummary }>> {
  return runWrite(source, async (repo) => {
  if (repo !== source) return completeQuiz(repo, userId, sessionId);
  const session = await repo.find("quizSessions", { eq: { id: sessionId, userId } });
  if (!session) return fail("Quiz session not found.");
  if (session.status === "completed") return fail("This quiz has already been submitted.");
  const round = await repo.find("quizRounds", { eq: { id: session.roundId } });
  if (!round) return fail("Quiz not found.");
  const access = await requireMembership(repo, userId, round.coupleId);
  if (!access.ok) return access;
  const questions = await roundQuestions(repo, round.id);
  const missing = await missingResponses(repo, round, userId, questions);
  if (missing) return fail("Answer or skip each question before submitting.");

  await repo.update("quizSessions", session.id, { status: "completed", completedAt: now(), updatedAt: now(), currentIndex: questions.length });
  await openReveals(repo, round.id);
  const summary = await personalSummary(repo, userId, round.id);
  await awardPlay(repo, userId, round);
  const partner = await otherPartner(repo, round.coupleId, userId);
  if (partner) {
    const sessions = await repo.list("quizSessions", { eq: { roundId: round.id } });
    const ready = sessions.filter((item) => item.status === "completed").length >= 2;
    await notifyUser(repo, {
      userId: partner.userId,
      coupleId: round.coupleId,
      type: ready ? "quiz_ready" : "quiz_completed",
      title: ready ? "A quiz is ready to open" : "Your partner finished a quiz",
      body: ready ? "You can review the shared answers now." : "Open the quiz, add your answers, and their answers open with yours.",
      href: `/play/results/${round.id}`,
    });
  }
  await grantAchievements(repo, userId, round.coupleId);
  await writeAudit(repo, userId, "quiz.completed", round.coupleId);
  return ok({ roundId: round.id, summary });
  });
}

async function missingResponses(repo: Repository, round: QuizRound, userId: string, questions: QuizQuestion[]) {
  const answers = await repo.list("userAnswers", { eq: { userId, roundId: round.id } });
  const predictions = await repo.list("answerPredictions", { eq: { predictorId: userId, roundId: round.id } });
  return questions.some((question) => {
    const needsSelf = round.mode === "reveal" || round.mode === "exchange" || round.mode === "daily";
    const needsGuess = round.mode === "guess" || round.mode === "solo" || round.mode === "exchange" || round.mode === "daily" || round.mode === "reverse";
    if (needsSelf && !answers.some((answer) => answer.questionId === question.id)) return true;
    if (needsGuess && !predictions.some((prediction) => prediction.questionId === question.id)) return true;
    return false;
  });
}

export async function openReveals(repo: Repository, roundId: string, options?: { snapshots?: boolean }) {
  const round = await repo.find("quizRounds", { eq: { id: roundId } });
  if (!round) return;
  const sessions = await repo.list("quizSessions", { eq: { roundId } });
  const completed = sessions.filter((session) => session.status === "completed");
  const partners = await repo.list("coupleMembers", { eq: { coupleId: round.coupleId, status: "active" } });
  for (const session of completed) {
    const partner = partners.find((member) => member.userId !== session.userId);
    if (!partner) continue;
    if (MUTUAL.includes(round.mode)) {
      if (completed.length < 2) continue;
      await revealAnswers(repo, round, partner.userId, session.userId);
      await revealAnswers(repo, round, session.userId, partner.userId);
      if (!round.resultsShared) {
        await repo.update("quizRounds", round.id, { resultsShared: true, status: "complete", updatedAt: now() });
        round.resultsShared = true;
      }
    } else if (round.mode === "guess" || round.mode === "solo" || round.mode === "reverse") {
      await revealAnswers(repo, round, partner.userId, session.userId);
      if (round.mode === "guess" && completed.length >= 2 && !round.resultsShared) {
        await repo.update("quizRounds", round.id, { resultsShared: true, status: "complete", updatedAt: now() });
        round.resultsShared = true;
      }
    }
  }
  if (options?.snapshots === false) return;
  for (const session of completed) await writeSnapshot(repo, session.userId, round.coupleId, round.id);
}

async function writeSnapshot(repo: Repository, userId: string, coupleId: string, roundId: string) {
  const summary = await personalSummary(repo, userId, roundId);
  const existing = (await repo.list("scoreSnapshots", { eq: { userId, roundId } }))[0];
  const payload = {
    score: summary.score,
    correct: summary.correct,
    close: summary.close,
    incorrect: summary.incorrect,
    skipped: summary.skipped,
    eligible: summary.eligible,
    points: summary.points,
  };
  if (existing) await repo.update("scoreSnapshots", existing.id, payload);
  else {
    await repo.insert("scoreSnapshots", { id: createId(), coupleId, roundId, userId, ...payload, createdAt: now() });
  }
}

async function revealAnswers(repo: Repository, round: QuizRound, ownerId: string, viewerId: string) {
  const [links, answers, reveals] = await Promise.all([
    repo.list("quizRoundQuestions", { eq: { roundId: round.id } }),
    repo.list("userAnswers", { eq: { userId: ownerId, coupleId: round.coupleId } }),
    repo.list("answerReveals", { eq: { roundId: round.id, ownerId, viewerId } }),
  ]);
  const revealed = new Set(reveals.map((item) => item.questionId));
  for (const link of links) {
    const answer = answers.find((item) => item.questionId === link.questionId);
    if (!answer || answer.skipped || revealed.has(link.questionId)) continue;
    await repo.insert("answerReveals", {
      id: createId(),
      coupleId: round.coupleId,
      questionId: link.questionId,
      ownerId,
      viewerId,
      roundId: round.id,
      createdAt: now(),
    });
  }
}

async function awardPlay(repo: Repository, userId: string, round: QuizRound) {
  const preferences = await repo.find("userPreferences", { eq: { userId } });
  if (!preferences) return;
  const today = todayKey();
  const alreadyClaimedDaily = round.mode === "daily" && preferences.lastDailyOn === today;
  let points = preferences.points + (alreadyClaimedDaily ? 0 : round.mode === "daily" ? 5 : 20);
  let dailyStreak = preferences.dailyStreak;
  let lastDailyOn = preferences.lastDailyOn;
  if (round.mode === "daily" && !alreadyClaimedDaily) {
    if (preferences.streakPaused) {
      lastDailyOn = today;
    } else if (preferences.lastDailyOn === yesterdayKey()) {
      dailyStreak += 1;
      lastDailyOn = today;
    } else {
      dailyStreak = 1;
      lastDailyOn = today;
    }
  }
  await repo.update("userPreferences", userId, { points, dailyStreak, lastDailyOn });
}

export async function shareSoloResults(repo: Repository, userId: string, roundId: string) {
  const round = await repo.find("quizRounds", { eq: { id: roundId, mode: "solo", createdBy: userId } });
  if (!round) return fail("Solo quiz not found.");
  const session = await repo.find("quizSessions", { eq: { roundId, userId, status: "completed" } });
  if (!session) return fail("Finish the quiz before sharing it.");
  await repo.update("quizRounds", round.id, { resultsShared: true, updatedAt: now() });
  const partner = await otherPartner(repo, round.coupleId, userId);
  if (partner) {
    await notifyUser(repo, {
      userId: partner.userId,
      coupleId: round.coupleId,
      type: "quiz_shared",
      title: "Your partner shared a practice quiz",
      body: "They chose to show you this round. Private answers stay hidden.",
      href: `/play/results/${round.id}`,
    });
  }
  return ok({ roundId });
}

export type GradedQuestion = {
  question: QuizQuestion;
  mine: UserAnswer | null;
  partnerAnswer: UserAnswer | null;
  myPrediction: AnswerPrediction | null;
  partnerPrediction: AnswerPrediction | null;
  comparison: Comparison | null;
  mineLabel: string;
  partnerLabel: string | null;
  predictionLabel: string | null;
  partnerGuessLabel: string | null;
};

export type RoundResults = {
  round: QuizRound;
  session: QuizSession | null;
  partnerName: string | null;
  questions: GradedQuestion[];
  summary: ScoreSummary;
};

export async function getRoundResults(repo: Repository, viewerId: string, roundId: string): Promise<Result<RoundResults>> {
  const round = await repo.find("quizRounds", { eq: { id: roundId } });
  if (!round) return fail("Quiz not found.");
  const access = await requireMembership(repo, viewerId, round.coupleId);
  if (!access.ok) return access;
  if (round.mode === "solo" && round.createdBy !== viewerId && !round.resultsShared) return fail("This practice quiz is still private.");
  await openReveals(repo, round.id, { snapshots: false });
  const current = (await repo.find("quizRounds", { eq: { id: roundId } })) ?? round;
  const questions = await roundQuestions(repo, current.id);
  const session = await repo.find("quizSessions", { eq: { roundId, userId: viewerId } });
  const partner = await otherPartner(repo, current.coupleId, viewerId);
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const viewerDone = session?.status === "completed";
  const [viewerAnswers, partnerAnswers, predictions, partnerSessions] = await Promise.all([
    repo.list("userAnswers", { eq: { userId: viewerId, coupleId: current.coupleId } }),
    partner ? repo.list("userAnswers", { eq: { userId: partner.userId, coupleId: current.coupleId } }) : Promise.resolve([]),
    repo.list("answerPredictions", { eq: { coupleId: current.coupleId } }),
    partner ? repo.list("quizSessions", { eq: { userId: partner.userId, status: "completed" } }) : Promise.resolve([]),
  ]);
  const partnerDone = new Set(partnerSessions.map((item) => item.roundId));
  const graded: GradedQuestion[] = [];
  for (const question of questions) {
    const mine = viewerAnswers.find((item) => item.questionId === question.id) ?? null;
    const guessKind = current.mode === "reverse" ? "reverse" : "partner";
    const myPrediction = choosePrediction(predictions, {
      questionId: question.id,
      predictorId: viewerId,
      subjectId: current.mode === "reverse" ? viewerId : partner?.userId ?? "",
      roundId: current.id,
      kind: guessKind,
      sameRoundOnly: current.mode === "reverse",
    });
    const storedPartnerAnswer = partnerAnswers.find((item) => item.questionId === question.id) ?? null;
    const partnerAnswer = viewerDone && storedPartnerAnswer?.roundId && partnerDone.has(storedPartnerAnswer.roundId) ? storedPartnerAnswer : null;
    const partnerPrediction = viewerDone
      ? choosePrediction(predictions, {
          questionId: question.id,
          predictorId: partner?.userId ?? "",
          subjectId: viewerId,
          roundId: current.id,
          kind: "partner",
          sameRoundOnly: current.mode === "reverse",
        })
      : null;
    const revealedPartnerGuess = partnerPrediction?.roundId && partnerDone.has(partnerPrediction.roundId) ? partnerPrediction : null;
    const comparison = comparisonFor(question, current, partner?.userId ?? null, partnerAnswer, myPrediction, partnerPrediction);
    graded.push({
      question,
      mine,
      partnerAnswer,
      myPrediction,
      partnerPrediction,
      comparison,
      mineLabel: mine ? describeAnswer(question.answerType, mine.payload, question.options, mine.skipped) : "Not answered yet",
      partnerLabel: partnerAnswer ? describeAnswer(question.answerType, partnerAnswer.payload, question.options, partnerAnswer.skipped) : null,
      predictionLabel: myPrediction ? describeAnswer(question.answerType, myPrediction.payload, question.options, myPrediction.skipped) : null,
      partnerGuessLabel: revealedPartnerGuess ? describeAnswer(question.answerType, revealedPartnerGuess.payload, question.options, revealedPartnerGuess.skipped) : null,
    });
  }
  return ok({
    round: current,
    session,
    partnerName: partnerProfile?.displayName ?? null,
    questions: graded,
    summary: summarize(graded.map((item) => item.comparison).filter((item): item is Comparison => Boolean(item))),
  });
}

function choosePrediction(
  rows: AnswerPrediction[],
  input: { questionId: string; predictorId: string; subjectId: string; roundId: string; kind: "partner" | "reverse"; sameRoundOnly: boolean },
) {
  const matches = rows.filter((item) => item.questionId === input.questionId && item.predictorId === input.predictorId && item.subjectId === input.subjectId && item.kind === input.kind && (!input.sameRoundOnly || item.roundId === input.roundId));
  matches.sort((left, right) => {
    const leftHere = left.roundId === input.roundId ? 1 : 0;
    const rightHere = right.roundId === input.roundId ? 1 : 0;
    if (leftHere !== rightHere) return rightHere - leftHere;
    return right.createdAt.localeCompare(left.createdAt);
  });
  return matches[0] ?? null;
}

function comparisonFor(
  question: QuizQuestion,
  round: QuizRound,
  partnerId: string | null,
  partnerAnswer: UserAnswer | null,
  myPrediction: AnswerPrediction | null,
  partnerPrediction: AnswerPrediction | null,
) {
  if (round.mode === "reverse") {
    if (!myPrediction || myPrediction.kind !== "reverse" || !partnerPrediction) return null;
    return compareResponses(question, { payload: partnerPrediction.payload, skipped: partnerPrediction.skipped }, { payload: myPrediction.payload, skipped: myPrediction.skipped });
  }
  if (!myPrediction || !partnerId || !partnerAnswer) return null;
  if (!isPartnerPrediction({ kind: myPrediction.kind, predictorId: myPrediction.predictorId, subjectId: myPrediction.subjectId, actualUserId: partnerId })) return null;
  return compareResponses(question, { payload: partnerAnswer.payload, skipped: partnerAnswer.skipped }, { payload: myPrediction.payload, skipped: myPrediction.skipped });
}

export async function personalSummary(repo: Repository, userId: string, roundId: string) {
  const results = await getRoundResults(repo, userId, roundId);
  if (!results.ok) return summarize([]);
  return results.data.summary;
}

export async function getOrCreateDaily(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Create or join a couple before playing today's question.");
  const key = todayKey();
  const resetAt = nextDailyReset(new Date()).toISOString();
  const rounds = await repo.list("quizRounds", { eq: { coupleId: membership.coupleId, mode: "daily" } });
  const existing = rounds.find((round) => dayKey(new Date(round.createdAt)) === key);
  if (existing) {
    const joined = await joinRound(repo, userId, existing.id);
    if (!joined.ok) return joined;
    return ok({ ...joined.data, resetAt, dayKey: key, timeZone: DAILY_TIME_ZONE });
  }
  const recentIds = new Set<string>();
  for (const round of rounds.slice(-14)) {
    const links = await repo.list("quizRoundQuestions", { eq: { roundId: round.id } });
    links.forEach((link) => recentIds.add(link.questionId));
  }
  const pool = (await repo.list("questions", { eq: { isActive: true, sensitive: false } })).filter((question) => !question.dependsOn && !recentIds.has(question.id) && question.visibility === "public");
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  if (!picked.length) return fail("The question bank is empty.");
  const started = await startQuiz(repo, userId, { mode: "daily", title: "Today's Couple Challenge", questionIds: picked.map((question) => question.id), size: picked.length, categories: [] });
  if (!started.ok) return started;
  return ok({ ...started.data, resetAt, dayKey: key, timeZone: DAILY_TIME_ZONE });
}

export async function listRoundCards(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return [];
  const rounds = await repo.list("quizRounds", { eq: { coupleId: membership.coupleId } });
  const sessions = await repo.list("quizSessions", {});
  return rounds
    .map((round) => {
      const mine = sessions.find((session) => session.roundId === round.id && session.userId === userId) ?? null;
      const partnerDone = sessions.some((session) => session.roundId === round.id && session.userId !== userId && session.status === "completed");
      return { round, mine, partnerDone };
    })
    .sort((a, b) => b.round.updatedAt.localeCompare(a.round.updatedAt));
}

export async function listMySessions(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return [];
  const sessions = await repo.list("quizSessions", { eq: { userId } });
  const rounds = await repo.list("quizRounds", { eq: { coupleId: membership.coupleId } });
  return sessions
    .map((session) => ({ session, round: rounds.find((round) => round.id === session.roundId) ?? null }))
    .filter((item): item is { session: QuizSession; round: QuizRound } => Boolean(item.round))
    .sort((a, b) => b.session.updatedAt.localeCompare(a.session.updatedAt));
}
