import { CycleBlocked } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { formatDay } from "@/lib/cycle/dates";
import { loadOwnerCycle, loadSharedCycle } from "@/lib/services/cycle";

export const metadata = { title: "Shared cycle" };

export default async function SharedCyclePage() {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  let shared;
  let mine;
  try {
    [shared, mine] = await Promise.all([
      loadSharedCycle(access.repo, access.user.profile.id),
      loadOwnerCycle(access.repo, access.user.profile.id),
    ]);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const sharing = [
    mine.profile.sharePeriodSummary ? "Period dates" : null,
    mine.profile.shareFertileSummary ? "Fertile window estimate" : null,
    mine.profile.shareMoodSummary ? "Mood and energy summaries" : null,
    mine.profile.shareSymptomSummary ? "Symptom names you select" : null,
    mine.profile.shareIntimacySummary ? "Sex drive and closeness you select" : null,
    mine.profile.shareSelectedDetails ? "Selected details you check on a day" : null,
  ].filter(Boolean);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="panel p-5">
        <h1 className="font-serif text-3xl">From your partner</h1>
        {!shared.partnerName && <p className="mt-2 text-sm text-muted-foreground">Join a couple to receive anything a partner chooses to share. Pairing itself never includes cycle data.</p>}
        {shared.partnerName && <p className="mt-2 text-sm text-muted-foreground">{shared.partnerName} controls this. Hidden records are not shown here.</p>}
        <div className="mt-4 grid gap-2 text-sm">
          <p>{shared.view.periodSummary ?? "No period summary."}</p>
          <p>{shared.view.fertileSummary ?? "No fertile-window summary."}</p>
          {shared.view.daily.map((entry) => <p key={entry.day}>{formatDay(entry.day)}: {entry.lines.join(" · ")}</p>)}
          {shared.view.daily.length === 0 && <p>No daily summaries.</p>}
          {shared.view.events.map((event) => <p key={event.id}>{formatDay(event.day)} · {event.title}{event.body ? ` — ${event.body}` : ""}</p>)}
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-3xl">What you are sharing</h2>
        {sharing.length === 0 ? <p className="mt-2 text-sm">Nothing. Open Privacy to choose a category.</p> : <ul className="mt-3 grid gap-2 text-sm">{sharing.map((item) => <li key={item}>{item}</li>)}</ul>}
        <a className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary" href="/cycle/settings">Change sharing</a>
      </section>
    </div>
  );
}
