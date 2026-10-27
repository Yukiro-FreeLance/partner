import path from "path";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { getRepository } from "@/lib/data";
import type { Repository } from "@/lib/data/repository";
import { readMediaFile } from "@/lib/media-files";
import { activeMembership, requireMembership } from "@/lib/services/access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { id } = await context.params;
  const repo = await getRepository();
  const media = await repo.find("mediaObjects", { eq: { id } });
  if (!media) return new Response("Not found.", { status: 404 });
  if (media.ownerId !== user.profile.id) {
    const owner = await repo.find("profiles", { eq: { id: media.ownerId } });
    const mediaUrl = `/api/media/${media.id}`;
    const isProfileImage = owner?.avatarUrl === mediaUrl || owner?.bannerUrl === mediaUrl;
    if (isProfileImage) {
      const viewer = await activeMembership(repo, user.profile.id);
      const ownerMember = await activeMembership(repo, media.ownerId);
      if (!viewer || !ownerMember || viewer.coupleId !== ownerMember.coupleId) return new Response("Not found.", { status: 404 });
    } else {
      if (!media.coupleId) return new Response("Not found.", { status: 404 });
      const access = await requireMembership(repo, user.profile.id, media.coupleId);
      if (!access.ok) return new Response("Not found.", { status: 404 });
      const attachment = await repo.find("memoryAttachments", { eq: { id } });
      const memory = attachment ? await repo.find("coupleMemories", { eq: { id: attachment.memoryId } }) : null;
      const sharedMemory = Boolean(memory && memory.visibility === "shared");
      if (!sharedMemory && !(await planOwnsMedia(repo, media.coupleId, `/api/media/${media.id}`))) return new Response("Not found.", { status: 404 });
    }
  }
  const remote = isSupabaseConfigured() && !media.storagePath.startsWith("couplesync/") && !path.isAbsolute(media.storagePath);
  if (remote) {
    const signed = await createAdminClient().storage.from("private-media").createSignedUrl(media.storagePath, 60);
    if (signed.error || !signed.data?.signedUrl) return new Response("File unavailable.", { status: 404 });
    return Response.redirect(signed.data.signedUrl);
  }
  const bytes = await readMediaFile(media.storagePath);
  if (!bytes) return new Response("File unavailable.", { status: 404 });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": media.contentType, "Cache-Control": "private, no-store" } });
}

async function planOwnsMedia(repo: Repository, coupleId: string, mediaUrl: string) {
  try {
    const [expenses, activities, plans] = await Promise.all([
      repo.list("itineraryExpenses", { eq: { receiptPath: mediaUrl } }),
      repo.list("itineraryActivities", { eq: { photoPath: mediaUrl } }),
      repo.list("datePlans", { eq: { coupleId, coverImage: mediaUrl } }),
    ]);
    if (plans.length) return true;
    for (const expense of expenses) {
      const plan = await repo.find("datePlans", { eq: { id: expense.datePlanId, coupleId } });
      if (plan) return true;
    }
    for (const activity of activities) {
      const day = await repo.find("itineraryDays", { eq: { id: activity.itineraryDayId } });
      if (!day) continue;
      const plan = await repo.find("datePlans", { eq: { id: day.datePlanId, coupleId } });
      if (plan) return true;
    }
  } catch {
    return false;
  }
  return false;
}
