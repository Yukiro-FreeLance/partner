import { CycleCharts } from "@/components/cycle/charts";
import { PersonalCycleNotice } from "@/components/cycle/partner-panel";
import { CycleBlocked } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { tracksOwnCycle } from "@/lib/gender";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { PHASE_COPY, TRACKING_DISCLAIMER } from "@/lib/cycle/copy";
import { formatDayShort } from "@/lib/cycle/dates";
import { driveValue } from "@/lib/cycle/report";
import { loadOwnerCycle } from "@/lib/services/cycle";

const phaseTone: Record<string, string> = {
  menstrual: "bg-[#ffe4e6] text-[#9f1239]",
  follicular: "bg-[#fce7f3] text-[#9d174d]",
  ovulation: "bg-[#f5f3ff] text-[#6d28d9]",
  luteal: "bg-[#ede9fe] text-[#5b21b6]",
  unknown: "bg-[#faf7ff] text-[#6b6280]",
};

export const metadata = { title: "Cycle insights" };

export default async function InsightsPage() {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  if (!tracksOwnCycle(access.user.profile.gender)) return <PersonalCycleNotice />;
  let snapshot;
  try {
    snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const lengths = snapshot.history.filter((row) => row.length).map((row) => ({ label: formatDayShort(row.start), days: row.length ?? 0 }));
  const drive = snapshot.series.flatMap((point) => {
    const value = driveValue(point.sexDrive);
    return value ? [{ label: formatDayShort(point.day), value }] : [];
  });
  const phaseCounts = snapshot.series.reduce<Record<string, number>>((counts, point) => {
    counts[point.phase] = (counts[point.phase] ?? 0) + 1;
    return counts;
  }, {});
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-serif text-4xl">Insights</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{TRACKING_DISCLAIMER} Patterns here are individual. They are not rules about hormones or desire.</p>
      </header>
      <CycleCharts lengths={lengths} symptoms={snapshot.symptoms} drive={drive} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Estimated versus recorded</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.history.map((row) => (
            <li key={row.start} className="rounded-3xl bg-[#faf5ff] p-4">
              <p className="text-xs font-medium text-muted-foreground">{row.lengthStatus === "recorded" ? "Recorded cycle" : "Current cycle"}</p>
              <p className="mt-1 font-serif text-3xl text-[#4c1d95]">{row.length ? `${row.length}` : "Open"}{row.length ? <span className="ml-1 text-base font-sans font-medium text-muted-foreground">days</span> : null}</p>
              <p className="mt-2 text-sm">Started {formatDayShort(row.start)}</p>
              <p className="text-sm text-muted-foreground">{row.periodDays ? `Period ${row.periodDays} days recorded` : "Period end not recorded"}</p>
              {row.earlierEstimate ? <p className="mt-1 text-xs text-muted-foreground">Earlier length estimate {row.earlierEstimate} days</p> : null}
            </li>
          ))}
          {snapshot.history.length === 0 && <li className="text-sm text-muted-foreground">Log a period to start a history.</li>}
        </ul>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Notes across phases</h2>
        <p className="mt-2 text-sm text-muted-foreground">Phase labels on past days use the recorded interval when the next period start is known. They are still estimates.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(phaseCounts).map(([phase, count]) => (
            <li key={phase} className={`rounded-3xl p-4 ${phaseTone[phase] ?? phaseTone.unknown}`}>
              <p className="text-xs font-medium">{phase === "unknown" ? "Open cycle" : PHASE_COPY[phase as keyof typeof PHASE_COPY]?.title ?? phase}</p>
              <p className="mt-1 font-serif text-3xl">{count}</p>
              <p className="text-xs">{count === 1 ? "check-in" : "check-ins"}</p>
            </li>
          ))}
          {snapshot.series.length === 0 && <li className="text-sm text-muted-foreground">Check-ins will group here after you save a few days.</li>}
        </ul>
      </section>
      </div>
      <p className="text-sm text-muted-foreground"><a className="font-medium text-primary" href="/api/cycle/export">Export cycle data</a> or erase it from Privacy.</p>
    </div>
  );
}
