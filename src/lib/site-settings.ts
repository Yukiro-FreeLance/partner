import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import type { SiteAssetKind, SiteSettings } from "@/lib/domain";
import { getRepository } from "@/lib/data";
import { readManagedFile, storeManagedBytes } from "@/lib/media-files";

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
  faviconData: null,
  appleIconPath: null,
  appleIconType: null,
  appleIconData: null,
  iconPath: null,
  iconType: null,
  iconData: null,
  ogImagePath: null,
  ogImageType: null,
  ogImageData: null,
  updatedAt: "",
};

const assetFields: Record<SiteAssetKind, { path: keyof SiteSettings; type: keyof SiteSettings; data: keyof SiteSettings }> = {
  favicon: { path: "faviconPath", type: "faviconType", data: "faviconData" },
  apple: { path: "appleIconPath", type: "appleIconType", data: "appleIconData" },
  icon: { path: "iconPath", type: "iconType", data: "iconData" },
  og: { path: "ogImagePath", type: "ogImageType", data: "ogImageData" },
};

export function isSiteAssetKind(value: string): value is SiteAssetKind {
  return value === "favicon" || value === "apple" || value === "icon" || value === "og";
}

export function siteAssetUrl(kind: SiteAssetKind, version = "") {
  const base = `/site-asset/${kind}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

const cacheMs = 60_000;
const settingsCache = globalThis as { __couplesyncSiteSettings?: { status: "ready" | "missing"; settings: SiteSettings; at: number } };

export type SiteSettingsLoad =
  | { status: "ready" | "missing"; settings: SiteSettings }
  | { status: "unavailable"; settings: SiteSettings };

export function invalidateSiteSettings() {
  settingsCache.__couplesyncSiteSettings = undefined;
}

export function settingsWritePlan(status: SiteSettingsLoad["status"]) {
  if (status === "unavailable") return "refuse" as const;
  if (status === "missing") return "insert" as const;
  return "update" as const;
}

export async function loadSiteSettings(): Promise<SiteSettingsLoad> {
  const cached = settingsCache.__couplesyncSiteSettings;
  if (cached && Date.now() - cached.at < cacheMs) return cached;
  try {
    const repo = await getRepository();
    const row = await repo.find("siteSettings", { eq: { id: "default" } });
    if (!row) {
      const missing = { status: "missing" as const, settings: { ...defaultSiteSettings }, at: Date.now() };
      settingsCache.__couplesyncSiteSettings = missing;
      return missing;
    }
    const ready = { status: "ready" as const, settings: { ...defaultSiteSettings, ...row, id: "default" }, at: Date.now() };
    settingsCache.__couplesyncSiteSettings = ready;
    return ready;
  } catch (error) {
    console.error("Site settings unavailable", error instanceof Error ? error.message : "unknown error");
    if (cached?.status === "ready") return cached;
    return { status: "unavailable", settings: cached?.settings ?? { ...defaultSiteSettings } };
  }
}

export async function getSiteSettings() {
  return (await loadSiteSettings()).settings;
}

export async function saveSiteSettings(patch: Partial<SiteSettings>) {
  const loaded = await loadSiteSettings();
  const plan = settingsWritePlan(loaded.status);
  if (plan === "refuse") throw new Error("Site settings could not be loaded, so the saved settings were left unchanged.");
  const repo = await getRepository();
  const next = { ...loaded.settings, ...patch, id: "default", updatedAt: new Date().toISOString() };
  const saved = plan === "insert" ? await repo.insert("siteSettings", next) : await repo.update("siteSettings", "default", next);
  invalidateSiteSettings();
  return saved;
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
  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = await storeManagedBytes(`couplesync/site/${kind}`, bytes, contentType);
  const fields = assetFields[kind];
  await saveSiteSettings({ [fields.path]: storagePath, [fields.type]: contentType, [fields.data]: null });
  return { ok: true as const };
}

export async function loadSiteAsset(kind: SiteAssetKind) {
  const settings = await getSiteSettings();
  const fields = assetFields[kind];
  const encoded = settings[fields.data];
  const type = (typeof settings[fields.type] === "string" && settings[fields.type]) || "image/png";
  if (typeof encoded === "string" && encoded) return { bytes: Buffer.from(encoded, "base64"), type };
  const stored = settings[fields.path];
  if (typeof stored === "string" && stored) {
    const bytes = await readManagedFile(stored);
    if (bytes) return { bytes, type };
  }
  return { bytes: await readFile(path.join(process.cwd(), "public", "brand", "logo.jpg")), type: "image/jpeg" };
}
