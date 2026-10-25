export const GENDERS = [
  ["female", "Female"],
  ["male", "Male"],
  ["unspecified", "Prefer not to say"],
] as const;

export type Gender = (typeof GENDERS)[number][0];

export function tracksOwnCycle(gender: string | null | undefined) {
  return gender === "female";
}

export function genderLabel(gender: string | null | undefined) {
  return GENDERS.find(([value]) => value === gender)?.[1] ?? "Not set";
}
