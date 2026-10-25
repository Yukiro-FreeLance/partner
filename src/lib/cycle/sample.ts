import type { CycleCheckIn, CyclePeriod, CycleProfile, CycleEvent } from "@/lib/domain";
import { addDays } from "@/lib/cycle/dates";
import { createId } from "@/lib/ids";

export function blankCycleProfile(userId: string, now: string, timeZone = "UTC"): CycleProfile {
  return {
    userId,
    timeZone,
    typicalCycleLength: 28,
    typicalPeriodLength: 5,
    lutealLength: 14,
    externalEstimateConsent: false,
    sharePhaseSummary: false,
    sharePeriodSummary: false,
    shareFertileSummary: false,
    shareMoodSummary: false,
    shareSymptomSummary: false,
    shareIntimacySummary: false,
    shareSelectedDetails: false,
    periodReminder: false,
    periodLeadDays: 2,
    checkInReminder: false,
    checkInHour: 20,
    fertileReminder: false,
    pregnancyTestReminder: false,
    missedCheckInReminder: false,
    sampleData: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function fictionalCycleSample(userId: string, today: string, now: string) {
  const start = addDays(today, -6);
  const profile: CycleProfile = { ...blankCycleProfile(userId, now, "Asia/Manila"), sampleData: true };
  const periods: CyclePeriod[] = [addDays(start, -56), addDays(start, -28), start].map((startedOn, index) => ({
    id: createId(),
    userId,
    startedOn,
    endedOn: addDays(startedOn, 4),
    note: index === 2 ? "Fictional sample period for Maya Chen. Not a real health record." : null,
    createdAt: now,
    updatedAt: now,
  }));
  const days = [0, 1, 2, 3, 4, 5].map((offset) => addDays(today, -offset));
  const moods = ["calm", "happy", "emotional", "calm", "irritable", "sad"] as const;
  const drives = ["moderate", "high", "moderate", "low", "low", "very_low"] as const;
  const checkIns: CycleCheckIn[] = days.map((day, index) => ({
    id: createId(),
    userId,
    day,
    symptoms: index === 0 ? ["fatigue"] : index > 3 ? ["cramps"] : [],
    customSymptoms: [],
    mood: moods[index] ?? "calm",
    energy: index > 3 ? 2 : 4,
    sexDrive: drives[index] ?? "moderate",
    bleeding: index > 3 ? "light" : "none",
    cervicalMucus: null,
    sleepQuality: 3,
    stressLevel: 2,
    wellnessNote: null,
    moment: index === 0 ? "affectionate" : "rest",
    notes: "Fictional sample entry for Maya Chen. Not a real health record.",
    affection: 3,
    emotionalCloseness: 4,
    intimacyPreference: "balanced",
    comfort: 3,
    readiness: 3,
    sexualActivity: null,
    contraception: null,
    shareLevel: "private",
    sharedFields: [],
    createdAt: now,
    updatedAt: now,
  }));
  const event: CycleEvent = {
    id: createId(),
    userId,
    coupleId: null,
    day: addDays(today, 2),
    title: "Fictional sample: park walk",
    body: "Sample calendar note for the demo couple. It is not a health record.",
    visibility: "shared",
    createdAt: now,
    updatedAt: now,
  };
  return { profile, periods, checkIns, event };
}
