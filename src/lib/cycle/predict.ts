import { addDays, compareDates, diffDays, eachDay, isIsoDate } from "@/lib/cycle/dates";

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown";

export type PeriodInput = { startedOn: string; endedOn: string | null };

export type PredictionInput = {
  today: string;
  timeZone: string;
  periods: PeriodInput[];
  typicalCycleLength: number;
  typicalPeriodLength: number;
  lutealLength: number;
};

export type CycleEstimate = {
  source: "local" | "external" | "local_fallback";
  confidence: "low" | "medium" | "limited";
  today: string;
  timeZone: string;
  hasHistory: boolean;
  cycleDay: number | null;
  cycleLength: number | null;
  cycleLengthSource: "history" | "setting" | "none";
  variationDays: number | null;
  lastPeriodStart: string | null;
  periodLength: number | null;
  periodLengthStatus: "confirmed" | "predicted" | "none";
  nextPeriodStart: string | null;
  daysUntilPeriod: number | null;
  daysLate: number;
  phase: CyclePhase;
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  inFertileWindow: boolean;
  irregular: boolean;
  notes: string[];
};

export type ExternalDates = {
  nextPeriodStart: string;
  ovulationDate: string;
  fertileStart: string;
  fertileEnd: string;
  cycleLength?: number;
};

