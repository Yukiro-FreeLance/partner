import type { CycleCheckIn, CycleEvent, CyclePeriod, CyclePregnancyLog, CycleProfile, CycleReminder, CycleShareScope } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { activeMembership, isBlocked, notifyUser, otherPartner } from "@/lib/services/access";
import { addDays, calendarDay, compareDates, hourInZone } from "@/lib/cycle/dates";
import { fertilityInsight } from "@/lib/cycle/fertility";
import { checkInSchema, eventSchema, periodSchema, pregnancySchema, profileSchema, reminderSchema } from "@/lib/cycle/parse";
import { projectForPartner } from "@/lib/cycle/privacy";
import { cleanPeriods, predictLocal, recordedCycles } from "@/lib/cycle/predict";
import { resolveEstimate } from "@/lib/cycle/provider";
import { dueReminderPlans, nextReminderDay } from "@/lib/cycle/reminders";
import { driveValue, insightSeries, symptomFrequency } from "@/lib/cycle/report";
import { blankCycleProfile } from "@/lib/cycle/sample";
import { tracksOwnCycle } from "@/lib/gender";
import { createId } from "@/lib/ids";
import { fail, ok, type Result } from "@/lib/result";

const SHARE_FLAGS: [keyof CycleProfile, CycleShareScope][] = [
  ["sharePhaseSummary", "phase_summary"],
  ["sharePeriodSummary", "period_summary"],
  ["shareFertileSummary", "fertile_summary"],
  ["shareMoodSummary", "mood_summary"],
  ["shareSymptomSummary", "symptom_summary"],
  ["shareIntimacySummary", "intimacy_summary"],
  ["shareSelectedDetails", "selected_details"],
];

function stamp() {
  return new Date().toISOString();
}

const TRACKER_REQUIRED = "Cycle tracking is available when gender is set to Female in Profile.";

async function trackerDenied(repo: Repository, userId: string) {
  const profile = await repo.find("profiles", { eq: { id: userId } });
  return tracksOwnCycle(profile?.gender) ? null : TRACKER_REQUIRED;
}

async function storedProfile(repo: Repository, userId: string) {
  return repo.find("cycleProfiles", { eq: { userId } });
}

async function profileOrBlank(repo: Repository, userId: string, now = new Date()) {
  return (await storedProfile(repo, userId)) ?? blankCycleProfile(userId, now.toISOString());
}

async function persistProfile(repo: Repository, profile: CycleProfile) {
  const existing = await storedProfile(repo, profile.userId);
  if (existing) return repo.update("cycleProfiles", profile.userId, profile);
  return repo.insert("cycleProfiles", profile);
}

function rangesOverlap(periods: CyclePeriod[], startedOn: string, endedOn: string | null, ignoreId?: string) {
  const end = endedOn ?? startedOn;
  return periods.some((period) => {
    if (period.id === ignoreId) return false;
    const otherEnd = period.endedOn ?? period.startedOn;
    return compareDates(startedOn, otherEnd) <= 0 && compareDates(period.startedOn, end) <= 0;
  });
}

export async function saveCycleProfile(repo: Repository, userId: string, input: unknown): Promise<Result<CycleProfile>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the cycle settings.");
  const current = await profileOrBlank(repo, userId);
  const next: CycleProfile = {
    ...current,
    ...parsed.data,
    userId,
    sampleData: current.sampleData,
    updatedAt: stamp(),
  };
  const saved = await persistProfile(repo, next);
  await syncShareGrants(repo, saved);
  return ok(saved);
}

async function syncShareGrants(repo: Repository, profile: CycleProfile) {
  const membership = await activeMembership(repo, profile.userId);
  const existing = await repo.list("cycleShareGrants", { eq: { ownerId: profile.userId } });
  for (const grant of existing) {
    if (!grant.revokedAt) await repo.update("cycleShareGrants", grant.id, { revokedAt: stamp() });
  }
  if (!membership) return;
  const partner = await otherPartner(repo, membership.coupleId, profile.userId);
  if (!partner) return;
  const now = stamp();
  for (const [flag, scope] of SHARE_FLAGS) {
    if (!profile[flag]) continue;
    await repo.insert("cycleShareGrants", {
      id: createId(),
      ownerId: profile.userId,
      partnerId: partner.userId,
      coupleId: membership.coupleId,
      scope,
      grantedAt: now,
      revokedAt: null,
    });
  }
}

