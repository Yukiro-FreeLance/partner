import type { CycleCheckIn, CycleEvent, CycleShareGrant, CycleShareScope } from "@/lib/domain";
import { levelWord, optionLabel, DRIVE_OPTIONS, INTIMACY_OPTIONS, MOOD_OPTIONS, MOMENT_OPTIONS, SYMPTOM_OPTIONS, ACTIVITY_OPTIONS, CONTRACEPTION_OPTIONS, MUCUS_OPTIONS, BLEEDING_OPTIONS } from "@/lib/cycle/copy";
import { formatDay } from "@/lib/cycle/dates";
import type { CycleEstimate } from "@/lib/cycle/predict";

const SUMMARY_FIELDS = new Set(["mood", "energy"]);
const FIELD_GRANTS: Record<string, CycleShareScope> = {
  mood: "mood_summary",
  energy: "mood_summary",
  symptoms: "symptom_summary",
  sexDrive: "intimacy_summary",
  affection: "intimacy_summary",
  emotionalCloseness: "intimacy_summary",
  intimacyPreference: "intimacy_summary",
  comfort: "intimacy_summary",
  readiness: "intimacy_summary",
  bleeding: "period_summary",
  cervicalMucus: "selected_details",
  sleepQuality: "selected_details",
  stressLevel: "selected_details",
  wellnessNote: "selected_details",
  moment: "selected_details",
  sexualActivity: "selected_details",
  contraception: "selected_details",
  notes: "selected_details",
};

export type PartnerCycleView = {
  periodSummary: string | null;
  fertileSummary: string | null;
  daily: { day: string; lines: string[] }[];
  events: { id: string; day: string; title: string; body: string | null }[];
};

function granted(grants: CycleShareGrant[], scope: CycleShareScope) {
  return grants.some((grant) => grant.scope === scope && !grant.revokedAt);
}

function fieldValue(entry: CycleCheckIn, field: string) {
  if (field === "mood") return optionLabel(MOOD_OPTIONS, entry.mood);
  if (field === "energy") return levelWord(entry.energy) ? `Energy ${levelWord(entry.energy)?.toLowerCase()}` : null;
  if (field === "symptoms") {
    const names = [...entry.symptoms.map((symptom) => optionLabel(SYMPTOM_OPTIONS, symptom) ?? symptom), ...entry.customSymptoms];
    return names.length ? `Symptoms: ${names.join(", ")}` : null;
  }
  if (field === "sexDrive") return optionLabel(DRIVE_OPTIONS, entry.sexDrive) ? `Sex drive ${optionLabel(DRIVE_OPTIONS, entry.sexDrive)?.toLowerCase()}` : null;
  if (field === "affection") return levelWord(entry.affection) ? `Affection ${levelWord(entry.affection)?.toLowerCase()}` : null;
  if (field === "emotionalCloseness") return levelWord(entry.emotionalCloseness) ? `Emotional closeness ${levelWord(entry.emotionalCloseness)?.toLowerCase()}` : null;
  if (field === "intimacyPreference") return optionLabel(INTIMACY_OPTIONS, entry.intimacyPreference);
  if (field === "comfort") return levelWord(entry.comfort) ? `Comfort ${levelWord(entry.comfort)?.toLowerCase()}` : null;
  if (field === "readiness") return levelWord(entry.readiness) ? `Readiness ${levelWord(entry.readiness)?.toLowerCase()}` : null;
  if (field === "bleeding") return optionLabel(BLEEDING_OPTIONS, entry.bleeding) ? `Bleeding ${optionLabel(BLEEDING_OPTIONS, entry.bleeding)?.toLowerCase()}` : null;
  if (field === "cervicalMucus") return optionLabel(MUCUS_OPTIONS, entry.cervicalMucus);
  if (field === "sleepQuality") return levelWord(entry.sleepQuality) ? `Sleep ${levelWord(entry.sleepQuality)?.toLowerCase()}` : null;
  if (field === "stressLevel") return levelWord(entry.stressLevel) ? `Stress ${levelWord(entry.stressLevel)?.toLowerCase()}` : null;
  if (field === "wellnessNote") return entry.wellnessNote;
  if (field === "moment") return optionLabel(MOMENT_OPTIONS, entry.moment);
  if (field === "sexualActivity") return optionLabel(ACTIVITY_OPTIONS, entry.sexualActivity);
  if (field === "contraception") return optionLabel(CONTRACEPTION_OPTIONS, entry.contraception) ? `Contraception: ${optionLabel(CONTRACEPTION_OPTIONS, entry.contraception)}` : null;
  if (field === "notes") return entry.notes;
  return null;
}

function linesForEntry(entry: CycleCheckIn, grants: CycleShareGrant[]) {
  if (entry.shareLevel === "private") return [];
  const fields = entry.shareLevel === "summary" ? [...SUMMARY_FIELDS] : entry.sharedFields;
  const lines: string[] = [];
  for (const field of fields) {
    const scope = FIELD_GRANTS[field];
    if (!scope || !granted(grants, scope)) continue;
    if (scope === "selected_details" && !granted(grants, "selected_details")) continue;
    const value = fieldValue(entry, field);
    if (value) lines.push(value);
  }
  return lines;
}

export function projectForPartner(input: {
  grants: CycleShareGrant[];
  estimate: CycleEstimate;
  checkIns: CycleCheckIn[];
  events: CycleEvent[];
}): PartnerCycleView {
  const active = input.grants.filter((grant) => !grant.revokedAt);
  const periodSummary = granted(active, "period_summary") && input.estimate.nextPeriodStart
    ? input.estimate.daysLate > 0
      ? `A period was estimated around ${formatDay(input.estimate.nextPeriodStart)} and has not been recorded yet.`
      : `A period is estimated around ${formatDay(input.estimate.nextPeriodStart)}.`
    : granted(active, "period_summary") && input.estimate.lastPeriodStart
      ? `A period was recorded as starting on ${formatDay(input.estimate.lastPeriodStart)}.`
      : null;
  const fertileSummary = granted(active, "fertile_summary") && input.estimate.fertileStart && input.estimate.fertileEnd
    ? `Estimated fertile window: ${formatDay(input.estimate.fertileStart)} to ${formatDay(input.estimate.fertileEnd)}. This is a prediction.`
    : null;
  const daily = input.checkIns
    .map((entry) => ({ day: entry.day, lines: linesForEntry(entry, active) }))
    .filter((entry) => entry.lines.length > 0);
  const events = input.events
    .filter((event) => event.visibility !== "private")
    .map((event) => ({
      id: event.id,
      day: event.day,
      title: event.title,
      body: event.visibility === "summary" ? null : event.body,
    }));
  return { periodSummary, fertileSummary, daily, events };
}

export function sensitiveText(value: string) {
  return /period|pregnan|fertile|ovulat|sex|bleed|cramp/i.test(value);
}
