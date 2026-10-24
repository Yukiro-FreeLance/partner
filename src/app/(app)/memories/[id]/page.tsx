import { notFound } from "next/navigation";
import { deleteMemoryAction } from "@/app/actions";
import { MemoryForm } from "@/components/memory-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { requireMembership } from "@/lib/services/access";

export const metadata = { title: "Memory" };

export default async function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const memory = await repo.find("coupleMemories", { eq: { id } });
  if (!memory) notFound();
  const access = await requireMembership(repo, user.profile.id, memory.coupleId);
  if (!access.ok || (memory.visibility === "private" && memory.authorId !== user.profile.id)) notFound();
  const attachments = await repo.list("memoryAttachments", { eq: { memoryId: memory.id } });
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-serif text-4xl">{memory.title}</h1>
      {memory.body && <p className="mt-3 leading-7">{memory.body}</p>}
      <ul className="mt-4 grid gap-3">{attachments.map((file) => <li key={file.id}><img src={`/api/media/${file.id}`} alt="" className="rounded-2xl" /></li>)}</ul>
      {memory.authorId === user.profile.id && (
        <>
          <MemoryForm memory={memory} />
          <form action={deleteMemoryAction} className="mt-4"><input type="hidden" name="memoryId" value={memory.id} /><Button variant="destructive" type="submit">Delete</Button></form>
        </>
      )}
    </main>
  );
}
