import Link from "next/link";
import { deletePeriodAction, deletePregnancyAction, savePeriodAction, savePregnancyAction } from "@/app/(app)/cycle/actions";
import { CycleBlocked, CycleStatus } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { DayReadout } from "@/components/cycle/day-readout";
import { PartnerCycleCard } from "@/components/cycle/partner-panel";
import { CycleRing } from "@/components/cycle/ring";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { tracksOwnCycle } from "@/lib/gender";
import { confidenceLabel, PHASE_COPY, sourceLabel, TRACKING_DISCLAIMER } from "@/lib/cycle/copy";
import { addDays, formatDay, formatDayShort } from "@/lib/cycle/dates";
import { loadOwnerCycle, loadSharedCycle } from "@/lib/services/cycle";
import { cycleProviderConfig } from "@/lib/cycle/provider";

export default async function CyclePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  if (!tracksOwnCycle(access.user.profile.gender)) {
    try {
      const shared = await loadSharedCycle(access.repo, access.user.profile.id);
      return <PartnerCycleCard shared={shared} heading="Shared cycle" />;
    } catch (error) {
      if (!isMissingCycleTable(error)) throw error;
      return <CycleSetup />;
    }
  }
  const query = await searchParams;
  let snapshot;
  try {
    snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const { estimate, profile, fertility } = snapshot;
  const todayEntry = snapshot.checkIns.find((entry) => entry.day === snapshot.today);
  const provider = cycleProviderConfig();
  const periodEnd = estimate.lastPeriodStart && estimate.periodLength ? addDays(estimate.lastPeriodStart, estimate.periodLength - 1) : null;
  return (
    <div className="grid gap-4">
      <header className="grid gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Private to you</p>
        <h1 className="font-serif text-4xl text-[#4c1d95]">Cycle tracker</h1>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{TRACKING_DISCLAIMER} Dates update from the periods you record. A partner sees a phase, a date, a symptom, a mood, sex drive, or a fertility estimate only after you turn that share on.</p>
      </header>
      <CycleStatus saved={query.saved} error={query.error} />
      {profile.sampleData && <p className="rounded-2xl bg-secondary px-4 py-3 text-sm">These entries are fictional sample data for Maya Chen. They are not a real health record.</p>}
      {!estimate.hasHistory && (
        <section className="panel grid gap-4 p-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-center">
          <CycleRing estimate={estimate} />
          <div>
            <h2 className="font-serif text-3xl">Log your first period</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use the first day of bleeding. Predictions stay labeled as predictions, and nothing is shared until you turn sharing on.</p>
            <PeriodForm />
          </div>
        </section>
      )}
      {estimate.hasHistory && (
        <>
          <section className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="panel grid justify-items-center p-5">
              <CycleRing estimate={estimate} />
              <p className="text-center font-serif text-2xl">{PHASE_COPY[estimate.phase].title}</p>
              <p className="text-center text-xs leading-5 text-muted-foreground">{sourceLabel(estimate.source)} {confidenceLabel(estimate.confidence)}</p>
              <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">The ring is the current cycle day. It moves when you record a new period start.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Cycle length" value={estimate.cycleLength ? `${estimate.cycleLength} days` : "—"} detail={estimate.cycleLengthSource === "history" ? "Average gap between recorded period starts. An estimate of your pattern, not a medical measurement." : "Using the cycle length in Privacy until more starts are recorded."} />
              <Stat label="Next period" value={estimate.nextPeriodStart ? formatDayShort(estimate.nextPeriodStart) : "—"} detail="Predicted from recent starts. The date can move after the next recorded period." />
              <Stat label="Period length" value={estimate.periodLength ? `${estimate.periodLength} days` : "—"} detail={estimate.periodLengthStatus === "confirmed" ? "Counted from the start and end dates you entered." : "Predicted from your typical period length until you record an end date."} />
              <Stat label={estimate.daysLate > 0 ? "Later than estimate" : "Days until period"} value={estimate.daysLate > 0 ? `${estimate.daysLate}` : `${estimate.daysUntilPeriod ?? "—"}`} detail={estimate.daysLate > 0 ? "The predicted start has passed and no new period is recorded. That is not a pregnancy result." : "Days from today to the predicted start."} />
              <Stat label="Fertile window" value={estimate.fertileStart && estimate.fertileEnd ? `${formatDayShort(estimate.fertileStart)} – ${formatDayShort(estimate.fertileEnd)}` : "—"} detail="A predicted range. It does not confirm ovulation or mark a day as safe." />
              <Stat label="Ovulation" value={estimate.ovulationDate ? formatDayShort(estimate.ovulationDate) : "—"} detail="One predicted day inside the fertile window. It is not a confirmed ovulation." />
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="font-serif text-2xl">{PHASE_COPY[estimate.phase].title} phase</h2>
            <p className="mt-2 text-sm leading-6">{PHASE_COPY[estimate.phase].body}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {(["menstrual", "follicular", "ovulation", "luteal"] as const).map((phase) => (
                <article key={phase} className={phase === estimate.phase ? "rounded-3xl bg-[#fde7f3] p-4" : "rounded-3xl bg-[#faf5ff] p-4"}>
                  <h3 className="font-serif text-lg">{PHASE_COPY[phase].title}{phase === estimate.phase ? " · current estimate" : ""}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{PHASE_COPY[phase].body}</p>
                </article>
              ))}
            </div>
            {periodEnd && <p className="mt-3 text-sm text-muted-foreground">Recorded period start {formatDay(estimate.lastPeriodStart ?? "")}. {estimate.periodLengthStatus === "confirmed" ? "Period end recorded" : "Period end predicted"} {formatDay(periodEnd)}.</p>}
          </section>
          <section className="panel grid gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Today</h2>
              <Link href={`/cycle/check-in?day=${snapshot.today}`} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">{todayEntry ? "Edit check-in" : "Daily check-in"}</Link>
            </div>
            <DayReadout entry={todayEntry} />
          </section>
          <section className="panel grid gap-3 p-5">
            <h2 className="font-serif text-2xl">Pregnancy chance and fertility</h2>
            <p className="text-sm">Cycle day {estimate.cycleDay ?? "—"}. Fertile window and ovulation above are predicted.</p>
            <ul className="grid gap-2 text-sm leading-6">
              {fertility.statements.map((statement) => <li key={statement}>{statement}</li>)}
              {fertility.recordedTests.map((statement) => <li key={statement}>{statement}</li>)}
            </ul>
            {fertility.testReminder && <p className="rounded-2xl bg-[#fff7ed] px-4 py-3 text-sm">{fertility.testReminder}</p>}
            <form action={savePregnancyAction} className="grid gap-3 rounded-3xl bg-[#faf5ff] p-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">Test date<input name="testedOn" type="date" required className="h-11 rounded-2xl border px-3" /></label>
              <label className="grid gap-1 text-sm">Result
                <select name="result" className="h-11 rounded-2xl border bg-white px-3" defaultValue="not_taken">
                  <option value="not_taken">No result recorded</option>
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                  <option value="invalid">Invalid</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">Private note<textarea name="notes" className="min-h-20 rounded-2xl border px-3 py-2" /></label>
              <button className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground sm:col-span-2" type="submit">Save pregnancy test</button>
            </form>
            <ul className="grid gap-2">
              {snapshot.tests.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{formatDay(entry.testedOn)} · {entry.result.replace("_", " ")}</span>
                  <form action={deletePregnancyAction}><input type="hidden" name="id" value={entry.id} /><button className="min-h-11 text-sm underline" type="submit">Delete</button></form>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Pregnancy tests stay private. {provider.mode === "apiverve" ? "An optional external calculator can be enabled in Privacy." : "No external calculator is configured, so dates are calculated here."}</p>
          </section>
          <section className="panel grid gap-3 p-5">
            <h2 className="font-serif text-2xl">Recorded periods</h2>
            <PeriodForm />
            <ul className="grid gap-3">
              {snapshot.periods.slice().sort((left, right) => right.startedOn.localeCompare(left.startedOn)).map((period) => (
                <li key={period.id} className="grid gap-2 rounded-3xl border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <form action={savePeriodAction} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={period.id} />
                    <label className="grid gap-1 text-sm">Start, recorded<input name="startedOn" type="date" defaultValue={period.startedOn} required className="h-11 rounded-2xl border px-3" /></label>
                    <label className="grid gap-1 text-sm">End, recorded if you know it<input name="endedOn" type="date" defaultValue={period.endedOn ?? ""} className="h-11 rounded-2xl border px-3" /></label>
                    <button className="min-h-11 rounded-full border px-4 text-sm sm:col-span-2" type="submit">Save correction</button>
                  </form>
                  <form action={deletePeriodAction}><input type="hidden" name="id" value={period.id} /><button className="min-h-11 text-sm underline" type="submit">Delete</button></form>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="panel p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></article>;
}

function PeriodForm() {
  return (
    <form action={savePeriodAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Period start<input name="startedOn" type="date" required className="h-11 rounded-2xl border px-3" /></label>
      <label className="grid gap-1 text-sm">Period end, optional<input name="endedOn" type="date" className="h-11 rounded-2xl border px-3" /></label>
      <label className="grid gap-1 text-sm sm:col-span-2">Note, optional<input name="note" maxLength={500} className="h-11 rounded-2xl border px-3" /></label>
      <button className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground sm:col-span-2" type="submit">Save period</button>
    </form>
  );
}
