import { describe, expect, it } from "vitest";
import { emptyDatabase } from "@/lib/data/memory";
import { packBytes, packDatabase, unpackBytes, unpackDatabase } from "@/lib/data/compact";

describe("compact storage", () => {
  it("round-trips a database and stores it smaller", async () => {
    const db = emptyDatabase();
    db.questions.push({
      id: "favorite-color",
      categoryId: "favorites",
      slug: "favorite-color",
      selfPrompt: "What is your favorite color?",
      guessPrompt: "What is their favorite color?",
      reversePrompt: "What would they guess?",
      answerType: "single",
      difficulty: "easy",
      sensitive: false,
      isActive: true,
      isSystem: true,
      visibility: "public",
      coupleId: null,
      createdBy: null,
      scoringRule: "exact",
      config: {},
      sortOrder: 1,
      locale: "en",
      dependsOn: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const packed = await packDatabase(db);
    const plain = Buffer.from(JSON.stringify(db));
    expect(packed.length).toBeLessThan(plain.length);
    expect(packed[0]).toBe(0x1f);
    const restored = unpackDatabase(packed);
    expect(restored.questions?.[0]?.slug).toBe("favorite-color");
  });

  it("leaves an existing plain database readable", () => {
    const db = emptyDatabase();
    const restored = unpackDatabase(Buffer.from(JSON.stringify(db)));
    expect(restored.profiles).toEqual([]);
  });

  it("drops icon bytes from the database once a blob copy exists", async () => {
    const db = emptyDatabase();
    db.siteSettings.push({
      id: "default",
      siteName: "CoupleSync",
      title: "CoupleSync",
      description: "A private quiz",
      ogTitle: "CoupleSync",
      ogDescription: "A private quiz",
      keywords: "quiz",
      themeColor: "#6d28d9",
      faviconPath: "couplesync/site/favicon",
      faviconType: "image/png",
      faviconData: "a".repeat(5000),
      appleIconPath: null,
      appleIconType: null,
      appleIconData: null,
      iconPath: null,
      iconType: null,
      iconData: null,
      ogImagePath: null,
      ogImageType: null,
      ogImageData: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const restored = unpackDatabase(await packDatabase(db));
    expect(restored.siteSettings?.[0]?.faviconData).toBeNull();
    expect(restored.siteSettings?.[0]?.faviconPath).toBe("couplesync/site/favicon");
  });

  it("compresses repetitive bytes and leaves a tiny payload alone", () => {
    const bulky = packBytes(Buffer.from("favorite color ".repeat(200)));
    expect(bulky.compressed).toBe(true);
    expect(unpackBytes(bulky.body).toString("utf8").startsWith("favorite color")).toBe(true);
    const tiny = packBytes(Buffer.from("ok"));
    expect(tiny.compressed).toBe(false);
  });
});