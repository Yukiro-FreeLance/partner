import "server-only";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

const privateHeaders = { "Cache-Control": "private, no-store" };

export function cycleJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

export async function requireCyclePage() {
  const user = await requireUser();
  if (user.actor) return { blocked: true as const, user };
  return { blocked: false as const, user, repo: await getRepository() };
}

export async function cycleApiContext() {
  const user = await getCurrentUser();
  if (!user) return cycleJson({ error: "Sign in required." }, 401);
  if (user.actor) return cycleJson({ error: "Cycle records stay hidden during admin view." }, 403);
  return { user, repo: await getRepository() };
}

export function isCycleResponse(value: unknown): value is Response {
  return value instanceof Response;
}
