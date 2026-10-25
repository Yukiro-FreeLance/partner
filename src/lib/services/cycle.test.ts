import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, UserPreferences } from "@/lib/domain";
import { acceptInvitation, createCouple, leaveCouple } from "@/lib/services/couples";
import { deleteCycleData, deletePeriod, deliverCycleReminders, loadOwnerCycle, loadSharedCycle, saveCheckIn, saveCycleProfile, savePeriod, savePregnancyLog } from "@/lib/services/cycle";
import { checkInFromJson } from "@/lib/cycle/parse";

function profile(id: string, name: string): Profile {
  return {
    id,
    email: `${name}@example.com`,
    displayName: name,
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: "dating",
    relationshipStartedOn: "2024-02-14",
    interests: [],
    preferredCategories: [],
    role: "user",
    gender: "female",
    isDemo: false,
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
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

async function paired() {
  const repo = createMemoryRepository();
  await repo.insert("profiles", profile("a", "Avery"));
  await repo.insert("profiles", profile("b", "Blair"));
  await repo.insert("userPreferences", preferences("a"));
  await repo.insert("userPreferences", preferences("b"));
  const created = await createCouple(repo, "a", { name: "Avery and Blair" });
  if (!created.ok) throw new Error(created.error);
  const accepted = await acceptInvitation(repo, "b", created.data.invitation.code);
  if (!accepted.ok) throw new Error(accepted.error);
  return repo;
}

describe("cycle privacy permissions", () => {
  it("keeps sexual activity, notes, and pregnancy logs off the partner view", async () => {
    const repo = await paired();
    const period = await savePeriod(repo, "a", { startedOn: "2026-01-01", endedOn: "2026-01-05" });
    expect(period.ok).toBe(true);
    const parsed = checkInFromJson({
      day: "2026-01-02",
      mood: "calm",
      notes: "private journal",
      sexualActivity: "unprotected",
      shareLevel: "summary",
    });
    if (!parsed.success) throw new Error(parsed.error.message);
    await saveCheckIn(repo, "a", parsed.data);
    await savePregnancyLog(repo, "a", { testedOn: "2026-01-20", result: "negative" });
    await saveCycleProfile(repo, "a", {
      timeZone: "UTC",
      typicalCycleLength: 28,
      typicalPeriodLength: 5,
      lutealLength: 14,
      shareMoodSummary: true,
      sharePeriodSummary: true,
    });
    const shared = await loadSharedCycle(repo, "b", new Date("2026-01-10T12:00:00.000Z"));
    expect(shared.partnerName).toBe("Avery");
    expect(JSON.stringify(shared.view)).not.toMatch(/private journal|unprotected|negative/);
    expect(shared.view.daily[0]?.lines.join(" ")).toMatch(/Calm/);
    expect(shared.view.periodSummary).toMatch(/estimated/i);

    const removed = await deletePeriod(repo, "b", period.ok ? period.data.id : "");
    expect(removed.ok).toBe(false);
    const owner = await loadOwnerCycle(repo, "b", new Date("2026-01-10T12:00:00.000Z"));
    expect(owner.periods).toHaveLength(0);
    expect(owner.checkIns).toHaveLength(0);
  });

  it("revokes partner access when someone leaves", async () => {
    const repo = await paired();
    await saveCycleProfile(repo, "a", { timeZone: "UTC", typicalCycleLength: 28, typicalPeriodLength: 5, lutealLength: 14, sharePeriodSummary: true });
    await savePeriod(repo, "a", { startedOn: "2026-01-01" });
    await leaveCouple(repo, "a");
    const shared = await loadSharedCycle(repo, "b", new Date("2026-01-10T12:00:00.000Z"));
    expect(shared.view.periodSummary).toBeNull();
  });

  it("rejects overlapping periods and deletes only the owner's records", async () => {
    const repo = await paired();
    expect((await savePeriod(repo, "a", { startedOn: "2026-02-31" })).ok).toBe(false);
    await savePeriod(repo, "a", { startedOn: "2026-01-01", endedOn: "2026-01-05" });
    const overlap = await savePeriod(repo, "a", { startedOn: "2026-01-04", endedOn: "2026-01-06" });
    expect(overlap.ok).toBe(false);
    await saveCheckIn(repo, "a", checkInFromJson({ day: "2026-01-02", mood: "sad" }).data);
    await deleteCycleData(repo, "a");
    const snapshot = await loadOwnerCycle(repo, "a");
    expect(snapshot.stored).toBe(false);
    expect(snapshot.periods).toHaveLength(0);
    expect(snapshot.checkIns).toHaveLength(0);
  });

  it("stores a discreet in-app reminder", async () => {
    const repo = await paired();
    await saveCycleProfile(repo, "a", {
      timeZone: "UTC",
      typicalCycleLength: 28,
      typicalPeriodLength: 5,
      lutealLength: 14,
      periodReminder: true,
      periodLeadDays: 3,
    });
    await savePeriod(repo, "a", { startedOn: "2026-01-01", endedOn: "2026-01-05" });
    await deliverCycleReminders(repo, "a", new Date("2026-01-27T15:00:00.000Z"));
    const notes = await repo.list("notifications", { eq: { userId: "a" } });
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.map((note) => `${note.title} ${note.body}`).join(" ")).not.toMatch(/period|pregnant|fertile|sex/i);
  });

  it("shows a partner only the phase and period details that were shared", async () => {
    const repo = await paired();
    await repo.update("profiles", "b", { gender: "male" });
    const denied = await savePeriod(repo, "b", { startedOn: "2026-01-01", endedOn: "2026-01-05" });
    expect(denied.ok).toBe(false);
    await savePeriod(repo, "a", { startedOn: "2026-01-01", endedOn: "2026-01-05" });
    await saveCycleProfile(repo, "a", { timeZone: "UTC", typicalCycleLength: 28, typicalPeriodLength: 5, lutealLength: 14, sharePeriodSummary: true });
    const shared = await loadSharedCycle(repo, "b", new Date("2026-01-10T12:00:00.000Z"));
    expect(shared.availability).toBe("shared");
    expect(shared.view.phaseSummary).toBeNull();
    expect(shared.view.periodSummary).toMatch(/estimate/i);
    expect(shared.view.fertileSummary).toBeNull();
    await saveCycleProfile(repo, "a", { timeZone: "UTC", typicalCycleLength: 28, typicalPeriodLength: 5, lutealLength: 14, sharePhaseSummary: true, sharePeriodSummary: true });
    const withPhase = await loadSharedCycle(repo, "b", new Date("2026-01-10T12:00:00.000Z"));
    expect(withPhase.view.phaseSummary).toMatch(/estimate/i);
    expect(withPhase.view.phase).toBeTruthy();
  });
});
