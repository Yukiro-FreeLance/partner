import { verifyEmailToken } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const repo = await getRepository();
  const result = await verifyEmailToken(repo, token);
  const next = new URL("/verify-email", request.url);
  if (!result.ok) {
    next.searchParams.set("status", "invalid");
    return Response.redirect(next);
  }
  await setSessionCookie(result.data.userId);
  next.searchParams.set("status", "ready");
  return Response.redirect(next);
}
