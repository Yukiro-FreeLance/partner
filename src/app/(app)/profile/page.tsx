import Link from "next/link";
import { Bell, Heart, LifeBuoy, Lock, LogOut, Settings, Shield, Users } from "lucide-react";
import { logoutAction, settingsAction } from "@/app/actions";
import { AvatarUpload } from "@/components/avatar-upload";
import { BannerUpload } from "@/components/banner-upload";
import { RelationshipStatusField } from "@/components/relationship-status";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Profile" };

const rows = [
  ["/settings", "Account Settings", Settings],
  ["/notifications", "Notification Preferences", Bell],
  ["/settings#privacy", "Privacy & Security", Shield],
  ["/memories", "Memories", Heart],
  ["/support", "Help & Support", LifeBuoy],
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const achievements = await (await getRepository()).list("userAchievements", { eq: { userId: user.profile.id } });
  const handle = user.profile.email.split("@")[0];
  return (
    <main className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-2 xl:grid-cols-3 lg:px-8">
      <section className="h-fit overflow-hidden rounded-[1.75rem] bg-white text-center shadow-[var(--shadow)]">
        <BannerUpload src={user.profile.bannerUrl} control="top" className="h-48">
          <h1 className="absolute top-4 left-5 z-10 font-serif text-2xl text-white drop-shadow">Profile</h1>
        </BannerUpload>
        <div className="relative z-10 -mt-16 px-6">
          <AvatarUpload name={user.profile.displayName} src={user.profile.avatarUrl} />
        </div>
        <p className="mt-4 font-serif text-3xl">{user.profile.displayName}</p>
        <p className="text-sm text-muted-foreground">@{handle}</p>
        <p className="mt-2 pb-6 text-sm text-rose">{user.preferences.locale === "fil" ? "Filipino" : "English"} · {achievements.length} achievements · {user.preferences.points} points</p>
      </section>
      <form action={settingsAction} className="grid h-fit gap-4 rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Profile settings</h2>
            <Link href="/settings" className="flex size-11 items-center justify-center rounded-full bg-secondary" aria-label="Account settings"><Settings className="size-5" /></Link>
          </div>
          <label className="grid gap-2"><Label htmlFor="displayName">Display name</Label><Input id="displayName" name="displayName" defaultValue={user.profile.displayName} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <RelationshipStatusField label="Relationship" defaultValue={user.profile.relationshipStatus} />
            <label className="grid gap-2"><Label htmlFor="relationshipStartedOn">Together since</Label><Input id="relationshipStartedOn" name="relationshipStartedOn" type="date" defaultValue={user.profile.relationshipStartedOn ?? ""} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">Theme
              <select name="theme" defaultValue={user.preferences.theme} className="h-11 rounded-2xl border bg-card px-3"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select>
            </label>
            <label className="grid gap-2 text-sm">Language
              <select name="locale" defaultValue={user.preferences.locale} className="h-11 rounded-2xl border bg-card px-3"><option value="en">English</option><option value="fil">Filipino</option></select>
            </label>
          </div>
          <input type="hidden" name="inAppNotifications" value={user.preferences.inAppNotifications ? "on" : "off"} />
          <input type="hidden" name="emailNotifications" value={user.preferences.emailNotifications ? "on" : "off"} />
          <input type="hidden" name="streakPaused" value={user.preferences.streakPaused ? "on" : "off"} />
          <input type="hidden" name="reducedMotion" value={user.preferences.reducedMotion ? "on" : "off"} />
          <input type="hidden" name="reminderHour" value={user.preferences.reminderHour ?? ""} />
          <Button type="submit">Save profile</Button>
        </form>
        <div className="grid h-fit gap-4">
        <nav className="overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
          {rows.map(([href, label, Icon]) => (
            <Link key={label} href={href} className="flex min-h-14 items-center gap-3 border-b border-[#f6eef8] px-4 text-sm last:border-b-0">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#f7e8ff] text-primary"><Icon className="size-4" aria-hidden /></span>
              <span className="flex-1">{label}</span>
              <span aria-hidden className="text-muted-foreground">›</span>
            </Link>
          ))}
          {(user.profile.role === "admin" || user.profile.role === "super_admin") && (
            <Link href="/admin" className="flex min-h-14 items-center gap-3 border-b border-[#f6eef8] px-4 text-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#f7e8ff] text-primary"><Lock className="size-4" aria-hidden /></span>
              <span className="flex-1">Question administration</span>
              <span aria-hidden className="text-muted-foreground">›</span>
            </Link>
          )}
          {user.profile.role === "super_admin" && (
            <Link href="/admin/users" className="flex min-h-14 items-center gap-3 px-4 text-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#f7e8ff] text-primary"><Users className="size-4" aria-hidden /></span>
              <span className="flex-1">User list</span>
              <span aria-hidden className="text-muted-foreground">›</span>
            </Link>
          )}
        </nav>
        <form action={logoutAction}>
          <button className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.75rem] bg-[#fff1f2] text-sm font-medium text-rose">
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </form>
        </div>
    </main>
  );
}
