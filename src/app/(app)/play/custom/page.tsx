import { startQuizAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/content/catalog";

export const metadata = { title: "Custom quiz" };

export default function CustomQuizPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-serif text-4xl">Custom quiz</h1>
      <form action={startQuizAction} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm">Mode
          <select name="mode" className="h-11 rounded-2xl border bg-card px-3">
            <option value="exchange">Both answer and guess</option>
            <option value="guess">Partner guess</option>
            <option value="reveal">Simultaneous reveal</option>
            <option value="solo">Solo practice</option>
            <option value="reverse">Reverse quiz</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">Number of questions
          <select name="size" className="h-11 rounded-2xl border bg-card px-3"><option>5</option><option>10</option><option>20</option></select>
        </label>
        <label className="grid gap-2 text-sm">Difficulty
          <select name="difficulty" className="h-11 rounded-2xl border bg-card px-3"><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="deep">Deep</option></select>
        </label>
        <fieldset className="grid gap-2"><legend className="text-sm">Categories</legend>
          {categories.map((category) => <label key={category.id} className="flex gap-2 text-sm"><input type="checkbox" name="categories" value={category.slug} />{category.name}</label>)}
        </fieldset>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="timer" /> Show a 45-second clock. It does not discard answers.</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="includeSensitive" /> Include optional sensitive questions</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="adult" /> I am 18 or older. Required only if you include Intimacy and Closeness.</label>
        <Button type="submit">Build quiz</Button>
      </form>
    </main>
  );
}
