import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/data/memory";
import type { Profile, UserPreferences } from "@/lib/domain";
import { acceptInvitation, createCouple } from "@/lib/services/couples";
import { createDatePlan, createSampleDatePlan, loadDatePlan, patchExpenseAmounts, saveExpense, toggleChecklistItem } from "@/lib/services/plans";

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

async function couple() {
  const repo = createMemoryRepository();
  await repo.insert("profiles", profile("a", "Avery"));
  await repo.insert("profiles", profile("b", "Blair"));
  await repo.insert("profiles", profile("c", "Casey"));
  await repo.insert("userPreferences", preferences("a"));
  await repo.insert("userPreferences", preferences("b"));
  const created = await createCouple(repo, "a", { name: "Avery and Blair" });
  if (!created.ok) throw new Error(created.error);
  const accepted = await acceptInvitation(repo, "b", created.data.invitation.code);
  if (!accepted.ok) throw new Error(accepted.error);
  return repo;
}

const planInput = {
  title: "Anniversary dinner",
  description: "A quiet night out",
  destination: "Quezon City",
  startDate: "2026-12-01",
  endDate: "2026-12-01",
  eventType: "anniversary" as const,
  currency: "PHP",
  estimatedBudget: 4000,
  status: "planning" as const,
  splitMethod: "fifty_fifty" as const,
  customSplitPercent: 50,
  fixedContribution: 0,
  warningThreshold: 80,
  dailyLimit: 4000,
};

describe("date plans", () => {
  it("keeps plans inside the couple and updates totals from expenses", async () => {
    const repo = await couple();
    const created = await createDatePlan(repo, "a", planInput);
    if (!created.ok) throw new Error(created.error);
    const blocked = await loadDatePlan(repo, "c", created.data.id);
    expect(blocked.ok).toBe(false);
    const expense = await saveExpense(repo, "b", created.data.id, {
      dayId: null,
      activityId: null,
      name: "Hotel",
      category: "accommodation",
      estimatedAmount: 4000,
      actualAmount: 4000,
      paidBy: "a",
      splitMethod: "inherit",
      customSplitPercent: null,
      paymentMethod: "card",
      expenseDate: "2026-12-01T18:00",
      notes: null,
      status: "paid",
    });
    if (!expense.ok) throw new Error(expense.error);
    const loaded = await loadDatePlan(repo, "b", created.data.id);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.data.summary.actual).toBe(4000);
    expect(loaded.data.summary.remaining).toBe(0);
    expect(loaded.data.summary.settlement.owedBy).toBe("b");
    expect(loaded.data.summary.settlement.amount).toBe(2000);
    const changed = await patchExpenseAmounts(repo, "a", created.data.id, expense.data.id, 4000, 4500);
    if (!changed.ok) throw new Error(changed.error);
    const again = await loadDatePlan(repo, "a", created.data.id);
    if (!again.ok) throw new Error(again.error);
    expect(again.data.summary.actual).toBe(4500);
    expect(again.data.summary.health).toBe("over");
    expect(again.data.summary.overAmount).toBe(500);
    const notes = await repo.list("notifications", { eq: { userId: "b" } });
    expect(notes.some((note) => note.title === "Budget overrun")).toBe(true);
  });

  it("creates the shared Manila sample with six days and a 25000 budget", async () => {
    const repo = await couple();
    const created = await createSampleDatePlan(repo, "a");
    if (!created.ok) throw new Error(created.error);
    expect(created.data.created).toBe(true);
    const loaded = await loadDatePlan(repo, "b", created.data.id);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.data.days).toHaveLength(6);
    expect(loaded.data.activities.length).toBeGreaterThan(20);
    expect(loaded.data.summary.budget).toBe(25000);
    expect(loaded.data.summary.actual).toBe(0);
    expect(loaded.data.summary.health).toBe("under");
    const repeat = await createSampleDatePlan(repo, "b");
    if (!repeat.ok) throw new Error(repeat.error);
    expect(repeat.data.id).toBe(created.data.id);
    expect(repeat.data.created).toBe(false);
    const checklist = loaded.data.checklists[0];
    if (!checklist) throw new Error("missing checklist");
    const toggled = await toggleChecklistItem(repo, "b", created.data.id, checklist.id, true);
    if (!toggled.ok) throw new Error(toggled.error);
    expect(toggled.data.completedBy).toBe("b");
    expect(toggled.data.isCompleted).toBe(true);
  });
});
