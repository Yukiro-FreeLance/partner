import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { loadAppSession } from "@/lib/auth/session";
import { tracksOwnCycle } from "@/lib/gender";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await loadAppSession();
  if (!app) redirect("/login");
  const { user, unread } = app;
  return <AppShell name={user.profile.displayName} avatarUrl={user.profile.avatarUrl} demo={user.profile.isDemo} unread={unread} locale={user.preferences.locale} impersonating={Boolean(user.actor)} superAdmin={!user.actor && user.profile.role === "super_admin"} tracksCycle={tracksOwnCycle(user.profile.gender)}>{children}</AppShell>;
}
