import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { formatScore } from "@/lib/scoring";
import { listQuizHistory } from "@/lib/services/quiz";

export const metadata = { title: "Quiz history" };

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function QuizHistoryPage() {
  const user = await requireUser();
  const history = await listQuizHistory(await getRepository(), user.profile.id);
  return (
    <main className="grid w-full gap-4 px-4 py-5 lg:px-8">
      <header>
        <p className="text-sm text-muted-foreground">Play</p>
        <h1 className="font-serif text-4xl">Quiz history</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every quiz you started, with the score saved after the guesses could be compared.</p>
      </header>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/play">Back to Play</Link>
      </div>
      <ol className="grid gap-3">
        {history.map((item) => {
          const done = item.session.status === "completed";
          const href = done ? `/play/results/${item.round.id}` : `/play/quiz/${item.session.id}`;
          const score = item.snapshot?.score;
          return (
            <li key={item.session.id}>
              <Link href={href} className="grid gap-3 rounded-[1.75rem] border bg-card px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <span>
                  <span className="block font-serif text-xl leading-tight">{item.round.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{when(item.session.completedAt ?? item.session.startedAt)} · {item.round.mode} · {item.round.size} questions</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-emerald-100 text-emerald-900" : "bg-[#f3e8ff] text-primary"}`}>{done ? "Finished" : "In progress"}</span>
                  {score != null && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">{formatScore(score)}</span>}
                  {item.snapshot && item.snapshot.eligible > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-950">{item.snapshot.points} pts</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {!history.length && <p className="text-sm text-muted-foreground">No quizzes yet. Start one from Play and it will show up here.</p>}
    </main>
  );
}
