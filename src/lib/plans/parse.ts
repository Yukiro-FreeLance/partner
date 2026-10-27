import type { ActivityStatus, DatePlanEventType, DatePlanStatus, ExpenseCategory, ExpenseSplitMethod, ExpenseStatus, PaymentMethod, SplitMethod } from "@/lib/domain";
import { fail, ok, type Result } from "@/lib/result";
import { roundMoney } from "@/lib/plans/money";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
const eventTypes = new Set<DatePlanEventType>(["concert", "travel", "anniversary", "date_night", "vacation", "other"]);
const planStatuses = new Set<DatePlanStatus>(["planning", "ready", "ongoing", "completed"]);
const splitMethods = new Set<SplitMethod>(["fifty_fifty", "custom_percent", "equal_fixed", "individual"]);
const expenseSplits = new Set<ExpenseSplitMethod>(["inherit", "fifty_fifty", "custom_percent", "equal_fixed", "individual"]);
const categories = new Set<ExpenseCategory>(["flight", "accommodation", "food", "transportation", "activities", "merchandise", "shopping", "other"]);
const expenseStatuses = new Set<ExpenseStatus>(["planned", "paid", "partial", "cancelled"]);
const activityStatuses = new Set<ActivityStatus>(["planned", "done", "skipped"]);
const payments = new Set<PaymentMethod>(["cash", "card", "transfer", "ewallet", "other"]);

export type PlanInput = {
  title: string;
  description: string | null;
  destination: string | null;
  startDate: string;
  endDate: string;
  eventType: DatePlanEventType;
  currency: string;
  estimatedBudget: number;
  status: DatePlanStatus;
  splitMethod: SplitMethod;
  customSplitPercent: number;
  fixedContribution: number;
  warningThreshold: number;
  dailyLimit: number | null;
};

export type DayInput = {
  id?: string;
  date: string;
  title: string;
  description: string | null;
};

export type ActivityInput = {
  id?: string;
  dayId: string;
  title: string;
  description: string | null;
  location: string | null;
  mapUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  estimatedCost: number;
  actualCost: number;
  status: ActivityStatus;
  notes: string | null;
  reservation: string | null;
  trackExpense: boolean;
  expenseCategory: ExpenseCategory;
};

export type ExpenseInput = {
  id?: string;
  dayId: string | null;
  activityId: string | null;
  name: string;
  category: ExpenseCategory;
  estimatedAmount: number;
  actualAmount: number;
  paidBy: string;
  splitMethod: ExpenseSplitMethod;
  customSplitPercent: number | null;
  paymentMethod: PaymentMethod | null;
  expenseDate: string;
  notes: string | null;
  status: ExpenseStatus;
};

