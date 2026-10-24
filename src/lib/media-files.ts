import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { blobEnabled, blobPaused, blobTokenOptions, pauseBlob } from "@/lib/blob-auth";
import { isSupabaseConfigured } from "@/lib/config";
import { packBytes, unpackBytes } from "@/lib/data/compact";
import { dataDir } from "@/lib/data/paths";
import { createAdminClient } from "@/lib/supabase/admin";

const bucket = "private-media";

const blobPrefix = "couplesync/uploads/";

export async function storeManagedBytes(pathname: string, bytes: Buffer, contentType: string) {
  if (isSupabaseConfigured()) {
    const key = pathname.replace(/^couplesync\//, "");
    const upload = await createAdminClient().storage.from(bucket).upload(key, bytes, { contentType, upsert: true });
    if (upload.error) throw new Error(upload.error.message);
    return key;
  }
  const packed = packBytes(bytes);
  const storedPath = packed.compressed ? `${pathname}.gz` : pathname;
  if (blobEnabled()) {
    if (blobPaused()) throw new Error("Blob store is paused until the usage limit resets");
    try {
      await put(storedPath, packed.body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: packed.compressed ? "application/gzip" : contentType,
        cacheControlMaxAge: 300,
        ...blobTokenOptions(),
      });
    } catch (error) {
      pauseBlob(error);
      throw error;
    }
    return storedPath;
  }
  const relative = storedPath.replace(/^couplesync\//, "");
  const full = path.join(dataDir(), relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, packed.body);
  return full;
}

export async function readManagedFile(storagePath: string) {
  if (isSupabaseConfigured() && !storagePath.startsWith("couplesync/") && !path.isAbsolute(storagePath)) {
    const downloaded = await createAdminClient().storage.from(bucket).download(storagePath);
    if (downloaded.error || !downloaded.data) return null;
    return Buffer.from(await downloaded.data.arrayBuffer());
  }
  const bytes = storagePath.startsWith("couplesync/") ? await readBlob(storagePath) : await readLocal(storagePath);
  if (!bytes) return null;
  return storagePath.endsWith(".gz") ? unpackBytes(bytes) : bytes;
}

export async function storeMediaFile(id: string, bytes: Buffer, contentType: string, _fileName: string) {
  return storeManagedBytes(`${blobPrefix}${id}`, bytes, contentType);
}

export async function readMediaFile(storagePath: string) {
  return readManagedFile(storagePath);
}

async function readBlob(storagePath: string) {
  if (blobPaused()) return null;
  try {
    const loaded = await get(storagePath, { access: "private", ...blobTokenOptions() });
    if (!loaded || loaded.statusCode !== 200 || !loaded.stream) return null;
    return Buffer.from(await new Response(loaded.stream).arrayBuffer());
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    pauseBlob(error);
    throw error;
  }
}

async function readLocal(storagePath: string) {
  const root = path.resolve(dataDir());
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(root)) return null;
  try {
    return await readFile(resolved);
  } catch {
    return null;
  }
}