export async function savePeriod(repo: Repository, userId: string, input: unknown): Promise<Result<CyclePeriod>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the period dates.");
  const profile = await profileOrBlank(repo, userId);
  const today = calendarDay(profile.timeZone);
  if (compareDates(parsed.data.startedOn, today) > 0) return fail("A period start can be today or a past date.");
  if (parsed.data.endedOn && compareDates(parsed.data.endedOn, today) > 0) return fail("A period end can be today or a past date.");
  const periods = await repo.list("cyclePeriods", { eq: { userId } });
  const ignoreId = parsed.data.id;
  if (rangesOverlap(periods, parsed.data.startedOn, parsed.data.endedOn, ignoreId)) return fail("Those dates overlap another recorded period.");
  const now = stamp();
  await persistProfile(repo, { ...profile, sampleData: false, updatedAt: now });
  if (ignoreId) {
    const current = periods.find((period) => period.id === ignoreId);
    if (!current || current.userId !== userId) return fail("That period was not found.");
    const saved = await repo.update("cyclePeriods", ignoreId, { startedOn: parsed.data.startedOn, endedOn: parsed.data.endedOn, note: parsed.data.note, updatedAt: now });
    return ok(saved);
  }
  const saved = await repo.insert("cyclePeriods", {
    id: createId(),
    userId,
    startedOn: parsed.data.startedOn,
    endedOn: parsed.data.endedOn,
    note: parsed.data.note,
    createdAt: now,
    updatedAt: now,
  });
  return ok(saved);
}

export async function deletePeriod(repo: Repository, userId: string, id: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const current = await repo.find("cyclePeriods", { eq: { id, userId } });
  if (!current) return fail("That period was not found.");
  await repo.remove("cyclePeriods", id);
  return ok({ deleted: true });
}

export async function saveCheckIn(repo: Repository, userId: string, input: unknown): Promise<Result<CycleCheckIn>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the daily entry.");
  const profile = await profileOrBlank(repo, userId);
  const today = calendarDay(profile.timeZone);
  if (compareDates(parsed.data.day, today) > 0) return fail("You can record today or a previous day.");
  const now = stamp();
  await persistProfile(repo, { ...profile, sampleData: false, updatedAt: now });
  const existing = (await repo.list("cycleCheckIns", { eq: { userId } })).find((entry) => entry.day === parsed.data.day);
  const row: CycleCheckIn = {
    id: existing?.id ?? createId(),
    userId,
    ...parsed.data,
    sharedFields: parsed.data.shareLevel === "selected" ? parsed.data.sharedFields : [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const saved = existing ? await repo.update("cycleCheckIns", existing.id, row) : await repo.insert("cycleCheckIns", row);
  return ok(saved);
}

export async function deleteCheckIn(repo: Repository, userId: string, id: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const current = await repo.find("cycleCheckIns", { eq: { id, userId } });
  if (!current) return fail("That check-in was not found.");
  await repo.remove("cycleCheckIns", id);
  return ok({ deleted: true });
}

export async function savePregnancyLog(repo: Repository, userId: string, input: unknown): Promise<Result<CyclePregnancyLog>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = pregnancySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the test entry.");
  const profile = await profileOrBlank(repo, userId);
  if (compareDates(parsed.data.testedOn, calendarDay(profile.timeZone)) > 0) return fail("A test date can be today or a past date.");
  const now = stamp();
  const saved = await repo.insert("cyclePregnancyLogs", { id: createId(), userId, ...parsed.data, createdAt: now, updatedAt: now });
  return ok(saved);
}

export async function deletePregnancyLog(repo: Repository, userId: string, id: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const current = await repo.find("cyclePregnancyLogs", { eq: { id, userId } });
  if (!current) return fail("That test entry was not found.");
  await repo.remove("cyclePregnancyLogs", id);
  return ok({ deleted: true });
}

export async function saveReminder(repo: Repository, userId: string, input: unknown): Promise<Result<CycleReminder>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = reminderSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the reminder.");
  const profile = await profileOrBlank(repo, userId);
  const now = stamp();
  const today = calendarDay(profile.timeZone);
  if (parsed.data.id) {
    const current = await repo.find("cycleReminders", { eq: { id: parsed.data.id, userId } });
    if (!current) return fail("That reminder was not found.");
    const saved = await repo.update("cycleReminders", current.id, { ...parsed.data, userId, nextRunOn: current.nextRunOn ?? today, updatedAt: now });
    return ok(saved);
  }
  const saved = await repo.insert("cycleReminders", {
    id: createId(),
    userId,
    kind: parsed.data.kind,
    title: parsed.data.title,
    hour: parsed.data.hour,
    enabled: parsed.data.enabled,
    nextRunOn: today,
    createdAt: now,
    updatedAt: now,
  });
  return ok(saved);
}

