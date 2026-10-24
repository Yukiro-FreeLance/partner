import "server-only";

const pauseMs = 60 * 60 * 1000;
const state = globalThis as { __couplesyncBlobPauseUntil?: number };

export function blobEnabled() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export function blobPaused() {
  return (state.__couplesyncBlobPauseUntil ?? 0) > Date.now();
}

export function pauseBlob(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!/403|blocked|usage limit/i.test(message)) return;
  state.__couplesyncBlobPauseUntil = Date.now() + pauseMs;
}

export function blobTokenOptions(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? { token } : {};
}
