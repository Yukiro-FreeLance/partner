"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accountStatusOf } from "@/lib/auth/account-status";
import { isSuperAdminEmail, isSupabaseConfigured } from "@/lib/config";
import { sendAuthLink, sendNotice } from "@/lib/email";
import { getRepository } from "@/lib/data";
import { runWrite } from "@/lib/data/repository";
import { loginAccount, provisionAccount, registerAccount, requestPasswordReset, resendVerification, resetPassword, verifyEmailToken } from "@/lib/auth/accounts";
import { clearImpersonationCookie, clearSessionCookie, consumePairPath, defaultPreferences, forgetAppSession, getCurrentUser, isStaffRole, rememberPairPath, requireUser, safePairPath, setImpersonationCookie, setSessionCookie } from "@/lib/auth/session";
import { DEMO_JORDAN_EMAIL, DEMO_MAYA_EMAIL, resetDemo } from "@/lib/demo/seed";
import { createId } from "@/lib/ids";
import { contactSchema, coupleSchema, genderSchema, loginSchema, memorySchema, registerSchema, resetSchema } from "@/lib/validators";
import { pauseCycleSharing } from "@/lib/services/cycle";
import { acceptInvitation, createCouple, createInvitation, invitationKey, leaveCouple, regenerateInvitation, requestReconnect, respondReconnect, revokeInvitation } from "@/lib/services/couples";
import { completeQuiz, getOrCreateDaily, saveQuizBatch, saveQuizProgress, shareSoloResults, startQuiz } from "@/lib/services/quiz";
import { completePersonality, savePersonalityAnswer, setPersonalityShared, startPersonality } from "@/lib/services/personality";
import { activeMembership, couplePartners, writeAudit } from "@/lib/services/access";
import { saveSiteSettings, storeSiteAsset } from "@/lib/site-settings";
import { addReflection, adminStats, blockUser, createCustomCard, createCustomQuestion, createMemory, deleteAccount, deleteMemory, fileReport, markSimilarity, reviewReport, saveAdminQuestion, saveCardState, updateMemory } from "@/lib/services/life";
import type { AnswerPayload, QuizMode } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string; link?: string };

function isNextControlFlow(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest);
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function accountRole(value: string) {
  if (value === "user" || value === "admin" || value === "super_admin") return value;
  return null;
}

async function mailedOrLocal(input: { to: string; subject: string; intro: string; path: string; localMessage: string; sentMessage: string }): Promise<FormState> {
  const sent = await sendAuthLink(input);
  if (sent.ok) return { message: input.sentMessage };
  if (sent.reason === "testing") {
    return { message: "Your account is ready. Resend is still in test mode, so it can only mail the inbox that owns the API key. Use this one-time link until a domain is verified at resend.com/domains.", link: input.path };
  }
  if (sent.reason === "failed") return { message: "The email could not be sent. Use this one-time link to continue.", link: input.path };
  return { message: input.localMessage, link: input.path };
}

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    displayName: formString(formData, "displayName"),
    email: formString(formData, "email"),
    gender: formString(formData, "gender"),
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  await rememberPairPath(formString(formData, "next"));
  let created: Awaited<ReturnType<typeof registerAccount>>;
  try {
    const repo = await getRepository();
    created = await registerAccount(repo, parsed.data);
  } catch (error) {
    console.error("Registration failed", error instanceof Error ? error.message : "unknown error");
    return { error: "The account store could not be reached, so the account was not created." };
  }
  if (!created.ok) return { error: created.error };
  return mailedOrLocal({
    to: created.data.email,
    subject: "Verify your CoupleSync email",
    intro: "Confirm this address to finish creating your account. The link expires in 24 hours.",
    path: `/api/verify-email?token=${encodeURIComponent(created.data.verifyToken)}`,
    sentMessage: "Account created. Check your email for the verification link.",
    localMessage: "Account created. Email delivery is not configured, so use this one-time verification link on this machine.",
  });
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formString(formData, "email"), password: formString(formData, "password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  try {
    const repo = await getRepository();
    const loggedIn = await loginAccount(repo, parsed.data.email, parsed.data.password);
    if (!loggedIn.ok) return { error: loggedIn.error };
    await setSessionCookie(loggedIn.data.id);
    const next = safePairPath(formString(formData, "next")) ?? (await consumePairPath());
    redirect(next ?? (await destination(loggedIn.data.id)));
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    console.error("Sign in failed", error instanceof Error ? error.message : "unknown error");
    return { error: "Sign-in could not reach the account store. Nothing was changed. Try again in a few minutes." };
  }
}

