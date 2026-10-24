import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { isStaffRole, requireUser } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) redirect("/home");
  return <AdminShell name={actor.displayName} superAdmin={actor.role === "super_admin"}>{children}</AdminShell>;
}