export async function deleteReminder(repo: Repository, userId: string, id: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const current = await repo.find("cycleReminders", { eq: { id, userId } });
  if (!current) return fail("That reminder was not found.");
  await repo.remove("cycleReminders", id);
  return ok({ deleted: true });
}

export async function saveEvent(repo: Repository, userId: string, input: unknown): Promise<Result<CycleEvent>> {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the calendar event.");
  const membership = await activeMembership(repo, userId);
  const now = stamp();
  const coupleId = parsed.data.visibility === "shared" ? membership?.coupleId ?? null : null;
  if (parsed.data.visibility === "shared" && !coupleId) return fail("Join a couple before sharing a calendar event.");
  if (parsed.data.id) {
    const current = await repo.find("cycleEvents", { eq: { id: parsed.data.id, userId } });
    if (!current) return fail("That event was not found.");
    const saved = await repo.update("cycleEvents", current.id, { ...parsed.data, userId, coupleId, updatedAt: now });
    return ok(saved);
  }
  const saved = await repo.insert("cycleEvents", { id: createId(), userId, coupleId, ...parsed.data, createdAt: now, updatedAt: now });
  return ok(saved);
}

export async function deleteEvent(repo: Repository, userId: string, id: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  const current = await repo.find("cycleEvents", { eq: { id, userId } });
  if (!current) return fail("That event was not found.");
  await repo.remove("cycleEvents", id);
  return ok({ deleted: true });
}

export async function deleteCycleData(repo: Repository, userId: string) {
  const denied = await trackerDenied(repo, userId);
  if (denied) return fail(denied);
  await repo.removeWhere("cyclePeriods", { eq: { userId } });
  await repo.removeWhere("cycleCheckIns", { eq: { userId } });
  await repo.removeWhere("cyclePregnancyLogs", { eq: { userId } });
  await repo.removeWhere("cycleReminders", { eq: { userId } });
  await repo.removeWhere("cycleEvents", { eq: { userId } });
  const grants = await repo.list("cycleShareGrants", { eq: { ownerId: userId } });
  for (const grant of grants) {
    if (!grant.revokedAt) await repo.update("cycleShareGrants", grant.id, { revokedAt: stamp() });
  }
  await repo.remove("cycleProfiles", userId).catch(() => undefined);
  return ok({ deleted: true });
}

export async function loadOwnerCycle(repo: Repository, userId: string, now = new Date()) {
  const stored = await storedProfile(repo, userId);
  const profile = stored ?? blankCycleProfile(userId, now.toISOString());
  const today = calendarDay(profile.timeZone, now);
  const [periods, checkIns, tests, reminders, events] = await Promise.all([
    repo.list("cyclePeriods", { eq: { userId } }),
    repo.list("cycleCheckIns", { eq: { userId } }),
    repo.list("cyclePregnancyLogs", { eq: { userId } }),
    repo.list("cycleReminders", { eq: { userId } }),
    repo.list("cycleEvents", { eq: { userId } }),
  ]);
  const predictionInput = {
    today,
    timeZone: profile.timeZone,
    periods,
    typicalCycleLength: profile.typicalCycleLength,
    typicalPeriodLength: profile.typicalPeriodLength,
    lutealLength: profile.lutealLength,
  };
  const estimate = await resolveEstimate(predictionInput, profile.externalEstimateConsent);
  const fertility = fertilityInsight(estimate, checkIns, tests);
  const history = recordedCycles(periods, profile.typicalCycleLength);
  const series = insightSeries(checkIns, periods, profile.lutealLength);
  const symptoms = symptomFrequency(checkIns);
  const drive = series.map((point) => ({ day: point.day, value: driveValue(point.sexDrive), phase: point.phase }));
  return { profile, stored: Boolean(stored), today, periods, checkIns, tests, reminders, events, estimate, fertility, history, series, symptoms, drive };
}

export async function deliverCycleReminders(repo: Repository, userId: string, now = new Date()) {
  if (await trackerDenied(repo, userId)) return;
  const snapshot = await loadOwnerCycle(repo, userId, now);
  if (!snapshot.stored) return;
  const yesterday = addDays(snapshot.today, -1);
  const notes = await repo.list("notifications", { eq: { userId } });
  const already = notes.filter((note) => calendarDay(snapshot.profile.timeZone, new Date(note.createdAt)) === snapshot.today).map((note) => note.type);
  const plans = dueReminderPlans({
    profile: snapshot.profile,
    estimate: snapshot.estimate,
    today: snapshot.today,
    hour: hourInZone(snapshot.profile.timeZone, now),
    checkInToday: snapshot.checkIns.some((entry) => entry.day === snapshot.today),
    checkInYesterday: snapshot.checkIns.some((entry) => entry.day === yesterday),
    reminders: snapshot.reminders,
    already,
  });
  for (const plan of plans) {
    await notifyUser(repo, { userId, type: plan.type, title: plan.title, body: plan.body, href: plan.href });
    if (plan.reminderId) await repo.update("cycleReminders", plan.reminderId, { nextRunOn: nextReminderDay(snapshot.today), updatedAt: stamp() });
  }
}

