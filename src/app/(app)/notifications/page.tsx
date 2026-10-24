import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { readNotificationsAction } from "@/app/actions";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notes = await (await getRepository()).list("notifications", { eq: { userId: user.profile.id } }, { orderBy: "createdAt", descending: true, limit: 40 });
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-serif text-4xl">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">These stay inside the app and do not include private answers.</p>
      <ul className="mt-6 grid gap-3">
        {notes.map((note) => <li key={note.id} className="rounded-3xl border bg-card p-4"><p className="font-medium">{note.title}</p><p className="text-sm">{note.body}</p><p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(parseISO(note.createdAt), { addSuffix: true })}</p>{note.href && <Link className="text-sm underline" href={note.href}>Open</Link>}</li>)}
      </ul>
      {!notes.length && <p className="mt-4 text-sm">No notifications yet.</p>}
      <form action={readNotificationsAction} className="mt-4"><button className="text-sm underline">Mark all read</button></form>
    </main>
  );
}
