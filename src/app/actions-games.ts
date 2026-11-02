"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { arcadeGame } from "@/lib/games/catalog";
import { startGameMatch } from "@/lib/services/games";
import type { GameMatchKind } from "@/lib/domain";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function startArcadeMatchAction(formData: FormData) {
  const user = await requireUser();
  const slug = formString(formData, "slug");
  const kind: GameMatchKind = formString(formData, "kind") === "hotseat" ? "hotseat" : "challenge";
  if (!arcadeGame(slug)) redirect("/play/games");
  const started = await startGameMatch(await getRepository(), user.profile.id, slug, kind);
  if (!started.ok) redirect(`/play/games/${encodeURIComponent(slug)}?error=${encodeURIComponent(started.error)}`);
  redirect(`/play/games/${encodeURIComponent(slug)}?mode=partner&kind=${kind}&match=${encodeURIComponent(started.data.id)}`);
}
