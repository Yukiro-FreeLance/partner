import { describe, expect, it } from "vitest";
import { dayKey, nextDailyReset, previousDayKey } from "@/lib/daily";

describe("daily reset", () => {
  it("uses Asia/Manila midnight as the boundary", () => {
    const before = new Date("2026-10-23T15:59:00.000Z");
    const after = new Date("2026-10-23T16:00:00.000Z");
    expect(dayKey(before)).toBe("2026-10-23");
    expect(dayKey(after)).toBe("2026-10-24");
    const reset = nextDailyReset(before);
    expect(Math.abs(reset.getTime() - Date.parse("2026-10-23T16:00:00.000Z"))).toBeLessThan(5);
    expect(dayKey(reset)).toBe("2026-10-24");
  });

  it("keeps the next reset inside a day and a half", () => {
    const now = new Date("2026-07-01T04:00:00.000Z");
    const reset = nextDailyReset(now, "America/New_York");
    expect(reset.getTime()).toBeGreaterThan(now.getTime());
    expect(reset.getTime() - now.getTime()).toBeLessThan(36 * 60 * 60 * 1000);
    expect(dayKey(new Date(reset.getTime() - 1000), "America/New_York")).toBe(dayKey(now, "America/New_York"));
  });

  it("steps the stored day key backward without using the clock", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28");
  });
});
