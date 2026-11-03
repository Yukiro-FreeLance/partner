import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
export async function GET() { await requireUser(); return NextResponse.json({ enabled: process.env.OPENCODE_ENABLED === "true" && Boolean(process.env.OPENCODE_HOST) }); }
