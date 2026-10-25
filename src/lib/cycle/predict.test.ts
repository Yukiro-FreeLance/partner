import { describe, expect, it } from "vitest";
import { addDays, calendarDay, diffDays, isIsoDate, monthGrid, weekDays } from "@/lib/cycle/dates";
import { fertilityInsight } from "@/lib/cycle/fertility";
import { calendarMarks, predictLocal, recordedCycles } from "@/lib/cycle/predict";
import { projectForPartner, sensitiveText } from "@/lib/cycle/privacy";
import { fetchApiverveEstimate, parseApivervePayload, resolveEstimate } from "@/lib/cycle/provider";
import { dueReminderPlans } from "@/lib/cycle/reminders";
import { blankCycleProfile } from "@/lib/cycle/sample";
import type { CycleCheckIn, CycleShareGrant } from "@/lib/domain";

const base = {
  today: "2026-01-10",
  timeZone: "UTC",
  periods: [{ startedOn: "2026-01-01", endedOn: null }],
  typicalCycleLength: 28,
  typicalPeriodLength: 5,
  lutealLength: 14,
};

function entry(patch: Partial<CycleCheckIn> = {}): CycleCheckIn {
  return {
    id: "check",
    userId: "owner",
    day: "2026-01-10",
    symptoms: ["cramps"],
    customSymptoms: [],
    mood: "calm",
    energy: 4,
    sexDrive: "high",
    bleeding: "light",
    cervicalMucus: "egg_white",
    sleepQuality: 3,
    stressLevel: 2,
    wellnessNote: "walk",
    moment: "space",
    notes: "private journal",
    affection: 2,
    emotionalCloseness: 3,
    intimacyPreference: "space",
    comfort: 3,
    readiness: 2,
    sexualActivity: "unprotected",
    contraception: "none",
    shareLevel: "private",
    sharedFields: [],
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...patch,
  };
}

