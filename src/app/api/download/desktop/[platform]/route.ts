import { headDownload, missingDownload, sendDownload } from "@/lib/app-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function kindOf(platform: string) {
  if (platform === "windows" || platform === "mac") return platform;
  return null;
}

export async function HEAD(_request: Request, context: { params: Promise<{ platform: string }> }) {
  const { platform } = await context.params;
  const kind = kindOf(platform);
  if (!kind) return missingDownload("Desktop installer");
  return headDownload(kind);
}

export async function GET(request: Request, context: { params: Promise<{ platform: string }> }) {
  const { platform } = await context.params;
  const kind = kindOf(platform);
  if (!kind) return missingDownload("Desktop installer");
  return sendDownload(kind, request);
}
