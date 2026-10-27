import { saveExpenseAction } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { ItineraryExpense } from "@/lib/domain";
import { categoryLabels, expenseStatusLabels, partnerHeading, paymentLabels, splitLabels } from "@/lib/plans/labels";
import type { PlanPartner } from "@/lib/services/plans";

const selectClass = "flex h-11 w-full rounded-2xl border bg-card px-3 text-base outline-none md:text-sm";

export function ExpenseForm({ planId, currency, expense, days, activities, partners, returnTo }: {
  planId: string;
  currency: string;
  expense?: ItineraryExpense;
  days: { id: string; label: string }[];
  activities: { id: string; label: string }[];
  partners: PlanPartner[];
  returnTo: string;
}) {
  const prefix = expense?.id ?? "new-expense";
  return (
    <form action={saveExpenseAction} className="grid gap-3">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <Field id={`${prefix}-name`} label="Expense name">
        <Input id={`${prefix}-name`} name="expenseName" required maxLength={160} defaultValue={expense?.expenseName ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-category`} label="Category">
          <select id={`${prefix}-category`} name="category" className={selectClass} defaultValue={expense?.category ?? "food"}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-status`} label="Status">
          <select id={`${prefix}-status`} name="status" className={selectClass} defaultValue={expense?.status ?? "planned"}>
            {Object.entries(expenseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-day`} label="Day">
          <select id={`${prefix}-day`} name="dayId" className={selectClass} defaultValue={expense?.itineraryDayId ?? ""}>
            <option value="">Unassigned</option>
            {days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-activity`} label="Activity">
          <select id={`${prefix}-activity`} name="activityId" className={selectClass} defaultValue={expense?.itineraryActivityId ?? ""}>
            <option value="">None</option>
            {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-estimated`} label={`Estimated (${currency})`}>
          <Input id={`${prefix}-estimated`} name="estimatedAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense?.estimatedAmount ?? 0} />
        </Field>
        <Field id={`${prefix}-actual`} label={`Actual (${currency})`}>
          <Input id={`${prefix}-actual`} name="actualAmount" inputMode="decimal" min={0} step="0.01" defaultValue={expense?.actualAmount ?? 0} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-paid`} label="Paid by">
          <select id={`${prefix}-paid`} name="paidBy" className={selectClass} defaultValue={expense?.paidBy ?? "shared"}>
            <option value="shared">Shared</option>
            {partners.map((partner) => <option key={partner.userId} value={partner.userId}>{partnerHeading(partner.index, partner.name)}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-payment`} label="Payment method">
          <select id={`${prefix}-payment`} name="paymentMethod" className={selectClass} defaultValue={expense?.paymentMethod ?? ""}>
            <option value="">Not set</option>
            {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${prefix}-split`} label="Cost sharing">
          <select id={`${prefix}-split`} name="splitMethod" className={selectClass} defaultValue={expense?.splitMethod ?? "inherit"}>
            <option value="inherit">Use the plan default</option>
            {Object.entries(splitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-percent`} label="Custom Partner 1 share (%)">
          <Input id={`${prefix}-percent`} name="customSplitPercent" inputMode="decimal" min={0} max={100} step="0.01" defaultValue={expense?.customSplitPercent ?? ""} placeholder="Plan default" />
        </Field>
      </div>
      <Field id={`${prefix}-when`} label="Date and time">
        <Input id={`${prefix}-when`} name="expenseDate" type="datetime-local" required defaultValue={expense?.expenseDate ?? ""} />
      </Field>
      <Field id={`${prefix}-notes`} label="Notes">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} defaultValue={expense?.notes ?? ""} />
      </Field>
      <Field id={`${prefix}-receipt`} label="Receipt or photo">
        <Input id={`${prefix}-receipt`} name="receipt" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" />
      </Field>
      {expense?.receiptPath && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a className="text-primary underline" href={expense.receiptPath}>View receipt</a>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="removeReceipt" value="1" />Remove receipt</label>
        </div>
      )}
      <Button type="submit">{expense ? "Save expense" : "Add expense"}</Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}
