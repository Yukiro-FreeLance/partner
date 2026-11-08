import Link from "next/link";
import { createSamplePlanAction } from "@/app/(app)/plans/actions";
import { PlanStatus } from "@/components/plans/status";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { isSamplePlanTitle } from "@/lib/plans/sample";
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
    const sampleUsed = listed.data.some(({ plan }) => isSamplePlanTitle(plan.title));
    return (
      <main className="w-full px-4 py-5 lg:px-8">
        <PlanStatus saved={query.saved} error={query.error} />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Together</p>
            <h1 className="font-serif text-lg leading-snug sm:text-xl">Date plans</h1>
            <p className="mt-0.5 max-w-xl text-[11px] leading-4 text-muted-foreground">Plan concerts, trips, anniversaries, and ordinary nights. Budgets stay shared between the two of you.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link href="/plans/new" className="inline-flex h-7 items-center rounded-full bg-primary px-2.5 text-[11px] text-primary-foreground">New plan</Link>
            {!sampleUsed && <form action={createSamplePlanAction}><Button type="submit" variant="secondary" className="h-7 px-2.5 text-[11px]">Use the MCR sample</Button></form>}
          </div>
        </div>
        {!listed.data.length && (
          <section className="mt-4 rounded-2xl bg-white p-3 shadow-[var(--shadow)]">
            <h2 className="font-serif text-base">No plans yet</h2>
            <p className="mt-1 max-w-xl text-[11px] leading-4 text-muted-foreground">Start with the My Chemical Romance concert trip to Manila, or make a plan of your own. The sample uses November 13–18 and a ₱25,000 budget you can replace.</p>
          </section>
        )}
        <div className="mt-4 grid items-start gap-2 md:grid-cols-2">
          {listed.data.map(({ plan, summary }) => (
            <article key={plan.id} className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
              <div className="relative h-16 bg-gradient-to-br from-[#fde7f3] via-[#f7e8ff] to-[#fff7fb] sm:h-20">
                {plan.coverImage && <img src={plan.coverImage} alt="" className="size-full object-cover" />}
              </div>
              <div className="grid gap-2 p-3">
                <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
                  <span className="text-rose">{eventTypeLabels[plan.eventType]}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5">{planStatusLabels[plan.status]}</span>
                  <span className={`rounded-full px-2 py-0.5 ${healthClass(summary.health)}`}>{healthLabel(summary.health, summary.actual, summary.budget)}</span>
                </div>
                <div>
                  <h2 className="font-serif text-base leading-snug">{plan.title}</h2>
                  <p className="text-[11px] leading-4 text-muted-foreground">{plan.destination || "Destination not set"} · {formatPlanRange(plan.startDate, plan.endDate)}</p>
                  <p className="text-[11px] font-medium leading-4 text-primary">{countdownLabel(plan.startDate, plan.endDate)}</p>
                </div>
                <dl className="grid grid-cols-3 gap-1 text-center text-[11px]">
                  <div><dt className="text-[10px] text-muted-foreground">Budget</dt><dd className="font-semibold">{formatMoney(summary.budget, plan.currency)}</dd></div>
                  <div><dt className="text-[10px] text-muted-foreground">Actual</dt><dd className="font-semibold">{formatMoney(summary.actual, plan.currency)}</dd></div>
                  <div><dt className="text-[10px] text-muted-foreground">Remaining</dt><dd className={`font-semibold ${summary.remaining < 0 ? "text-rose-700" : ""}`}>{formatMoney(summary.remaining, plan.currency)}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/plans/${plan.id}`} className="inline-flex h-7 items-center justify-center rounded-full bg-primary px-2.5 text-[11px] text-primary-foreground">View itinerary</Link>
                  <Link href={`/plans/${plan.id}/edit`} className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px]">Edit plan</Link>
                  <Link href={`/plans/${plan.id}/budget#add-expense`} className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px]">Add expense</Link>
                  <Link href={`/plans/${plan.id}/budget`} className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px]">View budget</Link>
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
