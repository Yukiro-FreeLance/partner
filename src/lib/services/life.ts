import type { AnswerPayload, CoupleMemory, Question, QuestionOption } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { fail, ok } from "@/lib/result";
import { activeMembership, notifyUser, otherPartner, requireMembership, writeAudit } from "@/lib/services/access";

function now() {
  return new Date().toISOString();
}

export async function createMemory(
  repo: Repository,
  userId: string,
  input: { title: string; body?: string; kind: CoupleMemory["kind"]; occurredOn?: string; visibility: "shared" | "private"; remindOn?: string },
) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Join a couple before saving a memory.");
  const title = input.title.trim();
  if (title.length < 2 || title.length > 80) return fail("Give the memory a title between 2 and 80 characters.");
  const memory = await repo.insert("coupleMemories", {
    id: createId(),
    coupleId: membership.coupleId,
    authorId: userId,
    title,
    body: input.body?.trim() || null,
    kind: input.kind,
    occurredOn: input.occurredOn || null,
    visibility: input.visibility,
    remindOn: input.remindOn || null,
    createdAt: now(),
    updatedAt: now(),
  });
  if (input.visibility === "shared") {
    const partner = await otherPartner(repo, membership.coupleId, userId);
    const profile = await repo.find("profiles", { eq: { id: userId } });
    if (partner) {
      await notifyUser(repo, {
        userId: partner.userId,
        coupleId: membership.coupleId,
        type: "memory",
        title: "A shared memory was added",
        body: `${profile?.displayName ?? "Your partner"} added “${title}”.`,
        href: `/memories/${memory.id}`,
      });
    }
  }
  return ok(memory);
}

export async function updateMemory(repo: Repository, userId: string, memoryId: string, patch: Partial<Pick<CoupleMemory, "title" | "body" | "kind" | "occurredOn" | "visibility" | "remindOn">>) {
  const memory = await repo.find("coupleMemories", { eq: { id: memoryId } });
  if (!memory || memory.authorId !== userId) return fail("You can only edit memories you created.");
  const updated = await repo.update("coupleMemories", memory.id, { ...patch, updatedAt: now() });
  return ok(updated);
}

export async function deleteMemory(repo: Repository, userId: string, memoryId: string) {
  const memory = await repo.find("coupleMemories", { eq: { id: memoryId } });
  if (!memory || memory.authorId !== userId) return fail("You can only delete memories you created.");
  await repo.removeWhere("memoryAttachments", { eq: { memoryId } });
  await repo.remove("coupleMemories", memoryId);
  return ok({ id: memoryId });
}

export async function visibleMemories(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return [];
  const memories = await repo.list("coupleMemories", { eq: { coupleId: membership.coupleId } }, { orderBy: "occurredOn", descending: true });
  return memories.filter((memory) => memory.visibility === "shared" || memory.authorId === userId);
}

export async function saveCardState(repo: Repository, userId: string, cardId: string, patch: { answered?: boolean; hidden?: boolean; note?: string | null; favorite?: boolean }) {
  const membership = await activeMembership(repo, userId);
  const existing = await repo.find("cardActivity", { eq: { userId, cardId } });
  if (existing) await repo.update("cardActivity", existing.id, { ...patch, note: patch.note === undefined ? existing.note : patch.note, updatedAt: now() });
  else {
    await repo.insert("cardActivity", {
      id: createId(),
      userId,
      coupleId: membership?.coupleId ?? null,
      cardId,
      answered: Boolean(patch.answered),
      hidden: Boolean(patch.hidden),
      note: patch.note ?? null,
      updatedAt: now(),
    });
  }
  if (patch.favorite) {
    const saved = await repo.find("savedQuestions", { eq: { userId, cardId } });
    if (!saved) await repo.insert("savedQuestions", { id: createId(), userId, cardId, questionId: null, createdAt: now() });
  }
  if (patch.favorite === false) {
    const saved = await repo.find("savedQuestions", { eq: { userId, cardId } });
    if (saved) await repo.remove("savedQuestions", saved.id);
  }
  return ok({ saved: true });
}

export async function addReflection(repo: Repository, userId: string, cardId: string, body: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Join a couple before sharing a reflection.");
  const text = body.trim();
  if (text.length < 2 || text.length > 1000) return fail("Keep the reflection between 2 and 1000 characters.");
  const reflection = await repo.insert("sharedReflections", {
    id: createId(),
    coupleId: membership.coupleId,
    cardId,
    questionId: null,
    authorId: userId,
    body: text,
    createdAt: now(),
    updatedAt: now(),
  });
  return ok(reflection);
}

