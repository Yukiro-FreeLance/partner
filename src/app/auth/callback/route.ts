import { NextResponse } from "next/server";
import { peekPairPath } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const pair = await peekPairPath();
  return NextResponse.redirect(new URL(pair ?? "/onboarding", url.origin));
}
