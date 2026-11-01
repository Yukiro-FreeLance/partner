import Link from "next/link";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { accountStatusOf } from "@/lib/auth/account-status";
import { formatWhen, isCurrentlyActive, lastLoginOf } from "@/lib/auth/presence";
import { isSuperAdminEmail } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Users" };

const views = [
  ["all", "All"],
  ["online", "Online"],
  ["active", "Active"],
  ["archived", "Archived"],
  ["deleted", "Deleted"],
] as const;

function todayKey(value: string) {
  return value.slice(0, 10);
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string; createError?: string; saved?: string; notice?: string; view?: string }> }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") return <main className="p-6">The user list is limited to super admins. Sign in with the account in SUPER_ADMIN_EMAILS. Demo profiles stay members.</main>;
  const query = await searchParams;
  const view = views.some(([key]) => key === query.view) ? query.view ?? "all" : "all";
  const repo = await getRepository();
  const [people, members, loginEvents] = await Promise.all([
    repo.list("profiles", {}),
    repo.list("coupleMembers", { eq: { status: "active" } }),
    repo.list("auditEvents", { eq: { action: "account.login" } }),
  ]);
  const names = new Map(people.map((person) => [person.id, person.displayName]));
  const coupleOf = new Map(members.map((member) => [member.userId, member.coupleId]));
  const partnerOf = new Map<string, string>();
  for (const member of members) {
    const other = members.find((item) => item.coupleId === member.coupleId && item.userId !== member.userId);
    if (other) partnerOf.set(member.userId, names.get(other.userId) ?? "Partner");
  }
  const auditLogin = new Map<string, string>();
  for (const event of loginEvents) {
    if (!event.userId) continue;
    const current = auditLogin.get(event.userId);
    if (!current || event.createdAt > current) auditLogin.set(event.userId, event.createdAt);
  }
  const now = Date.now();
  const today = todayKey(new Date(now).toISOString());
  const directory = people
    .map((person) => {
      const lastLogin = lastLoginOf(person, auditLogin.get(person.id) ?? null);
      const lastSeen = person.lastSeenAt ?? lastLogin;
      return {
        person,
        status: accountStatusOf(person),
        lastLogin,
        lastSeen,
        online: isCurrentlyActive(lastSeen, now) && accountStatusOf(person) === "active",
        partner: partnerOf.get(person.id) ?? null,
        paired: coupleOf.has(person.id),
      };
    })
    .sort((left, right) => {
      if (left.online !== right.online) return left.online ? -1 : 1;
      return left.person.displayName.localeCompare(right.person.displayName);
    });
  const visible = directory.filter((row) => {
    if (view === "all") return true;
    if (view === "online") return row.online;
    return row.status === view;
  });
  const onlineCount = directory.filter((row) => row.online).length;
  const signedInToday = directory.filter((row) => row.lastLogin && todayKey(row.lastLogin) === today).length;
  const unpaired = directory.filter((row) => row.status === "active" && !row.paired).length;
  return (
    <main className="grid w-full items-start gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">User list</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Last login, who is in the app now, pairing, and roles. Quiz answers, notes, and personality results are not shown. Impersonation opens that person&apos;s home and can be stopped from the banner.</p>
        </div>
        <CreateUserDialog defaultOpen={Boolean(query.createError)} error={query.createError} />
      </div>
      {query.saved && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Role saved for {query.saved}.</p>}
      {query.notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{query.notice}</p>}
      {query.created === "1" && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Account created. They can sign in with that email and password.</p>}
      {query.error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{query.error}</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow)]"><dt className="text-muted-foreground">Accounts</dt><dd className="font-serif text-3xl">{directory.length}</dd></div>
        <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow)]"><dt className="text-muted-foreground">Currently active</dt><dd className="font-serif text-3xl">{onlineCount}</dd></div>
        <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow)]"><dt className="text-muted-foreground">Signed in today</dt><dd className="font-serif text-3xl">{signedInToday}</dd></div>
        <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow)]"><dt className="text-muted-foreground">Unpaired</dt><dd className="font-serif text-3xl">{unpaired}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {views.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/admin/users" : `/admin/users?view=${key}`} className={view === key ? "inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground" : "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm"}>{label}{key === "online" ? ` ${onlineCount}` : ""}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[1.75rem] bg-white shadow-[var(--shadow)]">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#f3e8f5] text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
              <th className="px-4 py-3 font-medium">Pairing</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const { person, status } = row;
              const roleLabel = person.role === "super_admin" ? "Super admin" : person.role === "admin" ? "Admin" : "Member";
              const manageable = person.id !== actor.id && !isSuperAdminEmail(person.email);
              return (
                <tr key={person.id} className="border-b border-[#f8f1fa] last:border-b-0">
                  <td className="px-4 py-3 font-medium">{person.displayName}</td>
                  <td className="px-4 py-3 break-all text-muted-foreground">{person.email}</td>
                  <td className="px-4 py-3">{roleLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${row.online ? "bg-emerald-50 text-emerald-800" : "bg-[#f5f3ff] text-[#6d28d9]"}`}>{row.online ? "Online" : "Offline"}</span>
                      <span className="text-muted-foreground">{person.isDemo ? "Demo" : person.emailVerified ? "Verified" : "Unverified"}</span>
                      {status !== "active" && <span className="rounded-full bg-[#f5f3ff] px-2 py-1 text-xs font-medium text-[#6d28d9] capitalize">{status}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatWhen(row.lastLogin, now)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatWhen(row.lastSeen, now)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.partner ? `With ${row.partner}` : "Unpaired"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatWhen(person.createdAt, now)}</td>
                  <td className="px-4 py-3 text-right">
                    {manageable ? <UserActions userId={person.id} name={person.displayName} role={person.role} isDemo={person.isDemo} status={status} /> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No accounts in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
