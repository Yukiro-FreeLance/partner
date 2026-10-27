import Link from "next/link";
import { startQuizAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { categories } from "@/lib/content/catalog";
import { getRepository } from "@/lib/data";
import { listRoundCards } from "@/lib/services/quiz";

export const metadata = { title: "Play" };

const modes = [
  ["exchange", "Standard quiz", "10", "Ten questions. Your answer, then your guess. The score is prediction accuracy.", ""],
  ["exchange", "Quick quiz", "5", "Five questions.", ""],
  ["exchange", "Deep dive", "20", "Twenty questions for a longer conversation.", ""],
  ["guess", "Partner guess", "10", "Predict answers your partner has already given.", ""],
  ["reveal", "Simultaneous reveal", "10", "You each answer privately. Results open after both finish.", ""],
  ["solo", "Solo practice", "5", "Practice without sharing unless you choose.", ""],
  ["reverse", "Reverse quiz", "5", "Guess how they think you would answer.", ""],
  ["exchange", "Memory challenge", "6", "Shared memories. A mismatch is a story to revisit, not a failure.", "memories"],
  ["exchange", "Situational quiz", "8", "Everyday what-ifs. Preferences are compared, not graded as right or wrong.", "scenarios"],
  ["exchange", "Random challenge", "8", "A mix of categories, excluding private closeness questions.", ""],
  ["exchange", "Personality questions", "8", "Habits and tendencies. This is not a diagnosis.", "personality"],
];

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser();
  const cards = await listRoundCards(await getRepository(), user.profile.id);
  const waiting = cards.filter((item) => item.partnerDone && item.mine?.status !== "completed");
  const finished = cards.filter((item) => item.mine?.status === "completed");
  return (
    <main className="grid w-full gap-4 px-4 py-5 lg:px-8">
      <header>
        <h1 className="font-serif text-4xl">Play</h1>
        <p className="mt-1 text-xs leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-5">Choose a game to play together and strengthen your connection. Guesses and personal answers are saved separately.</p>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      </header>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/play/daily">Daily question</Link>
        <Link className="underline" href="/play/library">Question library</Link>
        <Link className="underline" href="/play/custom">Custom quiz</Link>
      </div>
      <section className="grid gap-3 lg:grid-cols-2">
        {modes.map(([mode, title, size, description, category]) => (
          <form id={title === "Quick quiz" ? "quick-quiz" : title === "Deep dive" ? "deep-dive" : undefined} key={title} action={startQuizAction} className="panel flex items-center gap-2 p-3 motion-safe:transition motion-safe:hover:-translate-y-0.5 sm:gap-3 sm:p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-serif text-sm text-rose sm:size-12 sm:rounded-2xl sm:text-lg">{size}</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-base leading-tight sm:text-xl">{title}</h2>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">{description}</p>
            </div>
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="size" value={size} />
            <input type="hidden" name="title" value={title} />
            {category && <input type="hidden" name="categories" value={category} />}
            <Button type="submit" className="shrink-0">Start</Button>
          </form>
        ))}
      </section>
      <section className="panel p-5">
        <h2 className="font-serif text-2xl">Intimacy and closeness</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Optional questions for adults about emotional closeness, affection, comfort, and boundaries. Nothing here is explicit. Your answers are shared with your partner after you both finish. You can skip any question.</p>
        <form action={startQuizAction} className="mt-4 grid gap-3">
          <input type="hidden" name="mode" value="exchange" />
          <input type="hidden" name="size" value="8" />
          <input type="hidden" name="title" value="Intimacy and closeness" />
          <input type="hidden" name="categories" value="intimacy" />
          <input type="hidden" name="includeSensitive" value="on" />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="adult" required /> I am 18 or older and I want these optional questions.</label>
          <Button type="submit">Start closeness quiz</Button>
        </form>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Partner finished</h2>
        <div className="mt-3 grid gap-2">
          {waiting.map((item) => item.mine?.status === "in_progress" ? (
            <Link key={item.round.id} className="rounded-2xl border bg-card px-4 py-3" href={`/play/quiz/${item.mine.id}`}>{item.round.title} · Continue to review</Link>
          ) : (
            <form key={item.round.id} action={startQuizAction} className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
              <p className="text-sm">{item.round.title} · Your partner already finished</p>
              <input type="hidden" name="mode" value={item.round.mode} />
              <input type="hidden" name="title" value={item.round.title} />
              <input type="hidden" name="size" value={item.round.size} />
              {item.round.categories.map((category) => <input key={category} type="hidden" name="categories" value={category} />)}
              {item.round.includeSensitive && <input type="hidden" name="includeSensitive" value="on" />}
              {item.round.categories.includes("intimacy") && <input type="hidden" name="adult" value="on" />}
              <Button type="submit">Play to review</Button>
            </form>
          ))}
          {!waiting.length && <p className="text-sm text-muted-foreground">When your partner finishes a quiz first, it shows up here.</p>}
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">In progress</h2>
        <div className="mt-3 grid gap-2">
          {cards.filter((item) => item.mine?.status === "in_progress").map((item) => <Link key={item.mine!.id} className="rounded-2xl border bg-card px-4 py-3" href={`/play/quiz/${item.mine!.id}`}>{item.round.title}{item.partnerDone ? " · Partner finished" : ""}</Link>)}
          {cards.every((item) => item.mine?.status !== "in_progress") && <p className="text-sm text-muted-foreground">Nothing waiting. Start whenever you like.</p>}
        </div>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Review</h2>
        <div className="mt-3 grid gap-2">
          {finished.map((item) => <Link key={item.round.id} className="rounded-2xl border bg-card px-4 py-3" href={`/play/results/${item.round.id}`}>{item.round.title}{item.partnerDone ? " · Both finished" : " · Waiting on your partner"}</Link>)}
          {!finished.length && <p className="text-sm text-muted-foreground">Finished quizzes open here so you can review the answers.</p>}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">Categories available: {categories.map((category) => category.name).join(", ")}.</p>
    </main>
  );
}
