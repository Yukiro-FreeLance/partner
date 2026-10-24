import { loadSiteAsset, isSiteAssetKind } from "@/lib/site-settings";

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  if (!isSiteAssetKind(kind)) return new Response("Not found.", { status: 404 });
  const asset = await loadSiteAsset(kind);
  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      "Content-Type": asset.type,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