async function destination(userId: string) {
  const repo = await getRepository();
  const preferences = await repo.find("userPreferences", { eq: { userId } });
  return preferences?.onboardingCompleted ? "/home" : "/onboarding";
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearSessionCookie();
  redirect("/");
}

export async function demoAction(formData: FormData) {
  const who = formString(formData, "who");
  if (who !== "maya" && who !== "jordan") return;
  const repo = await getRepository();
  const email = who === "maya" ? DEMO_MAYA_EMAIL : DEMO_JORDAN_EMAIL;
  const profile = await repo.find("profiles", { eq: { email, isDemo: true } });
  if (!profile) return;
  await setSessionCookie(profile.id);
  redirect("/home");
}

export async function forgotAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = formString(formData, "email").trim();
  const repo = await getRepository();
  const result = await requestPasswordReset(repo, email);
  if (!result.ok) return { error: result.error };
  if (!result.data.token) return { message: "If an account exists for that email, a reset link is ready. Demo profiles do not use password reset." };
  return mailedOrLocal({
    to: email,
    subject: "Reset your CoupleSync password",
    intro: "Use this link to choose a new password. It expires in 30 minutes.",
    path: `/reset-password?token=${result.data.token}`,
    sentMessage: "If an account exists for that email, a reset link is on its way.",
    localMessage: "Email delivery is not configured. Use this one-time reset link on this machine.",
  });
}

export async function resetAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ password: formString(formData, "password"), confirmPassword: formString(formData, "confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the password." };
  const repo = await getRepository();
  const result = await resetPassword(repo, formString(formData, "token"), parsed.data.password);
  if (!result.ok) return { error: result.error };
  return { message: "Password updated. You can sign in." };
}

export async function verifyAction(token: string): Promise<FormState> {
  const repo = await getRepository();
  const result = await verifyEmailToken(repo, token);
  if (!result.ok) return { error: result.error };
  return { message: "Email verified. You can sign in." };
}

export async function resendAction(_state: FormState, formData: FormData): Promise<FormState> {
  const repo = await getRepository();
  const result = await resendVerification(repo, formString(formData, "email"));
  if (!result.ok) return { error: result.error };
  if (!result.data.token) return { message: "If that account still needs verification, a new link is ready." };
  return mailedOrLocal({
    to: formString(formData, "email"),
    subject: "Verify your CoupleSync email",
    intro: "Here is a new link to confirm your email. It expires in 24 hours.",
    path: `/api/verify-email?token=${encodeURIComponent(result.data.token)}`,
    sentMessage: "If that account still needs verification, a new link is on its way.",
    localMessage: "Use this one-time verification link on this machine.",
  });
}

