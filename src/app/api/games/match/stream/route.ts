import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { subscribeMatchUpdates } from "@/lib/games/match-events";
import { gameMatchView, loadGameMatch } from "@/lib/services/games";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function event(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to follow a match.", { status: 401 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const match = await loadGameMatch(await getRepository(), user.profile.id, id);
  if (!match) return new Response("That match is not in your couple space.", { status: 404 });

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

      unsubscribe = subscribeMatchUpdates(id, (next) => {
        push({ type: "match", match: gameMatchView(next, user.profile.id) });
      });

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

      // Send the authoritative state immediately so a reconnecting player never
      // waits for the next action to learn whose turn it is.
      push({ type: "match", match: gameMatchView(match, user.profile.id) });
      push({ type: "ready", revision: match.revision });
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
