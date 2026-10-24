import type { MetadataRoute } from "next";
import { getSiteSettings, siteAssetUrl } from "@/lib/site-settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const kind = settings.iconData || settings.iconPath ? "icon" : "favicon";
  const type = (kind === "icon" ? settings.iconType : settings.faviconType) || "image/jpeg";
  return {
    name: settings.siteName,
    short_name: settings.siteName,
    description: settings.description,
    start_url: "/home",
    display: "standalone",
    background_color: "#f6f3fb",
    theme_color: settings.themeColor || "#6d28d9",
    icons: [{ src: siteAssetUrl(kind, settings.updatedAt), sizes: "512x512", type }],
  };
}
