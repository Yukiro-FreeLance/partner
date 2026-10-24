import { NextResponse } from "next/server";
import { getCurrentUser, impersonationCookieOptions, IMPERSONATION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const actor = user?.actor ?? user?.profile;
  const destination = actor?.role === "super_admin" ? "/admin/users" : "/home";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set(IMPERSONATION_COOKIE, "", impersonationCookieOptions(0));
  return response;
}
