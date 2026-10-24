import type { AnswerPayload, AnswerType, QuestionConfig, SimilarityValue } from "@/lib/domain";

export type ComparisonKind = "exact" | "partial" | "miss" | "ineligible";

export type Comparison = {
  eligible: boolean;
  points: number;
  kind: ComparisonKind;
  reason: string;
};

type ComparableQuestion = {
  answerType: AnswerType;
  sensitive?: boolean;
  config?: QuestionConfig;
};

type ComparableResponse = {
  payload: AnswerPayload;
  skipped?: boolean;
} | null;

const CHOICE_TYPES = new Set<AnswerType>(["single", "boolean", "yesno", "either", "emoji", "image"]);

export function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ineligible(reason: string): Comparison {
  return { eligible: false, points: 0, kind: "ineligible", reason };
}

function scored(points: number, reason: string): Comparison {
  const rounded = Math.round(points * 1000) / 1000;
  const kind: ComparisonKind = rounded === 1 ? "exact" : rounded === 0 ? "miss" : "partial";
  return { eligible: true, points: rounded, kind, reason };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left.map((item) => normalizeText(item)).filter(Boolean));
  const b = new Set(right.map((item) => normalizeText(item)).filter(Boolean));
  if (a.size === 0 && b.size === 0) return null;
  const union = new Set([...a, ...b]);
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return union.size === 0 ? null : intersection / union.size;
}

function rankingScore(left: string[], right: string[]) {
  const a = left.map((item) => normalizeText(item)).filter(Boolean);
  const b = right.map((item) => normalizeText(item)).filter(Boolean);
  const universe = [...new Set([...a, ...b])];
  if (universe.length === 0) return null;
  const position = (list: string[], item: string) => {
    const index = list.indexOf(item);
    return index === -1 ? list.length : index;
  };
  const distance = universe.reduce((sum, item) => sum + Math.abs(position(a, item) - position(b, item)), 0);
  const max = Math.max(1, Math.floor((universe.length * universe.length) / 2));
  return clamp(1 - distance / max);
}

function markPoints(mark: SimilarityValue) {
  if (mark === "similar") return scored(1, "You both marked these written answers as similar.");
  if (mark === "partial") return scored(0.5, "You marked these written answers as partly similar.");
  return scored(0, "You marked these written answers as different.");
}

export function compareResponses(
  question: ComparableQuestion,
  actual: ComparableResponse,
  prediction: ComparableResponse,
  mark?: SimilarityValue | null,
): Comparison {
  if (actual?.skipped || prediction?.skipped) {
    return ineligible("skipped");
  }
  if (!actual) return ineligible("missing_actual");
  if (!prediction) return ineligible("missing_prediction");
  const type = question.answerType;

  if (CHOICE_TYPES.has(type)) {
    const left = normalizeText(actual.payload.choice ?? "");
    const right = normalizeText(prediction.payload.choice ?? "");
    if (!left || !right) return ineligible("incomplete");
    return left === right
      ? scored(1, "Exact match after ignoring case and extra spaces.")
      : scored(0, "The selected choices are different.");
  }

  if (type === "multi") {
    const score = jaccard(actual.payload.choices ?? [], prediction.payload.choices ?? []);
    if (score === null) return ineligible("incomplete");
    return scored(score, "Multiple-select score uses overlap divided by the combined unique choices.");
  }

  if (type === "scale") {
    const min = question.config?.scaleMin ?? 1;
    const max = question.config?.scaleMax ?? 5;
    const left = actual.payload.scale;
    const right = prediction.payload.scale;
    if (typeof left !== "number" || typeof right !== "number" || max <= min) return ineligible("incomplete");
    const points = clamp(1 - Math.abs(left - right) / (max - min));
    return scored(points, "Rating score is 1 minus the normalized distance between the two ratings.");
  }

  if (type === "ranking") {
    const score = rankingScore(actual.payload.ranking ?? [], prediction.payload.ranking ?? []);
    if (score === null) return ineligible("incomplete");
    return scored(score, "Ranking score uses normalized rank distance. Matching order scores 1.");
  }

  if (type === "date") {
    const left = actual.payload.date?.slice(0, 10);
    const right = prediction.payload.date?.slice(0, 10);
    if (!left || !right) return ineligible("incomplete");
    const leftTime = Date.parse(`${left}T00:00:00Z`);
    const rightTime = Date.parse(`${right}T00:00:00Z`);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return ineligible("incomplete");
    const days = Math.abs(leftTime - rightTime) / 86_400_000;
    if (days === 0) return scored(1, "Same date.");
    if (days === 1) return scored(0.5, "Dates are one day apart, so this counts as a close match.");
    return scored(0, "The dates are more than a day apart.");
  }

  if (type === "short_text" || type === "long_text" || type === "voice") {
    const left = normalizeText(actual.payload.text ?? "");
    const right = normalizeText(prediction.payload.text ?? "");
    if (left && right && left === right) {
      return scored(1, "The written answers match after ignoring case, punctuation, and extra spaces.");
    }
    if (mark) return markPoints(mark);
    return ineligible("unscored_text");
  }

  return ineligible("unsupported");
}

