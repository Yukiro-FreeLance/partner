import Link from "next/link";
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { deleteDayAction, saveActivityAction, saveCommentAction, saveDayAction } from "@/app/(app)/plans/actions";
import { ActivityFields } from "@/components/plans/activity-fields";
import { DayBoard, type BoardActivity } from "@/components/plans/day-board";
import { PlanStatus } from "@/components/plans/status";
import { ConfirmSubmit } from "@/components/plans/confirm-submit";
import { deleteCommentAction, deletePlanAction } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { activityStatusLabels, countdownLabel, eventTypeLabels, formatMoney, formatPlanRange, healthClass, healthLabel, planStatusLabels } from "@/lib/plans/labels";
import type { ExpenseCategory } from "@/lib/domain";
import type { PlanDetail } from "@/lib/services/plans";

export function PlanScreen({ detail, view, saved, error, viewerId }: { detail: PlanDetail; view: string; saved?: string; error?: string; viewerId: string }) {
  const { plan, summary } = detail;
  const mode = view === "calendar" || view === "list" ? view : "timeline";
  const dayChoices = detail.days.map((day) => ({ id: day.id, label: `${format(parseISO(day.date), "MMM d")} · ${day.title}` }));
  const names = Object.fromEntries(detail.partners.map((partner) => [partner.userId, partner.name]));
  return (
    <main className="w-full px-4 py-4 pb-28 lg:px-8 lg:py-5 lg:pb-5">
      <PlanStatus saved={saved} error={error} />
      <header className="mt-3 overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
        <div className="relative h-28 bg-gradient-to-br from-[#fde7f3] via-[#f7e8ff] to-[#fff7fb] sm:h-44">
          {plan.coverImage && <img src={plan.coverImage} alt="" className="size-full object-cover" />}
        </div>
        <div className="grid gap-3 p-4 sm:gap-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <span className="text-rose">{eventTypeLabels[plan.eventType]}</span>
            <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">{planStatusLabels[plan.status]}</span>
            <span className={`rounded-full px-2 py-1 ${healthClass(summary.health)}`}>{healthLabel(summary.health, summary.actual, summary.budget)}</span>
          </div>
          <div>
            <h1 className="font-serif text-xl leading-snug sm:text-3xl lg:text-4xl">{plan.title}</h1>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:mt-2 sm:text-sm">{plan.destination || "Destination not set"} · {formatPlanRange(plan.startDate, plan.endDate)} · {countdownLabel(plan.startDate, plan.endDate)}</p>
            {plan.description && <p className="mt-2 max-w-2xl text-xs leading-4 sm:mt-3 sm:text-sm sm:leading-5">{plan.description}</p>}
          </div>
          <MoneyTrio currency={plan.currency} budget={summary.budget} actual={summary.actual} remaining={summary.remaining} utilization={summary.utilization} />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href={`/plans/${plan.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[11px] text-primary-foreground sm:h-11 sm:px-4 sm:text-sm">View itinerary</Link>
            <Link href={`/plans/${plan.id}/edit`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">Edit plan</Link>
            <Link href={`/plans/${plan.id}/budget#add-expense`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">Add expense</Link>
            <Link href={`/plans/${plan.id}/budget`} className="inline-flex h-8 items-center justify-center rounded-full bg-secondary px-3 text-[11px] sm:h-11 sm:px-4 sm:text-sm">View budget</Link>
          </div>
        </div>
      </header>
      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-[var(--shadow)]" aria-label="Itinerary views">
        {[["timeline", "Timeline"], ["calendar", "Calendar"], ["list", "List"]].map(([value, label]) => (
          <Link key={value} href={`/plans/${plan.id}?view=${value}`} className={`flex h-8 items-center justify-center rounded-full text-xs sm:h-11 sm:text-sm ${mode === value ? "bg-[#fde7f3] font-semibold text-primary" : "text-muted-foreground"}`} aria-current={mode === value ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {mode === "timeline" && (
        <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-8">
          {detail.days.map((day) => (
            <section key={day.id} aria-labelledby={`day-${day.id}`}>
              <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">{format(parseISO(day.date), "EEEE, MMMM d")}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`day-${day.id}`} className="mt-0.5 font-serif text-lg leading-snug sm:text-2xl lg:text-3xl">{day.title}</h2>
                <ConfirmSubmit action={deleteDayAction} fields={{ planId: plan.id, dayId: day.id, returnTo: `/plans/${plan.id}` }} label="Delete day" title={`Delete ${day.title}?`} description="This removes the day, its activities, and expenses recorded on that day." />
              </div>
              {day.description && <p className="mt-0.5 text-xs leading-4 text-muted-foreground sm:text-sm">Theme: {day.description}</p>}
              <div className="mt-4">
                <DayBoard planId={plan.id} dayId={day.id} dayTitle={day.title} currency={plan.currency} days={dayChoices} activities={activitiesFor(detail, day.id)} />
              </div>
            </section>
          ))}
          {!detail.days.length && <p className="rounded-[1.5rem] bg-white p-5 text-sm shadow-[var(--shadow)] lg:col-span-2">Add the first day to start the itinerary.</p>}
          <div className="grid gap-8 lg:grid-cols-2">
          <section id="add-day" className="panel p-5">
            <h2 className="font-serif text-xl lg:text-2xl">Add a day</h2>
            <form action={saveDayAction} className="mt-4 grid gap-3">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="returnTo" value={`/plans/${plan.id}`} />
              <label className="grid gap-1 text-sm font-medium" htmlFor="new-day-date">Date<Input id="new-day-date" name="date" type="date" required min={plan.startDate} max={plan.endDate} /></label>
              <label className="grid gap-1 text-sm font-medium" htmlFor="new-day-title">Title<Input id="new-day-title" name="title" required maxLength={120} placeholder="Evening together" /></label>
              <label className="grid gap-1 text-sm font-medium" htmlFor="new-day-theme">Theme<Textarea id="new-day-theme" name="description" maxLength={2000} placeholder="What this day is for" /></label>
              <Button type="submit">Add day</Button>
            </form>
          </section>
          {detail.days.length > 0 && (
            <section id="add-activity" className="panel p-5">
              <h2 className="font-serif text-xl lg:text-2xl">Add an activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">Drag an activity by its handle, or use Move up and Move down. Costs are added to the budget when tracking is on.</p>
              <form action={saveActivityAction} className="mt-4">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="returnTo" value={`/plans/${plan.id}`} />
                <ActivityFields days={dayChoices} dayId={detail.days[0]?.id ?? ""} currency={plan.currency} />
                <Button className="mt-3" type="submit">Add activity</Button>
              </form>
            </section>
          )}
          </div>
        </div>
      )}
      {mode === "calendar" && <Calendar detail={detail} />}
      {mode === "list" && <ActivityList detail={detail} />}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <section id="comments" className="panel p-5">
        <h2 className="font-serif text-xl lg:text-2xl">Comments</h2>
        <ul className="mt-4 grid gap-3">
          {detail.comments.map((comment) => (
            <li key={comment.id} className="rounded-2xl bg-[#fbf7fc] p-3">
              <p className="text-sm leading-6">{comment.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{names[comment.authorId] ?? "Partner"} · {format(parseISO(comment.createdAt), "MMM d, yyyy h:mm a")}</p>
              {comment.authorId === viewerId && <ConfirmSubmit action={deleteCommentAction} fields={{ planId: plan.id, commentId: comment.id, returnTo: `/plans/${plan.id}` }} label="Delete comment" title="Delete this comment?" description="Your partner will no longer see it." />}
            </li>
          ))}
          {!detail.comments.length && <li className="text-sm text-muted-foreground">No comments yet.</li>}
        </ul>
        <form action={saveCommentAction} className="mt-4 grid gap-3">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="returnTo" value={`/plans/${plan.id}`} />
          <Label htmlFor="comment-body">Add a comment</Label>
          <Textarea id="comment-body" name="body" required maxLength={1000} placeholder="A note for both of you" />
          <Button type="submit">Comment</Button>
        </form>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-xl lg:text-2xl">Activity history</h2>
        <ol className="mt-4 grid gap-2">
          {detail.history.map((item) => (
            <li key={item.id} className="text-sm"><span className="font-medium">{names[item.actorId] ?? "Partner"}</span> · {item.summary} <span className="text-muted-foreground">{format(parseISO(item.createdAt), "MMM d, h:mm a")}</span></li>
          ))}
          {!detail.history.length && <li className="text-sm text-muted-foreground">Changes will show up here.</li>}
        </ol>
      </section>
      </div>
      <div className="mt-4">
        <ConfirmSubmit action={deletePlanAction} fields={{ planId: plan.id }} label="Delete plan" title="Delete this plan?" description="The itinerary, expenses, comments, and history for this plan are removed." />
      </div>
      <div className="fixed inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] z-30 grid grid-cols-2 gap-2 lg:inset-x-auto lg:right-4 lg:bottom-6 lg:flex lg:w-auto lg:flex-col">
        <Link href="#add-activity" className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-[11px] text-primary-foreground shadow-[var(--shadow)] sm:h-11 sm:text-sm">Add activity</Link>
        <Link href={`/plans/${plan.id}/budget#add-expense`} className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-[11px] shadow-[var(--shadow)] sm:h-11 sm:text-sm">Add expense</Link>
      </div>
    </main>
  );
}

function MoneyTrio({ currency, budget, actual, remaining, utilization }: { currency: string; budget: number; actual: number; remaining: number; utilization: number }) {
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-[1.25rem] bg-[#fbf7fc] p-3 text-center">
      <div><dt className="text-[10px] text-muted-foreground sm:text-[11px]">Budget</dt><dd className="mt-1 text-xs font-semibold sm:text-sm">{formatMoney(budget, currency)}</dd></div>
      <div><dt className="text-[10px] text-muted-foreground sm:text-[11px]">Actual</dt><dd className="mt-1 text-xs font-semibold sm:text-sm">{formatMoney(actual, currency)}</dd></div>
      <div><dt className="text-[10px] text-muted-foreground sm:text-[11px]">Remaining</dt><dd className={`mt-1 text-xs font-semibold sm:text-sm ${remaining < 0 ? "text-rose-700" : ""}`}>{formatMoney(remaining, currency)}</dd></div>
      <div className="col-span-3 text-xs text-muted-foreground">{utilization}% of the budget used</div>
    </dl>
  );
}

function Calendar({ detail }: { detail: PlanDetail }) {
  const start = parseISO(detail.plan.startDate);
  const end = parseISO(detail.plan.endDate);
  const cells = eachDayOfInterval({ start: startOfWeek(start), end: endOfWeek(end) });
  const trip = eachDayOfInterval({ start, end });
  return (
    <div className="mt-6">
      <div className="hidden gap-2 lg:grid lg:grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <p key={day} className="px-2 text-xs font-semibold text-muted-foreground">{day}</p>)}
        {cells.map((date) => <DayCell key={date.toISOString()} date={date} detail={detail} muted={date < start || date > end} />)}
      </div>
      <div className="grid gap-3 lg:hidden">
        {trip.map((date) => <DayCell key={date.toISOString()} date={date} detail={detail} />)}
      </div>
    </div>
  );
}

function DayCell({ date, detail, muted = false }: { date: Date; detail: PlanDetail; muted?: boolean }) {
  const iso = format(date, "yyyy-MM-dd");
  const day = detail.days.find((item) => item.date === iso);
  const activities = day ? detail.activities.filter((activity) => activity.itineraryDayId === day.id) : [];
  return (
    <article className={`min-h-28 rounded-2xl bg-white p-2 shadow-[var(--shadow)] ${muted ? "opacity-50" : ""}`}>
      <p className="text-xs font-semibold">{format(date, "MMM d")}</p>
      {day && <p className="mt-1 text-xs text-muted-foreground">{day.title}</p>}
      <ul className="mt-2 grid gap-1">
        {activities.map((activity) => <li key={activity.id} className="text-xs leading-4"><Link href={`/plans/${detail.plan.id}?view=timeline#activity-${activity.id}`} className="text-primary">{activity.startTime ? `${activity.startTime} ` : ""}{activity.title}</Link></li>)}
      </ul>
    </article>
  );
}

function ActivityList({ detail }: { detail: PlanDetail }) {
  const rows = [...detail.activities].sort((a, b) => {
    const dayA = detail.days.find((day) => day.id === a.itineraryDayId)?.date ?? "";
    const dayB = detail.days.find((day) => day.id === b.itineraryDayId)?.date ?? "";
    return dayA.localeCompare(dayB) || (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.sortOrder - b.sortOrder;
  });
  if (!rows.length) return <p className="mt-6 rounded-[1.5rem] bg-white p-5 text-sm shadow-[var(--shadow)]">No activities yet.</p>;
  return (
    <ul className="mt-6 grid gap-3 lg:grid-cols-2">
      {rows.map((activity) => {
        const day = detail.days.find((item) => item.id === activity.itineraryDayId);
        return (
          <li key={activity.id}>
            <Link href={`/plans/${detail.plan.id}?view=timeline#activity-${activity.id}`} className="block rounded-[1.5rem] bg-white p-4 shadow-[var(--shadow)]">
              <p className="text-xs font-semibold tracking-wide text-rose uppercase">{day ? format(parseISO(day.date), "MMM d") : "Day"} · {activity.startTime ?? "Anytime"} · {activityStatusLabels[activity.status]}</p>
              <p className="mt-1 font-serif text-lg leading-tight sm:text-xl lg:text-2xl">{activity.title}</p>
              {activity.location && <p className="mt-1 text-sm text-muted-foreground">{activity.location}</p>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function activitiesFor(detail: PlanDetail, dayId: string): BoardActivity[] {
  return detail.activities.filter((activity) => activity.itineraryDayId === dayId).map((activity) => {
    const linked = detail.expenses.find((expense) => expense.itineraryActivityId === activity.id);
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location,
      mapUrl: activity.mapUrl,
      startTime: activity.startTime,
      endTime: activity.endTime,
      estimatedCost: activity.estimatedCost,
      actualCost: activity.actualCost,
      status: activity.status,
      notes: activity.notes,
      reservation: activity.reservation,
      photoPath: activity.photoPath,
      expenseCategory: linked?.category ?? "other" as ExpenseCategory,
      tracked: Boolean(linked),
      checklist: detail.checklists.filter((item) => item.itineraryActivityId === activity.id).map((item) => ({ id: item.id, title: item.title, isCompleted: item.isCompleted })),
    };
  });
}
