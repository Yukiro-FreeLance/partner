import type { AnswerPayload, AnswerType } from "@/lib/domain";

export function describeAnswer(type: AnswerType, payload: AnswerPayload, options: { value: string; label: string }[] = [], skipped = false) {
  if (skipped) return "Skipped";
  const labelFor = (value: string) => options.find((option) => option.value === value)?.label ?? value;
  if (payload.choice) return labelFor(payload.choice);
  if (payload.choices?.length) return payload.choices.map(labelFor).join(", ");
  if (typeof payload.scale === "number") return String(payload.scale);
  if (payload.ranking?.length) return payload.ranking.map((value, index) => `${index + 1}. ${labelFor(value)}`).join("  ");
  if (payload.text) return payload.text;
  if (payload.date) return payload.date.slice(0, 10);
  if (payload.mediaId) return payload.text ? `${payload.text} (voice note)` : "Voice note";
  return "No answer yet";
}

export function dependencyMet(
  dependency: { operator: "eq" | "includes"; value: string } | null,
  payload: AnswerPayload | null,
  skipped: boolean,
) {
  if (!dependency || skipped || !payload) return false;
  if (dependency.operator === "eq") return payload.choice === dependency.value;
  return payload.choice === dependency.value || (payload.choices ?? []).includes(dependency.value);
}
