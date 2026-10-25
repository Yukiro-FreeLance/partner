import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  return ["", "/about", "/privacy", "/terms", "/contact", "/support", "/login", "/register", "/join"].map((path) => ({
    url: `${origin}${path || "/"}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
