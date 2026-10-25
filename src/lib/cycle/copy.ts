export const SYMPTOM_OPTIONS = [
  ["cramps", "Cramps"],
  ["headache", "Headache"],
  ["bloating", "Bloating"],
  ["acne", "Acne"],
  ["breast_tenderness", "Breast tenderness"],
  ["fatigue", "Fatigue"],
  ["nausea", "Nausea"],
  ["back_pain", "Back pain"],
  ["spotting", "Spotting"],
] as const;

export const MOOD_OPTIONS = [
  ["happy", "Happy"],
  ["calm", "Calm"],
  ["emotional", "Emotional"],
  ["anxious", "Anxious"],
  ["irritable", "Irritable"],
  ["sad", "Sad"],
  ["other", "Other"],
] as const;

export const DRIVE_OPTIONS = [
  ["very_low", "Very low"],
  ["low", "Low"],
  ["moderate", "Moderate"],
  ["high", "High"],
  ["very_high", "Very high"],
] as const;

export const BLEEDING_OPTIONS = [
  ["none", "None"],
  ["spotting", "Spotting"],
  ["light", "Light"],
  ["medium", "Medium"],
  ["heavy", "Heavy"],
] as const;

export const MUCUS_OPTIONS = [
  ["dry", "Dry"],
  ["sticky", "Sticky"],
  ["creamy", "Creamy"],
  ["watery", "Watery"],
  ["egg_white", "Egg-white"],
] as const;

export const MOMENT_OPTIONS = [
  ["affectionate", "Feeling affectionate"],
  ["rest", "Needing rest"],
  ["discomfort", "Feeling discomfort"],
  ["closeness", "Wanting closeness"],
  ["space", "Preferring personal space"],
] as const;

export const ACTIVITY_OPTIONS = [
  ["none", "No sexual activity"],
  ["protected", "Sex with contraception"],
  ["unprotected", "Sex without contraception"],
  ["other", "Other"],
] as const;

export const CONTRACEPTION_OPTIONS = [
  ["none", "None"],
  ["condom", "Condom"],
  ["pill", "Pill"],
  ["iud", "IUD"],
  ["implant", "Implant"],
  ["other", "Other"],
] as const;

export const INTIMACY_OPTIONS = [
  ["closeness", "Closer"],
  ["balanced", "Balanced"],
  ["space", "More space"],
] as const;

export const SHAREABLE_FIELDS = [
  ["mood", "Mood"],
  ["energy", "Energy"],
  ["symptoms", "Symptom names"],
  ["sexDrive", "Sex drive"],
  ["affection", "Physical affection"],
  ["emotionalCloseness", "Emotional closeness"],
  ["intimacyPreference", "Closeness or space"],
  ["comfort", "Comfort"],
  ["readiness", "Readiness"],
  ["bleeding", "Bleeding"],
  ["cervicalMucus", "Cervical mucus"],
  ["sleepQuality", "Sleep"],
  ["stressLevel", "Stress"],
  ["wellnessNote", "Wellness note"],
  ["moment", "Moment of the day"],
  ["sexualActivity", "Sexual activity"],
  ["contraception", "Contraception"],
  ["notes", "Journal note"],
] as const;

export const PHASE_COPY = {
  menstrual: {
    title: "Menstrual",
    body: "Period days. Log bleeding, cramps, fatigue, or anything else you notice. This phase uses your recorded period dates when you have them.",
  },
  follicular: {
    title: "Follicular",
    body: "After the period and before the estimated ovulation day. Energy and mood notes are welcome. They describe you, not a rule for this phase.",
  },
  ovulation: {
    title: "Ovulation",
    body: "The estimated ovulation day. The fertile window is a separate prediction and can shift. Logging egg-white mucus does not confirm ovulation.",
  },
  luteal: {
    title: "Luteal",
    body: "After the estimated ovulation day and before the next period. You can log mood, energy, cravings, and other changes. Those experiences are not universal.",
  },
  unknown: {
    title: "Not enough dates yet",
    body: "Log the first day of a period to start a personal estimate. Predictions stay labeled as predictions.",
  },
} as const;

export const LEVEL_WORDS = ["Very low", "Low", "Moderate", "High", "Very high"] as const;

export function levelWord(value: number | null) {
  if (!value) return null;
  return LEVEL_WORDS[value - 1] ?? null;
}

export function optionLabel(options: readonly (readonly [string, string])[], value: string | null) {
  return options.find(([key]) => key === value)?.[1] ?? null;
}

export const TRACKING_DISCLAIMER = "These reports are for personal tracking. They are not a medical diagnosis, a fertility treatment, or a confirmation of ovulation or pregnancy.";

export const FERTILITY_LIMITS = [
  "These dates are estimates. Ovulation can move from one cycle to the next.",
  "Sperm can survive for several days, so the edges of a window are not exact.",
  "This is not a pregnancy probability, and it does not mean a day is safe for unprotected sex.",
  "Predicted fertility is not the same as confirmed ovulation.",
] as const;

export function sourceLabel(source: "local" | "external" | "local_fallback") {
  if (source === "external") return "External calculator. Still a prediction.";
  if (source === "local_fallback") return "CoupleSync calculation. The external calculator was unavailable.";
  return "Calculated in CoupleSync.";
}

export function confidenceLabel(confidence: "low" | "medium" | "limited") {
  if (confidence === "medium") return "Based on recent recorded cycles.";
  if (confidence === "limited") return "Limited, because recent cycles vary.";
  return "Low, because there is little recorded history.";
}

export const REMINDER_COPY = {
  period: { type: "cycle_period", title: "Reminder", body: "You have a personal reminder in CoupleSync." },
  checkin: { type: "cycle_checkin", title: "Daily note", body: "A check-in is available when you want it." },
  fertile: { type: "cycle_fertile", title: "Reminder", body: "You have a calendar reminder in CoupleSync." },
  pregnancy_test: { type: "cycle_pregnancy_test", title: "Reminder", body: "You have a private reminder in CoupleSync." },
  missed_checkin: { type: "cycle_missed", title: "Daily note", body: "Yesterday's check-in is still open." },
  custom: { type: "cycle_custom", title: "Wellness reminder", body: "Open CoupleSync for details." },
} as const;
