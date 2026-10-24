import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { blobTokenOptions } from "@/lib/blob-auth";
import { dataDir } from "@/lib/data/paths";

const blobPrefix = "couplesync/uploads/";

function sharedFiles() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storeMediaFile(id: string, bytes: Buffer, contentType: string, fileName: string) {
  if (sharedFiles()) {
    const pathname = `${blobPrefix}${id}`;
    await put(pathname, bytes, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      cacheControlMaxAge: 60,
      ...blobTokenOptions(),
    });
    return pathname;
  }
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "upload";
  const storagePath = path.join(dataDir(), "uploads", `${id}-${safe}`);
  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, bytes);
  return storagePath;
}

export async function readMediaFile(storagePath: string) {
  if (storagePath.startsWith(blobPrefix)) {
    try {
      const loaded = await get(storagePath, { access: "private", ...blobTokenOptions() });
      if (!loaded || loaded.statusCode !== 200 || !loaded.stream) return null;
      return Buffer.from(await new Response(loaded.stream).arrayBuffer());
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }
  const root = path.resolve(dataDir(), "uploads");
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(root)) return null;
  return readFile(resolved);
}