export async function createCoupleAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = coupleSchema.safeParse({ name: formString(formData, "name"), nickname: formString(formData, "nickname") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the couple name." };
  const repo = await getRepository();
  const created = await createCouple(repo, user.profile.id, parsed.data);
  if (!created.ok) return { error: created.error };
  redirect("/pairing");
}

export async function previewInviteAction(formData: FormData) {
  const code = invitationKey(formString(formData, "code"));
  if (!code) redirect("/join");
  const path = `/invite/${encodeURIComponent(code)}`;
  const user = await getCurrentUser();
  if (!user) {
    await rememberPairPath(path);
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  redirect(path);
}

export async function confirmPairAction(formData: FormData) {
  const user = await requireUser();
  const code = invitationKey(formString(formData, "code"));
  const repo = await getRepository();
  const joined = await acceptInvitation(repo, user.profile.id, code);
  if (!joined.ok) redirect(`/invite/${encodeURIComponent(code)}?error=${encodeURIComponent(joined.error)}`);
  await consumePairPath();
  redirect("/home");
}

export async function pairingStatusAction() {
  const user = await getCurrentUser();
  if (!user) return { paired: false };
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  if (!membership) return { paired: false };
  const partners = await couplePartners(repo, membership.coupleId);
  return { paired: partners.length >= 2 };
}

export async function regenerateInviteAction() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await repo.find("coupleMembers", { eq: { userId: user.profile.id, status: "active" } });
  if (!membership) redirect("/pairing");
  await regenerateInvitation(repo, user.profile.id, membership.coupleId);
  revalidatePath("/pairing");
  revalidatePath("/settings");
  revalidatePath("/home");
}

export async function joinCoupleAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const repo = await getRepository();
  const joined = await acceptInvitation(repo, user.profile.id, formString(formData, "code"));
  if (!joined.ok) return { error: joined.error };
  await consumePairPath();
  redirect("/home");
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await revokeInvitation(repo, user.profile.id, formString(formData, "invitationId"));
  revalidatePath("/settings");
  revalidatePath("/pairing");
  revalidatePath("/home");
}

export async function newInviteAction() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await repo.find("coupleMembers", { eq: { userId: user.profile.id, status: "active" } });
  if (!membership) return;
  await createInvitation(repo, user.profile.id, membership.coupleId);
  revalidatePath("/settings");
  revalidatePath("/pairing");
  revalidatePath("/home");
}

export async function leaveCoupleAction() {
  const user = await requireUser();
  const repo = await getRepository();
  await leaveCouple(repo, user.profile.id);
  redirect("/onboarding");
}

export async function reconnectAction() {
  const user = await requireUser();
  const repo = await getRepository();
  const previous = (await repo.list("coupleMembers", { eq: { userId: user.profile.id, status: "left" } })).sort((a, b) => (b.leftAt ?? "").localeCompare(a.leftAt ?? ""))[0];
  if (!previous) return;
  await requestReconnect(repo, user.profile.id, previous.coupleId);
  revalidatePath("/settings");
}

export async function reconnectReplyAction(formData: FormData) {
  const user = await requireUser();
  const decision = formString(formData, "decision") === "approved" ? "approved" : "declined";
  const repo = await getRepository();
  await respondReconnect(repo, user.profile.id, formString(formData, "requestId"), decision);
  revalidatePath("/settings");
}

export async function onboardingAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const step = formString(formData, "step");
  const preferences = { ...user.preferences };
  if (step === "profile") {
    await repo.update("profiles", user.profile.id, { displayName: formString(formData, "displayName").trim() || user.profile.displayName, updatedAt: new Date().toISOString() });
    preferences.onboardingStep = "relationship";
  } else if (step === "relationship") {
    await repo.update("profiles", user.profile.id, {
      relationshipStatus: formString(formData, "relationshipStatus") || null,
      relationshipStartedOn: formString(formData, "relationshipStartedOn") || null,
      updatedAt: new Date().toISOString(),
    });
    preferences.onboardingStep = "language";
  } else if (step === "language") {
    const locale = formString(formData, "locale") === "fil" ? "fil" : "en";
    preferences.locale = locale;
    preferences.onboardingStep = "interests";
  } else if (step === "interests") {
    const interests = formData.getAll("interests").map(String);
    const preferredCategories = formData.getAll("categories").map(String);
    await repo.update("profiles", user.profile.id, { interests, preferredCategories, updatedAt: new Date().toISOString() });
    preferences.onboardingStep = "pairing";
  } else if (step === "skip") {
    preferences.onboardingCompleted = true;
    preferences.onboardingStep = "done";
  }
  await repo.update("userPreferences", user.profile.id, preferences);
  if (preferences.onboardingCompleted) redirect("/home");
  redirect(`/onboarding?step=${preferences.onboardingStep}`);
}

