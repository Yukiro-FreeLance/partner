import { describe, expect, it } from "vitest";
import { budgetHealth, moneyDifference, summarizeTrip } from "@/lib/plans/money";
import { sampleEstimateTotal, samplePlan } from "@/lib/plans/sample";

const base = {
  estimatedBudget: 25000,
  warningThreshold: 80,
  dailyLimit: null,
  splitMethod: "fifty_fifty" as const,
  customSplitPercent: 50,
  fixedContribution: 0,
  partnerIds: ["a", "b"],
  days: [{ id: "d1", date: "2026-11-14" }],
};

describe("trip money", () => {
  it("treats a positive difference as spending below the estimate", () => {
    expect(moneyDifference(5000, 0)).toBe(5000);
    expect(moneyDifference(800, 1000)).toBe(-200);
  });

  it("marks under, near, and over budget", () => {
    expect(budgetHealth(100, 50, 80)).toBe("under");
    expect(budgetHealth(100, 80, 80)).toBe("near");
    expect(budgetHealth(100, 100, 80)).toBe("near");
    expect(budgetHealth(100, 101, 80)).toBe("over");
    expect(budgetHealth(0, 0, 80)).toBe("open");
  });

  it("splits a shared hotel bill in half and tracks who paid", () => {
    const summary = summarizeTrip({
      ...base,
      estimatedBudget: 4000,
      expenses: [
        {
          dayId: "d1",
          category: "accommodation",
          estimated: 4000,
          actual: 4000,
          status: "paid",
          paidBy: "a",
          splitMethod: "inherit",
          customSplitPercent: null,
        },
      ],
    });
    expect(summary.actual).toBe(4000);
    expect(summary.remaining).toBe(0);
    expect(summary.health).toBe("near");
    expect(summary.settlement.partners).toEqual([
      { userId: "a", paid: 4000, expected: 2000, net: 2000 },
      { userId: "b", paid: 0, expected: 2000, net: -2000 },
    ]);
    expect(summary.settlement.owedBy).toBe("b");
    expect(summary.settlement.owedTo).toBe("a");
    expect(summary.settlement.amount).toBe(2000);
  });

  it("keeps spending above an equal fixed contribution with the person who paid it", () => {
    const summary = summarizeTrip({
      ...base,
      splitMethod: "equal_fixed",
      fixedContribution: 2000,
      estimatedBudget: 6000,
      expenses: [
        {
          dayId: "d1",
          category: "accommodation",
          estimated: 6000,
          actual: 6000,
          status: "paid",
          paidBy: "a",
          splitMethod: "inherit",
          customSplitPercent: null,
        },
      ],
    });
    expect(summary.settlement.amount).toBe(2000);
    expect(summary.settlement.partners.find((partner) => partner.userId === "a")?.expected).toBe(4000);
    expect(summary.settlement.partners.find((partner) => partner.userId === "b")?.expected).toBe(2000);
  });

  it("ignores cancelled expenses and updates totals from the ledger", () => {
    const summary = summarizeTrip({
      ...base,
      expenses: [
        { dayId: "d1", category: "food", estimated: 800, actual: 900, status: "paid", paidBy: "shared", splitMethod: "individual", customSplitPercent: null },
        { dayId: "d1", category: "food", estimated: 500, actual: 500, status: "cancelled", paidBy: "a", splitMethod: "inherit", customSplitPercent: null },
      ],
    });
    expect(summary.estimatedLines).toBe(800);
    expect(summary.actual).toBe(900);
    expect(summary.remaining).toBe(24100);
    expect(summary.days[0]?.difference).toBe(-100);
    expect(summary.settlement.amount).toBe(0);
  });

  it("builds the Manila sample budget at 25000 with no actual spending", () => {
    expect(sampleEstimateTotal()).toBe(samplePlan.estimatedBudget);
    expect(samplePlan.estimatedBudget).toBe(25000);
  });
});
