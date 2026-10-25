import type { ReactNode } from "react";
import { blockAction, deleteAccountAction, leaveCoupleAction, newInviteAction, readNotificationsAction, reconnectAction, reconnectReplyAction, reportAction, revokeInviteAction, settingsAction } from "@/app/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { GenderField } from "@/components/gender-field";
import { RelationshipStatusField } from "@/components/relationship-status";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { genderLabel } from "@/lib/gender";
import { siteOrigin } from "@/lib/site-origin";
import { activeMembership, otherPartner } from "@/lib/services/access";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const partner = membership ? await otherPartner(repo, membership.coupleId, user.profile.id) : null;
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const invites = membership ? await repo.list("coupleInvitations", { eq: { coupleId: membership.coupleId, status: "pending" } }) : [];
  const requests = await repo.list("reconnectRequests", { eq: { partnerId: user.profile.id, status: "pending" } });
  const origin = await siteOrigin();
  return (
    <main className="grid w-full gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <header className="max-w-3xl">
        <h1 className="font-serif text-4xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Your name, gender, and couple details are visible inside your space. Cycle records stay private until you share a specific category. Invitation links use {origin.replace(/^https?:\/\//, "")}, the site you are on now.</p>
      </header>
      {saved === "1" && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Settings saved.</p>}
      {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="rounded-[1.75rem] bg-white p-6 text-center shadow-[var(--shadow)]">
          <AvatarUpload name={user.profile.displayName} src={user.profile.avatarUrl} />
          <p className="mt-4 font-serif text-2xl">{user.profile.displayName}</p>
          <p className="text-sm text-muted-foreground">{genderLabel(user.profile.gender)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Your partner can see this photo inside the couple space.</p>
        </section>
        <form id="privacy" action={settingsAction} className="grid gap-4 rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-serif text-2xl">Account</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Gender decides who keeps a cycle tracker. Female accounts can record a cycle. Everyone else sees only what a partner chooses to share.</p>
          </div>
          <input type="hidden" name="returnTo" value="/settings" />
          <label className="grid gap-2 sm:col-span-2"><Label htmlFor="displayName">Display name</Label><Input id="displayName" name="displayName" defaultValue={user.profile.displayName} /><Hint>This is the name on your home, quizzes, and invitations.</Hint></label>
          <div className="sm:col-span-2"><GenderField defaultValue={user.profile.gender} /></div>
          <div className="grid gap-2">
            <RelationshipStatusField label="Relationship" defaultValue={user.profile.relationshipStatus} />
            <Hint>Shown with your couple on Home. It does not change pairing.</Hint>
          </div>
          <label className="grid gap-2"><Label htmlFor="relationshipStartedOn">Together since</Label><Input id="relationshipStartedOn" name="relationshipStartedOn" type="date" defaultValue={user.profile.relationshipStartedOn ?? ""} /><Hint>Used for the days-together count. Leave it blank if you would rather not show a date.</Hint></label>
          <label className="grid gap-2 text-sm">Theme
            <select name="theme" defaultValue={user.preferences.theme} className="h-11 rounded-2xl border bg-white px-3"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>
            <Hint>Light, dark, or match this device. Saved on this account.</Hint>
          </label>
          <label className="grid gap-2 text-sm">Language
            <select name="locale" defaultValue={user.preferences.locale} className="h-11 rounded-2xl border bg-white px-3"><option value="en">English</option><option value="fil">Filipino</option></select>
            <Hint>Menus and labels. Your partner can use a different language.</Hint>
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 text-sm">In-app notifications <input name="inAppNotifications" type="checkbox" defaultChecked={user.preferences.inAppNotifications} /></label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 text-sm">Email notifications <input name="emailNotifications" type="checkbox" defaultChecked={user.preferences.emailNotifications} /></label>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">In-app notices stay in CoupleSync. Email notices use the address on this account and never include quiz answers or cycle details.</p>
          <label className="grid gap-2 text-sm sm:col-span-2">Reminder hour, optional <Input name="reminderHour" type="number" min={0} max={23} defaultValue={user.preferences.reminderHour ?? ""} /><Hint>A 24-hour clock time, from 0 to 23. Leave it empty to skip the daily reminder.</Hint></label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 text-sm">Pause streak without losing points <input name="streakPaused" type="checkbox" defaultChecked={user.preferences.streakPaused} /></label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 text-sm">Reduce motion <input name="reducedMotion" type="checkbox" defaultChecked={user.preferences.reducedMotion} /></label>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">A paused streak keeps the points you already earned. Reduced motion calms animations on this device.</p>
          <Button type="submit" className="sm:col-span-2">Save settings</Button>
        </form>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="grid h-fit gap-3 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="font-serif text-2xl">Invitation</h2>
          <p className="text-sm leading-6 text-muted-foreground">A code, link, or QR opens this same site. Pairing does not share cycle information.</p>
          <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/pairing">Manage pairing, QR code, and invitation links</a>
          {invites.map((invite) => (
            <div key={invite.id} className="rounded-2xl border bg-card p-3 text-sm">
              <p className="font-serif text-2xl tracking-widest">{invite.code}</p>
              <p className="break-all text-sm">{origin}/invite/{invite.token}</p>
              <form action={revokeInviteAction}><input type="hidden" name="invitationId" value={invite.id} /><Button variant="outline" size="sm" type="submit">Revoke</Button></form>
            </div>
          ))}
          <form action={newInviteAction}><Button type="submit" variant="secondary">New invitation</Button></form>
          {membership && <form action={leaveCoupleAction}><Button type="submit" variant="outline">Leave couple</Button></form>}
          <p className="text-xs leading-5 text-muted-foreground">Leaving revokes cycle sharing. Reconnecting needs a yes from both of you.</p>
          <form action={reconnectAction}><Button type="submit" variant="ghost">Request reconnect</Button></form>
          {requests.map((request) => (
            <form key={request.id} action={reconnectReplyAction} className="flex gap-2">
              <input type="hidden" name="requestId" value={request.id} />
              <Button name="decision" value="approved" type="submit">Approve reconnect</Button>
              <Button name="decision" value="declined" variant="outline" type="submit">Decline</Button>
            </form>
          ))}
        </section>
        {partnerProfile && (
          <section className="grid h-fit gap-3 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)]">
            <h2 className="font-serif text-2xl">Block or report</h2>
            <p className="text-sm leading-6 text-muted-foreground">Blocking stops the couple view. A report goes to a reviewer and does not include cycle records.</p>
            <form action={blockAction}><input type="hidden" name="blockedId" value={partnerProfile.id} /><Button variant="outline" type="submit">Block {partnerProfile.displayName}</Button></form>
            <form action={reportAction} className="grid gap-2"><input type="hidden" name="targetType" value="user" /><input type="hidden" name="targetId" value={partnerProfile.id} /><Textarea name="reason" placeholder="What should a reviewer know?" /><Button type="submit" variant="outline">Send report</Button></form>
          </section>
        )}
        <section className="grid h-fit gap-3 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="font-serif text-2xl">Your data</h2>
          <p className="text-sm leading-6 text-muted-foreground">Download a copy, or erase the account. Cycle sharing, export, and deletion also live in cycle privacy.</p>
          <a className="text-sm underline" href="/cycle/settings">Cycle privacy, reminders, export, and deletion</a>
          <a className="text-sm underline" href="/api/account/export">Download a copy of your data</a>
          <form action={deleteAccountAction} className="grid gap-2">
            <Label htmlFor="confirmName">Type your display name to delete the account</Label>
            <Input id="confirmName" name="confirmName" />
            <Hint>This removes the account. Shared couple records that still point at it are not rewritten into someone else&apos;s name.</Hint>
            <Button variant="destructive" type="submit">Delete account</Button>
          </form>
        </section>
      </div>
      <form action={readNotificationsAction}><button className="text-sm underline" type="submit">Mark notifications read</button></form>
    </main>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}
