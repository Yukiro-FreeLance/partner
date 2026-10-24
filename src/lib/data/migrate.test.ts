import { describe, expect, it } from "vitest";
import { copyDatabase, restoreDatabase, rewriteStoredPaths, sourceHasRecords, storedFileMoves } from "@/lib/data/migrate";
import { createMemoryRepository, emptyDatabase } from "@/lib/data/memory";
import { settingsWritePlan } from "@/lib/site-settings";
import type { Profile } from "@/lib/domain";

function profile(id: string, name: string): Profile {
  return {
    id,
    email: `${id}@example.com`,
    displayName: name,
    avatarUrl: null,
    bannerUrl: null,
    relationshipStatus: null,
    relationshipStartedOn: null,
    interests: [],
    preferredCategories: [],
    role: "user",
    isDemo: false,
    emailVerified: true,
    createdAt: "2026-10-24T00:00:00.000Z",
    updatedAt: "2026-10-24T00:00:00.000Z",
  };
}

describe("storage migration", () => {
  it("copies records and can roll them back", async () => {
    const sourceDb = emptyDatabase();
    sourceDb.profiles.push(profile("owner", "Owner"));
    const targetDb = emptyDatabase();
    targetDb.profiles.push(profile("keep", "Keep"));
    const source = createMemoryRepository(sourceDb);
    const target = createMemoryRepository(targetDb);
    const before = structuredClone(target.snapshot());
    const report = await copyDatabase(source, target);
    expect(report.missing).toEqual([]);
    expect(report.copied.profiles).toBe(1);
    expect((await target.list("profiles")).map((row) => row.id).sort()).toEqual(["keep", "owner"]);
    await restoreDatabase(target, before);
    expect((await target.list("profiles")).map((row) => row.id)).toEqual(["keep"]);
  });

  it("refuses an empty source and keeps blob paths until files move", () => {
    const db = emptyDatabase();
    expect(sourceHasRecords(db)).toBe(false);
    db.mediaObjects.push({
      id: "file",
      ownerId: "owner",
      coupleId: null,
      fileName: "cover.jpg",
      contentType: "image/jpeg",
      size: 10,
      storagePath: "couplesync/uploads/file",
      createdAt: "2026-10-24T00:00:00.000Z",
    });
    expect(storedFileMoves(db)).toEqual([{ from: "couplesync/uploads/file", to: "owner/file" }]);
    expect(rewriteStoredPaths(db).mediaObjects[0]?.storagePath).toBe("owner/file");
    expect(db.mediaObjects[0]?.storagePath).toBe("couplesync/uploads/file");
  });

  it("does not plan a write when settings cannot be loaded", () => {
    expect(settingsWritePlan("unavailable")).toBe("refuse");
    expect(settingsWritePlan("missing")).toBe("insert");
    expect(settingsWritePlan("ready")).toBe("update");
  });
});
