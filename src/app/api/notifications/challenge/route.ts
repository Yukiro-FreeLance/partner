import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { notifyUser } from "@/lib/services/access";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { notificationId?: string; response?: "accept" | "reject" };
  if (!body.notificationId) return Response.json({ error: "Notification is required." }, { status: 400 });
  const repo = await getRepository();
  const note = await repo.find("notifications", { eq: { id: body.notificationId, userId: user.profile.id } });
  if (!note) return Response.json({ error: "Notification not found." }, { status: 404 });
  await repo.update("notifications", note.id, { readAt: new Date().toISOString() });
  const challengerId = note.metadata?.challengerId;
  if (challengerId && body.response) {
    void notifyUser(repo, {
      userId: challengerId,
      coupleId: note.coupleId,
      type: "game.challenge.response",
      title: body.response === "accept" ? "Challenge accepted" : "Challenge declined",
      body: `${user.profile.displayName} ${body.response === "accept" ? "accepted" : "declined"} your game challenge.`,
      href: note.href,
    }).catch(() => undefined);
  }
  return Response.json({ ok: true });
}
