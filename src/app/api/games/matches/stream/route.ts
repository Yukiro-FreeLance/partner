import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { subscribeCoupleMatches } from "@/lib/games/match-events";
import { activeMembership } from "@/lib/services/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function event(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to follow matches.", { status: 401 });

  const membership = await activeMembership(await getRepository(), user.profile.id);

  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe = () => {};
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // The browser may have already closed the stream.
        }
      };

      const push = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(event(payload));
        } catch {
          close();
        }
      };

      if (membership) {
        unsubscribe = subscribeCoupleMatches(membership.coupleId, () => {
          push({ type: "change", at: Date.now() });
        });
      }

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          close();
        }
      }, 15_000);

      dispose = close;
      request.signal.addEventListener("abort", close);
      push({ type: "ready" });
    },
    cancel() {
      dispose();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
