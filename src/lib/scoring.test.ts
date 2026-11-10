import { describe, expect, it } from "vitest";
import {
  combineSummaries,
  compareResponses,
  formatPoints,
  formatScore,
  isPartnerPrediction,
  knowledgeBand,
  preferenceBand,
  roundBadges,
  summarize,
} from "@/lib/scoring";

const choice = (value: string) => ({ payload: { choice: value } });
const multi = (values: string[]) => ({ payload: { choices: values } });

describe("compareResponses", () => {
  it("matches single choices after normalizing case and whitespace", () => {
    const result = compareResponses({ answerType: "single" }, choice("  Blue "), choice("blue"));
    expect(result).toMatchObject({ eligible: true, points: 1, kind: "exact" });
  });

  it("does not treat a different choice as a match", () => {
    const result = compareResponses({ answerType: "single" }, choice("Blue"), choice("Green"));
    expect(result).toMatchObject({ eligible: true, points: 0, kind: "miss" });
  });

  it("uses Jaccard overlap for multiple-select answers", () => {
    const result = compareResponses({ answerType: "multi" }, multi(["pasta", "adobo"]), multi(["pasta", "sushi"]));
    expect(result.eligible).toBe(true);
    expect(result.points).toBeCloseTo(1 / 3, 3);
    expect(result.kind).toBe("partial");
  });

  it("gives partial credit for nearby ratings", () => {
    const result = compareResponses(
      { answerType: "scale", config: { scaleMin: 1, scaleMax: 5 } },
      { payload: { scale: 4 } },
      { payload: { scale: 5 } },
    );
    expect(result.points).toBeCloseTo(0.75, 3);
    expect(result.kind).toBe("partial");
  });

  it("uses rank distance for ranking questions", () => {
    const same = compareResponses(
      { answerType: "ranking" },
      { payload: { ranking: ["a", "b", "c"] } },
      { payload: { ranking: ["a", "b", "c"] } },
    );
    const swapped = compareResponses(
      { answerType: "ranking" },
      { payload: { ranking: ["a", "b", "c"] } },
      { payload: { ranking: ["a", "c", "b"] } },
    );
    expect(same.points).toBe(1);
    expect(swapped.points).toBeGreaterThan(0);
    expect(swapped.points).toBeLessThan(1);
  });

  it("scores dates exactly, one day apart, or as a miss", () => {
    expect(compareResponses({ answerType: "date" }, { payload: { date: "2024-02-14" } }, { payload: { date: "2024-02-14" } }).points).toBe(1);
    expect(compareResponses({ answerType: "date" }, { payload: { date: "2024-02-14" } }, { payload: { date: "2024-02-15" } }).points).toBe(0.5);
    expect(compareResponses({ answerType: "date" }, { payload: { date: "2024-02-14" } }, { payload: { date: "2024-03-01" } }).points).toBe(0);
  });

  it("leaves free text unscored until someone confirms a similarity", () => {
    const pending = compareResponses(
      { answerType: "short_text" },
      { payload: { text: "A quiet morning" } },
      { payload: { text: "Coffee and a walk" } },
    );
    expect(pending.eligible).toBe(false);
    expect(pending.reason).toBe("unscored_text");
    const marked = compareResponses(
      { answerType: "long_text" },
      { payload: { text: "A quiet morning" } },
      { payload: { text: "Coffee and a walk" } },
      "partial",
    );
    expect(marked).toMatchObject({ eligible: true, points: 0.5, kind: "partial" });
  });

  it("matches free text that is the same after normalization", () => {
    const result = compareResponses(
      { answerType: "short_text" },
      { payload: { text: "Mango float!" } },
      { payload: { text: "  mango   float " } },
    );
    expect(result.points).toBe(1);
  });

  it("gives full or partial credit when a word or sentence is only similar", () => {
    expect(compareResponses({ answerType: "short_text" }, { payload: { text: "Mango floats" } }, { payload: { text: "mango float" } }).points).toBe(1);
    expect(compareResponses({ answerType: "long_text" }, { payload: { text: "a quiet morning" } }, { payload: { text: "quiet mornings" } }).points).toBe(1);
    const close = compareResponses({ answerType: "short_text" }, { payload: { text: "beach vacation" } }, { payload: { text: "a vacation at the beach" } });
    expect(close.points).toBeGreaterThanOrEqual(0.65);
    expect(close.kind).not.toBe("miss");
    const word = compareResponses({ answerType: "short_text" }, { payload: { text: "I love coffee" } }, { payload: { text: "coffee" } });
    expect(word.eligible).toBe(true);
    expect(word.points).toBeGreaterThan(0);
    expect(word.points).toBeLessThan(1);
    const different = compareResponses({ answerType: "short_text" }, { payload: { text: "pizza" } }, { payload: { text: "pasta" } });
    expect(different.eligible).toBe(false);
    expect(different.reason).toBe("unscored_text");
  });

  it("lets an explicit different mark override a close written guess", () => {
    const marked = compareResponses(
      { answerType: "short_text" },
      { payload: { text: "quiet morning" } },
      { payload: { text: "quiet mornings" } },
      "different",
    );
    expect(marked).toMatchObject({ eligible: true, points: 0, kind: "miss" });
  });

  it("excludes skipped and missing answers and still counts a shared sensitive answer", () => {
    expect(compareResponses({ answerType: "yesno" }, { payload: { choice: "yes" }, skipped: true }, choice("yes")).reason).toBe("skipped");
    expect(compareResponses({ answerType: "yesno" }, null, choice("yes")).reason).toBe("missing_actual");
    expect(compareResponses({ answerType: "yesno" }, choice("yes"), null).reason).toBe("missing_prediction");
    expect(
      compareResponses(
        { answerType: "single", sensitive: true },
        { payload: { choice: "save", shareWithPartner: false } },
        choice("save"),
      ).kind,
    ).toBe("exact");
  });

  it("does not accept a person's own answer as their prediction", () => {
    expect(
      isPartnerPrediction({ kind: "partner", predictorId: "a", subjectId: "a", actualUserId: "a" }),
    ).toBe(false);
    expect(
      isPartnerPrediction({ kind: "reverse", predictorId: "a", subjectId: "b", actualUserId: "b" }),
    ).toBe(false);
    expect(
      isPartnerPrediction({ kind: "partner", predictorId: "a", subjectId: "b", actualUserId: "b" }),
    ).toBe(true);
  });
});

