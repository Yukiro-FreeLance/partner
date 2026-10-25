import { GENDERS } from "@/lib/gender";
import { Label } from "@/components/ui/field";

export function GenderField({ defaultValue, id = "gender" }: { defaultValue?: string | null; id?: string }) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <Label htmlFor={id}>Gender</Label>
      <select id={id} name="gender" required defaultValue={defaultValue ?? ""} className="h-11 rounded-2xl border bg-white px-3">
        <option value="" disabled>Select gender</option>
        {GENDERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <span className="text-xs leading-5 text-muted-foreground">Female accounts can keep a cycle tracker. Anyone else sees a partner&apos;s cycle only when that partner shares it. You can change this in Profile.</span>
    </label>
  );
}
