import { deleteCycleAction, deleteReminderAction, saveProfileAction, saveReminderAction } from "@/app/(app)/cycle/actions";
import { PersonalCycleNotice } from "@/components/cycle/partner-panel";
import { CycleBlocked, CycleStatus } from "@/components/cycle/status";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { tracksOwnCycle } from "@/lib/gender";
import { cycleProviderConfig } from "@/lib/cycle/provider";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { loadOwnerCycle } from "@/lib/services/cycle";

export const metadata = { title: "Cycle privacy" };

const zones = ["UTC", "Asia/Manila", "America/Los_Angeles", "America/New_York", "Europe/London", "Australia/Sydney"];

export default async function CycleSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const access = await requireCyclePage();
  if (access.blocked) return <CycleBlocked />;
  if (!tracksOwnCycle(access.user.profile.gender)) return <PersonalCycleNotice />;
  const query = await searchParams;
  let snapshot;
  try {
    snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
  } catch (error) {
    if (!isMissingCycleTable(error)) throw error;
    return <CycleSetup />;
  }
  const profile = snapshot.profile;
  const provider = cycleProviderConfig();
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="font-serif text-4xl">Privacy and reminders</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Period details, symptoms, sex drive, sexual activity, and pregnancy records stay private until you turn on a specific share. You can turn any of them off again.</p>
      </header>
      <CycleStatus saved={query.saved} error={query.error} />
      <form action={saveProfileAction} className="grid items-start gap-4 xl:grid-cols-2">
        <section className="panel grid gap-4 p-5">
          <h2 className="font-serif text-2xl">Cycle settings</h2>
          <label className="grid gap-1 text-sm">Time zone
            <input name="timeZone" list="zones" defaultValue={profile.timeZone} className="h-11 rounded-2xl border px-3" />
            <datalist id="zones">{zones.map((zone) => <option key={zone} value={zone} />)}</datalist>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">Typical cycle length<input name="typicalCycleLength" type="number" min={15} max={90} defaultValue={profile.typicalCycleLength} className="h-11 rounded-2xl border px-3" /></label>
            <label className="grid gap-1 text-sm">Typical period length<input name="typicalPeriodLength" type="number" min={1} max={10} defaultValue={profile.typicalPeriodLength} className="h-11 rounded-2xl border px-3" /></label>
            <label className="grid gap-1 text-sm">Luteal length assumption<input name="lutealLength" type="number" min={10} max={18} defaultValue={profile.lutealLength} className="h-11 rounded-2xl border px-3" /></label>
          </div>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input name="externalEstimateConsent" type="checkbox" defaultChecked={profile.externalEstimateConsent} /> <span>Allow period start dates and cycle length settings to be sent to the configured calculator. Symptoms, notes, sex, contraception, and pregnancy logs are not sent. The result is still an estimate. {provider.mode === "apiverve" ? "A calculator is configured on this server." : "No calculator is configured, so dates stay in CoupleSync."}</span></label>
        </section>
        <section className="panel grid gap-3 p-5">
          <h2 className="font-serif text-2xl">What a partner may see</h2>
          <p className="text-sm text-muted-foreground">These switches are the consent. A check-in still has to be set to summary or selected details. Leaving the couple, or changing gender away from Female, revokes them. Predictions stay labeled as estimates.</p>
          <Toggle name="sharePhaseSummary" label="Share the current cycle phase estimate" defaultChecked={profile.sharePhaseSummary} />
          <Toggle name="sharePeriodSummary" label="Share period start and the estimated next period" defaultChecked={profile.sharePeriodSummary} />
          <Toggle name="shareFertileSummary" label="Share the estimated fertile window" defaultChecked={profile.shareFertileSummary} />
          <Toggle name="shareMoodSummary" label="Share mood and energy from days you mark as a summary" defaultChecked={profile.shareMoodSummary} />
          <Toggle name="shareSymptomSummary" label="Share symptom names from days you select" defaultChecked={profile.shareSymptomSummary} />
          <Toggle name="shareIntimacySummary" label="Share sex drive and closeness from days you select" defaultChecked={profile.shareIntimacySummary} />
          <Toggle name="shareSelectedDetails" label="Allow selected details such as notes, mucus, sexual activity, or contraception" defaultChecked={profile.shareSelectedDetails} />
        </section>
        <section className="panel grid gap-3 p-5 xl:col-span-2">
          <h2 className="font-serif text-2xl">Reminders</h2>
          <p className="text-sm text-muted-foreground">Wording stays discreet so a lock screen does not name a period, fertility, or pregnancy.</p>
          <div className="grid gap-3 xl:grid-cols-2">
            <Toggle name="periodReminder" label="Upcoming personal reminder" defaultChecked={profile.periodReminder} />
            <label className="grid gap-1 text-sm">Days before<input name="periodLeadDays" type="number" min={0} max={14} defaultValue={profile.periodLeadDays} className="h-11 rounded-2xl border px-3" /></label>
            <Toggle name="checkInReminder" label="Daily check-in reminder" defaultChecked={profile.checkInReminder} />
            <label className="grid gap-1 text-sm">Check-in hour<input name="checkInHour" type="number" min={0} max={23} defaultValue={profile.checkInHour} className="h-11 rounded-2xl border px-3" /></label>
            <Toggle name="fertileReminder" label="Calendar reminder on the first estimated fertile day" defaultChecked={profile.fertileReminder} />
            <Toggle name="pregnancyTestReminder" label="Private reminder if a period is later than the estimate" defaultChecked={profile.pregnancyTestReminder} />
            <Toggle name="missedCheckInReminder" label="Missed check-in reminder" defaultChecked={profile.missedCheckInReminder} />
          </div>
          <button className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground" type="submit">Save privacy and reminders</button>
        </section>
      </form>
      <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="panel grid gap-3 p-5">
        <h2 className="font-serif text-2xl">Medication or wellness reminders</h2>
        <form action={saveReminderAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="kind" value="medication" />
          <label className="grid gap-1 text-sm">Title<input name="title" required maxLength={80} className="h-11 rounded-2xl border px-3" placeholder="Wellness reminder" /></label>
          <label className="grid gap-1 text-sm">Hour<input name="hour" type="number" min={0} max={23} defaultValue={9} className="h-11 rounded-2xl border px-3" /></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
          <button className="min-h-11 rounded-full border px-4 text-sm" type="submit">Add reminder</button>
        </form>
        <ul className="grid gap-2">
          {snapshot.reminders.map((reminder) => (
            <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-sm">
              <span>{reminder.title} · {reminder.hour}:00 · {reminder.enabled ? "On" : "Off"}</span>
              <span className="flex gap-2">
                <form action={saveReminderAction}>
                  <input type="hidden" name="id" value={reminder.id} />
                  <input type="hidden" name="kind" value={reminder.kind} />
                  <input type="hidden" name="title" value={reminder.title} />
                  <input type="hidden" name="hour" value={reminder.hour} />
                  <button className="min-h-11 underline" name="enabled" value={reminder.enabled ? "false" : "true"} type="submit">{reminder.enabled ? "Turn off" : "Turn on"}</button>
                </form>
                <form action={deleteReminderAction}><input type="hidden" name="id" value={reminder.id} /><button className="min-h-11 underline" type="submit">Delete</button></form>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel grid gap-3 p-5">
        <h2 className="font-serif text-2xl">Your cycle data</h2>
        <a className="text-sm underline" href="/api/cycle/export">Download cycle data</a>
        <a className="text-sm underline" href="/api/account/export">Download the full account export</a>
        <form action={deleteCycleAction} className="grid gap-2">
          <label className="grid gap-1 text-sm">Type DELETE to permanently erase cycle records<input name="confirm" className="h-11 rounded-2xl border px-3" /></label>
          <button className="min-h-11 rounded-full bg-destructive px-4 text-sm text-white" type="submit">Delete cycle data</button>
        </form>
      </section>
      </div>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return <label className="flex min-h-11 items-center gap-3 rounded-2xl border px-3 text-sm"><input name={name} type="checkbox" defaultChecked={defaultChecked} />{label}</label>;
}
