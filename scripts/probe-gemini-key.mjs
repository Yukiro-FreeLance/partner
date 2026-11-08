import fs from "node:fs";
import { OpenCode } from "@opencode/client";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
}
const headers = {};
if (env.OPENCODE_SERVER_USERNAME && env.OPENCODE_SERVER_PASSWORD) {
  headers.authorization = `Basic ${Buffer.from(`${env.OPENCODE_SERVER_USERNAME}:${env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`;
}
const client = OpenCode.make({ baseUrl: env.OPENCODE_HOST, headers });
const credentials = await client.credential.list().catch((error) => ({ error: String(error?.message || error) }));
const rows = Array.isArray(credentials) ? credentials : credentials?.data || [];
console.log("CREDS", JSON.stringify(rows.map((row) => ({
  integration: row.integrationID,
  type: row.value?.type,
  label: row.label,
  active: row.active,
  keys: row.value ? Object.keys(row.value) : [],
})), null, 2));
const models = await client.model.list().catch(() => ({ data: [] }));
const flash = (models.data || []).filter((model) => model.providerID === "google" && /flash/i.test(model.id) && model.status === "active");
console.log("GOOGLE_FLASH", flash.slice(0, 15).map((model) => model.id));
