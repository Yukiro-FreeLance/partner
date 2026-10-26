import { cache } from "react";
import type { CoupleMember } from "@/lib/domain";

type Scope = {
  userId: string;
  membership: CoupleMember | null;
};

const box = cache(() => ({ current: null as Scope | null }));

export function rememberMembership(userId: string, membership: CoupleMember | null) {
  try {
    box().current = { userId, membership };
  } catch {
    // No request cache outside a render.
  }
}

export function rememberedMembership(userId: string) {
  try {
    const current = box().current;
    if (current?.userId === userId) return { hit: true as const, membership: current.membership };
  } catch {
    // No request cache outside a render.
  }
  return { hit: false as const, membership: null };
}
