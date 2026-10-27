"use client";

import { useState } from "react";
import { deleteExpenseAction } from "@/app/(app)/plans/actions";
import { ConfirmSubmit } from "@/components/plans/confirm-submit";
import { ExpenseForm } from "@/components/plans/expense-form";
import type { ItineraryExpense } from "@/lib/domain";
import type { PlanPartner } from "@/lib/services/plans";

export function ExpenseDetails({ expense, planId, currency, days, activities, partners }: {
  expense: ItineraryExpense;
  planId: string;
  currency: string;
  days: { id: string; label: string }[];
  activities: { id: string; label: string }[];
  partners: PlanPartner[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" className="flex min-h-8 items-center text-xs text-primary sm:min-h-11 sm:text-sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Close details" : "Edit details"}
      </button>
      {open && (
        <div className="mt-3">
          <ExpenseForm planId={planId} currency={currency} expense={expense} days={days} activities={activities} partners={partners} returnTo={`/plans/${planId}/budget`} />
          <ConfirmSubmit action={deleteExpenseAction} fields={{ planId, expenseId: expense.id }} label="Delete expense" title="Delete this expense?" description="The daily and trip totals update after it is removed." />
        </div>
      )}
    </div>
  );
}