export async function finishOnboardingAction() {
  const user = await requireUser();
  const repo = await getRepository();
  await repo.update("userPreferences", user.profile.id, { ...user.preferences, onboardingCompleted: true, onboardingStep: "done" });
  redirect("/home");
}

export async function startQuizAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const roundId = formString(formData, "roundId");
  if (roundId) {
    const joined = await startQuiz(repo, user.profile.id, { mode: "exchange", roundId });
    if (!joined.ok) redirect(`/play?error=${encodeURIComponent(joined.error)}`);
    if (joined.data.session.status === "completed") redirect(`/play/results/${joined.data.round.id}`);
    redirect(`/play/quiz/${joined.data.session.id}`);
  }
  const mode = formString(formData, "mode") as QuizMode;
  const size = Number(formString(formData, "size") || "10");
  const categories = formData.getAll("categories").map(String);
  const adult = formData.get("adult") === "on";
  if (categories.includes("intimacy") && !adult) redirect("/play?error=Closeness%20questions%20are%20for%20adults%20who%20choose%20to%20include%20them.");
  const started = await startQuiz(repo, user.profile.id, {
    mode: mode || "exchange",
    title: formString(formData, "title") || undefined,
    size: Number.isFinite(size) ? size : 10,
    categories,
    difficulty: (formString(formData, "difficulty") || "mixed") as "easy" | "medium" | "deep" | "mixed",
    timerSeconds: formData.get("timer") === "on" ? 45 : null,
    includeSensitive: formData.get("includeSensitive") === "on" || (categories.includes("intimacy") && adult),
  });
  if (!started.ok) redirect(`/play?error=${encodeURIComponent(started.error)}`);
  redirect(`/play/quiz/${started.data.session.id}`);
}

export async function dailyAction() {
  const user = await requireUser();
  const repo = await getRepository();
  const daily = await getOrCreateDaily(repo, user.profile.id);
  if (!daily.ok) redirect(`/play?error=${encodeURIComponent(daily.error)}`);
  redirect(`/play/quiz/${daily.data.session.id}`);
}

export async function saveQuizAction(input: { sessionId: string; questionId: string; currentIndex: number; selfAnswer?: { payload: AnswerPayload; skipped: boolean } | null; prediction?: { payload: AnswerPayload; skipped: boolean } | null }) {
  const user = await requireUser();
  const repo = await getRepository();
  return saveQuizProgress(repo, user.profile.id, input);
}

export async function completeQuizAction(sessionId: string) {
  const user = await requireUser();
  const repo = await getRepository();
  const result = await completeQuiz(repo, user.profile.id, sessionId);
  if (!result.ok) return { error: result.error };
  redirect(`/play/results/${result.data.roundId}`);
}

export async function finishQuizAction(input: { sessionId: string; currentIndex: number; answers: { questionId: string; selfAnswer?: { payload: AnswerPayload; skipped: boolean } | null; prediction?: { payload: AnswerPayload; skipped: boolean } | null }[] }) {
  const user = await requireUser();
  const repo = await getRepository();
  const result = await runWrite(repo, async (tx) => {
    const saved = await saveQuizBatch(tx, user.profile.id, input);
    if (!saved.ok) return saved;
    if (saved.data.added.length) return { ok: true as const, data: { added: saved.data.added } };
    return completeQuiz(tx, user.profile.id, input.sessionId);
  });
  if (!result.ok) return { error: result.error };
  if ("added" in result.data) return { added: result.data.added };
  redirect(`/play/results/${result.data.roundId}`);
}

export async function shareSoloAction(roundId: string) {
  const user = await requireUser();
  const repo = await getRepository();
  await shareSoloResults(repo, user.profile.id, roundId);
  revalidatePath(`/play/results/${roundId}`);
}

