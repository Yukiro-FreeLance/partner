import { touchPresence } from "@/lib/auth/presence";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ unread: 0 });
  const repo = await getRepository();
  const actorId = user.actor?.id ?? user.profile.id;
  const [notes] = await Promise.all([
    repo.list("notifications", { eq: { userId: user.profile.id } }),
    touchPresence(repo, actorId),
  ]);
  return Response.json({ unread: notes.filter((note) => !note.readAt).length });
}
