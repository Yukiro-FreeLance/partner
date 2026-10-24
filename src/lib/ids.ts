import { createHash, randomBytes, randomUUID } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createId() {
  return randomUUID();
}

export function stableId(key: string) {
  const hex = createHash("sha256").update(`couplesync:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createInviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function createToken() {
  return randomBytes(32).toString("hex");
}