export async function pauseCycleSharing(repo: Repository, userId: string) {
  const grants = await repo.list("cycleShareGrants", { eq: { ownerId: userId } });
  for (const grant of grants) {
    if (!grant.revokedAt) await repo.update("cycleShareGrants", grant.id, { revokedAt: stamp() });
  }
  const profile = await storedProfile(repo, userId);
  if (!profile) return;
  await repo.update("cycleProfiles", userId, {
    sharePhaseSummary: false,
    sharePeriodSummary: false,
    shareFertileSummary: false,
    shareMoodSummary: false,
    shareSymptomSummary: false,
    shareIntimacySummary: false,
    shareSelectedDetails: false,
    updatedAt: stamp(),
  });
}

export async function loadSharedCycle(repo: Repository, viewerId: string, now = new Date()) {
  const membership = await activeMembership(repo, viewerId);
  if (!membership) return { partnerName: null as string | null, availability: "no_partner" as const, today: null as string | null, view: emptyPartnerView() };
  const partner = await otherPartner(repo, membership.coupleId, viewerId);
  if (!partner || await isBlocked(repo, viewerId, partner.userId)) return { partnerName: null as string | null, availability: "no_partner" as const, today: null as string | null, view: emptyPartnerView() };
  const partnerProfile = await repo.find("profiles", { eq: { id: partner.userId } });
  const partnerName = partnerProfile?.displayName ?? "Your partner";
  const stored = await storedProfile(repo, partner.userId);
  if (!tracksOwnCycle(partnerProfile?.gender) || !stored) {
    return { partnerName, availability: "not_tracking" as const, today: null as string | null, view: emptyPartnerView() };
  }
  const grants = (await repo.list("cycleShareGrants", { eq: { ownerId: partner.userId, partnerId: viewerId, coupleId: membership.coupleId } })).filter((grant) => !grant.revokedAt);
  const ownerProfile = stored;
  const today = calendarDay(ownerProfile.timeZone, now);
  const [periods, checkIns, events] = await Promise.all([
    repo.list("cyclePeriods", { eq: { userId: partner.userId } }),
    repo.list("cycleCheckIns", { eq: { userId: partner.userId } }),
    repo.list("cycleEvents", { eq: { userId: partner.userId } }),
  ]);
  const estimate = predictLocal({
    today,
    timeZone: ownerProfile.timeZone,
    periods,
    typicalCycleLength: ownerProfile.typicalCycleLength,
    typicalPeriodLength: ownerProfile.typicalPeriodLength,
    lutealLength: ownerProfile.lutealLength,
  });
  const sharedEvents = events.filter((event) => event.visibility !== "private" && (event.coupleId === null || event.coupleId === membership.coupleId));
  const view = projectForPartner({ grants, estimate, periods, checkIns, events: sharedEvents });
  const shared = Boolean(view.phaseSummary || view.periodSummary || view.fertileSummary || view.daily.length || view.events.length);
  return { partnerName, availability: shared ? "shared" as const : "not_shared" as const, today, view };
}

function emptyPartnerView() {
  return { phase: null, phaseSummary: null, periodSummary: null, fertileSummary: null, periodWindow: null, fertileWindow: null, daily: [], events: [] };
}

export async function exportCycleData(repo: Repository, userId: string) {
  const snapshot = await loadOwnerCycle(repo, userId);
  return {
    profile: snapshot.stored ? snapshot.profile : null,
    periods: snapshot.periods,
    checkIns: snapshot.checkIns,
    pregnancyLogs: snapshot.tests,
    reminders: snapshot.reminders,
    events: snapshot.events,
    grants: await repo.list("cycleShareGrants", { eq: { ownerId: userId } }),
  };
}

export function predictionInputFrom(profile: CycleProfile, periods: CyclePeriod[], today: string) {
  return { today, timeZone: profile.timeZone, periods: cleanPeriods(periods), typicalCycleLength: profile.typicalCycleLength, typicalPeriodLength: profile.typicalPeriodLength, lutealLength: profile.lutealLength };
}
