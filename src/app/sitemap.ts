import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/privacy", "/terms", "/contact", "/support", "/login", "/register", "/join"].map((path) => ({
    url: `${siteUrl()}${path || "/"}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
