import { cardAction, customCardAction, customQuestionAction, reflectionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { activeMembership } from "@/lib/services/access";

export const metadata = { title: "Question library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ depth?: string; q?: string }> }) {
  const { depth = "all", q = "" } = await searchParams;
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const [cardRows, activity, saved] = await Promise.all([
    repo.list("conversationCards", { eq: { isActive: true } }),
    repo.list("cardActivity", { eq: { userId: user.profile.id } }),
    repo.list("savedQuestions", { eq: { userId: user.profile.id } }),
  ]);
  const cards = cardRows.filter((card) => {
    if (card.coupleId && card.coupleId !== membership?.coupleId) return false;
    if (depth !== "all" && card.depth !== depth) return false;
    if (q && !card.prompt.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const recent = new Set(user.preferences.recentCardIds);
  const visible = cards.filter((card) => !activity.find((item) => item.cardId === card.id && item.hidden) && !recent.has(card.id));
  const featured = visible[Math.floor(Math.random() * Math.max(visible.length, 1))] ?? cards[0];
  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6">
      <h1 className="font-serif text-4xl">Question library</h1>
      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search" aria-label="Search questions" />
        <select name="depth" defaultValue={depth} className="h-11 rounded-2xl border bg-card px-3" aria-label="Depth">
          {["all", "light", "everyday", "romance", "memories", "dreams", "emotional", "communication", "growth", "future", "sensitive"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      {featured && (
        <article className="rounded-3xl bg-secondary p-5">
          <p className="text-xs uppercase">{featured.depth} · {featured.sensitive ? "Optional sensitive" : featured.mood}</p>
          <h2 className="mt-2 font-serif text-3xl">{featured.prompt}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={cardAction}><input type="hidden" name="cardId" value={featured.id} /><input type="hidden" name="answered" value="true" /><Button size="sm" variant="outline">Mark discussed</Button></form>
            <form action={cardAction}><input type="hidden" name="cardId" value={featured.id} /><input type="hidden" name="favorite" value={saved.some((item) => item.cardId === featured.id) ? "false" : "true"} /><Button size="sm" variant="outline">Favorite</Button></form>
            <form action={cardAction}><input type="hidden" name="cardId" value={featured.id} /><input type="hidden" name="hidden" value="true" /><Button size="sm" variant="ghost">Not ready / hide</Button></form>
          </div>
          <form action={cardAction} className="mt-3 grid gap-2"><input type="hidden" name="cardId" value={featured.id} /><Textarea name="note" placeholder="Private note" defaultValue={activity.find((item) => item.cardId === featured.id)?.note ?? ""} /><Button type="submit" variant="secondary">Save note</Button></form>
          <form action={reflectionAction} className="mt-3 grid gap-2"><input type="hidden" name="cardId" value={featured.id} /><Textarea name="body" placeholder="Shared reflection" /><Button type="submit">Share with your partner</Button></form>
        </article>
      )}
      <ul className="grid gap-2">
        {visible.slice(0, 12).map((card) => <li key={card.id} className="rounded-2xl border bg-card px-4 py-3 text-sm">{card.prompt}</li>)}
      </ul>
      <section className="grid gap-4 md:grid-cols-2">
        <form action={customQuestionAction} className="grid gap-2 rounded-3xl border bg-card p-4">
          <h2 className="font-serif text-2xl">Add a quiz question</h2>
          <Textarea name="prompt" required placeholder="What do you want to ask?" />
          <select name="answerType" className="h-11 rounded-2xl border px-3"><option value="short_text">Short text</option><option value="single">Single choice</option><option value="multi">Multiple choice</option></select>
          <Textarea name="options" placeholder="One choice per line, if needed" />
          <label className="text-sm"><input type="checkbox" name="sensitive" /> Optional and sensitive</label>
          <Button type="submit">Save question</Button>
        </form>
        <form action={customCardAction} className="grid gap-2 rounded-3xl border bg-card p-4">
          <h2 className="font-serif text-2xl">Add a conversation card</h2>
          <Textarea name="prompt" required placeholder="A question you would actually ask" />
          <label className="text-sm"><input type="checkbox" name="sensitive" /> Sensitive, easy to skip</label>
          <Button type="submit">Save card</Button>
        </form>
      </section>
    </main>
  );
}
