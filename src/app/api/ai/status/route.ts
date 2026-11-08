import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { aiRuntimeConfigured } from "@/lib/services/ai";

export async function GET() {
  await requireUser();
  return NextResponse.json({ enabled: aiRuntimeConfigured() });
}
