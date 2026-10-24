import { Label } from "@/components/ui/field";

export const relationshipStatuses = ["Dating", "In a relationship", "Engaged", "Married", "It's complicated", "Prefer not to say"] as const;

export function RelationshipStatusField({ id = "relationshipStatus", label = "Relationship status", defaultValue = "" }: { id?: string; label?: string; defaultValue?: string | null }) {
  const current = defaultValue ?? "";
  const known = relationshipStatuses as readonly string[];
  return (
    <label className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name="relationshipStatus" defaultValue={current} aria-label={label} className="h-11 w-full rounded-2xl border bg-white px-3 text-sm text-foreground">
        <option value="">Choose a status</option>
        {current && !known.includes(current) ? <option value={current}>{current}</option> : null}
        {relationshipStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </label>
  );
}
