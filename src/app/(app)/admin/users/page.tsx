import Link from "next/link";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { accountStatusOf } from "@/lib/auth/account-status";
import { getRepository } from "@/lib/data";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Users" };

const views = [
  ["all", "All"],
  ["active", "Active"],
  ["archived", "Archived"],
  ["deleted", "Deleted"],
] as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string; createError?: string; saved?: string; notice?: string; view?: string }> }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") return <main className="p-6">The user list is limited to super admins. Sign in with the account in SUPER_ADMIN_EMAILS. Demo profiles stay members.</main>;
  const query = await searchParams;
  const view = views.some(([key]) => key === query.view) ? query.view ?? "all" : "all";
  const people = (await (await getRepository()).list("profiles", {})).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const visible = people.filter((person) => view === "all" || accountStatusOf(person) === view);
  return (
    <main className="grid w-full items-start gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">User list</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Names and roles only. Quiz answers, notes, and personality results are not shown. Impersonation opens that person&apos;s home and can be stopped from the banner.</p>
        </div>
        <CreateUserDialog defaultOpen={Boolean(query.createError)} error={query.createError} />
      </div>
      {query.saved && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Role saved for {query.saved}.</p>}
      {query.notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{query.notice}</p>}
      {query.created === "1" && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Account created. They can sign in with that email and password.</p>}
      {query.error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{query.error}</p>}
      <div className="flex flex-wrap gap-2">
        {views.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/admin/users" : `/admin/users?view=${key}`} className={view === key ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"}>{label}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#f3e8f5] text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((person) => {
              const roleLabel = person.role === "super_admin" ? "Super admin" : person.role === "admin" ? "Admin" : "Member";
              const status = accountStatusOf(person);
              const manageable = person.id !== actor.id && person.role !== "super_admin";
              return (
                <tr key={person.id} className="border-b border-[#f8f1fa] last:border-b-0">
                  <td className="px-4 py-3 font-medium">{person.displayName}</td>
                  <td className="px-4 py-3 break-all text-muted-foreground">{person.email}</td>
                  <td className="px-4 py-3">{roleLabel}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span>{person.isDemo ? "Fictional demo" : "Real account"}</span>
                    {status !== "active" && <span className="ml-2 rounded-full bg-[#f5f3ff] px-2 py-1 text-xs font-medium text-[#6d28d9] capitalize">{status}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {manageable ? <UserActions userId={person.id} name={person.displayName} role={person.role === "admin" ? "admin" : "user"} isDemo={person.isDemo} status={status} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No accounts in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
