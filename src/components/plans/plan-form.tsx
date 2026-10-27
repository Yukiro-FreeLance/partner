import { updatePlanAction, createPlanAction } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { DatePlan } from "@/lib/domain";
import { eventTypeLabels, planStatusLabels, splitLabels } from "@/lib/plans/labels";

const selectClass = "flex h-11 w-full rounded-2xl border bg-card px-3 text-base outline-none md:text-sm";

export function PlanForm({ plan }: { plan?: DatePlan }) {
  return (
    <form action={plan ? updatePlanAction : createPlanAction} className="grid gap-4">
      {plan && <input type="hidden" name="planId" value={plan.id} />}
      <Field id="title" label="Title">
        <Input id="title" name="title" required minLength={2} maxLength={120} defaultValue={plan?.title ?? ""} placeholder="MCR Concert Trip — Manila" />
      </Field>
      <Field id="description" label="Description">
        <Textarea id="description" name="description" maxLength={2000} defaultValue={plan?.description ?? ""} />
      </Field>
      <Field id="destination" label="Destination">
        <Input id="destination" name="destination" maxLength={160} defaultValue={plan?.destination ?? ""} placeholder="Manila, Philippines" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="startDate" label="Start date">
          <Input id="startDate" name="startDate" type="date" required defaultValue={plan?.startDate ?? ""} />
        </Field>
        <Field id="endDate" label="End date">
          <Input id="endDate" name="endDate" type="date" required defaultValue={plan?.endDate ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="eventType" label="Event type">
          <select id="eventType" name="eventType" className={selectClass} defaultValue={plan?.eventType ?? "date_night"}>
            {Object.entries(eventTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id="status" label="Planning status">
          <select id="status" name="status" className={selectClass} defaultValue={plan?.status ?? "planning"}>
            {Object.entries(planStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="currency" label="Currency">
          <Input id="currency" name="currency" required minLength={3} maxLength={3} defaultValue={plan?.currency ?? "PHP"} className="uppercase" />
        </Field>
        <Field id="estimatedBudget" label="Trip budget">
          <Input id="estimatedBudget" name="estimatedBudget" inputMode="decimal" min={0} step="0.01" defaultValue={plan?.estimatedBudget ?? 0} />
        </Field>
      </div>
      <Field id="splitMethod" label="Cost sharing">
        <select id="splitMethod" name="splitMethod" className={selectClass} defaultValue={plan?.splitMethod ?? "fifty_fifty"}>
          {Object.entries(splitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="customSplitPercent" label="Partner 1 share (%)">
          <Input id="customSplitPercent" name="customSplitPercent" inputMode="decimal" min={0} max={100} step="0.01" defaultValue={plan?.customSplitPercent ?? 50} />
        </Field>
        <Field id="fixedContribution" label="Fixed contribution each">
          <Input id="fixedContribution" name="fixedContribution" inputMode="decimal" min={0} step="0.01" defaultValue={plan?.fixedContribution ?? 0} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="warningThreshold" label="Warning at (%)">
          <Input id="warningThreshold" name="warningThreshold" inputMode="decimal" min={1} max={100} step="1" required defaultValue={plan?.warningThreshold ?? 80} />
        </Field>
        <Field id="dailyLimit" label="Daily spending limit">
          <Input id="dailyLimit" name="dailyLimit" inputMode="decimal" min={0} step="0.01" defaultValue={plan?.dailyLimit ?? ""} placeholder="Optional" />
        </Field>
      </div>
      <Field id="cover" label="Cover image">
        <Input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </Field>
      {plan?.coverImage && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="removeCover" value="1" />
          Remove the current cover
        </label>
      )}
      <p className="text-xs leading-5 text-muted-foreground">Partner 1 is the person who joined the couple space first. The trip budget is the spending limit. Daily totals come from the expense records.</p>
      <Button type="submit">{plan ? "Save plan" : "Create plan"}</Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
