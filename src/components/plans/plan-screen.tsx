import Link from "next/link";
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { deleteDayAction, saveCommentAction } from "@/app/(app)/plans/actions";
import { AddExpenseButton } from "@/components/plans/expense-form";
import { AddActivityButton, AddDayButton } from "@/components/plans/plan-composer";
import { DayBoard, type BoardActivity } from "@/components/plans/day-board";
import { PlanStatus } from "@/components/plans/status";
import { ConfirmSubmit } from "@/components/plans/confirm-submit";
import { deleteCommentAction, deletePlanAction } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { activityStatusLabels, countdownLabel, eventTypeLabels, formatClock, formatClockRange, formatMoney, formatPlanRange, healthClass, healthLabel, planStatusLabels } from "@/lib/plans/labels";
import type { ExpenseCategory } from "@/lib/domain";
import type { PlanDetail } from "@/lib/services/plans";

export function PlanScreen({ detail, view, saved, error, viewerId, day, span }: { detail: PlanDetail; view: string; saved?: string; error?: string; viewerId: string; day?: string; span?: string }) {
  const { plan, summary } = detail;
  const mode = view === "calendar" || view === "list" ? view : "timeline";
  const range = planRange(plan.startDate, plan.endDate, detail.days.map((item) => item.date));
  const focus = range.includes(day ?? "") ? day ?? "" : defaultFocus(range);
  const showAll = mode === "timeline" && span === "all";
  const here = planPath(plan.id, { view: mode, day: focus, span: showAll ? "all" : undefined });
  const visibleDays = showAll ? detail.days : detail.days.filter((item) => item.date === focus);
  const activityDayId = visibleDays[0]?.id ?? detail.days[0]?.id ?? "";
  const dayChoices = detail.days.map((item) => ({ id: item.id, label: `${format(parseISO(item.date), "MMM d")} · ${item.title}` }));
  const names = Object.fromEntries(detail.partners.map((partner) => [partner.userId, partner.name]));
  return (
    <main className="w-full px-3 py-3 pb-24 lg:px-6 lg:py-4 lg:pb-28">
      <PlanStatus saved={saved} error={error} />
      <header className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow)]">
        <div className="relative h-16 bg-gradient-to-br from-[#fde7f3] via-[#f7e8ff] to-[#fff7fb] sm:h-24">
          {plan.coverImage && <img src={plan.coverImage} alt="" className="size-full object-cover" />}
        </div>
        <div className="grid gap-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
            <span className="text-rose">{eventTypeLabels[plan.eventType]}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{planStatusLabels[plan.status]}</span>
            <span className={`rounded-full px-2 py-0.5 ${healthClass(summary.health)}`}>{healthLabel(summary.health, summary.actual, summary.budget)}</span>
          </div>
          <div>
            <h1 className="font-serif text-lg leading-snug sm:text-xl">{plan.title}</h1>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{plan.destination || "Destination not set"} · {formatPlanRange(plan.startDate, plan.endDate)} · {countdownLabel(plan.startDate, plan.endDate)}</p>
            {plan.description && <p className="mt-1 max-w-2xl text-[11px] leading-4">{plan.description}</p>}
          </div>
          <MoneyTrio currency={plan.currency} budget={summary.budget} actual={summary.actual} remaining={summary.remaining} utilization={summary.utilization} />
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/plans/${plan.id}`} className="inline-flex h-7 items-center justify-center rounded-full bg-primary px-2.5 text-[11px] text-primary-foreground">View itinerary</Link>
            <Link href={`/plans/${plan.id}/edit`} className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px]">Edit plan</Link>
            <AddExpenseButton planId={plan.id} currency={plan.currency} days={dayChoices} activities={detail.activities.map((activity) => ({ id: activity.id, label: activity.title }))} partners={detail.partners} returnTo={here} defaultDayId={activityDayId} defaultDate={focus ? `${focus}T12:00` : ""} label="Add expense" className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px] text-foreground" />
            <Link href={`/plans/${plan.id}/budget`} className="inline-flex h-7 items-center justify-center rounded-full bg-secondary px-2.5 text-[11px]">View budget</Link>
          </div>
        </div>
      </header>
      <nav className="mt-2.5 flex w-full gap-0.5 rounded-full bg-white p-0.5 shadow-[var(--shadow)] sm:w-fit" aria-label="Itinerary views">
        {[["timeline", "Timeline"], ["calendar", "Calendar"], ["list", "List"]].map(([value, label]) => (
          <Link key={value} href={planPath(plan.id, { view: value, day: focus })} className={`flex h-7 flex-1 items-center justify-center rounded-full px-3 text-[11px] sm:min-w-24 sm:flex-none ${mode === value ? "bg-[#fde7f3] font-semibold text-primary" : "text-muted-foreground"}`} aria-current={mode === value ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {mode === "timeline" && (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Plan dates">
              {range.map((iso) => {
                const selected = iso === focus;
                return (
                  <Link key={iso} href={planPath(plan.id, { view: "timeline", day: iso })} aria-current={selected && !showAll ? "date" : undefined} className={`inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[11px] ${selected && !showAll ? "bg-primary font-medium text-primary-foreground" : selected ? "bg-white font-medium text-primary shadow-[var(--shadow)] ring-1 ring-primary" : "bg-white text-muted-foreground shadow-[var(--shadow)]"}`}>
                    {format(parseISO(iso), "EEE d")}
                  </Link>
                );
              })}
            </nav>
            {showAll
              ? <Link href={planPath(plan.id, { view: "timeline", day: focus })} className="inline-flex h-7 items-center rounded-full bg-secondary px-2.5 text-[11px] font-medium">Collapse</Link>
              : <Link href={planPath(plan.id, { view: "timeline", day: focus, span: "all" })} className="inline-flex h-7 items-center rounded-full bg-secondary px-2.5 text-[11px] font-medium">View all</Link>}
          </div>
          {visibleDays.map((item) => (
            <section key={item.id} aria-labelledby={`day-${item.id}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-rose uppercase">{format(parseISO(item.date), "EEEE, MMMM d")}</p>
                <ConfirmSubmit action={deleteDayAction} fields={{ planId: plan.id, dayId: item.id, returnTo: here }} label="Delete day" title={`Delete ${item.title}?`} description="This removes the day, its activities, and expenses recorded on that day." />
              </div>
              <h2 id={`day-${item.id}`} className="font-serif text-base leading-snug">{item.title}</h2>
              {item.description && <p className="text-[11px] leading-4 text-muted-foreground">Theme: {item.description}</p>}
              <div className="mt-2">
                <DayBoard planId={plan.id} dayId={item.id} dayTitle={item.title} currency={plan.currency} days={dayChoices} activities={activitiesFor(detail, item.id)} returnTo={here} />
              </div>
            </section>
          ))}
          {!showAll && focus && !visibleDays.length && <p className="rounded-xl bg-white p-3 text-xs shadow-[var(--shadow)]">No plan for {format(parseISO(focus), "EEEE, MMMM d")} yet. Add a day below.</p>}
          {!detail.days.length && showAll && <p className="rounded-xl bg-white p-3 text-xs shadow-[var(--shadow)]">Add the first day to start the itinerary.</p>}
          <div className="flex flex-wrap gap-1.5">
            <AddDayButton planId={plan.id} returnTo={here} startDate={plan.startDate} endDate={plan.endDate} focus={focus} />
            {detail.days.length > 0 && <AddActivityButton planId={plan.id} returnTo={here} days={dayChoices} dayId={activityDayId} currency={plan.currency} />}
          </div>
        </div>
      )}
      {mode === "calendar" && <Calendar detail={detail} />}
      {mode === "list" && <ActivityList detail={detail} />}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <section id="comments" className="panel p-3">
        <h2 className="font-serif text-base">Comments</h2>
        <ul className="mt-2 grid gap-1.5">
          {detail.comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-[#fbf7fc] p-2">
              <p className="text-[11px] leading-4">{comment.body}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{names[comment.authorId] ?? "Partner"} · {format(parseISO(comment.createdAt), "MMM d, yyyy h:mm a")}</p>
              {comment.authorId === viewerId && <ConfirmSubmit action={deleteCommentAction} fields={{ planId: plan.id, commentId: comment.id, returnTo: here }} label="Delete comment" title="Delete this comment?" description="Your partner will no longer see it." />}
            </li>
          ))}
          {!detail.comments.length && <li className="text-[11px] text-muted-foreground">No comments yet.</li>}
        </ul>
        <form action={saveCommentAction} className="mt-2 grid gap-1.5">
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="returnTo" value={here} />
          <Label htmlFor="comment-body" className="text-xs">Add a comment</Label>
          <Textarea id="comment-body" name="body" required maxLength={1000} placeholder="A note for both of you" className="min-h-16 text-xs" />
          <Button type="submit" className="h-8 px-3 text-xs">Comment</Button>
        </form>
      </section>
      <section className="panel p-3">
        <h2 className="font-serif text-base">Activity history</h2>
        <ol className="mt-2 grid gap-1">
          {detail.history.map((item) => (
            <li key={item.id} className="text-[11px] leading-4"><span className="font-medium">{names[item.actorId] ?? "Partner"}</span> · {item.summary} <span className="text-muted-foreground">{format(parseISO(item.createdAt), "MMM d, h:mm a")}</span></li>
          ))}
          {!detail.history.length && <li className="text-[11px] text-muted-foreground">Changes will show up here.</li>}
        </ol>
      </section>
      </div>
      <div className="mt-4">
        <ConfirmSubmit action={deletePlanAction} fields={{ planId: plan.id }} label="Delete plan" title="Delete this plan?" description="The itinerary, expenses, comments, and history for this plan are removed." />
      </div>
      <div className="fixed bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] left-3 right-20 z-30 grid grid-cols-2 gap-1.5 lg:bottom-[6.5rem] lg:left-auto lg:right-7 lg:flex lg:w-auto lg:flex-col">
        <AddActivityButton planId={plan.id} returnTo={here} days={dayChoices} dayId={activityDayId} currency={plan.currency} label="Add activity" className="inline-flex h-7 items-center justify-center rounded-full bg-primary px-2.5 text-[11px] text-primary-foreground shadow-[var(--shadow)]" />
        <AddExpenseButton planId={plan.id} currency={plan.currency} days={dayChoices} activities={detail.activities.map((activity) => ({ id: activity.id, label: activity.title }))} partners={detail.partners} returnTo={here} defaultDayId={activityDayId} defaultDate={focus ? `${focus}T12:00` : ""} label="Add expense" className="inline-flex h-7 items-center justify-center rounded-full bg-white px-2.5 text-[11px] text-foreground shadow-[var(--shadow)]" />
      </div>
    </main>
  );
}

