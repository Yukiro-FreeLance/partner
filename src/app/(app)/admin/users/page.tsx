import { createMemberAction, setMemberRoleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") return <main className="p-6">The user list is limited to super admins. Sign in with the account in SUPER_ADMIN_EMAILS. Demo profiles stay members.</main>;
  const { created, error } = await searchParams;
  const people = (await (await getRepository()).list("profiles", {})).sort((a, b) => a.displayName.localeCompare(b.displayName));
  return (
    <main className="grid gap-6">
      <h1 className="font-serif text-4xl">User list</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">Names and roles only. Quiz answers, notes, and personality results are not shown. Impersonation opens that person&apos;s home and can be stopped from the banner.</p>
      <form action={createMemberAction} className="grid gap-3 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)] sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="font-serif text-2xl">Create user</h2>
          <p className="mt-1 text-sm text-muted-foreground">New accounts are real sign-ins. Demo profiles cannot be promoted.</p>
        </div>
        <Input name="displayName" required maxLength={40} placeholder="Display name" autoComplete="off" />
        <Input name="email" type="email" required placeholder="Email" autoComplete="off" />
        <Input name="password" type="password" required minLength={8} placeholder="Password" autoComplete="new-password" />
        <select name="role" defaultValue="user" aria-label="Role for the new user" className="h-11 rounded-2xl border bg-white px-3 text-sm">
          <option value="user">Member</option>
          <option value="admin">Admin</option>
        </select>
        <div className="sm:col-span-2">
          <Button type="submit">Create user</Button>
        </div>
        {created === "1" && <p className="text-sm text-emerald-700 sm:col-span-2">Account created. They can sign in with that email and password.</p>}
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </form>
      <ul className="mt-6 grid gap-3">
        {people.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-white px-4 py-3 shadow-[var(--shadow)]">
            <div>
              <p className="font-medium">{person.displayName}</p>
              <p className="text-sm text-muted-foreground">{person.email}</p>
              <p className="text-xs text-muted-foreground">{person.role === "super_admin" ? "Super admin" : person.role === "admin" ? "Admin" : "Member"}{person.isDemo ? " · Fictional demo" : ""}</p>
            </div>
            {person.id !== actor.id && person.role !== "super_admin" && (
              <div className="flex flex-wrap items-center gap-2">
                {!person.isDemo && (
                  <form action={setMemberRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={person.id} />
                    <select name="role" defaultValue={person.role === "admin" ? "admin" : "user"} aria-label={`Role for ${person.displayName}`} className="h-11 rounded-full border bg-white px-3 text-sm">
                      <option value="user">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button type="submit" variant="secondary">Save role</Button>
                  </form>
                )}
                <form method="post" action="/api/admin/impersonate">
                  <input type="hidden" name="userId" value={person.id} />
                  <Button type="submit" variant="outline">Impersonate</Button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
