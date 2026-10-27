import type { ExpenseCategory, ExpenseSplitMethod, SplitMethod } from "@/lib/domain";

export type BudgetHealth = "under" | "near" | "over" | "open";

export type LedgerExpense = {
  dayId: string | null;
  category: ExpenseCategory | string;
  estimated: number;
  actual: number;
  status: "planned" | "paid" | "partial" | "cancelled";
  paidBy: string;
  splitMethod: ExpenseSplitMethod;
  customSplitPercent: number | null;
};

export type DayBudget = {
  dayId: string | null;
  date: string | null;
  estimated: number;
  actual: number;
  difference: number;
  remaining: number;
  overAmount: number;
  health: BudgetHealth;
  categories: CategoryBudget[];
};

export type CategoryBudget = {
  category: string;
  estimated: number;
  actual: number;
  difference: number;
};

export type PartnerBalance = {
  userId: string;
  paid: number;
  expected: number;
  net: number;
};

export type Settlement = {
  partners: PartnerBalance[];
  owedBy: string | null;
  owedTo: string | null;
  amount: number;
  sharedPaid: number;
  sharedBills: number;
};

export type TripSummary = {
  estimatedLines: number;
  actual: number;
  budget: number;
  remaining: number;
  unspent: number;
  overAmount: number;
  utilization: number;
  health: BudgetHealth;
  days: DayBudget[];
  categories: CategoryBudget[];
  settlement: Settlement;
};

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyDifference(estimated: number, actual: number) {
  return roundMoney(estimated - actual);
}

export function budgetHealth(budget: number, actual: number, threshold: number): BudgetHealth {
  if (!(budget > 0)) return actual > 0 ? "over" : "open";
  if (actual > budget) return "over";
  const limit = Math.min(100, Math.max(1, threshold));
  if (actual >= budget || actual >= roundMoney(budget * (limit / 100))) return "near";
  return "under";
}

type SummaryInput = {
  estimatedBudget: number;
  warningThreshold: number;
  dailyLimit: number | null;
  splitMethod: SplitMethod;
  customSplitPercent: number;
  fixedContribution: number;
  partnerIds: string[];
  days: { id: string; date: string }[];
  expenses: LedgerExpense[];
};

export function summarizeTrip(input: SummaryInput): TripSummary {
  const active = input.expenses.filter((expense) => expense.status !== "cancelled");
  const estimatedLines = roundMoney(active.reduce((sum, expense) => sum + expense.estimated, 0));
  const actual = roundMoney(active.reduce((sum, expense) => sum + expense.actual, 0));
  const budget = input.estimatedBudget > 0 ? roundMoney(input.estimatedBudget) : estimatedLines;
  const remaining = roundMoney(budget - actual);
  const days = input.days.map((day) => dayBudget(day, active.filter((expense) => expense.dayId === day.id), input.dailyLimit, input.warningThreshold));
  const unassigned = active.filter((expense) => !expense.dayId || !input.days.some((day) => day.id === expense.dayId));
  if (unassigned.length) days.push(dayBudget(null, unassigned, input.dailyLimit, input.warningThreshold));
  return {
    estimatedLines,
    actual,
    budget,
    remaining,
    unspent: roundMoney(Math.max(remaining, 0)),
    overAmount: roundMoney(Math.max(actual - budget, 0)),
    utilization: budget > 0 ? roundMoney((actual / budget) * 100) : 0,
    health: budgetHealth(budget, actual, input.warningThreshold),
    days,
    categories: rollup(active),
    settlement: settle(active, input),
  };
}

function dayBudget(day: { id: string; date: string } | null, expenses: LedgerExpense[], dailyLimit: number | null, threshold: number): DayBudget {
  const estimated = roundMoney(expenses.reduce((sum, expense) => sum + expense.estimated, 0));
  const actual = roundMoney(expenses.reduce((sum, expense) => sum + expense.actual, 0));
  const envelope = dailyLimit != null && dailyLimit > 0 ? roundMoney(dailyLimit) : estimated;
  const remaining = roundMoney(envelope - actual);
  return {
    dayId: day?.id ?? null,
    date: day?.date ?? null,
    estimated,
    actual,
    difference: moneyDifference(estimated, actual),
    remaining,
    overAmount: roundMoney(Math.max(actual - envelope, 0)),
    health: budgetHealth(envelope, actual, threshold),
    categories: rollup(expenses),
  };
}

function rollup(expenses: LedgerExpense[]): CategoryBudget[] {
  const buckets = new Map<string, CategoryBudget>();
  for (const expense of expenses) {
    const current = buckets.get(expense.category) ?? { category: expense.category, estimated: 0, actual: 0, difference: 0 };
    current.estimated = roundMoney(current.estimated + expense.estimated);
    current.actual = roundMoney(current.actual + expense.actual);
    current.difference = moneyDifference(current.estimated, current.actual);
    buckets.set(expense.category, current);
  }
  return [...buckets.values()];
}