export async function similarityAction(formData: FormData) {
  const user = await requireUser();
  const mark = formString(formData, "mark");
  if (mark !== "similar" && mark !== "partial" && mark !== "different") return;
  const repo = await getRepository();
  await markSimilarity(repo, user.profile.id, formString(formData, "questionId"), mark);
  revalidatePath("/connection");
}

export async function personalityAnswerAction(input: { sessionId: string; questionId: string; payload: AnswerPayload; skipped: boolean }) {
  const user = await requireUser();
  const repo = await getRepository();
  return savePersonalityAnswer(repo, user.profile.id, input.sessionId, input.questionId, input.payload, input.skipped);
}

export async function startPersonalityAction(slug: string) {
  const user = await requireUser();
  const repo = await getRepository();
  const started = await startPersonality(repo, user.profile.id, slug);
  if (!started.ok) redirect("/personality");
  redirect(`/personality/${slug}?session=${started.data.session.id}`);
}

export async function completePersonalityAction(sessionId: string, slug: string) {
  const user = await requireUser();
  const repo = await getRepository();
  const result = await completePersonality(repo, user.profile.id, sessionId);
  if (!result.ok) return { error: result.error };
  redirect(`/personality/${slug}/results`);
}

export async function sharePersonalityAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await setPersonalityShared(repo, user.profile.id, formString(formData, "resultId"), formData.get("shared") === "on");
  revalidatePath("/personality");
}

export async function memoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = memorySchema.safeParse({
    title: formString(formData, "title"),
    body: formString(formData, "body"),
    kind: formString(formData, "kind"),
    occurredOn: formString(formData, "occurredOn"),
    visibility: formString(formData, "visibility"),
    remindOn: formString(formData, "remindOn"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the memory." };
  const repo = await getRepository();
  const memoryId = formString(formData, "memoryId");
  const saved = memoryId ? await updateMemory(repo, user.profile.id, memoryId, parsed.data) : await createMemory(repo, user.profile.id, parsed.data);
  if (!saved.ok) return { error: saved.error };
  redirect(`/memories/${saved.data.id}`);
}

export async function deleteMemoryAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await deleteMemory(repo, user.profile.id, formString(formData, "memoryId"));
  redirect("/memories");
}

export async function cardAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await saveCardState(repo, user.profile.id, formString(formData, "cardId"), {
    answered: formData.has("answered") ? formData.get("answered") === "true" : undefined,
    hidden: formData.has("hidden") ? formData.get("hidden") === "true" : undefined,
    favorite: formData.has("favorite") ? formData.get("favorite") === "true" : undefined,
    note: formData.has("note") ? formString(formData, "note") : undefined,
  });
  revalidatePath("/play/library");
}

export async function reflectionAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await addReflection(repo, user.profile.id, formString(formData, "cardId"), formString(formData, "body"));
  revalidatePath("/play/library");
}

export async function customQuestionAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const created = await createCustomQuestion(repo, user.profile.id, {
    selfPrompt: formString(formData, "prompt"),
    answerType: (formString(formData, "answerType") || "short_text") as "short_text" | "single" | "multi",
    options: formString(formData, "options").split("\n"),
    sensitive: formData.get("sensitive") === "on",
  });
  if (!created.ok) redirect(`/play/library?error=${encodeURIComponent(created.error)}`);
  revalidatePath("/play/library");
}

export async function customCardAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const created = await createCustomCard(repo, user.profile.id, formString(formData, "prompt"), formData.get("sensitive") === "on");
  if (!created.ok) redirect(`/play/library?error=${encodeURIComponent(created.error)}`);
  revalidatePath("/play/library");
}

