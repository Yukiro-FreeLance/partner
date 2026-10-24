import { adminQuestionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { isStaffRole, requireUser } from "@/lib/auth/session";
import { categories } from "@/lib/content/catalog";
import { getRepository } from "@/lib/data";
import { adminStats } from "@/lib/services/life";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) return <main className="p-6">Admin access is granted with the ADMIN_EMAILS environment variable. There is no shared administrator password.</main>;
  const repo = await getRepository();
  const stats = await adminStats(repo);
  const questions = await repo.list("questions", {});
  const messages = await repo.list("supportMessages", {}, { orderBy: "createdAt", descending: true, limit: 10 });
  return (
    <main className="grid gap-6">
      <h1 className="font-serif text-4xl">Question library admin</h1>
      <p className="text-sm text-muted-foreground">Counts only. Private answers, notes, and personality results are not shown here.</p>
      <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        <div className="rounded-2xl bg-card p-3"><dt>People</dt><dd className="font-serif text-3xl">{stats.people}</dd></div>
        <div className="rounded-2xl bg-card p-3"><dt>Couples</dt><dd className="font-serif text-3xl">{stats.couples}</dd></div>
        <div className="rounded-2xl bg-card p-3"><dt>Finished quizzes</dt><dd className="font-serif text-3xl">{stats.completedSessions}</dd></div>
        <div className="rounded-2xl bg-card p-3"><dt>Questions</dt><dd className="font-serif text-3xl">{stats.questions}</dd></div>
        <div className="rounded-2xl bg-card p-3"><dt>Open reports</dt><dd className="font-serif text-3xl">{stats.openReports}</dd></div>
      </dl>
      <form id="questions" action={adminQuestionAction} className="grid gap-3 rounded-3xl border bg-card p-4">
        <h2 className="font-serif text-2xl">New or edited question</h2>
        <Input name="id" placeholder="Existing id, optional" />
        <Textarea name="selfPrompt" required placeholder="Self prompt" />
        <Textarea name="guessPrompt" required placeholder="Guess prompt" />
        <select name="categoryId" className="h-11 rounded-2xl border px-3">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select name="answerType" className="h-11 rounded-2xl border px-3"><option value="single">single</option><option value="multi">multi</option><option value="short_text">short_text</option><option value="scale">scale</option></select>
        <select name="difficulty" className="h-11 rounded-2xl border px-3"><option value="easy">easy</option><option value="medium">medium</option><option value="deep">deep</option></select>
        <Textarea name="options" placeholder="Choices, one per line" />
        <label className="text-sm"><input type="checkbox" name="sensitive" /> Sensitive</label>
        <label className="text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
        <Button type="submit">Save question</Button>
      </form>
      <ul className="grid max-h-[32rem] gap-2 overflow-y-auto text-sm">{questions.map((question) => <li key={question.id} className="rounded-2xl border bg-card px-3 py-2">{question.isActive ? "Active" : "Hidden"} · {question.selfPrompt}</li>)}</ul>
      <section id="support">
        <h2 className="font-serif text-2xl">Support messages</h2>
        <ul className="mt-3 grid gap-2 text-sm">{messages.map((message) => <li key={message.id} className="rounded-2xl bg-muted p-3"><strong>{message.name}</strong> · {message.email}<p>{message.message}</p></li>)}</ul>
      </section>
    </main>
  );
}
