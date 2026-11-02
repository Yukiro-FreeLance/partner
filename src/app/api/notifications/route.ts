import { touchPresence } from "@/lib/auth/presence";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

function notificationMetadata(note: { href: string | null; title: string; metadata?: Record<string, string> | null }) {
  if (note.metadata) return note.metadata;
  if (!note.href) return null;
  try {
    const url = new URL(note.href, "http://couplesync.local");
    const gameSlug = url.pathname.split("/").filter(Boolean).at(-1) ?? null;
    const matchId = url.searchParams.get("match");
    const challengerName = note.title.split(" challenged you to ")[0] || "Your partner";
    return gameSlug ? { gameSlug, ...(matchId ? { matchId } : {}), challengerName } : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ unread: 0 });
  const repo = await getRepository();
  const actorId = user.actor?.id ?? user.profile.id;
  const [notes] = await Promise.all([
    repo.list("notifications", { eq: { userId: user.profile.id } }),
    touchPresence(repo, actorId),
  ]);
  const unread = notes.filter((note) => !note.readAt);
  const challenges = unread
    .filter((note) => note.type === "game.challenge")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
    .map((note) => ({ id: note.id, title: note.title, body: note.body, href: note.href, metadata: notificationMetadata(note), createdAt: note.createdAt }));
  return Response.json({ unread: unread.length, challenges });
}