export async function settingsAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const chosenTheme = formString(formData, "theme");
  const theme: "light" | "dark" | "system" = chosenTheme === "dark" || chosenTheme === "system" ? chosenTheme : "light";
  const locale: "en" | "fil" = formString(formData, "locale") === "fil" ? "fil" : "en";
  const gender = genderSchema.safeParse(formString(formData, "gender"));
  const returnTo = formString(formData, "returnTo") === "/profile" ? "/profile" : "/settings";
  if (!gender.success) redirect(`${returnTo}?error=${encodeURIComponent("Select a gender.")}`);
  await repo.update("profiles", user.profile.id, {
    displayName: formString(formData, "displayName").trim() || user.profile.displayName,
    gender: gender.data,
    relationshipStatus: formString(formData, "relationshipStatus") || null,
    relationshipStartedOn: formString(formData, "relationshipStartedOn") || null,
    updatedAt: new Date().toISOString(),
  });
  if (user.profile.gender === "female" && gender.data !== "female") await pauseCycleSharing(repo, user.profile.id);
  if (user.profile.gender !== gender.data) await writeAudit(repo, user.profile.id, "account.gender");
  const preferences = await repo.find("userPreferences", { eq: { userId: user.profile.id } });
  const nextPreferences = {
    ...defaultPreferences(user.profile.id),
    ...(preferences ?? {}),
    theme,
    locale,
    emailNotifications: formData.get("emailNotifications") === "on",
    inAppNotifications: formData.get("inAppNotifications") === "on",
    streakPaused: formData.get("streakPaused") === "on",
    reducedMotion: formData.get("reducedMotion") === "on",
    reminderHour: formString(formData, "reminderHour") ? Number(formString(formData, "reminderHour")) : null,
  };
  if (preferences) await repo.update("userPreferences", user.profile.id, nextPreferences);
  else await repo.insert("userPreferences", nextPreferences);
  const store = await cookies();
  store.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  store.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  forgetAppSession(user.profile.id);
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/cycle");
  redirect(formString(formData, "returnTo") === "/profile" ? "/profile?saved=1" : "/settings?saved=1");
}

export async function readNotificationsAction() {
  const user = await requireUser();
  const repo = await getRepository();
  const notes = await repo.list("notifications", { eq: { userId: user.profile.id } });
  for (const note of notes) {
    if (!note.readAt) await repo.update("notifications", note.id, { readAt: new Date().toISOString() });
  }
  revalidatePath("/notifications");
}

export async function reportAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  const targetType = formString(formData, "targetType");
  if (targetType !== "user" && targetType !== "question" && targetType !== "memory" && targetType !== "card") return;
  await fileReport(repo, user.profile.id, { targetType, targetId: formString(formData, "targetId"), reason: formString(formData, "reason"), details: formString(formData, "details") });
  revalidatePath("/settings");
}

export async function blockAction(formData: FormData) {
  const user = await requireUser();
  const repo = await getRepository();
  await blockUser(repo, user.profile.id, formString(formData, "blockedId"));
  revalidatePath("/settings");
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser();
  if (formString(formData, "confirmName").trim() !== user.profile.displayName) return;
  const repo = await getRepository();
  await deleteAccount(repo, user.profile.id);
  if (isSupabaseConfigured()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().auth.admin.deleteUser(user.profile.id);
  }
  await clearSessionCookie();
  redirect("/?deleted=1");
}

export async function resetDemoAction() {
  const user = await requireUser();
  if (!user.profile.isDemo) return;
  const repo = await getRepository();
  await resetDemo(repo);
  const refreshed = await repo.find("profiles", { eq: { email: user.profile.email, isDemo: true } });
  if (refreshed) await setSessionCookie(refreshed.id);
  redirect("/home");
}