export async function createCustomQuestion(
  repo: Repository,
  userId: string,
  input: { selfPrompt: string; answerType: Question["answerType"]; options: string[]; sensitive: boolean },
) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Join a couple before adding a question.");
  const prompt = input.selfPrompt.trim();
  if (prompt.length < 8 || prompt.length > 240) return fail("Write a question between 8 and 240 characters.");
  const id = createId();
  const question: Question = {
    id,
    categoryId: "playful",
    slug: id,
    selfPrompt: prompt,
    guessPrompt: `How would your partner answer: ${prompt}`,
    reversePrompt: `What would your partner guess you would say? ${prompt}`,
    answerType: input.answerType,
    difficulty: "medium",
    sensitive: input.sensitive,
    isActive: true,
    isSystem: false,
    visibility: "couple",
    coupleId: membership.coupleId,
    createdBy: userId,
    scoringRule: input.answerType,
    config: { maxLength: 240 },
    sortOrder: 1000,
    locale: "en",
    dependsOn: null,
    createdAt: now(),
    updatedAt: now(),
  };
  await repo.insert("questions", question);
  const options: QuestionOption[] = input.options.filter(Boolean).map((label, index) => ({
    id: createId(),
    questionId: id,
    label: label.trim(),
    value: label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `option-${index + 1}`,
    imageUrl: null,
    sortOrder: index + 1,
  }));
  for (const option of options) await repo.insert("questionOptions", option);
  return ok(question);
}

export async function createCustomCard(repo: Repository, userId: string, prompt: string, sensitive: boolean) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Join a couple before adding a question.");
  const text = prompt.trim();
  if (text.length < 8 || text.length > 240) return fail("Write a prompt between 8 and 240 characters.");
  const card = await repo.insert("conversationCards", {
    id: createId(),
    slug: createId(),
    prompt: text,
    depth: sensitive ? "sensitive" : "everyday",
    mood: "curious",
    topic: "custom",
    sensitive,
    isSystem: false,
    coupleId: membership.coupleId,
    createdBy: userId,
    isActive: true,
    locale: "en",
  });
  return ok(card);
}

export async function markSimilarity(repo: Repository, userId: string, questionId: string, mark: "similar" | "partial" | "different") {
  const membership = await activeMembership(repo, userId);
  if (!membership) return fail("Join a couple first.");
  const access = await requireMembership(repo, userId, membership.coupleId);
  if (!access.ok) return access;
  const existing = await repo.find("similarityMarks", { eq: { coupleId: membership.coupleId, questionId, userId } });
  if (existing) await repo.update("similarityMarks", existing.id, { mark, updatedAt: now() });
  else await repo.insert("similarityMarks", { id: createId(), coupleId: membership.coupleId, questionId, userId, mark, updatedAt: now() });
  return ok({ mark });
}

export async function exportAccount(repo: Repository, userId: string) {
  const profile = await repo.find("profiles", { eq: { id: userId } });
  const preferences = await repo.find("userPreferences", { eq: { userId } });
  const answers = await repo.list("userAnswers", { eq: { userId } });
  const predictions = await repo.list("answerPredictions", { eq: { predictorId: userId } });
  const reveals = await repo.list("answerReveals", { eq: { viewerId: userId } });
  const memories = (await repo.list("coupleMemories", {})).filter((memory) => memory.authorId === userId || reveals.some((reveal) => reveal.coupleId === memory.coupleId));
  const visibleMemoriesOnly = memories.filter((memory) => memory.authorId === userId || memory.visibility === "shared");
  const personality = await repo.list("personalityResults", { eq: { userId } });
  const notifications = await repo.list("notifications", { eq: { userId } });
  const { exportCycleData } = await import("@/lib/services/cycle");
  const cycle = await exportCycleData(repo, userId);
  await writeAudit(repo, userId, "account.exported");
  return {
    exportedAt: now(),
    profile,
    preferences,
    answers,
    predictions,
    memories: visibleMemoriesOnly,
    personality,
    cycle,
    notifications: notifications.map(({ title, body, type, createdAt, href }) => ({ title, body, type, createdAt, href })),
    note: "This file contains your own answers and your private cycle records. A partner's answer is included only when you already had permission to see it through a reveal, and only your copy of shared memories is included.",
  };
}

export async function deleteAccount(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (membership) {
    const { leaveCouple } = await import("@/lib/services/couples");
    await leaveCouple(repo, userId);
  }
  const { deleteCycleData } = await import("@/lib/services/cycle");
  await deleteCycleData(repo, userId);
  const tables = ["userAnswers", "answerPredictions", "personalityAnswers", "personalityResults", "personalitySessions", "cardActivity", "savedQuestions", "notifications", "userAchievements", "reports", "emailTokens", "loginAttempts"] as const;
  for (const table of tables) {
    const key = table === "reports" ? "reporterId" : table === "emailTokens" || table === "loginAttempts" ? null : "userId";
    if (key) await repo.removeWhere(table, { eq: { [key]: userId } as never });
  }
  await repo.removeWhere("reports", { eq: { reporterId: userId } });
  await repo.removeWhere("emailTokens", { eq: { userId } });
  await repo.removeWhere("userBlocks", { eq: { blockerId: userId } });
  await repo.remove("credentials", userId);
  await repo.remove("userPreferences", userId);
  await repo.remove("profiles", userId);
  await writeAudit(repo, null, "account.deleted");
  return ok({ deleted: true });
}

