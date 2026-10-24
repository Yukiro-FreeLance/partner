import { blockAction, deleteAccountAction, leaveCoupleAction, newInviteAction, readNotificationsAction, reconnectAction, reconnectReplyAction, reportAction, revokeInviteAction, settingsAction } from "@/app/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { activeMembership, otherPartner } from "@/lib/services/access";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const partner = membership ? await otherPartner(repo, membership.coupleId, user.profile.id) : null;
  const partnerProfile = partner ? await repo.find("profiles", { eq: { id: partner.userId } }) : null;
  const invites = membership ? await repo.list("coupleInvitations", { eq: { coupleId: membership.coupleId, status: "pending" } }) : [];
  const requests = await repo.list("reconnectRequests", { eq: { partnerId: user.profile.id, status: "pending" } });
  return (
    <main className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:px-8">
      <section className="rounded-[1.75rem] bg-white p-6 text-center shadow-[var(--shadow)]">
        <h1 className="font-serif text-3xl">Settings</h1>
        <div className="mt-6"><AvatarUpload name={user.profile.displayName} src={user.profile.avatarUrl} /></div>
      </section>
      <div className="grid gap-6">
      <form id="privacy" action={settingsAction} className="grid gap-4 rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)]">
        <label className="grid gap-2"><Label htmlFor="displayName">Display name</Label><Input id="displayName" name="displayName" defaultValue={user.profile.displayName} /></label>
        <label className="grid gap-2"><Label htmlFor="relationshipStatus">Relationship</Label><Input id="relationshipStatus" name="relationshipStatus" defaultValue={user.profile.relationshipStatus ?? ""} /></label>
        <label className="grid gap-2"><Label htmlFor="relationshipStartedOn">Together since</Label><Input id="relationshipStartedOn" name="relationshipStartedOn" type="date" defaultValue={user.profile.relationshipStartedOn ?? ""} /></label>
        <label className="grid gap-2 text-sm">Theme
          <select name="theme" defaultValue={user.preferences.theme} className="h-11 rounded-2xl border bg-card px-3"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>
        </label>
        <label className="grid gap-2 text-sm">Language
          <select name="locale" defaultValue={user.preferences.locale} className="h-11 rounded-2xl border bg-card px-3"><option value="en">English</option><option value="fil">Filipino</option></select>
        </label>
        <label className="flex items-center justify-between text-sm">In-app notifications <input name="inAppNotifications" type="checkbox" defaultChecked={user.preferences.inAppNotifications} /></label>
        <label className="flex items-center justify-between text-sm">Email notifications, never including answer text <input name="emailNotifications" type="checkbox" defaultChecked={user.preferences.emailNotifications} /></label>
        <label className="grid gap-2 text-sm">Reminder hour, optional <Input name="reminderHour" type="number" min={0} max={23} defaultValue={user.preferences.reminderHour ?? ""} /></label>
        <label className="flex items-center justify-between text-sm">Pause streak without losing points <input name="streakPaused" type="checkbox" defaultChecked={user.preferences.streakPaused} /></label>
        <label className="flex items-center justify-between text-sm">Reduce motion <input name="reducedMotion" type="checkbox" defaultChecked={user.preferences.reducedMotion} /></label>
        <Button type="submit">Save settings</Button>
      </form>
      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Invitation</h2>
        <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/pairing">Manage pairing, QR code, and invitation links</a>
        {invites.map((invite) => (
          <div key={invite.id} className="rounded-2xl border bg-card p-3 text-sm">
            <p className="font-serif text-2xl tracking-widest">{invite.code}</p>
            <p className="break-all">/invite/{invite.token}</p>
            <form action={revokeInviteAction}><input type="hidden" name="invitationId" value={invite.id} /><Button variant="outline" size="sm" type="submit">Revoke</Button></form>
          </div>
        ))}
        <form action={newInviteAction}><Button type="submit" variant="secondary">New invitation</Button></form>
        {membership && <form action={leaveCoupleAction}><Button type="submit" variant="outline">Leave couple</Button></form>}
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
        <section className="grid gap-3">
          <h2 className="font-serif text-2xl">Block or report</h2>
          <form action={blockAction}><input type="hidden" name="blockedId" value={partnerProfile.id} /><Button variant="outline" type="submit">Block {partnerProfile.displayName}</Button></form>
          <form action={reportAction} className="grid gap-2"><input type="hidden" name="targetType" value="user" /><input type="hidden" name="targetId" value={partnerProfile.id} /><Textarea name="reason" placeholder="What should a reviewer know?" /><Button type="submit" variant="outline">Send report</Button></form>
        </section>
      )}
      <section className="grid gap-3">
        <h2 className="font-serif text-2xl">Your data</h2>
        <a className="text-sm underline" href="/api/account/export">Download a copy of your data</a>
        <form action={deleteAccountAction} className="grid gap-2">
          <Label htmlFor="confirmName">Type your display name to delete the account</Label>
          <Input id="confirmName" name="confirmName" />
          <Button variant="destructive" type="submit">Delete account</Button>
        </form>
      </section>
      <form action={readNotificationsAction}><button className="text-sm underline" type="submit">Mark notifications read</button></form>
      </div>
    </main>
  );
}
