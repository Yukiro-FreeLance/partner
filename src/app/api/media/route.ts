import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { getRepository } from "@/lib/data";
import { saveUploadedMedia } from "@/lib/services/life";
import { createAdminClient } from "@/lib/supabase/admin";

const types = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "audio/webm", "audio/mpeg", "audio/mp4", "audio/wav"]);
const imageByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

function fileType(file: File) {
  const raw = file.type === "image/jpg" || file.type === "image/pjpeg" ? "image/jpeg" : file.type === "image/x-png" ? "image/png" : file.type;
  if (types.has(raw)) return raw;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return imageByExtension[extension] ?? raw;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file." }, { status: 400 });
  const contentType = fileType(file);
  const purpose = String(form.get("purpose") ?? "");
  const profilePhoto = purpose === "avatar" || purpose === "banner";
  if (!types.has(contentType)) return Response.json({ error: profilePhoto ? "Use a JPEG, PNG, WEBP, or GIF photo." : "Use a JPEG, PNG, WEBP, GIF, or audio file." }, { status: 400 });
  if (profilePhoto && !contentType.startsWith("image/")) return Response.json({ error: "Use a JPEG, PNG, WEBP, or GIF photo." }, { status: 400 });
  const limit = contentType.startsWith("audio/") ? 8_000_000 : 5_000_000;
  if (file.size > limit) return Response.json({ error: "That file is too large." }, { status: 400 });
  const id = crypto.randomUUID();
  const bytes = Buffer.from(await file.arrayBuffer());
  let storagePath = "";
  if (isSupabaseConfigured()) {
    storagePath = `${user.profile.id}/${id}`;
    const upload = await createAdminClient().storage.from("private-media").upload(storagePath, bytes, { contentType });
    if (upload.error) return Response.json({ error: upload.error.message }, { status: 500 });
  } else {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "upload";
    storagePath = path.join(process.cwd(), ".data", "uploads", `${id}-${safe}`);
    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, bytes);
  }
  const repo = await getRepository();
  const saved = await saveUploadedMedia(repo, user.profile.id, { fileName: file.name, contentType, size: file.size, storagePath }, String(form.get("memoryId") || "") || undefined);
  if (!saved.ok) return Response.json({ error: saved.error }, { status: 400 });
  if (purpose === "avatar" || purpose === "banner") {
    const url = `/api/media/${saved.data.id}`;
    await repo.update("profiles", user.profile.id, purpose === "avatar" ? { avatarUrl: url, updatedAt: new Date().toISOString() } : { bannerUrl: url, updatedAt: new Date().toISOString() });
    revalidatePath("/profile");
    revalidatePath("/home");
    revalidatePath("/settings");
  }
  return Response.json({ id: saved.data.id });
}