function MoneyTrio({ currency, budget, actual, remaining, utilization }: { currency: string; budget: number; actual: number; remaining: number; utilization: number }) {
  return (
    <dl className="grid grid-cols-3 gap-1 rounded-xl bg-[#fbf7fc] px-2 py-1.5 text-center">
      <div><dt className="text-[10px] text-muted-foreground">Budget</dt><dd className="text-[11px] font-semibold">{formatMoney(budget, currency)}</dd></div>
      <div><dt className="text-[10px] text-muted-foreground">Actual</dt><dd className="text-[11px] font-semibold">{formatMoney(actual, currency)}</dd></div>
      <div><dt className="text-[10px] text-muted-foreground">Remaining</dt><dd className={`text-[11px] font-semibold ${remaining < 0 ? "text-rose-700" : ""}`}>{formatMoney(remaining, currency)}</dd></div>
      <div className="col-span-3 text-[10px] text-muted-foreground">{utilization}% of the budget used</div>
    </dl>
  );
}

function Calendar({ detail }: { detail: PlanDetail }) {
  const start = parseISO(detail.plan.startDate);
  const end = parseISO(detail.plan.endDate);
  const cells = eachDayOfInterval({ start: startOfWeek(start), end: endOfWeek(end) });
  const trip = eachDayOfInterval({ start, end });
  return (
    <div className="mt-3">
      <div className="hidden gap-1.5 lg:grid lg:grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <p key={day} className="px-1.5 text-[10px] font-semibold text-muted-foreground">{day}</p>)}
        {cells.map((date) => <DayCell key={date.toISOString()} date={date} detail={detail} muted={date < start || date > end} />)}
      </div>
      <div className="grid gap-2 lg:hidden">
        {trip.map((date) => <DayCell key={date.toISOString()} date={date} detail={detail} />)}
      </div>
    </div>
  );
}

