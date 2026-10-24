import { Fragment } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Flag, Heart, Plane, Sparkles, StickyNote } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { visibleMemories } from "@/lib/services/life";

export const metadata = { title: "Memories" };

const kinds = {
  milestone: { label: "Milestone", icon: Flag },
  trip: { label: "Trip", icon: Plane },
  moment: { label: "Moment", icon: Heart },
  plan: { label: "Plan", icon: Sparkles },
  note: { label: "Note", icon: StickyNote },
} as const;

export default async function MemoriesPage() {
  const user = await requireUser();
  const memories = [...(await visibleMemories(await getRepository(), user.profile.id))].sort((a, b) => {
    const left = a.occurredOn ?? a.createdAt.slice(0, 10);
    const right = b.occurredOn ?? b.createdAt.slice(0, 10);
    return right.localeCompare(left);
  });
  let year = "";
  return (
    <main className="w-full px-4 py-5 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Our story</p>
          <h1 className="font-serif text-3xl lg:text-4xl">Our Memories</h1>
        </div>
        <Link href="/memories/new" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">Add a moment</Link>
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">A private history for the two of you. Private notes stay with the person who wrote them.</p>
      {!memories.length && <p className="mt-8 rounded-[1.75rem] bg-white p-6 text-sm shadow-[var(--shadow)]">Your timeline is empty. A first meeting, a plan, or a regular Tuesday all count.</p>}
      <ol className="relative mt-8 ml-3 max-w-3xl border-l-2 border-[#eadcf5] pl-8">
        {memories.map((memory) => {
          const when = memory.occurredOn ?? memory.createdAt.slice(0, 10);
          const nextYear = when.slice(0, 4);
          const showYear = nextYear !== year;
          year = nextYear;
          const kind = kinds[memory.kind];
          const Icon = kind.icon;
          return (
            <Fragment key={memory.id}>
            {showYear && <li className="relative -mt-2 mb-3 list-none"><p className="font-serif text-sm tracking-wide text-primary">{nextYear}</p></li>}
            <li className="relative pb-8">
              <span className="absolute top-4 -left-[2.85rem] flex size-9 items-center justify-center rounded-full bg-white text-primary shadow-[var(--shadow)] ring-2 ring-[#eadcf5]">
                <Icon className="size-4" aria-hidden />
              </span>
              <Link href={`/memories/${memory.id}`} className="block rounded-[1.5rem] bg-white p-5 shadow-[var(--shadow)]">
                <p className="text-xs font-semibold tracking-wide text-rose uppercase">{format(parseISO(when), "MMMM d, yyyy")} · {kind.label}</p>
                <p className="mt-1 font-serif text-2xl">{memory.title}</p>
                {memory.body && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{memory.body}</p>}
                <p className="mt-3 text-xs text-muted-foreground">{memory.visibility === "private" ? "Private to you" : "Shared with your partner"}</p>
              </Link>
            </li>
            </Fragment>
          );
        })}
      </ol>
    </main>
  );
}
