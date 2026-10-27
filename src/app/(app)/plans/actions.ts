"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { createId } from "@/lib/ids";
import { storeMediaFile } from "@/lib/media-files";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { activityFromForm, checklistFromForm, commentFromForm, dayFromForm, expenseFromForm, planFromForm } from "@/lib/plans/parse";
import { roundMoney } from "@/lib/plans/money";
import {
  createDatePlan,
  createSampleDatePlan,
  deleteActivity,
  deleteChecklistItem,
  deleteComment,
  deleteDatePlan,
  deleteExpense,
  deleteItineraryDay,
  patchExpenseAmounts,
  reorderActivities,
  saveActivity,
  saveChecklistItem,
  saveComment,
  saveExpense,
  saveItineraryDay,
  toggleChecklistItem,
  updateDatePlan,
} from "@/lib/services/plans";
import { saveUploadedMedia } from "@/lib/services/life";
import { createAdminClient } from "@/lib/supabase/admin";

const images = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const files = new Set([...images, "application/pdf"]);

async function context() {
  const user = await requireUser();
  if (user.actor) redirect(`/plans?error=${encodeURIComponent("Plans stay read-only while an administrator is viewing this account.")}`);
  return { user, repo: await getRepository() };
}

function refresh(path: string) {
  revalidatePath("/plans");
  revalidatePath("/home");
  const id = path.match(/^\/plans\/([^/?#]+)/)?.[1];
  if (id && id !== "new") {
    revalidatePath(`/plans/${id}`);
    revalidatePath(`/plans/${id}/budget`);
    revalidatePath(`/plans/${id}/edit`);
  }
}

function finish(path: string, error?: string, saved = "1"): never {
  refresh(path);
  redirect(error ? withParam(path, "error", error) : withParam(path, "saved", saved));
}

function withParam(path: string, key: string, value: string) {
  const hashAt = path.indexOf("#");
  const bare = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const [pathname, query = ""] = bare.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

function back(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") ?? "").trim();
  if (!value.startsWith("/plans") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return fallback;
  return value;
}

async function attempt(path: string, work: () => Promise<{ ok: true } | { ok: false; error: string }>, saved?: string) {
  try {
    const result = await work();
    finish(path, result.ok ? undefined : result.error, saved);
  } catch (error) {
    if (isMissingPlanTable(error)) finish(path, "Date plans are not available until the database migration is applied.");
    throw error;
  }
}

async function storePlanFile(userId: string, file: FormDataEntryValue | null, imageOnly = false) {
  if (!(file instanceof File) || file.size === 0) return { ok: true as const, path: null };
  const contentType = file.type === "image/jpg" || file.type === "image/pjpeg" ? "image/jpeg" : file.type === "image/x-png" ? "image/png" : file.type;
  const allowed = imageOnly ? images : files;
  if (!allowed.has(contentType)) return { ok: false as const, error: imageOnly ? "Use a JPEG, PNG, WEBP, or GIF photo." : "Use a JPEG, PNG, WEBP, GIF, or PDF." };
  if (file.size > 5_000_000) return { ok: false as const, error: "That file is too large." };
  try {
    const repo = await getRepository();
    const id = createId();
    const bytes = Buffer.from(await file.arrayBuffer());
    const storagePath = isSupabaseConfigured() ? `${userId}/${id}` : await storeMediaFile(id, bytes, contentType, file.name);
    if (isSupabaseConfigured()) {
      const upload = await createAdminClient().storage.from("private-media").upload(storagePath, bytes, { contentType });
      if (upload.error) return { ok: false as const, error: "The file could not be saved." };
    }
    const saved = await saveUploadedMedia(repo, userId, { fileName: file.name || "upload", contentType, size: file.size, storagePath });
    if (!saved.ok) return { ok: false as const, error: saved.error };
    return { ok: true as const, path: `/api/media/${saved.data.id}` };
  } catch {
    return { ok: false as const, error: "The file could not be saved." };
  }
}

export async function createPlanAction(formData: FormData) {
  const { user, repo } = await context();
  const parsed = planFromForm(formData);
  if (!parsed.ok) finish("/plans/new", parsed.error);
  const cover = await storePlanFile(user.profile.id, formData.get("cover"), true);
  if (!cover.ok) finish("/plans/new", cover.error);
  await attempt("/plans/new", async () => {
    const result = await createDatePlan(repo, user.profile.id, parsed.data, cover.path);
    if (!result.ok) return result;
    finish(`/plans/${result.data.id}`);
  });
}

export async function createSamplePlanAction() {
  const { user, repo } = await context();
  await attempt("/plans", async () => {
    const result = await createSampleDatePlan(repo, user.profile.id);
    if (!result.ok) return result;
    finish(`/plans/${result.data.id}`, undefined, "sample");
  });
}

export async function updatePlanAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = `/plans/${planId}/edit`;
  const parsed = planFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  const cover = await storePlanFile(user.profile.id, formData.get("cover"), true);
  if (!cover.ok) finish(path, cover.error);
  const nextCover = cover.path ? cover.path : formData.get("removeCover") === "1" ? null : undefined;
  await attempt(path, () => updateDatePlan(repo, user.profile.id, planId, parsed.data, nextCover));
}

export async function deletePlanAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt("/plans", () => deleteDatePlan(repo, user.profile.id, planId), "deleted");
}

export async function saveDayAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = back(formData, `/plans/${planId}`);
  const parsed = dayFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  await attempt(path, () => saveItineraryDay(repo, user.profile.id, planId, parsed.data));
}

export async function deleteDayAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(back(formData, `/plans/${planId}`), () => deleteItineraryDay(repo, user.profile.id, planId, String(formData.get("dayId") ?? "")));
}

export async function saveActivityAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = back(formData, `/plans/${planId}`);
  const parsed = activityFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  const photo = await storePlanFile(user.profile.id, formData.get("photo"), true);
  if (!photo.ok) finish(path, photo.error);
  const nextPhoto = photo.path ? photo.path : formData.get("removePhoto") === "1" ? null : undefined;
  await attempt(path, () => saveActivity(repo, user.profile.id, planId, parsed.data, nextPhoto));
}