describe("cycle dates", () => {
  it("keeps calendar arithmetic on the date itself across a DST boundary", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(diffDays("2026-03-09", "2026-03-08")).toBe(1);
    expect(isIsoDate("2026-02-31")).toBe(false);
  });

  it("uses the requested time zone for today", () => {
    const instant = new Date("2026-10-25T16:30:00.000Z");
    expect(calendarDay("Asia/Manila", instant)).toBe("2026-10-26");
    expect(calendarDay("America/Los_Angeles", instant)).toBe("2026-10-25");
    expect(calendarDay("Not/AZone", instant)).toBe(calendarDay("UTC", instant));
  });

  it("builds a Monday week and a full month grid", () => {
    expect(weekDays("2026-10-25")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    const month = monthGrid("2026-10-25");
    expect(month.cells).toHaveLength(35);
    expect(month.cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });
});

describe("cycle predictions", () => {
  it("estimates from one recorded period without calling the result confirmed", () => {
    const estimate = predictLocal(base);
    expect(estimate.cycleDay).toBe(10);
    expect(estimate.cycleLength).toBe(28);
    expect(estimate.cycleLengthSource).toBe("setting");
    expect(estimate.confidence).toBe("low");
    expect(estimate.nextPeriodStart).toBe("2026-01-29");
    expect(estimate.ovulationDate).toBe("2026-01-15");
    expect(estimate.fertileStart).toBe("2026-01-10");
    expect(estimate.fertileEnd).toBe("2026-01-15");
    expect(estimate.phase).toBe("follicular");
    expect(estimate.inFertileWindow).toBe(true);
    expect(estimate.periodLengthStatus).toBe("predicted");
    expect(estimate.notes.join(" ")).toMatch(/not confirmed/i);
  });

  it("uses recent history and keeps a late period on the original estimate", () => {
    const estimate = predictLocal({
      ...base,
      today: "2026-02-03",
      periods: [
        { startedOn: "2025-11-06", endedOn: "2025-11-10" },
        { startedOn: "2025-12-04", endedOn: "2025-12-08" },
        { startedOn: "2026-01-01", endedOn: "2026-01-05" },
      ],
    });
    expect(estimate.cycleLength).toBe(28);
    expect(estimate.confidence).toBe("medium");
    expect(estimate.nextPeriodStart).toBe("2026-01-29");
    expect(estimate.daysLate).toBe(5);
    expect(estimate.phase).toBe("luteal");
    expect(estimate.periodLengthStatus).toBe("confirmed");
    expect(estimate.notes.join(" ")).toMatch(/not started by the estimated date/i);
  });

  it("drops impossible gaps and ignores a future start", () => {
    const estimate = predictLocal({
      ...base,
      today: "2026-03-01",
      periods: [
        { startedOn: "2026-01-01", endedOn: null },
        { startedOn: "2026-01-05", endedOn: null },
        { startedOn: "2026-02-02", endedOn: null },
        { startedOn: "2026-04-01", endedOn: null },
      ],
    });
    expect(estimate.lastPeriodStart).toBe("2026-02-02");
    expect(estimate.irregular).toBe(true);
    expect(estimate.confidence).toBe("low");
  });

  it("labels confirmed bleeding separately from predicted period days", () => {
    const estimate = predictLocal(base);
    const marks = calendarMarks(estimate, base.periods, ["2026-01-01", "2026-01-02", "2026-01-29"]);
    expect(marks["2026-01-01"].confirmedPeriod).toBe(true);
    expect(marks["2026-01-02"].predictedPeriod).toBe(true);
    expect(marks["2026-01-02"].confirmedPeriod).toBe(false);
    expect(marks["2026-01-29"].predictedPeriod).toBe(true);
  });

  it("compares an earlier estimate with the recorded next period", () => {
    const rows = recordedCycles([
      { startedOn: "2026-01-01", endedOn: "2026-01-05" },
      { startedOn: "2026-01-29", endedOn: "2026-02-02" },
      { startedOn: "2026-02-26", endedOn: null },
    ], 28);
    expect(rows[1].length).toBe(28);
    expect(rows[1].earlierEstimate).toBe(28);
    expect(rows[2].lengthStatus).toBe("open");
    expect(rows[0].periodDays).toBe(5);
  });
});

describe("fertility wording", () => {
  it("does not turn a calendar estimate into a probability or a pregnancy claim", () => {
    const estimate = predictLocal({ ...base, today: "2026-02-03", periods: [{ startedOn: "2026-01-01", endedOn: "2026-01-05" }] });
    const insight = fertilityInsight(estimate, [entry({ day: "2026-01-12", sexualActivity: "unprotected" })], [{
      id: "test",
      userId: "owner",
      testedOn: "2026-02-03",
      result: "positive",
      notes: null,
      createdAt: "2026-02-03T00:00:00.000Z",
      updatedAt: "2026-02-03T00:00:00.000Z",
    }]);
    const text = [...insight.statements, insight.testReminder, ...insight.recordedTests].join(" ");
    expect(text).not.toMatch(/%|you are pregnant|guaranteed|safe day/i);
    expect(text).toMatch(/not a pregnancy probability/i);
    expect(text).toMatch(/not assumed to mean pregnancy/i);
    expect(text).toMatch(/not a diagnosis/i);
    expect(insight.testReminder).toMatch(/late period has many causes/i);
  });
});

describe("partner projection", () => {
  const estimate = predictLocal(base);
  const grant = (scope: CycleShareGrant["scope"], revokedAt: string | null = null): CycleShareGrant => ({
    id: scope,
    ownerId: "owner",
    partnerId: "partner",
    coupleId: "couple",
    scope,
    grantedAt: "2026-01-01T00:00:00.000Z",
    revokedAt,
  });

  it("hides private health details until each grant and day setting allows them", () => {
    const hidden = projectForPartner({ grants: [grant("mood_summary"), grant("selected_details"), grant("intimacy_summary")], estimate, periods: [], checkIns: [entry()], events: [] });
    expect(hidden.daily).toEqual([]);
    expect(JSON.stringify(hidden)).not.toMatch(/private journal|unprotected|Sex drive/);

    const summary = projectForPartner({
      grants: [grant("mood_summary")],
      estimate,
      periods: [],
      checkIns: [entry({ shareLevel: "summary", notes: "private journal", sexualActivity: "unprotected" })],
      events: [],
    });
    expect(summary.daily[0]?.lines.join(" ")).toMatch(/Calm/);
    expect(summary.daily[0]?.lines.join(" ")).not.toMatch(/journal|unprotected|Sex drive/);

    const selected = projectForPartner({
      grants: [grant("intimacy_summary"), grant("selected_details")],
      estimate,
      periods: [],
      checkIns: [entry({ shareLevel: "selected", sharedFields: ["sexDrive", "notes"] })],
      events: [],
    });
    expect(selected.daily[0]?.lines.join(" ")).toMatch(/Sex drive high/);
    expect(selected.daily[0]?.lines.join(" ")).toMatch(/private journal/);
    expect(selected.daily[0]?.lines.join(" ")).not.toMatch(/unprotected/);

    const revoked = projectForPartner({
      grants: [grant("period_summary", "2026-01-02T00:00:00.000Z")],
      estimate,
      periods: [],
      checkIns: [],
      events: [{ id: "event", userId: "owner", coupleId: "couple", day: "2026-01-11", title: "Dinner", body: "secret", visibility: "private", createdAt: "", updatedAt: "" }],
    });
    expect(revoked.periodSummary).toBeNull();
    expect(revoked.events).toEqual([]);
  });
});

describe("optional external calculator", () => {
  it("sends only dates and lengths, then falls back when the payload is unusable", async () => {
    let requested = "";
    const result = await fetchApiverveEstimate({
      endpoint: "https://api.apiverve.com/v1/menstrualcycle",
      apiKey: "test-key",
      lastPeriod: "2026-01-01",
      cycleLength: 28,
      periodLength: 5,
      fetchImpl: async (url) => {
        requested = url;
        return { ok: true, json: async () => ({ status: "ok", data: { symptoms: "cramps", cycles: [] } }) };
      },
    });
    expect(result.ok).toBe(false);
    expect(requested).toContain("last_period=2026-01-01");
    expect(requested).not.toMatch(/cramp|unprotected|journal/i);
    expect(parseApivervePayload({ data: { cycles: [] } }, "2026-01-01")).toBeNull();
  });

  it("keeps the local estimate when consent or the service is missing", async () => {
    const previous = process.env.CYCLE_PREDICTION_PROVIDER;
    const key = process.env.CYCLE_PREDICTION_API_KEY;
    process.env.CYCLE_PREDICTION_PROVIDER = "apiverve";
    process.env.CYCLE_PREDICTION_API_KEY = "test-key";
    let called = false;
    const estimate = await resolveEstimate(base, false, async () => {
      called = true;
      return { ok: false, json: async () => ({}) };
    });
    expect(called).toBe(false);
    expect(estimate.source).toBe("local");
    process.env.CYCLE_PREDICTION_PROVIDER = previous;
    if (key === undefined) delete process.env.CYCLE_PREDICTION_API_KEY;
    else process.env.CYCLE_PREDICTION_API_KEY = key;
  });
});

describe("discreet reminders", () => {
  it("uses lock-screen wording and replaces a sensitive custom title", () => {
    const profile = { ...blankCycleProfile("owner", "2026-01-01T00:00:00.000Z"), periodReminder: true, periodLeadDays: 2, pregnancyTestReminder: true };
    const estimate = predictLocal({ ...base, today: "2026-01-28" });
    const plans = dueReminderPlans({
      profile,
      estimate,
      today: "2026-01-28",
      hour: 21,
      checkInToday: true,
      checkInYesterday: true,
      reminders: [{ id: "med", userId: "owner", kind: "medication", title: "Period pills", hour: 9, enabled: true, nextRunOn: "2026-01-28", createdAt: "", updatedAt: "" }],
      already: [],
    });
    for (const plan of plans) {
      expect(sensitiveText(`${plan.title} ${plan.body}`)).toBe(false);
    }
    expect(plans.some((plan) => plan.title === "Wellness reminder")).toBe(true);
  });
});