function DayCell({ date, detail, muted = false }: { date: Date; detail: PlanDetail; muted?: boolean }) {
  const iso = format(date, "yyyy-MM-dd");
  const days = detail.days.filter((item) => item.date === iso);
  const activities = detail.activities.filter((activity) => days.some((item) => item.id === activity.itineraryDayId)).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.sortOrder - b.sortOrder);
  return (
    <article className={`min-h-16 rounded-xl bg-white p-1.5 shadow-[var(--shadow)] ${muted ? "opacity-50" : ""}`}>
      <p className="text-[11px] font-semibold">{format(date, "MMM d")}</p>
      {days.length > 0 && <p className="truncate text-[10px] leading-4 text-muted-foreground">{days.map((item) => item.title).join(" · ")}</p>}
      <ul className="mt-1 grid gap-px">
        {activities.slice(0, 3).map((activity) => (
          <li key={activity.id} className="flex min-w-0 items-center gap-1 text-[10px] leading-4">
            <span className="size-1 shrink-0 rounded-full bg-primary" aria-hidden />
            <Link href={planPath(detail.plan.id, { view: "timeline", day: iso, hash: `activity-${activity.id}` })} className="truncate">{formatClock(activity.startTime) ? `${formatClock(activity.startTime)} ` : ""}{activity.title}</Link>
          </li>
        ))}
        {activities.length > 3 && <li className="pl-2 text-[10px] leading-4 text-muted-foreground">+{activities.length - 3}</li>}
      </ul>
    </article>
  );
}

