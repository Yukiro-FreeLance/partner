import Link from "next/link";
import { CompareChart, TrendChart } from "@/components/charts";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { formatScore, SCORE_DISCLAIMER } from "@/lib/scoring";
import { getConnectionReport } from "@/lib/services/insights";

const links = [
  ["/connection", "Overview"],
  ["/connection/knowledge", "Knowledge"],
  ["/connection/shared", "Shared"],
  ["/connection/differences", "Differences"],
  ["/connection/personality", "Personality"],
  ["/connection/history", "History"],
];

export async function ConnectionReport({ focus }: { focus: "overview" | "knowledge" | "shared" | "differences" | "personality" | "history" }) {
  const user = await requireUser();
  const repo = await getRepository();
  const [report, snapshotRows] = await Promise.all([
    getConnectionReport(repo, user.profile.id),
    repo.list("scoreSnapshots", { eq: { userId: user.profile.id } }),
  ]);
  const snapshots = snapshotRows.filter((item) => item.score !== null);
  const trend = snapshots.slice(-8).map((item, index) => ({ label: `Quiz ${index + 1}`, score: Math.round(item.score ?? 0) }));
  const groups: Record<typeof focus, string[]> = {
    overview: ["common", "different", "surprise", "ask", "learned", "interest"],
    knowledge: ["surprise", "learned"],
    shared: ["common", "interest"],
    differences: ["different", "ask"],
    personality: [],
    history: [],
  };
  const kinds = groups[focus];
  const insights = (report?.insights ?? []).filter((insight) => kinds.includes(insight.kind));
  return (
    <main className="grid w-full gap-4 px-4 py-5 lg:px-8">
      <header>
        <h1 className="text-center font-serif text-3xl lg:text-left lg:text-4xl">Our Connection</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{SCORE_DISCLAIMER}</p>
        {report?.eligibleNotice && <p className="mt-3 rounded-2xl bg-accent p-3 text-sm">{report.eligibleNotice}</p>}
      </header>
      <nav className="flex gap-2 overflow-x-auto text-sm" aria-label="Connection sections">
        {links.map(([href, label]) => <Link key={href} href={href} className="min-h-11 rounded-full bg-white px-4 py-2 shadow-[var(--shadow)]">{label}</Link>)}
      </nav>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-5"><p className="text-sm text-muted-foreground">Couple knowledge</p><p className="font-serif text-4xl">{formatScore(report?.knowledge.score ?? null)}</p><p>{report?.knowledge.label}</p></article>
        <article className="panel p-5"><p className="text-sm text-muted-foreground">Your prediction accuracy</p><p className="font-serif text-4xl">{formatScore(report?.mine.score ?? null)}</p><p>{report?.mine.label}</p></article>
        <article className="panel p-5"><p className="text-sm text-muted-foreground">Preference alignment</p><p className="font-serif text-4xl">{formatScore(report?.preferences.score ?? null)}</p><p>{report?.preferences.label}</p></article>
      </section>
      {(focus === "overview" || focus === "history" || focus === "knowledge") && (
        <section className="panel p-5">
          <h2 className="font-serif text-2xl">How the scores moved</h2>
          <TrendChart data={trend} />
          <CompareChart data={[{ name: "You", value: Math.round(report?.mine.score ?? 0) }, { name: report?.partnerName ?? "Partner", value: Math.round(report?.partnerKnowledge?.score ?? 0) }]} />
          <p className="text-xs text-muted-foreground">Knowledge is prediction accuracy. Preference alignment compares your own answers with each other. They are not the same number.</p>
        </section>
      )}
      {focus === "personality" && <p className="text-sm">Personality comparisons appear only after each person chooses to share. <Link className="underline" href="/personality">Open the reflections</Link></p>}
      <section className="grid gap-3 lg:grid-cols-2">
        {insights.map((insight) => (
          <article key={insight.id} className="panel p-4">
            <h2 className="font-serif text-2xl">{insight.title}</h2>
            <p className="mt-2 text-sm leading-6">{insight.explanation}</p>
            <Link className="mt-2 inline-block text-sm underline" href={`/play/library`}>Related question</Link>
          </article>
        ))}
        {!insights.length && focus !== "history" && focus !== "personality" && <p className="text-sm text-muted-foreground">Not enough shared answers in this section yet.</p>}
      </section>
    </main>
  );
}