export async function fileReport(repo: Repository, userId: string, input: { targetType: "user" | "question" | "memory" | "card"; targetId: string; reason: string; details?: string }) {
  const reason = input.reason.trim();
  if (reason.length < 3) return fail("Add a short reason.");
  await repo.insert("reports", {
    id: createId(),
    reporterId: userId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason,
    details: input.details?.trim() || null,
    status: "open",
    createdAt: now(),
  });
  await writeAudit(repo, userId, "report.created");
  return ok({ sent: true });
}

export async function blockUser(repo: Repository, userId: string, blockedId: string) {
  if (userId === blockedId) return fail("You cannot block yourself.");
  const existing = await repo.find("userBlocks", { eq: { blockerId: userId, blockedId } });
  if (!existing) await repo.insert("userBlocks", { id: createId(), blockerId: userId, blockedId, createdAt: now() });
  return ok({ blocked: true });
}

export async function adminStats(repo: Repository) {
  const [profiles, couples, sessions, questions, reports] = await Promise.all([
    repo.list("profiles", {}),
    repo.list("couples", {}),
    repo.list("quizSessions", { eq: { status: "completed" } }),
    repo.list("questions", {}),
    repo.list("reports", { eq: { status: "open" } }),
  ]);
  return {
    people: profiles.filter((profile) => !profile.isDemo).length,
    couples: couples.filter((couple) => couple.status === "active").length,
    completedSessions: sessions.length,
    questions: questions.filter((question) => question.isActive).length,
    openReports: reports.length,
  };
}

export async function saveAdminQuestion(repo: Repository, input: { id?: string; selfPrompt: string; guessPrompt: string; answerType: Question["answerType"]; categoryId: string; difficulty: Question["difficulty"]; sensitive: boolean; isActive: boolean; options: string[] }) {
  const id = input.id || createId();
  const existing = input.id ? await repo.find("questions", { eq: { id } }) : null;
  const question: Question = {
    id,
    categoryId: input.categoryId,
    slug: existing?.slug ?? id,
    selfPrompt: input.selfPrompt.trim(),
    guessPrompt: input.guessPrompt.trim(),
    reversePrompt: existing?.reversePrompt ?? `What would your partner guess? ${input.selfPrompt.trim()}`,
    answerType: input.answerType,
    difficulty: input.difficulty,
    sensitive: input.sensitive,
    isActive: input.isActive,
    isSystem: existing?.isSystem ?? false,
    visibility: existing?.visibility ?? "public",
    coupleId: existing?.coupleId ?? null,
    createdBy: existing?.createdBy ?? null,
    scoringRule: input.answerType,
    config: existing?.config ?? {},
    sortOrder: existing?.sortOrder ?? 900,
    locale: "en",
    dependsOn: existing?.dependsOn ?? null,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  };
  if (existing) await repo.update("questions", id, question);
  else await repo.insert("questions", question);
  if (input.options.length) {
    await repo.removeWhere("questionOptions", { eq: { questionId: id } });
    for (const [index, label] of input.options.entries()) {
      const value = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `option-${index + 1}`;
      await repo.insert("questionOptions", { id: createId(), questionId: id, label: label.trim(), value, imageUrl: null, sortOrder: index + 1 });
    }
  }
  return ok(question);
}

export async function reviewReport(repo: Repository, reportId: string, status: "reviewed" | "dismissed", disableQuestion: boolean) {
  const report = await repo.find("reports", { eq: { id: reportId } });
  if (!report) return fail("Report not found.");
  await repo.update("reports", report.id, { status });
  if (disableQuestion && report.targetType === "question") {
    const question = await repo.find("questions", { eq: { id: report.targetId } });
    if (question && !question.isSystem) await repo.update("questions", question.id, { isActive: false, updatedAt: now() });
  }
  return ok({ status });
}

export async function saveUploadedMedia(repo: Repository, userId: string, file: { fileName: string; contentType: string; size: number; storagePath: string }, memoryId?: string) {
  const membership = await activeMembership(repo, userId);
  const media = await repo.insert("mediaObjects", {
    id: createId(),
    ownerId: userId,
    coupleId: membership?.coupleId ?? null,
    fileName: file.fileName,
    contentType: file.contentType,
    size: file.size,
    storagePath: file.storagePath,
    createdAt: now(),
  });
  if (memoryId && membership) {
    const memory = await repo.find("coupleMemories", { eq: { id: memoryId, authorId: userId } });
    if (memory) {
      await repo.insert("memoryAttachments", {
        id: media.id,
        memoryId,
        coupleId: membership.coupleId,
        ownerId: userId,
        fileName: file.fileName,
        contentType: file.contentType,
        size: file.size,
        storagePath: file.storagePath,
        createdAt: now(),
      });
    }
  }
  return ok(media);
}

export type { AnswerPayload };
