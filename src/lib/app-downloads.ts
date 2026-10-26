import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type DownloadKind = "apk" | "windows" | "mac";

const catalog: Record<DownloadKind, { fileName: string; contentType: string; candidates: string[] }> = {
  apk: {
    fileName: "CoupleSync.apk",
    contentType: "application/vnd.android.package-archive",
    candidates: ["apk/couplesync.apk", "public/downloads/couplesync.apk"],
  },
  windows: {
    fileName: "CoupleSync-Setup.exe",
    contentType: "application/octet-stream",
    candidates: ["desktop/CoupleSync-Setup.exe", "desktop/couplesync-setup.exe", "public/downloads/couplesync-setup.exe"],
  },
  mac: {
    fileName: "CoupleSync.dmg",
    contentType: "application/x-apple-diskimage",
    candidates: ["desktop/CoupleSync.dmg", "desktop/couplesync.dmg", "public/downloads/couplesync.dmg"],
  },
};

async function locate(kind: DownloadKind) {
  const item = catalog[kind];
  for (const relative of item.candidates) {
    const full = path.join(process.cwd(), relative);
    try {
      const info = await stat(full);
      if (info.isFile() && info.size > 0) return { path: full, size: info.size, ...item };
    } catch {
      // Try the next location.
    }
  }
  return null;
}

export async function downloadStatus() {
  const [apk, windows, mac] = await Promise.all([locate("apk"), locate("windows"), locate("mac")]);
  return { apk: Boolean(apk), windows: Boolean(windows), mac: Boolean(mac) };
}

function fileHeaders(contentType: string, fileName: string, extra: Record<string, string>) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

export function missingDownload(label: string) {
  return new Response(`${label} is not on this server.`, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function sendDownload(kind: DownloadKind, request: Request) {
  const file = await locate(kind);
  if (!file) return missingDownload(catalog[kind].fileName);
  const data = await readFile(file.path);
  const size = file.size;
  const range = request.headers.get("range");
  if (!range) {
    return new Response(data, { headers: fileHeaders(file.contentType, file.fileName, { "Content-Length": String(size) }) });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  let start = match[1] ? Number(match[1]) : NaN;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (match[1] === "") {
    start = Math.max(size - Number(match[2]), 0);
    end = size - 1;
  }
  if (!Number.isFinite(start) || start < 0 || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  const body = data.subarray(start, end + 1);
  return new Response(body, {
    status: 206,
    headers: fileHeaders(file.contentType, file.fileName, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(body.length),
    }),
  });
}

export async function headDownload(kind: DownloadKind) {
  const file = await locate(kind);
  if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(null, { headers: fileHeaders(file.contentType, file.fileName, { "Content-Length": String(file.size) }) });
}
