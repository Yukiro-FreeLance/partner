import type { CycleProfile, CycleReminder } from "@/lib/domain";
import { REMINDER_COPY } from "@/lib/cycle/copy";
import { addDays, compareDates } from "@/lib/cycle/dates";
import { sensitiveText } from "@/lib/cycle/privacy";
import type { CycleEstimate } from "@/lib/cycle/predict";

export type ReminderPlan = { type: string; title: string; body: string; href: string; reminderId?: string };

export function dueReminderPlans(input: {
  profile: CycleProfile;
  estimate: CycleEstimate;
  today: string;
  hour: number;
  checkInToday: boolean;
  checkInYesterday: boolean;
  reminders: CycleReminder[];
  already: string[];
}) {
  const plans: ReminderPlan[] = [];
  const push = (plan: ReminderPlan) => {
    if (!input.already.includes(plan.type)) plans.push(plan);
  };
  if (input.profile.periodReminder && input.estimate.daysUntilPeriod !== null && input.estimate.daysUntilPeriod >= 0 && input.estimate.daysUntilPeriod <= input.profile.periodLeadDays) {
    push({ ...REMINDER_COPY.period, href: "/cycle" });
  }
  if (input.profile.checkInReminder && !input.checkInToday && input.hour >= input.profile.checkInHour) {
    push({ ...REMINDER_COPY.checkin, href: "/cycle/check-in" });
  }
  if (input.profile.fertileReminder && input.estimate.fertileStart === input.today) {
    push({ ...REMINDER_COPY.fertile, href: "/cycle" });
  }
  if (input.profile.pregnancyTestReminder && input.estimate.daysLate > 0) {
    push({ ...REMINDER_COPY.pregnancy_test, href: "/cycle" });
  }
  if (input.profile.missedCheckInReminder && !input.checkInYesterday) {
    push({ ...REMINDER_COPY.missed_checkin, href: "/cycle/check-in" });
  }
  for (const reminder of input.reminders) {
    if (!reminder.enabled || !reminder.nextRunOn || compareDates(reminder.nextRunOn, input.today) > 0 || input.hour < reminder.hour) continue;
    const title = sensitiveText(reminder.title) ? REMINDER_COPY.custom.title : reminder.title || REMINDER_COPY.custom.title;
    push({ type: `cycle_custom:${reminder.id}`, title, body: REMINDER_COPY.custom.body, href: "/cycle", reminderId: reminder.id });
  }
  return plans;
}

export function nextReminderDay(today: string) {
  return addDays(today, 1);
}
