import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { clearConversation } from "@/lib/services/ai";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const cleared = await clearConversation(await getRepository(), user.profile.id, (await params).id);
  return cleared ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Conversation not found." }, { status: 404 });
}
