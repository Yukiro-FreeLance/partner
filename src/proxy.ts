import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/config";

const protectedPrefixes = ["/home", "/play", "/personality", "/connection", "/memories", "/cycle", "/profile", "/settings", "/notifications", "/onboarding", "/admin"];

function downloadPath(pathname: string) {
  if (pathname === "/downloads/couplesync.apk") return { pathname: "/api/download/apk", search: "" };
  if (pathname === "/downloads/couplesync-setup.exe") return { pathname: "/api/download/desktop/windows", search: "" };
  if (pathname === "/downloads/couplesync.dmg") return { pathname: "/api/download/desktop/mac", search: "" };
  return null;
}

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const downloadRewrite = downloadPath(pathname);
  if (downloadRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = downloadRewrite.pathname;
    url.search = downloadRewrite.search;
    return NextResponse.rewrite(url);
  }
  const appSession = Boolean(request.cookies.get("cs_session")?.value);
  if (appSession || !isProtected(pathname)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  let supabaseUser = false;
  if (supabaseUrl() && supabaseAnonKey()) {
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    supabaseUser = Boolean(data.user);
  }

  const hasSession = supabaseUser || Boolean(request.cookies.get("cs_session")?.value);
  if (isProtected(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
