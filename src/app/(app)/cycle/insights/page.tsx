import { CycleCharts } from "@/components/cycle/charts";
import { CycleBlocked } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { PHASE_COPY, TRACKING_DISCLAIMER } from "@/lib/cycle/copy";
import { formatDayShort } from "@/lib/cycle/dates";
import { driveValue } from "@/lib/cycle/report";
import { loadOwnerCycle } from "@/lib/services/cycle";

export const metadata = { title: "Cycle insights" };

export default async function InsightsPage() {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
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
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Estimated versus recorded</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {snapshot.history.map((row) => (
            <li key={row.start}>
              {formatDayShort(row.start)} · {row.lengthStatus === "recorded" ? `${row.length} days recorded` : "Current cycle, still open"}
              {row.periodDays ? ` · period ${row.periodDays} days recorded` : ""}
              {row.earlierEstimate ? ` · earlier length estimate ${row.earlierEstimate} days` : ""}
            </li>
          ))}
          {snapshot.history.length === 0 && <li className="text-muted-foreground">Log a period to start a history.</li>}
        </ul>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Notes across phases</h2>
        <p className="mt-2 text-sm text-muted-foreground">Phase labels on past days use the recorded interval when the next period start is known. They are still estimates.</p>
        <ul className="mt-3 grid gap-2 text-sm">
          {Object.entries(phaseCounts).map(([phase, count]) => <li key={phase}>{PHASE_COPY[phase as keyof typeof PHASE_COPY]?.title ?? phase}: {count} check-ins</li>)}
          {snapshot.series.length === 0 && <li className="text-muted-foreground">Check-ins will group here after you save a few days.</li>}
        </ul>
      </section>
      <p className="text-sm"><a className="underline" href="/api/cycle/export">Export cycle data</a> or erase it from Privacy.</p>
    </div>
  );
}
