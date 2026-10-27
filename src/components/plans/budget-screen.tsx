import Link from "next/link";
import { format, parseISO } from "date-fns";
import { patchExpenseAction } from "@/app/(app)/plans/actions";
import { BudgetCharts } from "@/components/plans/budget-charts";
import { ExpenseDetails } from "@/components/plans/expense-details";
import { ExpenseForm } from "@/components/plans/expense-form";
import { PlanStatus } from "@/components/plans/status";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import { categoryLabels, expenseStatusLabels, formatMoney, healthClass, healthLabel, partnerHeading, payerName, splitLabels } from "@/lib/plans/labels";
import type { ItineraryExpense } from "@/lib/domain";
import type { CategoryBudget, DayBudget } from "@/lib/plans/money";
import type { PlanDetail } from "@/lib/services/plans";

export function BudgetScreen({ detail, saved, error }: { detail: PlanDetail; saved?: string; error?: string }) {
  const { plan, summary } = detail;
  const days = detail.days.map((day) => ({ id: day.id, label: `${format(parseISO(day.date), "MMM d")} · ${day.title}` }));
  const activities = detail.activities.map((activity) => ({ id: activity.id, label: activity.title }));
  const chartDays = summary.days.map((day) => ({
    label: day.date ? format(parseISO(day.date), "MMM d") : "Other",
    estimated: day.estimated,
    actual: day.actual,
  }));
  const chartCategories = summary.categories.map((category) => ({ name: categoryLabels[category.category as keyof typeof categoryLabels] ?? category.category, estimated: category.estimated, actual: category.actual }));
  const payers = [
    ...summary.settlement.partners.map((partner) => {
      const known = detail.partners.find((item) => item.userId === partner.userId);
      return { name: known ? `P${known.index + 1}` : "Partner", paid: partner.paid };
    }),
    { name: "Shared", paid: summary.settlement.sharedPaid },
  ];
  return (
    <main className="w-full px-4 py-5 pb-36 lg:px-8 lg:pb-5">
      <PlanStatus saved={saved} error={error} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Shared budget</p>
          <h1 className="font-serif text-2xl leading-tight sm:text-3xl lg:text-4xl">{plan.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{splitLabels[plan.splitMethod]} · Warning at {plan.warningThreshold}%</p>
        </div>
        <Link href={`/plans/${plan.id}`} className="inline-flex min-h-11 items-center text-sm text-primary">Back to itinerary</Link>
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Planned budget" value={formatMoney(summary.budget, plan.currency)} />
        <Stat label="Actual spending" value={formatMoney(summary.actual, plan.currency)} />
        <Stat label="Remaining" value={formatMoney(summary.remaining, plan.currency)} tone={summary.remaining < 0 ? "text-rose-700" : ""} />
        <Stat label="Unspent" value={formatMoney(summary.unspent, plan.currency)} />
      </section>
      <section className="mt-4 panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl lg:text-2xl">Budget usage</h2>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthClass(summary.health)}`}>{healthLabel(summary.health, summary.actual, summary.budget)}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{summary.utilization}% used{summary.overAmount > 0 ? ` · Over by ${formatMoney(summary.overAmount, plan.currency)}` : ""}</p>
        <Progress className="mt-3" value={Math.min(summary.utilization, 100)} aria-label="Budget used" />
        {plan.dailyLimit != null && <p className="mt-3 text-sm text-muted-foreground">Daily limit {formatMoney(plan.dailyLimit, plan.currency)}</p>}
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.settlement.partners.map((partner) => {
          const known = detail.partners.find((item) => item.userId === partner.userId);
          const label = known ? partnerHeading(known.index, known.name) : "Partner";
          return <Stat key={partner.userId} label={`${label} paid`} value={formatMoney(partner.paid, plan.currency)} detail={`Share of spending ${formatMoney(partner.expected, plan.currency)}`} />;
        })}
        <Stat label="Shared payments" value={formatMoney(summary.settlement.sharedPaid, plan.currency)} detail="Recorded as paid together" />
        <Stat label="Shared bills" value={formatMoney(summary.settlement.sharedBills, plan.currency)} detail="Expenses that are not individually owned" />
      </section>
      <section className="mt-4 panel p-5">
        <h2 className="font-serif text-xl lg:text-2xl">Balance</h2>
        {summary.settlement.amount > 0 && summary.settlement.owedBy && summary.settlement.owedTo ? (
          <p className="mt-2 text-sm leading-6">{payerName(detail.partners, summary.settlement.owedBy)} owes {payerName(detail.partners, summary.settlement.owedTo)} {formatMoney(summary.settlement.amount, plan.currency)}.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nobody is owed money for the expenses recorded so far.</p>
        )}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">A positive difference means the actual amount is below the estimate. A negative difference means it went over. Cancelled expenses are left out of the totals.</p>
      </section>
      <div className="mt-4">
        <BudgetCharts currency={plan.currency} days={chartDays} categories={chartCategories} payers={payers} />
      </div>
      <div className="mt-6 grid gap-6">
        {summary.days.map((day) => (
          <DayTable key={day.dayId ?? "unassigned"} day={day} currency={plan.currency} expenses={detail.expenses.filter((expense) => (expense.itineraryDayId ?? null) === day.dayId)} planId={plan.id} title={day.date ? format(parseISO(day.date), "MMMM d") : "Unassigned"} days={days} activities={activities} partners={detail.partners} />
        ))}
      </div>
      <section id="add-expense" className="mt-6 panel p-5">
        <h2 className="font-serif text-xl lg:text-2xl">Add an expense</h2>
        <div className="mt-4">
          <ExpenseForm planId={plan.id} currency={plan.currency} days={days} activities={activities} partners={detail.partners} returnTo={`/plans/${plan.id}/budget`} />
        </div>
      </section>
      <div className="fixed inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] z-30 lg:inset-x-auto lg:right-4 lg:bottom-6 lg:w-auto">
        <a href="#add-expense" className="inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-xs text-primary-foreground shadow-[var(--shadow)] sm:h-11 sm:text-sm lg:w-auto">Add expense</a>
      </div>
    </main>
  );
}

function DayTable({ day, currency, expenses, planId, title, days, activities, partners }: { day: DayBudget; currency: string; expenses: ItineraryExpense[]; planId: string; title: string; days: { id: string; label: string }[]; activities: { id: string; label: string }[]; partners: PlanDetail["partners"] }) {
  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl lg:text-2xl">{title}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${healthClass(day.health)}`}>{healthLabel(day.health, day.actual, day.estimated)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Estimated {formatMoney(day.estimated, currency)} · Actual {formatMoney(day.actual, currency)} · Remaining {formatMoney(day.remaining, currency)}{day.overAmount > 0 ? ` · Over ${formatMoney(day.overAmount, currency)}` : ""}</p>
      <CategoryTable currency={currency} categories={day.categories} />
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Expenses on {title}. Difference is estimated minus actual.</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Expense</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Estimated</th>
              <th className="py-2 pr-3 font-medium">Actual</th>
              <th className="py-2 pr-3 font-medium">Difference</th>
              <th className="py-2 font-medium">Save</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} currency={currency} planId={planId} days={days} activities={activities} partners={partners} />)}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 md:hidden">
        {expenses.map((expense) => <ExpenseCard key={expense.id} expense={expense} currency={currency} planId={planId} days={days} activities={activities} partners={partners} />)}
      </div>
      {!expenses.length && <p className="mt-3 text-sm text-muted-foreground">No expenses on this day.</p>}
    </section>
  );
}

