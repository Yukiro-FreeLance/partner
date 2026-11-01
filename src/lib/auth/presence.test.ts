import { describe, expect, it } from "vitest";
import { formatWhen, isCurrentlyActive, lastLoginOf } from "@/lib/auth/presence";

describe("presence", () => {
  it("treats a recent last-seen stamp as currently active", () => {
    const now = Date.parse("2026-11-01T14:00:00.000Z");
    expect(isCurrentlyActive("2026-11-01T13:55:00.000Z", now)).toBe(true);
    expect(isCurrentlyActive("2026-11-01T13:40:00.000Z", now)).toBe(false);
    expect(isCurrentlyActive(null, now)).toBe(false);
  });

  it("uses the latest login stamp and a readable time", () => {
    expect(lastLoginOf({ lastLoginAt: "2026-11-01T12:00:00.000Z" }, "2026-11-01T13:00:00.000Z")).toBe("2026-11-01T13:00:00.000Z");
    expect(formatWhen("2026-11-01T13:59:30.000Z", Date.parse("2026-11-01T14:00:00.000Z"))).toBe("Just now");
    expect(formatWhen(null)).toBe("Never");
  });
});
