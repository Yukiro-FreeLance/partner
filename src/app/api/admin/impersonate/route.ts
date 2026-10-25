import { NextResponse } from "next/server";
import { accountStatusOf } from "@/lib/auth/account-status";
import { getCurrentUser, impersonationCookieOptions, IMPERSONATION_COOKIE, signImpersonation } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { writeAudit } from "@/lib/services/access";

export async function POST(request: Request) {
  try {
  const user = await getCurrentUser();
  const actor = user?.actor ?? user?.profile;
  const usersUrl = new URL("/admin/users", request.url);
  if (!user || !actor || actor.role !== "super_admin") return NextResponse.redirect(new URL("/home", request.url), 303);
  const targetId = String((await request.formData()).get("userId") ?? "");
  if (!targetId || targetId === actor.id) return NextResponse.redirect(usersUrl, 303);
  const repo = await getRepository();
  const target = await repo.find("profiles", { eq: { id: targetId } });
  if (!target || target.role === "super_admin" || accountStatusOf(target) !== "active") return NextResponse.redirect(usersUrl, 303);
  await writeAudit(repo, actor.id, `impersonate ${target.id}`);
  const response = NextResponse.redirect(new URL("/home", request.url), 303);
  response.cookies.set(IMPERSONATION_COOKIE, await signImpersonation(target.id, actor.id), impersonationCookieOptions());
  return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impersonation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