function CategoryTable({ currency, categories }: { currency: string; categories: CategoryBudget[] }) {
  if (!categories.length) return null;
  return (
    <table className="mt-4 w-full text-left text-sm">
      <caption className="sr-only">Category totals. Difference is estimated minus actual.</caption>
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="py-2 pr-3 font-medium">Expense category</th>
          <th className="py-2 pr-3 text-right font-medium">Estimated</th>
          <th className="py-2 pr-3 text-right font-medium">Actual</th>
          <th className="py-2 text-right font-medium">Difference</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.category} className="border-t border-[#f3e8f5]">
            <th className="py-2 pr-3 font-medium">{categoryLabels[category.category as keyof typeof categoryLabels] ?? category.category}</th>
            <td className="py-2 pr-3 text-right">{formatMoney(category.estimated, currency)}</td>
            <td className="py-2 pr-3 text-right">{formatMoney(category.actual, currency)}</td>
            <td className={`py-2 text-right ${diffClass(category.difference)}`}>{formatMoney(category.difference, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpenseRow({ expense, currency, planId, days, activities, partners }: { expense: ItineraryExpense; currency: string; planId: string; days: { id: string; label: string }[]; activities: { id: string; label: string }[]; partners: PlanDetail["partners"] }) {
  const formId = `expense-${expense.id}`;
  const difference = Math.round((expense.estimatedAmount - expense.actualAmount) * 100) / 100;
  return (
    <tr className="border-t border-[#f3e8f5]">
      <th className="py-2 pr-3 font-medium">{expense.expenseName}<span className="mt-1 block text-xs font-normal text-muted-foreground">{expenseStatusLabels[expense.status]}</span></th>
      <td className="py-2 pr-3">{categoryLabels[expense.category]}</td>
      <td className="py-2 pr-3"><input form={formId} name="estimatedAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense.estimatedAmount} aria-label={`Estimated amount for ${expense.expenseName}`} className="h-11 w-28 rounded-2xl border px-2" /></td>
      <td className="py-2 pr-3"><input form={formId} name="actualAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense.actualAmount} aria-label={`Actual amount for ${expense.expenseName}`} className="h-11 w-28 rounded-2xl border px-2" /></td>
      <td className={`py-2 pr-3 ${diffClass(difference)}`}>{formatMoney(difference, currency)}</td>
      <td className="py-2">
        <form id={formId} action={patchExpenseAction}>
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="expenseId" value={expense.id} />
          <Button type="submit" size="sm" variant="secondary">Save</Button>
        </form>
        <ExpenseDetails expense={expense} planId={planId} currency={currency} days={days} activities={activities} partners={partners} />
      </td>
    </tr>
  );
}

function ExpenseCard({ expense, currency, planId, days, activities, partners }: { expense: ItineraryExpense; currency: string; planId: string; days: { id: string; label: string }[]; activities: { id: string; label: string }[]; partners: PlanDetail["partners"] }) {
  const difference = Math.round((expense.estimatedAmount - expense.actualAmount) * 100) / 100;
  return (
    <div className="rounded-2xl bg-[#fbf7fc] p-3">
      <form action={patchExpenseAction}>
        <input type="hidden" name="planId" value={planId} />
        <input type="hidden" name="expenseId" value={expense.id} />
        <p className="text-sm font-medium leading-4">{expense.expenseName}</p>
        <p className="text-[11px] leading-4 text-muted-foreground">{categoryLabels[expense.category]} · {expenseStatusLabels[expense.status]}</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <label className="grid gap-0.5 text-[11px]">Estimated<input name="estimatedAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense.estimatedAmount} className="h-8 rounded-xl border bg-white px-2 text-sm" /></label>
          <label className="grid gap-0.5 text-[11px]">Actual<input name="actualAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense.actualAmount} className="h-8 rounded-xl border bg-white px-2 text-sm" /></label>
        </div>
        <p className={`mt-1.5 text-xs leading-4 ${diffClass(difference)}`}>Difference {formatMoney(difference, currency)}</p>
        <Button className="mt-2" type="submit" size="sm" variant="secondary">Save amounts</Button>
      </form>
      <ExpenseDetails expense={expense} planId={planId} currency={currency} days={days} activities={activities} partners={partners} />
    </div>
  );
}

function Stat({ label, value, detail, tone = "" }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <article className="panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-xl lg:text-2xl ${tone}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </article>
  );
}

function diffClass(value: number) {
  if (value < 0) return "text-rose-700";
  if (value > 0) return "text-emerald-700";
  return "text-muted-foreground";
}
