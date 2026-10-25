"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { checkInFromForm, profileFromForm } from "@/lib/cycle/parse";
import { getRepository } from "@/lib/data";
import { deleteCheckIn, deleteCycleData, deleteEvent, deletePeriod, deletePregnancyLog, deleteReminder, saveCheckIn, saveCycleProfile, saveEvent, savePeriod, savePregnancyLog, saveReminder } from "@/lib/services/cycle";

async function context() {
  const user = await requireUser();
  if (user.actor) redirect("/cycle?error=Cycle%20records%20stay%20hidden%20during%20admin%20view.");
  return { user, repo: await getRepository() };
}

function finish(path: string, error?: string) {
  revalidatePath("/cycle");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}` : `${path}${path.includes("?") ? "&" : "?"}saved=1`);
}

export async function savePeriodAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await savePeriod(repo, user.profile.id, {
    id: String(formData.get("id") ?? "") || undefined,
    startedOn: formData.get("startedOn"),
    endedOn: formData.get("endedOn"),
    note: formData.get("note"),
  });
  finish("/cycle", result.ok ? undefined : result.error);
}

export async function deletePeriodAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await deletePeriod(repo, user.profile.id, String(formData.get("id") ?? ""));
  finish("/cycle", result.ok ? undefined : result.error);
}

export async function saveCheckInAction(formData: FormData) {
  const { user, repo } = await context();
  const day = String(formData.get("day") ?? "");
  const parsed = checkInFromForm(formData);
  if (!parsed.success) finish(`/cycle/check-in?day=${day}`, parsed.error.issues[0]?.message ?? "Check the entry.");
  const result = await saveCheckIn(repo, user.profile.id, parsed.data);
  finish(`/cycle/check-in?day=${day}`, result.ok ? undefined : result.error);
}

export async function deleteCheckInAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await deleteCheckIn(repo, user.profile.id, String(formData.get("id") ?? ""));
  finish("/cycle/check-in", result.ok ? undefined : result.error);
}

export async function saveProfileAction(formData: FormData) {
  const { user, repo } = await context();
  const parsed = profileFromForm(formData);
  if (!parsed.success) finish("/cycle/settings", parsed.error.issues[0]?.message ?? "Check the settings.");
  const result = await saveCycleProfile(repo, user.profile.id, parsed.data);
  finish("/cycle/settings", result.ok ? undefined : result.error);
}

export async function savePregnancyAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await savePregnancyLog(repo, user.profile.id, {
    testedOn: formData.get("testedOn"),
    result: formData.get("result"),
    notes: formData.get("notes"),
  });
  finish("/cycle", result.ok ? undefined : result.error);
}

export async function deletePregnancyAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await deletePregnancyLog(repo, user.profile.id, String(formData.get("id") ?? ""));
  finish("/cycle", result.ok ? undefined : result.error);
}

export async function saveEventAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await saveEvent(repo, user.profile.id, {
    id: String(formData.get("id") ?? "") || undefined,
    day: formData.get("day"),
    title: formData.get("title"),
    body: formData.get("body"),
    visibility: formData.get("visibility"),
  });
  finish("/cycle/calendar", result.ok ? undefined : result.error);
}

export async function deleteEventAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await deleteEvent(repo, user.profile.id, String(formData.get("id") ?? ""));
  finish("/cycle/calendar", result.ok ? undefined : result.error);
}

export async function saveReminderAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await saveReminder(repo, user.profile.id, {
    id: String(formData.get("id") ?? "") || undefined,
    kind: formData.get("kind") || "custom",
    title: formData.get("title"),
    hour: formData.get("hour"),
    enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
  });
  finish("/cycle/settings", result.ok ? undefined : result.error);
}

export async function deleteReminderAction(formData: FormData) {
  const { user, repo } = await context();
  const result = await deleteReminder(repo, user.profile.id, String(formData.get("id") ?? ""));
  finish("/cycle/settings", result.ok ? undefined : result.error);
}

export async function deleteCycleAction(formData: FormData) {
  const { user, repo } = await context();
  if (String(formData.get("confirm") ?? "") !== "DELETE") finish("/cycle/settings", "Type DELETE to erase cycle data.");
  const result = await deleteCycleData(repo, user.profile.id);
  finish("/cycle", result.ok ? undefined : result.error);
}