function ActivityList({ detail }: { detail: PlanDetail }) {
  const groups = new Map<string, { date: string; titles: string[]; activities: PlanDetail["activities"] }>();
  for (const item of [...detail.days].sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder)) {
    const activities = detail.activities.filter((activity) => activity.itineraryDayId === item.id).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.sortOrder - b.sortOrder);
    if (!activities.length) continue;
    const group = groups.get(item.date) ?? { date: item.date, titles: [], activities: [] };
    group.titles.push(item.title);
    group.activities.push(...activities);
    groups.set(item.date, group);
  }
  for (const group of groups.values()) group.activities.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "") || a.sortOrder - b.sortOrder);
  const rows = [...groups.values()];
  if (!rows.length) return <p className="mt-3 rounded-xl bg-white p-3 text-xs shadow-[var(--shadow)]">No activities yet.</p>;
  return (
    <div className="mt-3 grid gap-3">
      {rows.map((group) => (
        <section key={group.date} className="rounded-xl bg-white p-2.5 shadow-[var(--shadow)]" aria-label={format(parseISO(group.date), "EEEE, MMMM d")}>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-rose uppercase">{format(parseISO(group.date), "EEEE, MMMM d")}</p>
          <h2 className="font-serif text-[13px] leading-snug">{group.titles.join(" · ")}</h2>
          <ol className="relative mt-2 ml-1.5 border-l border-[#eadcf5]">
            {group.activities.map((activity) => (
              <li key={activity.id} className="relative pb-2 pl-3 last:pb-0">
                <span className="absolute top-1.5 -left-[0.22rem] size-1.5 rounded-full bg-primary" aria-hidden />
                <Link href={planPath(detail.plan.id, { view: "timeline", day: group.date, hash: `activity-${activity.id}` })} className="block">
                  <p className="text-[10px] font-semibold tracking-wide text-rose uppercase">{formatClockRange(activity.startTime, activity.endTime)} · {activityStatusLabels[activity.status]}</p>
                  <p className="font-serif text-[13px] leading-snug">{activity.title}</p>
                  {activity.location && <p className="text-[11px] leading-4 text-muted-foreground">{activity.location}</p>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function planRange(start: string, end: string, fallback: string[]) {
  try {
    const dates = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map((date) => format(date, "yyyy-MM-dd"));
    if (dates.length) return dates;
  } catch {
    /* An inverted range falls back to days already on the itinerary. */
  }
  return [...new Set(fallback)].sort();
}

function defaultFocus(dates: string[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  return dates.find((date) => date >= today) ?? dates[0] ?? "";
}

function planPath(planId: string, options: { view?: string; day?: string; span?: string; hash?: string }) {
  const params = new URLSearchParams();
  if (options.view && options.view !== "timeline") params.set("view", options.view);
  if (options.day) params.set("day", options.day);
  if (options.span === "all") params.set("span", "all");
  const query = params.toString();
  return `/plans/${planId}${query ? `?${query}` : ""}${options.hash ? `#${options.hash}` : ""}`;
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
