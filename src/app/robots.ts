import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/play", "/personality", "/connection", "/memories", "/profile", "/settings", "/notifications", "/onboarding", "/admin", "/api"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
