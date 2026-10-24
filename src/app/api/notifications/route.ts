import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ unread: 0 });
  const notes = await (await getRepository()).list("notifications", { eq: { userId: user.profile.id } });
  return Response.json({ unread: notes.filter((note) => !note.readAt).length });
}