export function isPartnerPrediction(input: { kind: "partner" | "reverse"; predictorId: string; subjectId: string; actualUserId: string }) {
  return input.kind === "partner" && input.predictorId !== input.subjectId && input.subjectId === input.actualUserId;
}

export type ScoreSummary = {
  score: number | null;
  label: string;
  description: string;
  correct: number;
  close: number;
  incorrect: number;
  skipped: number;
  eligible: number;
  points: number;
};

export function knowledgeBand(score: number) {
  if (score >= 90) {
    return {
      label: "In Sync",
      description: "You noticed a lot of the details. There is still room to be surprised by each other.",
    };
  }
  if (score >= 75) {
    return {
      label: "Great Connection",
      description: "You already know a lot, and a few answers are lovely things to keep learning.",
    };
  }
  if (score >= 55) {
    return {
      label: "Getting Closer",
      description: "You are building a real picture of each other, one answer at a time.",
    };
  }
  if (score >= 30) {
    return {
      label: "Learning Each Other",
      description: "There is a warm mix of familiar answers and new discoveries.",
    };
  }
  return {
    label: "Fresh Discoveries Ahead",
    description: "A lower score means there is more to discover. It does not say anything about how much you care.",
  };
}

export function preferenceBand(score: number) {
  if (score >= 90) return { label: "Mostly the same favorites", description: "Your own answers line up closely. That is fun, and it is not required." };
  if (score >= 75) return { label: "Lots in common", description: "You share plenty, with a few differences that make the picture more interesting." };
  if (score >= 55) return { label: "A meaningful mix", description: "Some preferences match and some do not. Different taste is not a problem to solve." };
  if (score >= 30) return { label: "Different in interesting ways", description: "You often want different things. That is material for curiosity, not a verdict." };
  return { label: "Plenty of new territory", description: "Your answers diverge a lot right now. That can make conversations more interesting." };
}

export function summarize(comparisons: Comparison[], purpose: "knowledge" | "preference" = "knowledge"): ScoreSummary {
  const eligibleRows = comparisons.filter((item) => item.eligible);
  const skipped = comparisons.filter((item) => !item.eligible && item.reason === "skipped").length;
  const points = eligibleRows.reduce((sum, item) => sum + item.points, 0);
  if (eligibleRows.length === 0) {
    return {
      score: null,
      label: "Not enough answers yet",
      description:
        purpose === "knowledge"
          ? "A score appears when your guess can be compared with an answer your partner has finished. Skipped questions stay out of the math."
          : "Preference alignment appears after both of you have answered the same question.",
      correct: 0,
      close: 0,
      incorrect: 0,
      skipped,
      eligible: 0,
      points: 0,
    };
  }
  const score = (points / eligibleRows.length) * 100;
  const band = purpose === "knowledge" ? knowledgeBand(score) : preferenceBand(score);
  return {
    score,
    label: band.label,
    description: band.description,
    correct: eligibleRows.filter((item) => item.points === 1).length,
    close: eligibleRows.filter((item) => item.points > 0 && item.points < 1).length,
    incorrect: eligibleRows.filter((item) => item.points === 0).length,
    skipped,
    eligible: eligibleRows.length,
    points,
  };
}

export function combineSummaries(left: ScoreSummary, right: ScoreSummary): ScoreSummary {
  const eligible = left.eligible + right.eligible;
  const points = left.points + right.points;
  const skipped = left.skipped + right.skipped;
  if (eligible === 0) {
    const empty = summarize([], "knowledge");
    return { ...empty, skipped };
  }
  const score = (points / eligible) * 100;
  const band = knowledgeBand(score);
  return {
    score,
    label: band.label,
    description: band.description,
    correct: left.correct + right.correct,
    close: left.close + right.close,
    incorrect: left.incorrect + right.incorrect,
    skipped,
    eligible,
    points,
  };
}

export function formatScore(score: number | null) {
  if (score === null) return "Not enough answers yet";
  return `${Math.round(score)}%`;
}

export const SCORE_DISCLAIMER =
  "This is a playful snapshot of what you have shared so far. It is not a scientific assessment, and it does not measure love, commitment, happiness, loyalty, or how long a relationship will last. A lower score means there is more to discover.";
