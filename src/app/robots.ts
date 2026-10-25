import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/play", "/personality", "/connection", "/memories", "/profile", "/settings", "/notifications", "/onboarding", "/admin", "/api"],
    },
    sitemap: `${await siteOrigin()}/sitemap.xml`,
  };
}
