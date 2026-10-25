import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { tracksOwnCycle } from "@/lib/gender";
import { getRepository } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notes = await (await getRepository()).list("notifications", { eq: { userId: user.profile.id } });
  const unread = notes.filter((note) => !note.readAt).length;
  return <AppShell name={user.profile.displayName} avatarUrl={user.profile.avatarUrl} demo={user.profile.isDemo} unread={unread} locale={user.preferences.locale} impersonating={Boolean(user.actor)} superAdmin={!user.actor && user.profile.role === "super_admin"} tracksCycle={tracksOwnCycle(user.profile.gender)}>{children}</AppShell>;
}
