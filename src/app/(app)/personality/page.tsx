import Link from "next/link";
import { startPersonalityAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Personality" };

export default async function PersonalityPage() {
  const user = await requireUser();
  const tests = await (await getRepository()).list("personalityTests", { eq: { isActive: true } });
  const results = await (await getRepository()).list("personalityResults", { eq: { userId: user.profile.id } });
  return (
    <main className="grid w-full gap-4 px-4 py-5 lg:px-8">
      <h1 className="text-center font-serif text-3xl lg:text-left lg:text-4xl">Personality Lab</h1>
      <p className="text-sm leading-6 text-muted-foreground">Paths you walk together, each one a little different. These are descriptive preferences, not diagnoses. Nothing is shared until you turn sharing on.</p>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {tests.sort((a, b) => a.sortOrder - b.sortOrder).map((test) => {
          const result = results.find((item) => item.testId === test.id);
          return (
            <article key={test.id} className="panel p-4">
              <h2 className="font-serif text-2xl">{test.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{test.description}</p>
              <p className="mt-2 text-xs">{test.disclaimer}</p>
              <form action={startPersonalityAction.bind(null, test.slug)} className="mt-4"><Button type="submit">{result ? "Retake" : "Begin"}</Button></form>
              {result && <Link className="mt-3 inline-block text-sm underline" href={`/personality/${test.slug}/results`}>View your result {result.shared ? "· shared" : "· private"}</Link>}
            </article>
          );
        })}
      </div>
    </main>
  );
}
