import { downloadStatus } from "@/lib/app-downloads";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await downloadStatus(), { headers: { "Cache-Control": "no-store" } });
}
