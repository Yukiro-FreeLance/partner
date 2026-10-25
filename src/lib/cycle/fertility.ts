import type { CycleCheckIn, CyclePregnancyLog } from "@/lib/domain";
import { FERTILITY_LIMITS, optionLabel, ACTIVITY_OPTIONS, CONTRACEPTION_OPTIONS } from "@/lib/cycle/copy";
import { compareDates, formatDay } from "@/lib/cycle/dates";
import type { CycleEstimate } from "@/lib/cycle/predict";

export type FertilityInsight = {
  band: "unknown" | "inside_estimate" | "near_estimate" | "outside_estimate";
  statements: string[];
  testReminder: string | null;
  recordedTests: string[];
};

function nearWindow(estimate: CycleEstimate) {
  if (!estimate.fertileStart || !estimate.fertileEnd) return false;
  const startDistance = Math.abs(dateDistance(estimate.today, estimate.fertileStart));
  const endDistance = Math.abs(dateDistance(estimate.today, estimate.fertileEnd));
  return !estimate.inFertileWindow && (startDistance <= 2 || endDistance <= 2);
}

function dateDistance(left: string, right: string) {
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  return Math.round((Date.UTC(ly, lm - 1, ld) - Date.UTC(ry, rm - 1, rd)) / 86_400_000);
}

export function fertilityInsight(estimate: CycleEstimate, checkIns: CycleCheckIn[], tests: CyclePregnancyLog[]): FertilityInsight {
  const statements: string[] = [...FERTILITY_LIMITS];
  let band: FertilityInsight["band"] = "unknown";
  if (!estimate.hasHistory) {
    statements.push("Log a period start to see a calendar estimate.");
  } else if (estimate.inFertileWindow) {
    band = "inside_estimate";
    statements.push("Today falls inside the estimated fertile window. That is a calendar estimate only.");
  } else if (nearWindow(estimate)) {
    band = "near_estimate";
    statements.push("Today is within two days of the estimated window. Ovulation can shift, so this is not a boundary.");
  } else {
    band = "outside_estimate";
    statements.push("Today is outside the estimated fertile window. Being outside that estimate does not make unprotected sex safe.");
  }

  const relevant = checkIns.filter((entry) => entry.sexualActivity || entry.contraception);
  for (const entry of relevant) {
    const inWindow = estimate.fertileStart && estimate.fertileEnd && compareDates(entry.day, estimate.fertileStart) >= 0 && compareDates(entry.day, estimate.fertileEnd) <= 0;
    if (entry.sexualActivity === "unprotected") {
      statements.push(
        inWindow
          ? `You logged sex without contraception on ${formatDay(entry.day)}, inside the estimated window. A pregnancy test can be informative if a period is late. This log cannot show whether pregnancy has occurred.`
          : `You logged sex without contraception on ${formatDay(entry.day)}. This log cannot show whether pregnancy has occurred.`,
      );
    } else if (entry.sexualActivity === "protected" || (entry.contraception && entry.contraception !== "none")) {
      const method = optionLabel(CONTRACEPTION_OPTIONS, entry.contraception) ?? optionLabel(ACTIVITY_OPTIONS, entry.sexualActivity) ?? "a method";
      statements.push(`You logged contraception (${method}) on ${formatDay(entry.day)}. This app does not estimate whether a method worked.`);
    }
  }

  const recordedTests = tests
    .slice()
    .sort((left, right) => compareDates(right.testedOn, left.testedOn))
    .map((entry) => {
      if (entry.result === "positive") return `You recorded a positive pregnancy test on ${formatDay(entry.testedOn)}. This is your log, not a diagnosis. A clinician can help you confirm a pregnancy.`;
      if (entry.result === "negative") return `You recorded a negative pregnancy test on ${formatDay(entry.testedOn)}. A negative result can be early, and this app does not interpret it.`;
      if (entry.result === "invalid") return `You recorded an invalid pregnancy test on ${formatDay(entry.testedOn)}.`;
      return `You recorded a pregnancy test note on ${formatDay(entry.testedOn)} without a result.`;
    });

  const testReminder = estimate.daysLate > 0
    ? "Your period is later than the estimate. A home pregnancy test may be appropriate if you want that information. A late period has many causes and is not assumed to mean pregnancy."
    : null;

  return { band, statements, testReminder, recordedTests };
}
