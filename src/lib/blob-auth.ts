import "server-only";

export function blobTokenOptions(): { token?: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { token } : {};
}
