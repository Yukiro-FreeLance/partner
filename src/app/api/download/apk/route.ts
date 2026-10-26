import { headDownload, sendDownload } from "@/lib/app-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function HEAD() {
  return headDownload("apk");
}

export function GET(request: Request) {
  return sendDownload("apk", request);
}
