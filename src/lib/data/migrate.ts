import type { Database, SiteSettings, TableName } from "@/lib/domain";
import { emptyDatabase } from "@/lib/data/memory";
import { primaryKey, rowKey, type Repository } from "@/lib/data/repository";

const tables = Object.keys(emptyDatabase()) as TableName[];

export type MigrationReport = {
  copied: Record<string, number>;
  missing: string[];
};

export function sourceHasRecords(db: Database) {
  return db.profiles.length > 0 || db.questions.length > 0 || db.siteSettings.some((row) => Boolean(row.updatedAt));
}

export async function snapshotDatabase(repo: Repository): Promise<Database> {
  const db = emptyDatabase();
  for (const table of tables) db[table] = (await repo.list(table)) as never;
  return db;
}

export async function copyDatabase(source: Repository, target: Repository): Promise<MigrationReport> {
  const copied: Record<string, number> = {};
  for (const table of tables) {
    const rows = await source.list(table);
    copied[table] = rows.length;
    for (const row of rows) {
      const id = rowKey(table, row);
      const key = primaryKey(table);
      const existing = await target.find(table, { eq: { [key]: id } } as never);
      if (existing) await target.update(table, id, row);
      else await target.insert(table, row);
    }
  }
  const missing: string[] = [];
  for (const table of tables) {
    const sourceRows = await source.list(table);
    const targetIds = new Set((await target.list(table)).map((row) => rowKey(table, row)));
    for (const row of sourceRows) {
      const id = rowKey(table, row);
      if (!targetIds.has(id)) missing.push(`${table}:${id}`);
    }
  }
  return { copied, missing };
}

export async function restoreDatabase(target: Repository, snapshot: Database) {
  for (const table of [...tables].reverse()) {
    for (const row of await target.list(table)) {
      await target.remove(table, rowKey(table, row));
    }
  }
  for (const table of tables) {
    for (const row of snapshot[table]) await target.insert(table, row as never);
  }
}

export function storedFileMoves(db: Database) {
  const moves: { from: string; to: string }[] = [];
  for (const media of db.mediaObjects) {
    if (!needsStorageMove(media.storagePath)) continue;
    moves.push({ from: media.storagePath, to: `${media.ownerId}/${media.id}` });
  }
  for (const settings of db.siteSettings) {
    const named = [
      ["faviconPath", "site/favicon"],
      ["appleIconPath", "site/apple"],
      ["iconPath", "site/icon"],
      ["ogImagePath", "site/og"],
    ] as const;
    for (const [key, to] of named) {
      const from = settings[key];
      if (typeof from === "string" && needsStorageMove(from)) moves.push({ from, to });
    }
  }
  return moves;
}

export function rewriteStoredPaths(db: Database): Database {
  const next = structuredClone(db);
  for (const media of next.mediaObjects) {
    if (needsStorageMove(media.storagePath)) media.storagePath = `${media.ownerId}/${media.id}`;
  }
  for (const settings of next.siteSettings) rewriteSitePaths(settings);
  return next;
}

function rewriteSitePaths(settings: SiteSettings) {
  if (typeof settings.faviconPath === "string" && needsStorageMove(settings.faviconPath)) settings.faviconPath = "site/favicon";
  if (typeof settings.appleIconPath === "string" && needsStorageMove(settings.appleIconPath)) settings.appleIconPath = "site/apple";
  if (typeof settings.iconPath === "string" && needsStorageMove(settings.iconPath)) settings.iconPath = "site/icon";
  if (typeof settings.ogImagePath === "string" && needsStorageMove(settings.ogImagePath)) settings.ogImagePath = "site/og";
}

export function needsStorageMove(storagePath: string) {
  if (!storagePath) return false;
  if (storagePath.startsWith("couplesync/")) return true;
  if (storagePath.endsWith(".gz")) return true;
  return /^[A-Za-z]:[\\/]/.test(storagePath) || storagePath.startsWith("/");
}
