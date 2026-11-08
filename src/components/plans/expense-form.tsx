"use client";

import { useRef, useState } from "react";
import { saveExpenseAction, scanReceiptAction } from "@/app/(app)/plans/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/overlays";
import type { ExpenseCategory, ExpenseSplitMethod, ExpenseStatus, ItineraryExpense, PaymentMethod } from "@/lib/domain";
import { categoryLabels, expenseStatusLabels, partnerHeading, paymentLabels, splitLabels } from "@/lib/plans/labels";
import type { PlanPartner } from "@/lib/services/plans";

const selectClass = "flex h-8 w-full rounded-xl border bg-card px-2.5 text-xs outline-none";

export function AddExpenseButton({ planId, currency, days, activities, partners, returnTo, defaultDayId = "", defaultDate = "", className, label = "Add expense" }: {
  planId: string;
  currency: string;
  days: { id: string; label: string }[];
  activities: { id: string; label: string }[];
  partners: PlanPartner[];
  returnTo: string;
  defaultDayId?: string;
  defaultDate?: string;
  className?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className={className ?? "h-8 px-3 text-xs"}>{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(100%-2rem,42rem)] w-[min(100%-2rem,40rem)] overflow-y-auto p-4">
        <DialogTitle className="text-base">Add an expense</DialogTitle>
        <DialogDescription className="text-[11px]">Scan a receipt with a free vision model to fill the purchase, total, and store, then save it to the shared budget.</DialogDescription>
        <div className="mt-3">
          <ExpenseForm planId={planId} currency={currency} days={days} activities={activities} partners={partners} returnTo={returnTo} defaultDayId={defaultDayId} defaultDate={defaultDate} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseForm({ planId, currency, expense, days, activities, partners, returnTo, defaultDayId = "", defaultDate = "" }: {
  planId: string;
  currency: string;
  expense?: ItineraryExpense;
  days: { id: string; label: string }[];
  activities: { id: string; label: string }[];
  partners: PlanPartner[];
  returnTo: string;
  defaultDayId?: string;
  defaultDate?: string;
}) {
  const prefix = expense?.id ?? "new-expense";
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [name, setName] = useState(expense?.expenseName ?? "");
  const [store, setStore] = useState(readStore(expense?.notes));
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "food");
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status ?? "planned");
  const [dayId, setDayId] = useState(expense?.itineraryDayId ?? defaultDayId);
  const [activityId, setActivityId] = useState(expense?.itineraryActivityId ?? "");
  const [estimated, setEstimated] = useState(String(expense?.estimatedAmount ?? 0));
  const [actual, setActual] = useState(String(expense?.actualAmount ?? 0));
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? "shared");
  const [payment, setPayment] = useState(expense?.paymentMethod ?? "");
  const [split, setSplit] = useState<ExpenseSplitMethod>(expense?.splitMethod ?? "inherit");
  const [percent, setPercent] = useState(expense?.customSplitPercent == null ? "" : String(expense.customSplitPercent));
  const [when, setWhen] = useState(toLocal(expense?.expenseDate) || defaultDate);
  const [notes, setNotes] = useState(notesWithoutStore(expense?.notes));

  function onFile(file: File | undefined) {
    setScanError("");
    setScanNote("");
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
  }

  async function scan() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setScanError("Choose a receipt photo first.");
      return;
    }
    setScanning(true);
    setScanError("");
    setScanNote("");
    const data = new FormData();
    data.set("receipt", file);
    const result = await scanReceiptAction(data);
    setScanning(false);
    if (!result.ok) {
      setScanError(result.error);
      return;
    }
    setName(result.purchase);
    setStore(result.store);
    setCategory(result.category);
    if (result.paymentMethod) setPayment(result.paymentMethod);
    if (result.purchasedAt) setWhen(result.purchasedAt);
    if (result.items) setNotes(result.items);
    if (result.total != null) {
      setActual(String(result.total));
      if (!expense || Number(estimated) === 0) setEstimated(String(result.total));
    }
    setStatus("paid");
    setScanNote(result.total == null ? "Filled what could be read. Add the total before you save." : "Receipt details are in the form. Review them, then save.");
  }

  return (
    <form action={saveExpenseAction} className="grid gap-2">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <div className="rounded-xl border border-dashed border-[#eadcf5] bg-[#fbf7fc] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-rose uppercase">Receipt</p>
          <Button type="button" variant="secondary" className="h-7 px-2.5 text-[11px]" disabled={scanning} onClick={() => void scan()}>{scanning ? "Reading…" : "Scan receipt"}</Button>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">A clear photo fills the purchase, total, store, and line items through free Gemini, OpenRouter, or Groq vision models.</p>
        {preview && <img src={preview} alt="Receipt preview" className="mt-2 h-24 w-full rounded-lg object-contain bg-white" />}
        <Input ref={fileRef} id={`${prefix}-receipt`} name="receipt" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="mt-2 h-8 text-[11px]" onChange={(event) => onFile(event.target.files?.[0])} />
        {scanError && <p className="mt-1 text-[11px] leading-4 text-rose-700" role="alert">{scanError}</p>}
        {scanNote && <p className="mt-1 text-[11px] leading-4 text-emerald-800">{scanNote}</p>}
        {expense?.receiptPath && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <a className="text-primary underline" href={expense.receiptPath}>View saved receipt</a>
            <label className="flex items-center gap-1"><input type="checkbox" name="removeReceipt" value="1" />Remove</label>
          </div>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-store`} label="Store">
          <Input id={`${prefix}-store`} name="store" maxLength={120} value={store} placeholder="Shop or restaurant" className="h-8 text-xs" onChange={(event) => setStore(event.target.value)} />
        </Field>
        <Field id={`${prefix}-name`} label="Purchase">
          <Input id={`${prefix}-name`} name="expenseName" required maxLength={160} value={name} placeholder="What you bought" className="h-8 text-xs" onChange={(event) => setName(event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-actual`} label={`Total (${currency})`}>
          <Input id={`${prefix}-actual`} name="actualAmount" inputMode="decimal" min={0} step="0.01" value={actual} className="h-8 text-xs" onChange={(event) => setActual(event.target.value)} />
        </Field>
        <Field id={`${prefix}-estimated`} label={`Estimated (${currency})`}>
          <Input id={`${prefix}-estimated`} name="estimatedAmount" inputMode="decimal" min={0} step="0.01" value={estimated} className="h-8 text-xs" onChange={(event) => setEstimated(event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-category`} label="Category">
          <select id={`${prefix}-category`} name="category" className={selectClass} value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-status`} label="Status">
          <select id={`${prefix}-status`} name="status" className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as ExpenseStatus)}>
            {Object.entries(expenseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-when`} label="Date and time">
          <Input id={`${prefix}-when`} name="expenseDate" type="datetime-local" required value={when} className="h-8 text-xs" onChange={(event) => setWhen(event.target.value)} />
        </Field>
        <Field id={`${prefix}-payment`} label="Payment">
          <select id={`${prefix}-payment`} name="paymentMethod" className={selectClass} value={payment} onChange={(event) => setPayment(event.target.value as PaymentMethod | "")}>
            <option value="">Not set</option>
            {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-day`} label="Day">
          <select id={`${prefix}-day`} name="dayId" className={selectClass} value={dayId} onChange={(event) => setDayId(event.target.value)}>
            <option value="">Unassigned</option>
            {days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-activity`} label="Activity">
          <select id={`${prefix}-activity`} name="activityId" className={selectClass} value={activityId ?? ""} onChange={(event) => setActivityId(event.target.value)}>
            <option value="">None</option>
            {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field id={`${prefix}-paid`} label="Paid by">
          <select id={`${prefix}-paid`} name="paidBy" className={selectClass} value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
            <option value="shared">Shared</option>
            {partners.map((partner) => <option key={partner.userId} value={partner.userId}>{partnerHeading(partner.index, partner.name)}</option>)}
          </select>
        </Field>
        <Field id={`${prefix}-split`} label="Cost sharing">
          <select id={`${prefix}-split`} name="splitMethod" className={selectClass} value={split} onChange={(event) => setSplit(event.target.value as ExpenseSplitMethod)}>
            <option value="inherit">Use the plan default</option>
            {Object.entries(splitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <Field id={`${prefix}-percent`} label="Custom Partner 1 share (%)">
        <Input id={`${prefix}-percent`} name="customSplitPercent" inputMode="decimal" min={0} max={100} step="0.01" value={percent} placeholder="Plan default" className="h-8 text-xs" onChange={(event) => setPercent(event.target.value)} />
      </Field>
      <Field id={`${prefix}-notes`} label="Items and notes">
        <Textarea id={`${prefix}-notes`} name="notes" maxLength={2000} value={notes} placeholder="Line items from the receipt" className="min-h-16 text-xs" onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <Button type="submit" className="h-8 px-3 text-xs">{expense ? "Save expense" : "Add expense"}</Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="grid gap-1"><Label htmlFor={id} className="text-xs">{label}</Label>{children}</div>;
}

function readStore(notes: string | null | undefined) {
  return notes?.match(/^Store:\s*(.+)$/m)?.[1]?.trim() ?? "";
}

function notesWithoutStore(notes: string | null | undefined) {
  return (notes ?? "").replace(/^Store:[^\n]*(?:\r?\n)?/, "").trim();
}

function toLocal(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00`;
  return "";
}