function settle(expenses: LedgerExpense[], input: SummaryInput): Settlement {
  const partners = input.partnerIds;
  const paid: Record<string, number> = {};
  const expected: Record<string, number> = {};
  for (const id of partners) {
    paid[id] = 0;
    expected[id] = 0;
  }
  const fixed: LedgerExpense[] = [];
  let sharedPaid = 0;
  let sharedBills = 0;
  for (const expense of expenses) {
    if (expense.paidBy === "shared") sharedPaid = roundMoney(sharedPaid + expense.actual);
    const method = expense.splitMethod === "inherit" ? input.splitMethod : expense.splitMethod;
    if (method !== "individual") sharedBills = roundMoney(sharedBills + expense.actual);
    addShares(paid, recordPayment(expense, partners));
    if (expense.actual <= 0) continue;
    if (method === "equal_fixed") {
      fixed.push(expense);
      continue;
    }
    addShares(expected, expectedShares(expense, method, input, partners));
  }
  if (fixed.length && partners.length) addShares(expected, equalFixedShares(fixed, input.fixedContribution, partners));
  const balances = partners.map((userId) => ({
    userId,
    paid: roundMoney(paid[userId] ?? 0),
    expected: roundMoney(expected[userId] ?? 0),
    net: roundMoney((paid[userId] ?? 0) - (expected[userId] ?? 0)),
  }));
  const debtor = balances.find((partner) => partner.net < -0.009);
  const creditor = balances.find((partner) => partner.net > 0.009);
  return {
    partners: balances,
    owedBy: debtor?.userId ?? null,
    owedTo: creditor?.userId ?? null,
    amount: debtor ? roundMoney(Math.abs(debtor.net)) : 0,
    sharedPaid: roundMoney(sharedPaid),
    sharedBills: roundMoney(sharedBills),
  };
}

function expectedShares(expense: LedgerExpense, method: SplitMethod, input: SummaryInput, partners: string[]) {
  if (!partners.length) return {};
  if (partners.length === 1) return { [partners[0]]: expense.actual };
  if (method === "individual") {
    if (expense.paidBy !== "shared" && partners.includes(expense.paidBy)) return { [expense.paidBy]: expense.actual };
    return splitEven(expense.actual, partners);
  }
  if (method === "custom_percent") {
    const percent = expense.customSplitPercent ?? input.customSplitPercent;
    const first = roundMoney(expense.actual * (percent / 100));
    return { [partners[0]]: first, [partners[1]]: roundMoney(expense.actual - first) };
  }
  return splitEven(expense.actual, partners);
}

function equalFixedShares(expenses: LedgerExpense[], fixedContribution: number, partners: string[]) {
  const pool = roundMoney(expenses.reduce((sum, expense) => sum + expense.actual, 0));
  const cap = roundMoney(Math.max(0, fixedContribution) * partners.length);
  const covered = fixedContribution > 0 ? Math.min(pool, cap) : pool;
  const base = splitEven(covered, partners);
  const overflow = roundMoney(pool - covered);
  const paidOnThese: Record<string, number> = {};
  for (const expense of expenses) addShares(paidOnThese, recordPayment(expense, partners));
  const weights = partners.map((id) => paidOnThese[id] ?? 0);
  const extra = splitByWeights(overflow, partners, weights);
  const shares: Record<string, number> = {};
  for (const id of partners) shares[id] = roundMoney((base[id] ?? 0) + (extra[id] ?? 0));
  return shares;
}

function recordPayment(expense: LedgerExpense, partners: string[]) {
  if (expense.actual <= 0 || !partners.length) return {};
  if (expense.paidBy === "shared" || !partners.includes(expense.paidBy)) return splitEven(expense.actual, partners);
  return { [expense.paidBy]: expense.actual };
}

function splitEven(amount: number, ids: string[]) {
  const shares: Record<string, number> = {};
  let used = 0;
  const base = roundMoney(amount / ids.length);
  ids.forEach((id, index) => {
    const part = index === ids.length - 1 ? roundMoney(amount - used) : base;
    shares[id] = part;
    used = roundMoney(used + part);
  });
  return shares;
}

function splitByWeights(amount: number, ids: string[], weights: number[]) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return splitEven(amount, ids);
  const shares: Record<string, number> = {};
  let used = 0;
  ids.forEach((id, index) => {
    if (index === ids.length - 1) {
      shares[id] = roundMoney(amount - used);
      return;
    }
    const part = roundMoney(amount * ((weights[index] ?? 0) / total));
    shares[id] = part;
    used = roundMoney(used + part);
  });
  return shares;
}

function addShares(target: Record<string, number>, shares: Record<string, number>) {
  for (const [id, amount] of Object.entries(shares)) target[id] = roundMoney((target[id] ?? 0) + amount);
}