export async function contactAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({ name: formString(formData, "name"), email: formString(formData, "email"), message: formString(formData, "message") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the message." };
  const repo = await getRepository();
  const allowed = (await repo.list("supportMessages", { eq: { email: parsed.data.email } })).filter((item) => item.createdAt > new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if (allowed.length >= 5) return { error: "Please wait before sending another message." };
  await repo.insert("supportMessages", { id: createId(), ...parsed.data, createdAt: new Date().toISOString() });
  const inbox = process.env.CONTACT_EMAIL?.trim() ?? "";
  if (inbox) {
    await sendNotice({
      to: inbox,
      subject: "CoupleSync contact message",
      body: `${parsed.data.name} (${parsed.data.email}) wrote: ${parsed.data.message}`,
    });
  }
  return { message: inbox ? "Message saved and sent to the platform inbox." : "Message saved. The platform owner can read it in the admin support list." };
}

export async function impersonateAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") redirect("/home");
  const targetId = formString(formData, "userId");
  if (!targetId || targetId === actor.id) redirect("/admin/users");
  const repo = await getRepository();
  const target = await repo.find("profiles", { eq: { id: targetId } });
  if (!target || target.role === "super_admin" || accountStatusOf(target) !== "active") {
    redirect(`/admin/users?error=${encodeURIComponent("That account cannot be opened.")}`);
  }
  await writeAudit(repo, actor.id, `impersonate ${target.id}`);
  forgetAppSession(actor.id);
  await setImpersonationCookie(target.id, actor.id);
  redirect("/home");
}

export async function createMemberAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin" || actor.isDemo) redirect("/home");
  const displayName = formString(formData, "displayName").trim();
  const email = formString(formData, "email").trim().toLowerCase();
  const password = formString(formData, "password");
  const role = accountRole(formString(formData, "role")) ?? "user";
  const problem = !displayName || displayName.length > 40
    ? "Add a name of 40 characters or fewer."
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Enter a valid email address."
      : password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)
        ? "Use at least 8 characters, with a letter and a number."
        : null;
  if (problem) redirect(`/admin/users?createError=${encodeURIComponent(problem)}`);
  const repo = await getRepository();
  const created = await provisionAccount(repo, { displayName, email, password, role });
  if (!created.ok) redirect(`/admin/users?createError=${encodeURIComponent(created.error)}`);
  await writeAudit(repo, actor.id, `create user ${created.data.userId}`);
  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function setMemberRoleAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") redirect("/home");
  const targetId = formString(formData, "userId");
  const role = accountRole(formString(formData, "role"));
  if (!role) redirect("/admin/users?error=" + encodeURIComponent("Choose a member, admin, or super admin role."));
  if (!targetId || targetId === actor.id) redirect("/admin/users?error=" + encodeURIComponent("You cannot change your own role."));
  const repo = await getRepository();
  const target = await repo.find("profiles", { eq: { id: targetId } });
  if (!target) redirect("/admin/users?error=" + encodeURIComponent("That account is not on this server. Open the list again and save the role."));
  if (target.isDemo) redirect("/admin/users?error=" + encodeURIComponent("Demo profiles stay members."));
  if (isSuperAdminEmail(target.email) && role !== "super_admin") redirect("/admin/users?error=" + encodeURIComponent("The platform owner stays a super admin."));
  await repo.update("profiles", target.id, { role, updatedAt: new Date().toISOString() });
  await writeAudit(repo, actor.id, `set role ${target.id} ${role}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users?saved=${encodeURIComponent(target.displayName)}`);
}

export async function setAccountStatusAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") redirect("/home");
  const targetId = formString(formData, "userId");
  const status = formString(formData, "status");
  if (status !== "active" && status !== "archived" && status !== "deleted") redirect("/admin/users?error=" + encodeURIComponent("Choose archive, delete, or restore."));
  if (!targetId || targetId === actor.id) redirect("/admin/users?error=" + encodeURIComponent("You cannot change your own account."));
  const repo = await getRepository();
  const target = await repo.find("profiles", { eq: { id: targetId } });
  if (!target || target.role === "super_admin") redirect("/admin/users?error=" + encodeURIComponent("That account cannot be changed."));
  await repo.update("profiles", target.id, { accountStatus: status, updatedAt: new Date().toISOString() });
  await writeAudit(repo, actor.id, `account.${status} ${target.id}`);
  revalidatePath("/admin/users");
  const verb = status === "active" ? "restored" : status;
  redirect(`/admin/users?notice=${encodeURIComponent(`${target.displayName} ${verb}.`)}`);
}

export async function deleteMemberPermanentlyAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") redirect("/home");
  const targetId = formString(formData, "userId");
  if (!targetId || targetId === actor.id) redirect("/admin/users?error=" + encodeURIComponent("You cannot erase your own account from this list."));
  const repo = await getRepository();
  const target = await repo.find("profiles", { eq: { id: targetId } });
  if (!target || target.role === "super_admin") redirect("/admin/users?error=" + encodeURIComponent("That account cannot be erased."));
  if (target.isDemo) redirect("/admin/users?error=" + encodeURIComponent("Fictional demo profiles stay with the sample data. Archive or delete them instead."));
  await writeAudit(repo, actor.id, `account.purge ${target.id}`);
  try {
    await deleteAccount(repo, target.id);
  } catch (error) {
    await repo.update("profiles", target.id, { accountStatus: "deleted", updatedAt: new Date().toISOString() });
    const detail = error instanceof Error ? error.message : "Shared records still reference this account.";
    redirect(`/admin/users?error=${encodeURIComponent(`The account was marked deleted. It could not be erased completely: ${detail}`)}`);
  }
  revalidatePath("/admin/users");
  redirect(`/admin/users?notice=${encodeURIComponent(`${target.displayName} was permanently deleted.`)}`);
}

export async function stopImpersonatingAction() {
  const user = await requireUser();
  if (!user.actor) redirect("/home");
  await clearImpersonationCookie();
  redirect("/admin/users");
}

export async function adminQuestionAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) redirect("/home");
  const repo = await getRepository();
  await saveAdminQuestion(repo, {
    id: formString(formData, "id") || undefined,
    selfPrompt: formString(formData, "selfPrompt"),
    guessPrompt: formString(formData, "guessPrompt"),
    answerType: formString(formData, "answerType") as "single",
    categoryId: formString(formData, "categoryId"),
    difficulty: formString(formData, "difficulty") as "easy",
    sensitive: formData.get("sensitive") === "on",
    isActive: formData.get("isActive") === "on",
    options: formString(formData, "options").split("\n").map((line) => line.trim()).filter(Boolean),
  });
  revalidatePath("/admin");
}

export async function adminReportAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) return;
  const repo = await getRepository();
  const status = formString(formData, "status") === "dismissed" ? "dismissed" : "reviewed";
  await reviewReport(repo, formString(formData, "reportId"), status, formData.get("disable") === "on");
  revalidatePath("/admin/reports");
}

export async function siteSettingsAction(formData: FormData) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") redirect("/home");
  const siteName = formString(formData, "siteName").trim().slice(0, 40);
  const title = formString(formData, "title").trim().slice(0, 140);
  const description = formString(formData, "description").trim().slice(0, 300);
  const ogTitle = formString(formData, "ogTitle").trim().slice(0, 140);
  const ogDescription = formString(formData, "ogDescription").trim().slice(0, 300);
  const keywords = formString(formData, "keywords").trim().slice(0, 240);
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(formString(formData, "themeColor").trim()) ? formString(formData, "themeColor").trim() : "#6d28d9";
  if (!siteName || !title || !description) redirect("/admin/settings?error=Add%20a%20site%20name%2C%20title%2C%20and%20description.");
  const repo = await getRepository();
  try {
    await saveSiteSettings({ siteName, title, description, ogTitle: ogTitle || title, ogDescription: ogDescription || description, keywords, themeColor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Site settings could not be saved.";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }
  for (const kind of ["favicon", "apple", "icon", "og"] as const) {
    const file = formData.get(kind);
    if (!(file instanceof File) || file.size === 0) continue;
    const saved = await storeSiteAsset(kind, file);
    if (!saved.ok) redirect(`/admin/settings?error=${encodeURIComponent(saved.error)}`);
  }
  await writeAudit(repo, actor.id, "site.settings");
  revalidatePath("/", "layout");
  revalidatePath("/favicon.ico");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function loadAdminStats() {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) return null;
  return adminStats(await getRepository());
}
