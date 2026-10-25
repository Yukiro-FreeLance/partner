import { redirect } from "next/navigation";
import { verifyEmailToken } from "@/lib/auth/accounts";
import { peekPairPath, setSessionCookie } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const repo = await getRepository();
  const result = await verifyEmailToken(repo, token);
  if (!result.ok) redirect("/verify-email?status=invalid");
  await setSessionCookie(result.data.userId);
  const pair = await peekPairPath();
  redirect(pair ?? "/verify-email?status=ready");
}
