import { PersonalityPlayer } from "@/components/personality-player";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { startPersonality } from "@/lib/services/personality";

export const metadata = { title: "Reflection" };

export default async function PersonalityTestPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ session?: string }> }) {
  const { slug } = await params;
  const { session } = await searchParams;
  const user = await requireUser();
  const repo = await getRepository();
  const started = await startPersonality(repo, user.profile.id, slug);
  if (!started.ok) return <main className="p-6">{started.error}</main>;
  const active = session ? started.data.session.id === session || started.data.session.status === "in_progress" : true;
  if (!active) return <main className="p-6">This reflection is closed.</main>;
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <p className="text-sm text-muted-foreground">{started.data.test.disclaimer}</p>
      <h1 className="mt-2 font-serif text-4xl">{started.data.test.name}</h1>
      <PersonalityPlayer slug={slug} sessionId={started.data.session.id} questions={started.data.questions.map((question) => ({ id: question.id, prompt: question.prompt, helpText: question.helpText, answerType: question.answerType, options: question.options }))} />
    </main>
  );
}
