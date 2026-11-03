import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { deleteConversation, getConversation } from "@/lib/services/ai";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const data = await getConversation(await getRepository(), user.profile.id, (await params).id);
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const deleted = await deleteConversation(await getRepository(), user.profile.id, (await params).id);
  return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Conversation not found." }, { status: 404 });
}
