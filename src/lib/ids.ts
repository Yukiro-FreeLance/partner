import { randomBytes, randomUUID } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createId() {
  return randomUUID();
}

export function createInviteCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function createToken() {
  return randomBytes(32).toString("hex");
}
