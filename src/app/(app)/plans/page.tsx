import Link from "next/link";
import { createSamplePlanAction } from "@/app/(app)/plans/actions";
import { PlanStatus } from "@/components/plans/status";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { SAMPLE_PLAN_TITLE } from "@/lib/plans/sample";
import { countdownLabel, eventTypeLabels, formatMoney, formatPlanRange, healthClass, healthLabel, planStatusLabels } from "@/lib/plans/labels";
import { activeMembership } from "@/lib/services/access";
import { listDatePlans } from "@/lib/services/plans";

export const metadata = { title: "Date plans" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  if (!membership) {
    return (
      <main className="w-full px-4 py-6 lg:px-8">
        <h1 className="font-serif text-4xl">Date plans</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Create or join a couple space before you plan a date together.</p>
        <Link href="/onboarding?step=pairing" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">Create or join</Link>
      </main>
    );
  }
  try {
    const listed = await listDatePlans(repo, user.profile.id);
    if (!listed.ok) throw new Error(listed.error);
    const sampleUsed = listed.data.some(({ plan }) => plan.title === SAMPLE_PLAN_TITLE);
    return (
      <main className="w-full px-4 py-5 lg:px-8">
        <PlanStatus saved={query.saved} error={query.error} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Together</p>
            <h1 className="font-serif text-xl leading-snug sm:text-3xl lg:text-4xl">Date plans</h1>
            <p className="mt-1 max-w-xl text-xs leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-5">Plan concerts, trips, anniversaries, and ordinary nights. Budgets stay shared between the two of you.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/plans/new" className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs text-primary-foreground sm:h-11 sm:px-4 sm:text-sm">New plan</Link>
            {!sampleUsed && <form action={createSamplePlanAction}><Button type="submit" variant="secondary">Use the MCR sample</Button></form>}
          </div>
        </div>
        {!listed.data.length && (
          <section className="mt-8 rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)]">
            <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl">No plans yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Start with the My Chemical Romance concert trip to Manila, or make a plan of your own. The sample uses November 13–18 and a ₱25,000 budget you can replace.</p>
          </section>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {listed.data.map(({ plan, summary }) => (
            <article key={plan.id} className="overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
              <div className="relative h-24 bg-gradient-to-br from-[#fde7f3] via-[#f7e8ff] to-[#fff7fb] sm:h-36">
                {plan.coverImage && <img src={plan.coverImage} alt="" className="size-full object-cover" />}
              </div>
              <div className="grid gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wide uppercase">
                  <span className="text-rose">{eventTypeLabels[plan.eventType]}</span>
                  <span className="rounded-full bg-secondary px-2 py-1">{planStatusLabels[plan.status]}</span>
                  <span className={`rounded-full px-2 py-1 ${healthClass(summary.health)}`}>{healthLabel(summary.health, summary.actual, summary.budget)}</span>
                </div>
                <div>
                  <h2 className="font-serif text-lg leading-snug sm:text-2xl lg:text-3xl">{plan.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{plan.destination || "Destination not set"} · {formatPlanRange(plan.startDate, plan.endDate)}</p>
                  <p className="mt-1 text-xs font-medium text-primary sm:text-sm">{countdownLabel(plan.startDate, plan.endDate)}</p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                  <div><dt className="text-[11px] text-muted-foreground">Budget</dt><dd className="font-semibold">{formatMoney(summary.budget, plan.currency)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Actual</dt><dd className="font-semibold">{formatMoney(summary.actual, plan.currency)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Remaining</dt><dd className={`font-semibold ${summary.remaining < 0 ? "text-rose-700" : ""}`}>{formatMoney(summary.remaining, plan.currency)}</dd></div>
                </dl>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Link href={`/plans/${plan.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[11px] text-primary-foreground sm:h-11 sm:px-4 sm:text-sm">View itinerary</Link>
                  <Link href={`/plans/${plan.id}/edit`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">Edit plan</Link>
                  <Link href={`/plans/${plan.id}/budget#add-expense`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">Add expense</Link>
                  <Link href={`/plans/${plan.id}/budget`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">View budget</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    );
  } catch (error) {
    if (!isMissingPlanTable(error)) throw error;
    return (
      <main className="w-full px-4 py-6 lg:px-8">
        <h1 className="font-serif text-4xl">Date plans</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">The date planner tables are not in the database yet. Apply the latest migration, then reload this page.</p>
      </main>
    );
  }
}
