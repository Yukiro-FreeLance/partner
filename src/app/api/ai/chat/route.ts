import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { answer, getConversation } from "@/lib/services/ai";

const input = z.object({ conversationId: z.string().min(1), message: z.string().trim().min(1).max(4000) });

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "AI service unavailable.";
  if (/free usage limit reached/i.test(message)) return "OpenCode is connected, but its free usage limit has been reached. Configure a provider API key or an OpenCode Go subscription.";
  if (/authentication required|unauthorized/i.test(message)) return "OpenCode authentication failed. Check the server username and password in the server environment.";
  return message;
}

export async function POST(request: Request) {
  const user = await requireUser();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a message between 1 and 4000 characters." }, { status: 400 });
  const repo = await getRepository();
  const data = await getConversation(repo, user.profile.id, parsed.data.conversationId);
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          await answer(repo, user.profile.id, data.conversation, parsed.data.message, (delta) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: publicError(error) })}\n\n`));
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 503 });
  }
}
