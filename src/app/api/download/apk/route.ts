import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fileCandidates = [
  path.join(process.cwd(), "apk", "couplesync.apk"),
  path.join(process.cwd(), "public", "downloads", "couplesync.apk"),
];
const contentType = "application/vnd.android.package-archive";
const fileName = "CoupleSync.apk";

function headers(extra: Record<string, string>) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

async function locateApk() {
  for (const candidate of fileCandidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile() && info.size > 0) return { path: candidate, size: info.size };
    } catch {
      // Try the next location.
    }
  }
  return null;
}

function missing() {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Android app</title><body style="font-family:system-ui,sans-serif;padding:2rem"><h1>Android app</h1><p>The install file is not on this server yet.</p><p><a href="/">Back to CoupleSync</a></p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function HEAD() {
  const file = await locateApk();
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(null, { headers: headers({ "Content-Length": String(file.size) }) });
}

export async function GET(request: Request) {
  const file = await locateApk();
  if (!file) return missing();
  const data = await readFile(file.path);
  const size = file.size;
  const range = request.headers.get("range");
  if (!range) return new Response(data, { headers: headers({ "Content-Length": String(size) }) });
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    start = Math.max(size - suffix, 0);
    end = size - 1;
  }
  if (!Number.isFinite(start) || start < 0 || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  const body = data.subarray(start, end + 1);
  return new Response(body, {
    status: 206,
    headers: headers({
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(body.length),
    }),
  });
}
