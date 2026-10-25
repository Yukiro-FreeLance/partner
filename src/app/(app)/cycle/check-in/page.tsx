import Link from "next/link";
import { deleteCheckInAction } from "@/app/(app)/cycle/actions";
import { CheckInForm } from "@/components/cycle/check-in-form";
import { CycleBlocked, CycleStatus } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { formatDay, isIsoDate, compareDates } from "@/lib/cycle/dates";
import { loadOwnerCycle } from "@/lib/services/cycle";

export const metadata = { title: "Daily check-in" };

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ day?: string; saved?: string; error?: string }> }) {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  const query = await searchParams;
  let snapshot;
  try {
    snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const day = query.day && isIsoDate(query.day) && compareDates(query.day, snapshot.today) <= 0 ? query.day : snapshot.today;
  const initial = snapshot.checkIns.find((entry) => entry.day === day) ?? null;
  const recent = snapshot.checkIns.slice().sort((left, right) => right.day.localeCompare(left.day)).slice(0, 14);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="panel p-4 sm:p-6">
        <h1 className="font-serif text-4xl">Daily check-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Record how this day felt. You can reopen an earlier day and save over it.</p>
        <CycleStatus saved={query.saved} error={query.error} />
        <form className="mt-4 flex flex-wrap items-end gap-2" action="/cycle/check-in">
          <label className="grid gap-1 text-sm">Day<input name="day" type="date" defaultValue={day} max={snapshot.today} className="h-11 rounded-2xl border px-3" /></label>
          <button className="min-h-11 rounded-full border px-4 text-sm" type="submit">Open day</button>
        </form>
        <div className="mt-5"><CheckInForm key={day} day={day} initial={initial} /></div>
        {initial && <form action={deleteCheckInAction} className="mt-3"><input type="hidden" name="id" value={initial.id} /><button className="min-h-11 text-sm underline" type="submit">Delete this check-in</button></form>}
      </section>
      <aside className="panel h-fit p-4">
        <h2 className="font-serif text-2xl">Previous days</h2>
        <ul className="mt-3 grid gap-1">
          {recent.map((entry) => <li key={entry.id}><Link className="flex min-h-11 items-center text-sm underline-offset-4 hover:underline" href={`/cycle/check-in?day=${entry.day}`}>{formatDay(entry.day)}</Link></li>)}
          {recent.length === 0 && <li className="text-sm text-muted-foreground">No check-ins yet.</li>}
        </ul>
      </aside>
    </div>
  );
}
