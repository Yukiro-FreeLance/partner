import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { SiteAssetKind, SiteSettings } from "@/lib/domain";
import { dataDir } from "@/lib/data/paths";
import { getRepository } from "@/lib/data";

export const defaultSiteSettings: SiteSettings = {
  id: "default",
  siteName: "CoupleSync",
  title: "CoupleSync — How well do you really know your person?",
  description: "Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours.",
  ogTitle: "CoupleSync",
  ogDescription: "A private way for two people to learn each other.",
  keywords: "couple quiz, relationship, partner",
  themeColor: "#6d28d9",
  faviconPath: null,
  faviconType: null,
  appleIconPath: null,
  appleIconType: null,
  iconPath: null,
  iconType: null,
  ogImagePath: null,
  ogImageType: null,
  updatedAt: "",
};

const assetFields: Record<SiteAssetKind, { path: keyof SiteSettings; type: keyof SiteSettings }> = {
  favicon: { path: "faviconPath", type: "faviconType" },
  apple: { path: "appleIconPath", type: "appleIconType" },
  icon: { path: "iconPath", type: "iconType" },
  og: { path: "ogImagePath", type: "ogImageType" },
};

export function isSiteAssetKind(value: string): value is SiteAssetKind {
  return value === "favicon" || value === "apple" || value === "icon" || value === "og";
}

export function siteAssetUrl(kind: SiteAssetKind) {
  return `/site-asset/${kind}`;
}

export async function getSiteSettings() {
  try {
    const repo = await getRepository();
    return (await repo.find("siteSettings", { eq: { id: "default" } })) ?? { ...defaultSiteSettings };
  } catch (error) {
    console.error("Site settings unavailable", error instanceof Error ? error.message : "unknown error");
    return { ...defaultSiteSettings };
  }
}

export async function saveSiteSettings(patch: Partial<SiteSettings>) {
  const repo = await getRepository();
  const current = (await repo.find("siteSettings", { eq: { id: "default" } })) ?? { ...defaultSiteSettings };
  const next = { ...current, ...patch, id: "default", updatedAt: new Date().toISOString() };
  if (current.updatedAt) return repo.update("siteSettings", "default", next);
  return repo.insert("siteSettings", next);
}

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"]);

export function siteImageType(file: File) {
  const raw = file.type === "image/jpg" || file.type === "image/pjpeg" ? "image/jpeg" : file.type === "image/x-png" ? "image/png" : file.type;
  if (imageTypes.has(raw)) return raw;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "ico") return "image/x-icon";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "";
}

export async function storeSiteAsset(kind: SiteAssetKind, file: File) {
  const contentType = siteImageType(file);
  if (!contentType) return { ok: false as const, error: "Use a PNG, JPEG, WEBP, GIF, or ICO image." };
  const limit = kind === "og" ? 5_000_000 : 2_000_000;
  if (file.size > limit) return { ok: false as const, error: "That image is too large." };
  const extension = contentType === "image/jpeg" ? ".jpg" : contentType === "image/webp" ? ".webp" : contentType === "image/gif" ? ".gif" : contentType.includes("icon") ? ".ico" : ".png";
  const storagePath = path.join(dataDir(), "site", `${kind}${extension}`);
  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
  const fields = assetFields[kind];
  await saveSiteSettings({ [fields.path]: storagePath, [fields.type]: contentType });
  return { ok: true as const };
}