export async function deleteActivityAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(back(formData, `/plans/${planId}`), () => deleteActivity(repo, user.profile.id, planId, String(formData.get("activityId") ?? "")));
}

export async function reorderActivitiesAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = `/plans/${planId}`;
  try {
    const result = await reorderActivities(repo, user.profile.id, planId, String(formData.get("dayId") ?? ""), String(formData.get("order") ?? "").split(","));
    if (!result.ok) finish(path, result.error);
    refresh(path);
  } catch (error) {
    if (isMissingPlanTable(error)) finish(path, "Date plans are not available until the database migration is applied.");
    throw error;
  }
}

export async function saveChecklistAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = back(formData, `/plans/${planId}`);
  const parsed = checklistFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  await attempt(path, () => saveChecklistItem(repo, user.profile.id, planId, parsed.data.activityId, parsed.data.title));
}

export async function toggleChecklistAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(back(formData, `/plans/${planId}`), () => toggleChecklistItem(repo, user.profile.id, planId, String(formData.get("checklistId") ?? ""), formData.get("completed") === "1"));
}

export async function deleteChecklistAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(back(formData, `/plans/${planId}`), () => deleteChecklistItem(repo, user.profile.id, planId, String(formData.get("checklistId") ?? "")));
}

export async function saveExpenseAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = back(formData, `/plans/${planId}/budget`);
  const parsed = expenseFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  const receipt = await storePlanFile(user.profile.id, formData.get("receipt"));
  if (!receipt.ok) finish(path, receipt.error);
  const nextReceipt = receipt.path ? receipt.path : formData.get("removeReceipt") === "1" ? null : undefined;
  await attempt(path, () => saveExpense(repo, user.profile.id, planId, parsed.data, nextReceipt));
}

export async function patchExpenseAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = `/plans/${planId}/budget`;
  const estimated = amount(formData.get("estimatedAmount"));
  const actual = amount(formData.get("actualAmount"));
  if (!estimated.ok || !actual.ok) finish(path, "Enter amounts with up to two decimal places.");
  await attempt(path, () => patchExpenseAmounts(repo, user.profile.id, planId, String(formData.get("expenseId") ?? ""), estimated.data, actual.data));
}

export async function deleteExpenseAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(`/plans/${planId}/budget`, () => deleteExpense(repo, user.profile.id, planId, String(formData.get("expenseId") ?? "")));
}

export async function saveCommentAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  const path = back(formData, `/plans/${planId}`);
  const parsed = commentFromForm(formData);
  if (!parsed.ok) finish(path, parsed.error);
  await attempt(path, () => saveComment(repo, user.profile.id, planId, parsed.data.body, parsed.data.activityId));
}

export async function deleteCommentAction(formData: FormData) {
  const { user, repo } = await context();
  const planId = String(formData.get("planId") ?? "");
  await attempt(back(formData, `/plans/${planId}`), () => deleteComment(repo, user.profile.id, planId, String(formData.get("commentId") ?? "")));
}

function amount(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return { ok: true as const, data: 0 };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false as const, error: "Enter amounts with up to two decimal places." };
  const data = roundMoney(Number(text));
  if (data > 99_999_999.99) return { ok: false as const, error: "That amount is too large." };
  return { ok: true as const, data };
}