const MIN_CYCLE = 15;
const MAX_CYCLE = 90;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function cleanPeriods(periods: PeriodInput[]) {
  const byStart = new Map<string, PeriodInput>();
  for (const period of periods) {
    if (!isIsoDate(period.startedOn)) continue;
    const endedOn = period.endedOn && isIsoDate(period.endedOn) && compareDates(period.endedOn, period.startedOn) >= 0 ? period.endedOn : null;
    byStart.set(period.startedOn, { startedOn: period.startedOn, endedOn });
  }
  return [...byStart.values()].sort((left, right) => compareDates(left.startedOn, right.startedOn));
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function predictLocal(input: PredictionInput): CycleEstimate {
  const today = input.today;
  const periods = cleanPeriods(input.periods).filter((period) => compareDates(period.startedOn, today) <= 0);
  const typicalCycle = clamp(input.typicalCycleLength || 28, MIN_CYCLE, MAX_CYCLE);
  const typicalPeriod = clamp(input.typicalPeriodLength || 5, 1, 10);
  const luteal = clamp(input.lutealLength || 14, 10, 18);
  const notes: string[] = [];
  const empty: CycleEstimate = {
    source: "local",
    confidence: "low",
    today,
    timeZone: input.timeZone,
    hasHistory: false,
    cycleDay: null,
    cycleLength: null,
    cycleLengthSource: "none",
    variationDays: null,
    lastPeriodStart: null,
    periodLength: null,
    periodLengthStatus: "none",
    nextPeriodStart: null,
    daysUntilPeriod: null,
    daysLate: 0,
    phase: "unknown",
    ovulationDate: null,
    fertileStart: null,
    fertileEnd: null,
    inFertileWindow: false,
    irregular: false,
    notes: ["Log a period start to calculate a personal estimate."],
  };
  if (!isIsoDate(today) || periods.length === 0) return empty;

  const intervals: number[] = [];
  let irregular = false;
  for (let index = 1; index < periods.length; index += 1) {
    const length = diffDays(periods[index].startedOn, periods[index - 1].startedOn);
    if (length < MIN_CYCLE || length > MAX_CYCLE) {
      irregular = true;
      notes.push(`A gap of ${length} days was left out of the average because it is outside 15 to 90 days.`);
      continue;
    }
    intervals.push(length);
  }
  const recent = intervals.slice(-6);
  const cycleLength = recent.length ? average(recent) : typicalCycle;
  const variationDays = recent.length > 1 ? Math.max(...recent) - Math.min(...recent) : null;
  if (variationDays !== null && variationDays > 7) {
    irregular = true;
    notes.push("Recent cycle lengths vary by more than a week, so this estimate is limited.");
  }
  const last = periods[periods.length - 1];
  const confirmedLengths = periods
    .map((period) => (period.endedOn ? diffDays(period.endedOn, period.startedOn) + 1 : null))
    .filter((length): length is number => length !== null && length >= 1 && length <= 10);
  const periodLength = last.endedOn ? diffDays(last.endedOn, last.startedOn) + 1 : confirmedLengths.length ? average(confirmedLengths) : typicalPeriod;
  const periodLengthStatus = last.endedOn ? "confirmed" : "predicted";
  const nextPeriodStart = addDays(last.startedOn, cycleLength);
  const daysUntilPeriod = diffDays(nextPeriodStart, today);
  const daysLate = daysUntilPeriod < 0 ? -daysUntilPeriod : 0;
  const ovulationDate = addDays(nextPeriodStart, -luteal);
  let fertileStart = addDays(ovulationDate, -5);
  const fertileEnd = ovulationDate;
  if (compareDates(fertileStart, last.startedOn) < 0) {
    fertileStart = last.startedOn;
    notes.push("The estimated fertile window overlaps the recorded period start, so it is shown only from that start date.");
  }
  const cycleDay = diffDays(today, last.startedOn) + 1;
  const periodEnd = last.endedOn ?? addDays(last.startedOn, Math.max(periodLength, 1) - 1);
  let phase: CyclePhase = "luteal";
  if (compareDates(today, periodEnd) <= 0) phase = "menstrual";
  else if (compareDates(today, ovulationDate) < 0) phase = "follicular";
  else if (today === ovulationDate) phase = "ovulation";
  if (daysLate > 0) {
    notes.push("The recorded period has not started by the estimated date. A later fertile window is not calculated until you log a new period.");
  }
  notes.push("Ovulation and the fertile window are predicted from cycle dates. They are not confirmed.");
  const confidence = recent.length < 2 ? "low" : irregular ? "limited" : "medium";
  return {
    source: "local",
    confidence,
    today,
    timeZone: input.timeZone,
    hasHistory: true,
    cycleDay,
    cycleLength,
    cycleLengthSource: recent.length ? "history" : "setting",
    variationDays,
    lastPeriodStart: last.startedOn,
    periodLength: clamp(periodLength, 1, 10),
    periodLengthStatus,
    nextPeriodStart,
    daysUntilPeriod,
    daysLate,
    phase,
    ovulationDate,
    fertileStart,
    fertileEnd,
    inFertileWindow: compareDates(today, fertileStart) >= 0 && compareDates(today, fertileEnd) <= 0,
    irregular,
    notes,
  };
}

export function applyExternalEstimate(local: CycleEstimate, remote: ExternalDates | null): CycleEstimate {
  if (!local.hasHistory || !local.lastPeriodStart || !remote) {
    return {
      ...local,
      source: "local_fallback",
      notes: [...local.notes, "The external calculator did not return a usable estimate. Showing the CoupleSync calculation."],
    };
  }
  const dates = [remote.nextPeriodStart, remote.ovulationDate, remote.fertileStart, remote.fertileEnd];
  const ordered = dates.every(isIsoDate) && compareDates(remote.fertileStart, remote.ovulationDate) <= 0 && compareDates(remote.ovulationDate, remote.fertileEnd) <= 0;
  const window = ordered ? diffDays(remote.fertileEnd, remote.fertileStart) : 99;
  const afterStart = ordered && compareDates(remote.nextPeriodStart, local.lastPeriodStart) > 0;
  const nearLocal = ordered && local.nextPeriodStart && Math.abs(diffDays(remote.nextPeriodStart, local.nextPeriodStart)) <= 21 && local.ovulationDate && Math.abs(diffDays(remote.ovulationDate, local.ovulationDate)) <= 21;
  if (!ordered || window > 10 || window < 1 || !afterStart || !nearLocal) {
    return {
      ...local,
      source: "local_fallback",
      notes: [...local.notes, "The external calculator did not return a usable estimate. Showing the CoupleSync calculation."],
    };
  }
  const daysUntilPeriod = diffDays(remote.nextPeriodStart, local.today);
  const daysLate = daysUntilPeriod < 0 ? -daysUntilPeriod : 0;
  const periodEnd = local.lastPeriodStart && local.periodLength ? addDays(local.lastPeriodStart, local.periodLength - 1) : local.lastPeriodStart;
  let phase: CyclePhase = "luteal";
  if (periodEnd && compareDates(local.today, periodEnd) <= 0) phase = "menstrual";
  else if (compareDates(local.today, remote.ovulationDate) < 0) phase = "follicular";
  else if (local.today === remote.ovulationDate) phase = "ovulation";
  return {
    ...local,
    source: "external",
    cycleLength: remote.cycleLength && remote.cycleLength >= 15 && remote.cycleLength <= 90 ? remote.cycleLength : local.cycleLength,
    nextPeriodStart: remote.nextPeriodStart,
    ovulationDate: remote.ovulationDate,
    fertileStart: remote.fertileStart,
    fertileEnd: remote.fertileEnd,
    daysUntilPeriod,
    daysLate,
    phase,
    inFertileWindow: compareDates(local.today, remote.fertileStart) >= 0 && compareDates(local.today, remote.fertileEnd) <= 0,
    notes: [...local.notes.filter((note) => !note.startsWith("Ovulation and the fertile window")), "An external calculator supplied these dates. They are still predictions, not confirmed ovulation."],
  };
}

export type DayMark = {
  confirmedPeriod: boolean;
  predictedPeriod: boolean;
  fertile: boolean;
  ovulation: boolean;
};

export function calendarMarks(estimate: CycleEstimate, periods: PeriodInput[], days: string[]) {
  const marks = new Map<string, DayMark>();
  const ensure = (day: string) => {
    const current = marks.get(day) ?? { confirmedPeriod: false, predictedPeriod: false, fertile: false, ovulation: false };
    marks.set(day, current);
    return current;
  };
  const cleaned = cleanPeriods(periods);
  cleaned.forEach((period, index) => {
    const nextStart = cleaned[index + 1]?.startedOn ?? null;
    if (period.endedOn) {
      for (const day of eachDay(period.startedOn, period.endedOn)) ensure(day).confirmedPeriod = true;
      return;
    }
    ensure(period.startedOn).confirmedPeriod = true;
    const predictedEnd = addDays(period.startedOn, Math.max((estimate.periodLength ?? 5) - 1, 0));
    for (const day of eachDay(addDays(period.startedOn, 1), predictedEnd)) {
      if (nextStart && compareDates(day, nextStart) >= 0) break;
      ensure(day).predictedPeriod = true;
    }
  });
  if (estimate.nextPeriodStart && estimate.periodLength) {
    for (const day of eachDay(estimate.nextPeriodStart, addDays(estimate.nextPeriodStart, estimate.periodLength - 1))) {
      ensure(day).predictedPeriod = true;
    }
  }
  if (estimate.fertileStart && estimate.fertileEnd) {
    for (const day of eachDay(estimate.fertileStart, estimate.fertileEnd)) ensure(day).fertile = true;
  }
  if (estimate.ovulationDate) ensure(estimate.ovulationDate).ovulation = true;
  const result: Record<string, DayMark> = {};
  for (const day of days) {
    result[day] = marks.get(day) ?? { confirmedPeriod: false, predictedPeriod: false, fertile: false, ovulation: false };
  }
  return result;
}

export type RecordedCycle = {
  start: string;
  length: number | null;
  periodDays: number | null;
  lengthStatus: "recorded" | "open";
  earlierEstimate: number | null;
};

export function recordedCycles(periods: PeriodInput[], typicalCycleLength: number): RecordedCycle[] {
  const cleaned = cleanPeriods(periods);
  const completed: number[] = [];
  return cleaned.map((period, index) => {
    const next = cleaned[index + 1];
    const earlierEstimate = index === 0 ? null : completed.length ? average(completed.slice(-6)) : typicalCycleLength;
    const length = next ? diffDays(next.startedOn, period.startedOn) : null;
    if (length !== null && length >= MIN_CYCLE && length <= MAX_CYCLE) completed.push(length);
    const periodDays = period.endedOn ? diffDays(period.endedOn, period.startedOn) + 1 : null;
    return { start: period.startedOn, length, periodDays, lengthStatus: next ? "recorded" : "open", earlierEstimate };
  });
}
