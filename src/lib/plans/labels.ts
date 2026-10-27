import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { ActivityStatus, DatePlanEventType, DatePlanStatus, ExpenseCategory, ExpenseStatus, PaymentMethod, SplitMethod } from "@/lib/domain";
import type { BudgetHealth } from "@/lib/plans/money";

export const eventTypeLabels: Record<DatePlanEventType, string> = {
  concert: "Concert",
  travel: "Travel",
  anniversary: "Anniversary",
  date_night: "Date Night",
  vacation: "Vacation",
  other: "Other",
};

export const planStatusLabels: Record<DatePlanStatus, string> = {
  planning: "Planning",
  ready: "Ready",
  ongoing: "Ongoing",
  completed: "Completed",
};

export const categoryLabels: Record<ExpenseCategory, string> = {
  flight: "Flight",
  accommodation: "Accommodation",
  food: "Food",
  transportation: "Transportation",
  activities: "Activities",
  merchandise: "Merchandise",
  shopping: "Shopping",
  other: "Other",
};

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  planned: "Planned",
  paid: "Paid",
  partial: "Partially paid",
  cancelled: "Cancelled",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  planned: "Planned",
  done: "Done",
  skipped: "Skipped",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  transfer: "Transfer",
  ewallet: "E-wallet",
  other: "Other",
};

export const splitLabels: Record<SplitMethod, string> = {
  fifty_fifty: "50/50 split",
  custom_percent: "Custom percentage",
  equal_fixed: "Equal fixed contributions",
  individual: "Individually paid expenses",
};

export function formatMoney(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  const locale = currency === "PHP" ? "en-PH" : "en";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatPlanRange(start: string, end: string) {
  const from = parseISO(start);
  const to = parseISO(end);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${format(from, "MMMM d")}–${format(to, "d")}`;
  return `${format(from, "MMM d")} – ${format(to, "MMM d")}`;
}

export function countdownLabel(start: string, end: string, today = new Date().toISOString().slice(0, 10)) {
  if (today < start) {
    const days = differenceInCalendarDays(parseISO(start), parseISO(today));
    if (days <= 0) return "Starts today";
    if (days === 1) return "Tomorrow";
    return `${days} days to go`;
  }
  if (today <= end) {
    const day = differenceInCalendarDays(parseISO(today), parseISO(start)) + 1;
    return `Day ${day}`;
  }
  const ago = differenceInCalendarDays(parseISO(today), parseISO(end));
  if (ago === 0) return "Ends today";
  return ago === 1 ? "Ended yesterday" : "Trip ended";
}

export function healthLabel(health: BudgetHealth, actual = 0, budget = 0) {
  if (health === "over") return "Over budget";
  if (health === "open") return "No budget set";
  if (budget > 0 && roundSame(actual, budget)) return "At budget limit";
  if (health === "near") return "Near budget limit";
  return "Under budget";
}

function roundSame(left: number, right: number) {
  return Math.round(left * 100) === Math.round(right * 100);
}

export function healthClass(health: BudgetHealth) {
  if (health === "over") return "bg-rose-50 text-rose-900";
  if (health === "near") return "bg-[#fde7f3] text-primary";
  if (health === "open") return "bg-secondary text-secondary-foreground";
  return "bg-emerald-50 text-emerald-800";
}

export function partnerHeading(index: number, name: string) {
  return `Partner ${index + 1} · ${name}`;
}

export function payerName(partners: { userId: string; name: string; index: number }[], paidBy: string) {
  if (paidBy === "shared") return "Shared";
  const partner = partners.find((item) => item.userId === paidBy);
  return partner ? partnerHeading(partner.index, partner.name) : "Partner";
}
