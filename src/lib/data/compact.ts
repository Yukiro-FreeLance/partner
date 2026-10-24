import { access } from "fs/promises";
import path from "path";
import { gzipSync, gunzipSync } from "zlib";
import type { Database, SiteSettings } from "@/lib/domain";
import { dataDir } from "@/lib/data/paths";

const assetPairs = [
  ["faviconPath", "faviconData"],
  ["appleIconPath", "appleIconData"],
  ["iconPath", "iconData"],
  ["ogImagePath", "ogImageData"],
] as const;

export function packBytes(bytes: Buffer) {
  if (bytes.length < 256) return { body: bytes, compressed: false };
  const packed = gzipSync(bytes, { level: 9 });
  if (packed.length + 32 >= bytes.length) return { body: bytes, compressed: false };
  return { body: packed, compressed: true };
}

export function unpackBytes(bytes: Buffer) {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return gunzipSync(bytes);
  return bytes;
}

export async function packDatabase(db: Database) {
  const slim = await releaseEmbeddedAssets(db);
  return gzipSync(Buffer.from(JSON.stringify(slim)), { level: 9 });
}

export function unpackDatabase(bytes: Buffer): Partial<Database> {
  const parsed = JSON.parse(unpackBytes(bytes).toString("utf8")) as Partial<Database>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Database payload is not an object");
  return parsed;
}

async function releaseEmbeddedAssets(db: Database): Promise<Database> {
  const siteSettings: SiteSettings[] = [];
  for (const row of db.siteSettings) {
    const next = { ...row };
    for (const [pathKey, dataKey] of assetPairs) {
      const stored = next[pathKey];
      if (typeof stored !== "string" || !next[dataKey]) continue;
      if (await durableCopy(stored)) next[dataKey] = null;
    }
    siteSettings.push(next);
  }
  return { ...db, siteSettings };
}

async function durableCopy(stored: string) {
  if (stored.startsWith("couplesync/")) return true;
  const root = path.resolve(dataDir());
  const resolved = path.resolve(stored);
  if (!resolved.startsWith(root)) return false;
  try {
    await access(resolved);
    return true;
  } catch {
    return false;
  }
}
