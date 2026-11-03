import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { createConversation, listConversations } from "@/lib/services/ai";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ conversations: await listConversations(await getRepository(), user.profile.id) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({})) as { title?: string };
  const conversation = await createConversation(await getRepository(), user.profile.id, body.title);
  return NextResponse.json({ conversation }, { status: 201 });
}
