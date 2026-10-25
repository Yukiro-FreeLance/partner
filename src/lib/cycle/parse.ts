import { z } from "zod";
import { isIsoDate, normalizeTimeZone } from "@/lib/cycle/dates";
import { ACTIVITY_OPTIONS, BLEEDING_OPTIONS, CONTRACEPTION_OPTIONS, DRIVE_OPTIONS, INTIMACY_OPTIONS, MOMENT_OPTIONS, MOOD_OPTIONS, MUCUS_OPTIONS, SHAREABLE_FIELDS, SYMPTOM_OPTIONS } from "@/lib/cycle/copy";

const day = z.string().refine(isIsoDate, "Use a real calendar date.");
const optionalDay = z.union([z.string(), z.null(), z.undefined()]).transform((value) => (typeof value === "string" && isIsoDate(value) ? value : null));
const score = z.number().int().min(1).max(5).nullable();
const shareFields = SHAREABLE_FIELDS.map(([field]) => field);

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined || value === null) return null;
  return value;
}

function scoreField(value: unknown) {
  if (value === "" || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : value;
}

export const periodSchema = z.object({
  id: z.string().optional(),
  startedOn: day,
  endedOn: optionalDay,
  note: z.string().trim().max(500).optional().transform((value) => value || null),
});

export const profileSchema = z.object({
  timeZone: z.string().trim().transform((value, context) => {
    const zone = normalizeTimeZone(value);
    if (!zone) {
      context.addIssue({ code: "custom", message: "Use a valid time zone such as Asia/Manila." });
      return z.NEVER;
    }
    return zone;
  }),
  typicalCycleLength: z.coerce.number().int().min(15).max(90),
  typicalPeriodLength: z.coerce.number().int().min(1).max(10),
  lutealLength: z.coerce.number().int().min(10).max(18),
  externalEstimateConsent: z.coerce.boolean().optional().default(false),
  sharePeriodSummary: z.coerce.boolean().optional().default(false),
  shareFertileSummary: z.coerce.boolean().optional().default(false),
  shareMoodSummary: z.coerce.boolean().optional().default(false),
  shareSymptomSummary: z.coerce.boolean().optional().default(false),
  shareIntimacySummary: z.coerce.boolean().optional().default(false),
  shareSelectedDetails: z.coerce.boolean().optional().default(false),
  periodReminder: z.coerce.boolean().optional().default(false),
  periodLeadDays: z.coerce.number().int().min(0).max(14).optional().default(2),
  checkInReminder: z.coerce.boolean().optional().default(false),
  checkInHour: z.coerce.number().int().min(0).max(23).optional().default(20),
  fertileReminder: z.coerce.boolean().optional().default(false),
  pregnancyTestReminder: z.coerce.boolean().optional().default(false),
  missedCheckInReminder: z.coerce.boolean().optional().default(false),
});

export const checkInSchema = z.object({
  day,
  symptoms: z.array(z.enum(SYMPTOM_OPTIONS.map(([item]) => item) as [string, ...string[]])).max(12).default([]),
  customSymptoms: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  mood: z.enum(MOOD_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  energy: score,
  sexDrive: z.enum(DRIVE_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  bleeding: z.enum(BLEEDING_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  cervicalMucus: z.enum(MUCUS_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  sleepQuality: score,
  stressLevel: score,
  wellnessNote: z.string().trim().max(500).nullable().default(null),
  moment: z.enum(MOMENT_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  notes: z.string().trim().max(2000).nullable().default(null),
  affection: score,
  emotionalCloseness: score,
  intimacyPreference: z.enum(INTIMACY_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  comfort: score,
  readiness: score,
  sexualActivity: z.enum(ACTIVITY_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  contraception: z.enum(CONTRACEPTION_OPTIONS.map(([item]) => item) as [string, ...string[]]).nullable().default(null),
  shareLevel: z.enum(["private", "summary", "selected"]).default("private"),
  sharedFields: z.array(z.enum(shareFields as [string, ...string[]])).max(20).default([]),
});

export const pregnancySchema = z.object({
  testedOn: day,
  result: z.enum(["positive", "negative", "invalid", "not_taken"]),
  notes: z.string().trim().max(500).optional().transform((value) => value || null),
});

export const reminderSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["medication", "custom"]).default("custom"),
  title: z.string().trim().min(1).max(80),
  hour: z.coerce.number().int().min(0).max(23),
  enabled: z.coerce.boolean().optional().default(true),
});

export const eventSchema = z.object({
  id: z.string().optional(),
  day,
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(500).optional().transform((value) => value || null),
  visibility: z.enum(["private", "summary", "selected", "shared"]),
});

function flags(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function checkInFromJson(input: unknown) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return checkInSchema.safeParse({
    ...value,
    mood: emptyToNull(value.mood),
    sexDrive: emptyToNull(value.sexDrive),
    bleeding: emptyToNull(value.bleeding),
    cervicalMucus: emptyToNull(value.cervicalMucus),
    moment: emptyToNull(value.moment),
    intimacyPreference: emptyToNull(value.intimacyPreference),
    sexualActivity: emptyToNull(value.sexualActivity),
    contraception: emptyToNull(value.contraception),
    wellnessNote: emptyToNull(value.wellnessNote),
    notes: emptyToNull(value.notes),
    energy: scoreField(value.energy),
    sleepQuality: scoreField(value.sleepQuality),
    stressLevel: scoreField(value.stressLevel),
    affection: scoreField(value.affection),
    emotionalCloseness: scoreField(value.emotionalCloseness),
    comfort: scoreField(value.comfort),
    readiness: scoreField(value.readiness),
    symptoms: value.symptoms ?? [],
    customSymptoms: value.customSymptoms ?? [],
    sharedFields: value.sharedFields ?? [],
  });
}

export function checkInFromForm(formData: FormData) {
  const custom = String(formData.get("customSymptoms") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return checkInFromJson({
    day: formData.get("day"),
    symptoms: formData.getAll("symptoms"),
    customSymptoms: custom,
    mood: formData.get("mood"),
    energy: formData.get("energy"),
    sexDrive: formData.get("sexDrive"),
    bleeding: formData.get("bleeding"),
    cervicalMucus: formData.get("cervicalMucus"),
    sleepQuality: formData.get("sleepQuality"),
    stressLevel: formData.get("stressLevel"),
    wellnessNote: formData.get("wellnessNote"),
    moment: formData.get("moment"),
    notes: formData.get("notes"),
    affection: formData.get("affection"),
    emotionalCloseness: formData.get("emotionalCloseness"),
    intimacyPreference: formData.get("intimacyPreference"),
    comfort: formData.get("comfort"),
    readiness: formData.get("readiness"),
    sexualActivity: formData.get("sexualActivity"),
    contraception: formData.get("contraception"),
    shareLevel: formData.get("shareLevel") || "private",
    sharedFields: formData.getAll("sharedFields"),
  });
}

export function profileFromForm(formData: FormData) {
  return profileSchema.safeParse({
    timeZone: formData.get("timeZone"),
    typicalCycleLength: formData.get("typicalCycleLength"),
    typicalPeriodLength: formData.get("typicalPeriodLength"),
    lutealLength: formData.get("lutealLength"),
    externalEstimateConsent: flags(formData, "externalEstimateConsent"),
    sharePeriodSummary: flags(formData, "sharePeriodSummary"),
    shareFertileSummary: flags(formData, "shareFertileSummary"),
    shareMoodSummary: flags(formData, "shareMoodSummary"),
    shareSymptomSummary: flags(formData, "shareSymptomSummary"),
    shareIntimacySummary: flags(formData, "shareIntimacySummary"),
    shareSelectedDetails: flags(formData, "shareSelectedDetails"),
    periodReminder: flags(formData, "periodReminder"),
    periodLeadDays: formData.get("periodLeadDays") || 2,
    checkInReminder: flags(formData, "checkInReminder"),
    checkInHour: formData.get("checkInHour") || 20,
    fertileReminder: flags(formData, "fertileReminder"),
    pregnancyTestReminder: flags(formData, "pregnancyTestReminder"),
    missedCheckInReminder: flags(formData, "missedCheckInReminder"),
  });
}
