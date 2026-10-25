import Link from "next/link";
import { CalendarLegend, DayIdentifiers, DayMarkList, daySurface, describeDay, type CalendarFlags } from "@/components/cycle/calendar-legend";
import { PartnerCycleCard } from "@/components/cycle/partner-panel";
import { addDays, formatDay, monthGrid, weekDays } from "@/lib/cycle/dates";
import { sharedDayMarks } from "@/lib/cycle/privacy";
import type { loadSharedCycle } from "@/lib/services/cycle";

type SharedCycle = Awaited<ReturnType<typeof loadSharedCycle>>;

export function PartnerCalendar({ shared, view, cursor }: { shared: SharedCycle; view: "month" | "week"; cursor: string }) {
  const today = shared.today ?? cursor;
  const days = view === "week" ? weekDays(cursor) : monthGrid(cursor).cells.map((cell) => cell.day);
  const marks = sharedDayMarks(shared.view, days);
  const month = monthGrid(cursor);
  const cells = view === "week" ? weekDays(cursor).map((day) => ({ day, inMonth: true })) : month.cells;
  const eventDays = new Set(shared.view.events.map((event) => event.day));
  const shift = view === "week" ? 7 : 30;
  const flagsFor = (day: string, inMonth: boolean): CalendarFlags => {
    const mark = marks[day];
    return {
      confirmedPeriod: Boolean(mark?.confirmedPeriod),
      predictedPeriod: Boolean(mark?.predictedPeriod),
      fertile: Boolean(mark?.fertile),
      ovulation: Boolean(mark?.ovulation),
      checkIn: false,
      event: eventDays.has(day),
      today: day === today,
      selected: day === cursor,
      inMonth,
    };
  };
  const selectedFlags = flagsFor(cursor, true);
  const dayLines = shared.view.daily.find((entry) => entry.day === cursor)?.lines ?? [];
  const dayEvents = shared.view.events.filter((event) => event.day === cursor);
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-serif text-4xl">Shared calendar</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">These marks are estimates from the period dates your partner chose to share. Private check-ins stay off this calendar.</p>
      </header>
      <PartnerCycleCard shared={shared} />
      <div className="flex items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm" href={`/cycle/calendar?view=${view}&cursor=${addDays(cursor, -shift)}`}>Previous</Link>
        <p className="font-serif text-xl">{view === "week" ? formatDay(cursor) : month.label}</p>
        <Link className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm" href={`/cycle/calendar?view=${view}&cursor=${addDays(cursor, shift)}`}>Next</Link>
      </div>
      <div className="flex gap-2">
        <Link className={view === "month" ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"} href={`/cycle/calendar?view=month&cursor=${cursor}`}>Month</Link>
        <Link className={view === "week" ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"} href={`/cycle/calendar?view=week&cursor=${cursor}`}>Week</Link>
      </div>
      <CalendarLegend audience="partner" />
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-1">{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const flags = flagsFor(cell.day, cell.inMonth);
          return (
            <Link key={cell.day} href={`/cycle/calendar?view=${view}&cursor=${cell.day}`} aria-label={describeDay(cell.day, flags)} className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-sm ${daySurface(flags)}`} aria-current={flags.selected ? "date" : undefined}>
              <span className={flags.today ? "font-semibold text-primary" : ""}>{Number(cell.day.slice(-2))}</span>
              <DayIdentifiers flags={flags} />
            </Link>
          );
        })}
      </div>
      <section className="panel grid gap-3 p-5">
        <h2 className="font-serif text-2xl">{formatDay(cursor)}</h2>
        <DayMarkList flags={selectedFlags} />
        {dayLines.length > 0 ? <ul className="grid gap-1 text-sm">{dayLines.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing from this day has been shared.</p>}
        {dayEvents.map((event) => <p key={event.id} className="text-sm">{event.title}{event.body ? ` — ${event.body}` : ""}</p>)}
        <p className="text-xs text-muted-foreground">Predicted days are estimates, not confirmed medical information.</p>
      </section>
    </div>
  );
}
