import Link from "next/link";
import { deleteEventAction, saveEventAction } from "@/app/(app)/cycle/actions";
import { CycleBlocked, CycleStatus } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { DRIVE_OPTIONS, MOOD_OPTIONS, optionLabel, SYMPTOM_OPTIONS } from "@/lib/cycle/copy";
import { addDays, formatDay, formatDayShort, isIsoDate, monthGrid, weekDays } from "@/lib/cycle/dates";
import { calendarMarks } from "@/lib/cycle/predict";
import { loadOwnerCycle, loadSharedCycle } from "@/lib/services/cycle";

export const metadata = { title: "Couple calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; cursor?: string; saved?: string; error?: string }> }) {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  const query = await searchParams;
  let snapshot;
  let shared;
  try {
    snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
    shared = await loadSharedCycle(access.repo, access.user.profile.id);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const cursor = query.cursor && isIsoDate(query.cursor) ? query.cursor : snapshot.today;
  const view = query.view === "week" ? "week" : "month";
  const days = view === "week" ? weekDays(cursor) : monthGrid(cursor).cells.map((cell) => cell.day);
  const marks = calendarMarks(snapshot.estimate, snapshot.periods, days);
  const month = monthGrid(cursor);
  const cells = view === "week" ? weekDays(cursor).map((day) => ({ day, inMonth: true })) : month.cells;
  const selected = snapshot.checkIns.find((entry) => entry.day === cursor);
  const ownEvents = snapshot.events.filter((event) => event.day === cursor);
  const shift = view === "week" ? 7 : 30;
  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Predicted days are outlines. Recorded period days are filled. Your partner only sees events and summaries you explicitly share.</p>
        </div>
        <div className="flex gap-2">
          <Link className={view === "month" ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"} href={`/cycle/calendar?view=month&cursor=${cursor}`}>Month</Link>
          <Link className={view === "week" ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"} href={`/cycle/calendar?view=week&cursor=${cursor}`}>Week</Link>
        </div>
      </header>
      <CycleStatus saved={query.saved} error={query.error} />
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm" href={`/cycle/calendar?view=${view}&cursor=${addDays(cursor, -shift)}`}>Previous</Link>
        <p className="font-serif text-xl">{view === "week" ? formatDay(cursor) : month.label}</p>
        <Link className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm" href={`/cycle/calendar?view=${view}&cursor=${addDays(cursor, shift)}`}>Next</Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const mark = marks[cell.day];
          const hasEntry = snapshot.checkIns.some((entry) => entry.day === cell.day) || snapshot.events.some((event) => event.day === cell.day);
          return (
            <Link key={cell.day} href={`/cycle/calendar?view=${view}&cursor=${cell.day}`} className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-sm ${cell.day === cursor ? "ring-2 ring-primary" : ""} ${cell.inMonth ? "bg-white" : "bg-transparent text-muted-foreground"} ${mark?.confirmedPeriod ? "bg-[#ffe4e6]" : ""} ${mark?.predictedPeriod ? "border border-dashed border-[#be123c]" : ""} ${mark?.fertile ? "shadow-[inset_0_0_0_2px_#c4b5fd]" : ""}`} aria-current={cell.day === cursor ? "date" : undefined}>
              <span>{Number(cell.day.slice(-2))}</span>
              {mark?.ovulation && <span className="text-[10px] text-[#6d28d9]">ovulation</span>}
              {hasEntry && <span className="size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <li>Filled rose: recorded period</li>
        <li>Dashed rose: predicted period</li>
        <li>Lavender outline: predicted fertile window</li>
        <li>Ovulation label: predicted only</li>
      </ul>
      <section className="panel grid gap-3 p-5">
        <h2 className="font-serif text-2xl">{formatDay(cursor)}</h2>
        {selected ? <p className="text-sm">Mood {optionLabel(MOOD_OPTIONS, selected.mood) ?? "not logged"} · Energy {selected.energy ?? "not logged"} · Sex drive {optionLabel(DRIVE_OPTIONS, selected.sexDrive) ?? "not logged"} · Symptoms {[...selected.symptoms.map((item) => optionLabel(SYMPTOM_OPTIONS, item) ?? item), ...selected.customSymptoms].join(", ") || "none"}</p> : <p className="text-sm text-muted-foreground">No check-in on this day.</p>}
        {selected?.notes && <p className="text-sm">Journal: {selected.notes}</p>}
        <Link className="text-sm font-medium text-primary" href={`/cycle/check-in?day=${cursor}`}>Open check-in</Link>
        <ul className="grid gap-2">
          {ownEvents.map((event) => (
            <li key={event.id} className="rounded-2xl bg-[#faf5ff] p-3 text-sm">
              <p className="font-medium">{event.title}</p>
              {event.body && <p>{event.body}</p>}
              <p className="text-xs text-muted-foreground">Visibility: {event.visibility}</p>
              <form action={deleteEventAction}><input type="hidden" name="id" value={event.id} /><button className="min-h-11 text-sm underline" type="submit">Delete</button></form>
            </li>
          ))}
        </ul>
        <form action={saveEventAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="day" value={cursor} />
          <label className="grid gap-1 text-sm sm:col-span-2">Event title<input name="title" required maxLength={80} className="h-11 rounded-2xl border px-3" /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">Note<input name="body" maxLength={500} className="h-11 rounded-2xl border px-3" /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">Who can see it
            <select name="visibility" defaultValue="private" className="h-11 rounded-2xl border bg-white px-3">
              <option value="private">Private to me</option>
              <option value="summary">Share the title only</option>
              <option value="selected">Share the title and note</option>
              <option value="shared">Shared calendar event</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">Do not put symptoms, sex, or pregnancy details in a shared event unless you mean for your partner to read them.</p>
          <button className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground sm:col-span-2" type="submit">Save event</button>
        </form>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Shared with you</h2>
        {!shared.partnerName && <p className="mt-2 text-sm text-muted-foreground">Pair with a partner before shared events can appear.</p>}
        {shared.partnerName && <p className="mt-2 text-sm">{shared.view.periodSummary ?? `${shared.partnerName} has not shared period dates.`}</p>}
        {shared.view.fertileSummary && <p className="mt-1 text-sm">{shared.view.fertileSummary}</p>}
        <ul className="mt-3 grid gap-2">
          {shared.view.events.map((event) => <li key={event.id} className="text-sm">{formatDayShort(event.day)} · {event.title}{event.body ? ` — ${event.body}` : ""}</li>)}
          {shared.view.events.length === 0 && <li className="text-sm text-muted-foreground">No partner events are shared.</li>}
        </ul>
      </section>
    </div>
  );
}
