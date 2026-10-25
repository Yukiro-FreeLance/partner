import "server-only";
import { headers } from "next/headers";

function fallbackOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return configured || "http://localhost:3000";
}

export async function siteOrigin() {
  try {
    const headerStore = await headers();
    const rawHost = headerStore.get("x-forwarded-host") || headerStore.get("host");
    const host = rawHost?.split(",")[0]?.trim() ?? "";
    if (!host || /[\s/\\]/.test(host)) return fallbackOrigin();
    const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    const local = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.endsWith(".local");
    const proto = forwarded === "http" || forwarded === "https" ? forwarded : local ? "http" : "https";
    return `${proto}://${host}`;
  } catch {
    return fallbackOrigin();
  }
}

export async function siteHost() {
  return new URL(await siteOrigin()).host;
}
