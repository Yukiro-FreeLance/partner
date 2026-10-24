import { readFile } from "fs/promises";
import path from "path";
import { dataDir } from "@/lib/data/paths";
import { getSiteSettings, isSiteAssetKind } from "@/lib/site-settings";

const fields = {
  favicon: ["faviconPath", "faviconType"],
  apple: ["appleIconPath", "appleIconType"],
  icon: ["iconPath", "iconType"],
  og: ["ogImagePath", "ogImageType"],
} as const;

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  if (!isSiteAssetKind(kind)) return new Response("Not found.", { status: 404 });
  const settings = await getSiteSettings();
  const [pathKey, typeKey] = fields[kind];
  const stored = settings[pathKey];
  if (!stored) return Response.redirect(new URL("/brand/logo.jpg", request.url));
  const root = path.resolve(dataDir(), "site");
  const resolved = path.resolve(stored);
  if (!resolved.startsWith(root)) return new Response("Not found.", { status: 404 });
  try {
    const bytes = await readFile(resolved);
    return new Response(bytes, { headers: { "Content-Type": settings[typeKey] || "image/png", "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.redirect(new URL("/brand/logo.jpg", request.url));
  }
}