export function planFromForm(form: FormData): Result<PlanInput> {
  const title = text(form, "title");
  const description = optionalText(form, "description", 2000);
  const destination = optionalText(form, "destination", 160);
  const startDate = text(form, "startDate");
  const endDate = text(form, "endDate");
  const eventType = text(form, "eventType");
  const currency = text(form, "currency").toUpperCase();
  const status = text(form, "status");
  const splitMethod = text(form, "splitMethod");
  if (title.length < 2 || title.length > 120) return fail("Give the plan a title between 2 and 120 characters.");
  if (!description.ok) return description;
  if (!destination.ok) return destination;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) return fail("Use valid start and end dates.");
  if (endDate < startDate) return fail("The end date must be on or after the start date.");
  if (!eventTypes.has(eventType as DatePlanEventType)) return fail("Choose an event type.");
  if (!/^[A-Z]{3}$/.test(currency)) return fail("Use a 3-letter currency code, such as PHP.");
  if (!planStatuses.has(status as DatePlanStatus)) return fail("Choose a planning status.");
  if (!splitMethods.has(splitMethod as SplitMethod)) return fail("Choose how you want to share costs.");
  const estimatedBudget = money(form, "estimatedBudget", true);
  const customSplitPercent = money(form, "customSplitPercent", true);
  const fixedContribution = money(form, "fixedContribution", true);
  const warningThreshold = money(form, "warningThreshold", true);
  const dailyLimit = optionalMoney(form, "dailyLimit");
  if (!estimatedBudget.ok || !customSplitPercent.ok || !fixedContribution.ok || !warningThreshold.ok || !dailyLimit.ok) {
    return firstError(estimatedBudget, customSplitPercent, fixedContribution, warningThreshold, dailyLimit);
  }
  if (customSplitPercent.data > 100) return fail("The custom split must be between 0 and 100.");
  if (warningThreshold.data < 1 || warningThreshold.data > 100) return fail("The warning threshold must be between 1 and 100 percent.");
  return ok({
    title,
    description: description.data,
    destination: destination.data,
    startDate,
    endDate,
    eventType: eventType as DatePlanEventType,
    currency,
    estimatedBudget: estimatedBudget.data,
    status: status as DatePlanStatus,
    splitMethod: splitMethod as SplitMethod,
    customSplitPercent: customSplitPercent.data,
    fixedContribution: fixedContribution.data,
    warningThreshold: warningThreshold.data,
    dailyLimit: dailyLimit.data,
  });
}

export function dayFromForm(form: FormData): Result<DayInput> {
  const date = text(form, "date");
  const title = text(form, "title");
  const description = optionalText(form, "description", 2000);
  const id = text(form, "id");
  if (!datePattern.test(date)) return fail("Choose a valid day.");
  if (title.length < 1 || title.length > 120) return fail("Give the day a title up to 120 characters.");
  if (!description.ok) return description;
  return ok({ id: id || undefined, date, title, description: description.data });
}

export function activityFromForm(form: FormData): Result<ActivityInput> {
  const title = text(form, "title");
  const description = optionalText(form, "description", 2000);
  const location = optionalText(form, "location", 200);
  const notes = optionalText(form, "notes", 2000);
  const reservation = optionalText(form, "reservation", 500);
  const map = optionalUrl(text(form, "mapUrl"));
  const startTime = optionalTime(text(form, "startTime"));
  const endTime = optionalTime(text(form, "endTime"));
  const estimatedCost = money(form, "estimatedCost", true);
  const actualCost = money(form, "actualCost", true);
  const status = text(form, "status") || "planned";
  const category = text(form, "expenseCategory") || "other";
  const dayId = text(form, "dayId");
  const id = text(form, "id");
  if (!dayId) return fail("Choose the day for this activity.");
  if (title.length < 2 || title.length > 160) return fail("Give the activity a title between 2 and 160 characters.");
  if (!description.ok || !location.ok || !notes.ok || !reservation.ok) return firstError(description, location, notes, reservation);
  if (!map.ok || !startTime.ok || !endTime.ok) return firstError(map, startTime, endTime);
  if (startTime.data && endTime.data && endTime.data <= startTime.data) return fail("The end time must be after the start time.");
  if (!estimatedCost.ok || !actualCost.ok) return firstError(estimatedCost, actualCost);
  if (!activityStatuses.has(status as ActivityStatus)) return fail("Choose an activity status.");
  if (!categories.has(category as ExpenseCategory)) return fail("Choose an expense category.");
  return ok({
    id: id || undefined,
    dayId,
    title,
    description: description.data,
    location: location.data,
    mapUrl: map.data,
    startTime: startTime.data,
    endTime: endTime.data,
    estimatedCost: estimatedCost.data,
    actualCost: actualCost.data,
    status: status as ActivityStatus,
    notes: notes.data,
    reservation: reservation.data,
    trackExpense: form.get("trackExpense") === "1",
    expenseCategory: category as ExpenseCategory,
  });
}

