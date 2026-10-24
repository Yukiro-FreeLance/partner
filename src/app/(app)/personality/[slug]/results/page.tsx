import { sharePersonalityAction } from "@/app/actions";
import { CompareChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { dimensionLabel, personalityComparison } from "@/lib/services/personality";

export const metadata = { title: "Reflection result" };

export default async function PersonalityResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const comparison = await personalityComparison(await getRepository(), user.profile.id, slug);
  if (!comparison.ok || !comparison.data.mine) return <main className="p-6">Finish the reflection to see a result.</main>;
  const mine = comparison.data.mine;
  const partner = comparison.data.partner;
  const data = Object.entries(mine.scores).map(([name, value]) => ({ name, value }));
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6">
      <h1 className="font-serif text-4xl">{comparison.data.test.name}</h1>
      <p className="text-sm text-muted-foreground">{comparison.data.test.disclaimer}</p>
      <p className="leading-7">{mine.summary}</p>
      <CompareChart data={data} />
      <ul className="grid gap-2 text-sm">{Object.keys(mine.scores).map((key) => <li key={key}>{dimensionLabel(key)}</li>)}</ul>
      <ul className="grid gap-2 text-sm">{mine.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
      <form action={sharePersonalityAction} className="rounded-3xl border bg-card p-4">
        <input type="hidden" name="resultId" value={mine.id} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shared" defaultChecked={mine.shared} /> Share this result with your partner</label>
        <Button className="mt-3" type="submit">Save sharing choice</Button>
      </form>
      {partner && <section className="rounded-3xl bg-accent p-4"><h2 className="font-serif text-2xl">{comparison.data.partnerName} also shared this</h2><p className="mt-2 text-sm">{partner.summary}</p></section>}
      {!mine.shared && <p className="text-sm text-muted-foreground">Your partner cannot see this until you share it. Their private result stays hidden too.</p>}
    </main>
  );
}
