import { Input, Label, Textarea } from "@/components/ui/field";
import type { ActivityStatus, ExpenseCategory } from "@/lib/domain";
import { activityStatusLabels, categoryLabels } from "@/lib/plans/labels";

const selectClass = "flex h-11 w-full rounded-2xl border bg-card px-3 text-base outline-none md:text-sm";

export function ActivityFields({ days, dayId, activity, currency }: {
  days: { id: string; label: string }[];
  dayId: string;
  activity?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    mapUrl: string | null;
    startTime: string | null;
    endTime: string | null;
    estimatedCost: number;
    actualCost: number;
    status: ActivityStatus;
    notes: string | null;
    reservation: string | null;
    expenseCategory: ExpenseCategory;
    tracked: boolean;
  };
  currency: string;
}) {
  const prefix = activity?.id ?? "new-activity";
  return (
    <div className="grid gap-3">
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <Field id={`${prefix}-day`} label="Day">
        <select id={`${prefix}-day`} name="dayId" className={selectClass} defaultValue={activity ? dayId : dayId} required>
          {days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
        </select>
      </Field>
      <Field id={`${prefix}-title`} label="Title">
        <Input id={`${prefix}-title`} name="title" required minLength={2} maxLength={160} defaultValue={activity?.title ?? ""} placeholder="Breakfast together" />
      </Field>
      <Field id={`${prefix}-description`} label="Description">
        <Textarea id={`${prefix}-description`} name="description" maxLength={2000} defaultValue={activity?.description ?? ""} placeholder="What you want to do" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-start`} label="Start time">
          <Input id={`${prefix}-start`} name="startTime" type="time" defaultValue={activity?.startTime ?? ""} />
        </Field>
        <Field id={`${prefix}-end`} label="End time">
          <Input id={`${prefix}-end`} name="endTime" type="time" defaultValue={activity?.endTime ?? ""} />
        </Field>
      </div>
      <Field id={`${prefix}-location`} label="Location">
        <Input id={`${prefix}-location`} name="location" maxLength={200} defaultValue={activity?.location ?? ""} placeholder="Manila" />
      </Field>
      <Field id={`${prefix}-map`} label="Map link">
        <Input id={`${prefix}-map`} name="mapUrl" type="url" inputMode="url" defaultValue={activity?.mapUrl ?? ""} placeholder="https://" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-estimated`} label={`Estimated cost (${currency})`}>
          <Input id={`${prefix}-estimated`} name="estimatedCost" inputMode="decimal" min={0} step="0.01" defaultValue={activity?.estimatedCost ?? 0} />
        </Field>
        <Field id={`${prefix}-actual`} label={`Actual cost (${currency})`}>
          <Input id={`${prefix}-actual`} name="actualCost" inputMode="decimal" min={0} step="0.01" defaultValue={activity?.actualCost ?? 0} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-category`} label="Budget category">
          <select id={`${prefix}-category`} name="expenseCategory" className={selectClass} defaultValue={activity?.expenseCategory ?? "other"}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-status`} label="Status">
          <select id={`${prefix}-status`} name="status" className={selectClass} defaultValue={activity?.status ?? "planned"}>
            {Object.entries(activityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="trackExpense" value="1" defaultChecked={activity?.tracked ?? true} />
        Track this cost in the shared budget
      </label>
      <Field id={`${prefix}-reservation`} label="Reservation or ticket details">
        <Input id={`${prefix}-reservation`} name="reservation" maxLength={500} defaultValue={activity?.reservation ?? ""} />
      </Field>
      <Field id={`${prefix}-notes`} label="Notes and reminders">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={activity?.notes ?? ""} />
      </Field>
      <Field id={`${prefix}-photo`} label="Photo">
        <Input id={`${prefix}-photo`} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </Field>
      {activity && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="removePhoto" value="1" />
          Remove the current photo
        </label>
      )}
    </div>
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
