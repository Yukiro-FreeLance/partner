import Link from "next/link";
import { formatDay } from "@/lib/cycle/dates";
import type { loadSharedCycle } from "@/lib/services/cycle";

type SharedCycle = Awaited<ReturnType<typeof loadSharedCycle>>;

export function PersonalCycleNotice() {
  return (
    <section className="panel p-5">
      <h1 className="font-serif text-3xl">This tracker follows one person&apos;s cycle</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">It is available when gender is set to Female in Profile. A partner still only sees the phase, dates, symptoms, mood, sex drive, or fertility estimates that person chooses to share.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/cycle" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">See shared cycle</Link>
        <Link href="/profile" className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm">Update profile</Link>
      </div>
    </section>
  );
}

export function PartnerCycleCard({ shared, heading = "Partner's cycle" }: { shared: SharedCycle; heading?: string }) {
  const name = shared.partnerName?.split(" ")[0] ?? "Your partner";
  return (
    <section className="panel p-5">
      <h2 className="font-serif text-2xl">{shared.partnerName ? `${name}'s cycle` : heading}</h2>
      {shared.availability === "no_partner" && <p className="mt-2 text-sm leading-6 text-muted-foreground">Pair with your partner before any cycle details can appear. Pairing itself does not share cycle information.</p>}
      {shared.availability === "not_tracking" && <p className="mt-2 text-sm leading-6 text-muted-foreground">Cycle information is unavailable. {shared.partnerName ?? "Your partner"} has not turned on cycle tracking.</p>}
      {shared.availability === "not_shared" && <p className="mt-2 text-sm leading-6 text-muted-foreground">{shared.partnerName ?? "Your partner"} has not shared cycle information. Private entries stay hidden until they choose to share.</p>}
      {shared.availability === "shared" && (
        <div className="mt-3 grid gap-2 text-sm leading-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Estimate</p>
          <p>{shared.view.phaseSummary ?? "The current phase has not been shared."}</p>
          <p>{shared.view.periodSummary ?? "Estimated period dates have not been shared."}</p>
          <p>{shared.view.fertileSummary ?? "Fertility estimates have not been shared."}</p>
          {shared.view.daily.slice(0, 4).map((entry) => <p key={entry.day}>{formatDay(entry.day)}: {entry.lines.join(" · ")}</p>)}
          {shared.view.daily.length === 0 && <p className="text-muted-foreground">No mood, symptom, or sex-drive summaries have been shared.</p>}
          <p className="text-xs text-muted-foreground">Predictions are estimates, not confirmed medical information. Hidden records are not shown here.</p>
        </div>
      )}
      <Link href="/cycle" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary">Open cycle</Link>
    </section>
  );
}
