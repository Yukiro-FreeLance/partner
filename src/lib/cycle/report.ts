import type { CycleCheckIn } from "@/lib/domain";
import { optionLabel, SYMPTOM_OPTIONS, DRIVE_OPTIONS } from "@/lib/cycle/copy";
import { addDays, compareDates, diffDays } from "@/lib/cycle/dates";
import { cleanPeriods, type PeriodInput, type CyclePhase } from "@/lib/cycle/predict";

export type PhasePoint = { day: string; phase: CyclePhase; mood: string | null; energy: number | null; sexDrive: string | null; symptoms: string[] };

export function phaseOnRecordedDay(day: string, periods: PeriodInput[], lutealLength: number): CyclePhase {
  const cleaned = cleanPeriods(periods);
  const container = cleaned.findIndex((period, index) => {
    const next = cleaned[index + 1]?.startedOn;
    return compareDates(day, period.startedOn) >= 0 && (!next || compareDates(day, next) < 0);
  });
  if (container < 0) return "unknown";
  const period = cleaned[container];
  const next = cleaned[container + 1]?.startedOn ?? null;
  if (!next) return "unknown";
  const length = diffDays(next, period.startedOn);
  if (length < 15 || length > 90) return "unknown";
  const periodEnd = period.endedOn ?? addDays(period.startedOn, 4);
  const ovulation = addDays(next, -lutealLength);
  if (compareDates(day, periodEnd) <= 0) return "menstrual";
  if (compareDates(day, ovulation) < 0) return "follicular";
  if (day === ovulation) return "ovulation";
  return "luteal";
}

export function insightSeries(checkIns: CycleCheckIn[], periods: PeriodInput[], lutealLength: number): PhasePoint[] {
  return checkIns
    .slice()
    .sort((left, right) => compareDates(left.day, right.day))
    .map((entry) => ({
      day: entry.day,
      phase: phaseOnRecordedDay(entry.day, periods, lutealLength),
      mood: entry.mood,
      energy: entry.energy,
      sexDrive: entry.sexDrive,
      symptoms: [...entry.symptoms, ...entry.customSymptoms],
    }));
}

export function symptomFrequency(checkIns: CycleCheckIn[]) {
  const counts = new Map<string, number>();
  for (const entry of checkIns) {
    for (const symptom of entry.symptoms) counts.set(optionLabel(SYMPTOM_OPTIONS, symptom) ?? symptom, (counts.get(optionLabel(SYMPTOM_OPTIONS, symptom) ?? symptom) ?? 0) + 1);
    for (const symptom of entry.customSymptoms) counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function driveValue(value: string | null) {
  const index = DRIVE_OPTIONS.findIndex(([key]) => key === value);
  return index >= 0 ? index + 1 : null;
}