export function expenseFromForm(form: FormData): Result<ExpenseInput> {
  const name = text(form, "expenseName");
  const category = text(form, "category");
  const estimatedAmount = money(form, "estimatedAmount", true);
  const actualAmount = money(form, "actualAmount", true);
  const paidBy = text(form, "paidBy");
  const splitMethod = text(form, "splitMethod") || "inherit";
  const custom = text(form, "customSplitPercent");
  const payment = text(form, "paymentMethod");
  const expenseDate = text(form, "expenseDate");
  const notes = optionalText(form, "notes", 2000);
  const status = text(form, "status") || "planned";
  const dayId = text(form, "dayId");
  const activityId = text(form, "activityId");
  const id = text(form, "id");
  if (name.length < 1 || name.length > 160) return fail("Name the expense in 160 characters or fewer.");
  if (!categories.has(category as ExpenseCategory)) return fail("Choose a category.");
  if (!estimatedAmount.ok || !actualAmount.ok || !notes.ok) return firstError(estimatedAmount, actualAmount, notes);
  if (!paidBy) return fail("Choose who paid.");
  if (!expenseSplits.has(splitMethod as ExpenseSplitMethod)) return fail("Choose a cost-sharing method.");
  let customSplitPercent: number | null = null;
  if (custom) {
    const parsed = Number(custom);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return fail("The custom split must be between 0 and 100.");
    customSplitPercent = roundMoney(parsed);
  }
  if (payment && !payments.has(payment as PaymentMethod)) return fail("Choose a payment method.");
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(expenseDate)) return fail("Choose a date and time for the expense.");
  if (!expenseStatuses.has(status as ExpenseStatus)) return fail("Choose an expense status.");
  return ok({
    id: id || undefined,
    dayId: dayId || null,
    activityId: activityId || null,
    name,
    category: category as ExpenseCategory,
    estimatedAmount: estimatedAmount.data,
    actualAmount: actualAmount.data,
    paidBy,
    splitMethod: splitMethod as ExpenseSplitMethod,
    customSplitPercent,
    paymentMethod: payment ? (payment as PaymentMethod) : null,
    expenseDate,
    notes: notes.data,
    status: status as ExpenseStatus,
  });
}

export function checklistFromForm(form: FormData) {
  const title = text(form, "title");
  const activityId = text(form, "activityId");
  if (!activityId) return fail("Choose an activity for this checklist item.");
  if (title.length < 1 || title.length > 160) return fail("Checklist items can be up to 160 characters.");
  return ok({ activityId, title });
}

export function commentFromForm(form: FormData) {
  const body = text(form, "body");
  const activityId = text(form, "activityId");
  if (body.length < 1 || body.length > 1000) return fail("Comments can be up to 1,000 characters.");
  return ok({ body, activityId: activityId || null });
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string, max: number): Result<string | null> {
  const value = text(form, key);
  if (!value) return ok(null);
  if (value.length > max) return fail(`Keep that note under ${max} characters.`);
  return ok(value);
}

function money(form: FormData, key: string, allowEmpty: boolean): Result<number> {
  const value = text(form, key);
  if (!value && allowEmpty) return ok(0);
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return fail("Enter an amount with up to two decimal places.");
  const amount = roundMoney(Number(value));
  if (amount > 99_999_999.99) return fail("That amount is too large.");
  return ok(amount);
}

function optionalMoney(form: FormData, key: string): Result<number | null> {
  const value = text(form, key);
  if (!value) return ok(null);
  return money(form, key, false);
}

function optionalTime(value: string): Result<string | null> {
  if (!value) return ok(null);
  if (!timePattern.test(value)) return fail("Use a valid time.");
  return ok(value);
}

function optionalUrl(value: string): Result<string | null> {
  if (!value) return ok(null);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fail("Map links need to start with http or https.");
    return ok(url.toString());
  } catch {
    return fail("Use a valid map link.");
  }
}

function firstError(...results: Result<unknown>[]): Result<never> {
  const found = results.find((result) => !result.ok);
  return found && !found.ok ? found : fail("Check the form and try again.");
}