describe("summarize", () => {
  it("returns not enough answers instead of zero when nothing is eligible", () => {
    const summary = summarize([
      compareResponses({ answerType: "single" }, { payload: {}, skipped: true }, choice("blue")),
    ]);
    expect(summary.score).toBeNull();
    expect(summary.label).toBe("Not enough answers yet");
    expect(formatScore(summary.score)).toBe("Not enough answers yet");
  });

  it("uses weighted partial credit and the published knowledge bands", () => {
    const summary = summarize([
      compareResponses({ answerType: "single" }, choice("blue"), choice("blue")),
      compareResponses({ answerType: "scale", config: { scaleMin: 1, scaleMax: 5 } }, { payload: { scale: 4 } }, { payload: { scale: 5 } }),
    ]);
    expect(summary.eligible).toBe(2);
    expect(summary.points).toBeCloseTo(1.75, 3);
    expect(summary.score).toBeCloseTo(87.5, 3);
    expect(summary.label).toBe("Great Connection");
    expect(formatScore(summary.score)).toBe("87.5%");
    expect(knowledgeBand(90).label).toBe("In Sync");
    expect(knowledgeBand(55).label).toBe("Getting Closer");
    expect(knowledgeBand(30).label).toBe("Learning Each Other");
    expect(knowledgeBand(29).label).toBe("Fresh Discoveries Ahead");
  });

  it("formats fractional points without hiding partial credit", () => {
    expect(formatPoints(1.5, 2)).toBe("1.5/2 points");
    expect(formatScore(100)).toBe("100%");
  });

  it("keeps preference labels distinct from knowledge labels", () => {
    expect(preferenceBand(80).label).not.toBe(knowledgeBand(80).label);
  });

  it("combines partner scores from their real points", () => {
    const maya = summarize([
      compareResponses({ answerType: "single" }, choice("adobo"), choice("adobo")),
      compareResponses({ answerType: "single" }, choice("green"), choice("blue")),
    ]);
    const jordan = summarize([compareResponses({ answerType: "single" }, choice("blue"), choice("blue"))]);
    const couple = combineSummaries(maya, jordan);
    expect(couple.eligible).toBe(3);
    expect(couple.points).toBe(2);
    expect(couple.score).toBeCloseTo((2 / 3) * 100, 3);
  });

  it("builds point badges from exact and close credit", () => {
    const summary = summarize([
      compareResponses({ answerType: "short_text" }, { payload: { text: "mango float" } }, { payload: { text: "mango floats" } }),
      compareResponses({ answerType: "short_text" }, { payload: { text: "I love coffee" } }, { payload: { text: "coffee" } }),
    ]);
    const labels = roundBadges(summary).map((badge) => badge.label);
    expect(labels).toContain("1 exact");
    expect(labels).toContain("1 close");
    expect(roundBadges(summarize([])).map((badge) => badge.label)).toEqual(["Score pending"]);
  });
});
