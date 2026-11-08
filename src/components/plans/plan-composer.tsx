"use client";

import { saveActivityAction, saveDayAction } from "@/app/(app)/plans/actions";
import { ActivityFields } from "@/components/plans/activity-fields";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/overlays";

type DayChoice = { id: string; label: string };

export function AddDayButton({ planId, returnTo, startDate, endDate, focus, className, label = "Add a day" }: {
  planId: string;
  returnTo: string;
  startDate: string;
  endDate: string;
  focus: string;
  className?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className={className ?? "h-8 px-3 text-xs"}>{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(100%-2rem,32rem)] overflow-y-auto p-4">
        <DialogTitle className="text-base">Add a day</DialogTitle>
        <DialogDescription className="text-[11px]">Choose a date in this plan and give the day a title.</DialogDescription>
        <form action={saveDayAction} className="mt-3 grid gap-2">
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="grid gap-1 text-xs font-medium" htmlFor="new-day-date">Date<Input id="new-day-date" name="date" type="date" required min={startDate} max={endDate} defaultValue={focus || startDate} className="h-8 text-xs" /></label>
          <label className="grid gap-1 text-xs font-medium" htmlFor="new-day-title">Title<Input id="new-day-title" name="title" required maxLength={120} placeholder="Evening together" className="h-8 text-xs" /></label>
          <label className="grid gap-1 text-xs font-medium" htmlFor="new-day-theme">Theme<Textarea id="new-day-theme" name="description" maxLength={2000} placeholder="What this day is for" className="min-h-16 text-xs" /></label>
          <Button type="submit" className="h-8 px-3 text-xs">Add day</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddActivityButton({ planId, returnTo, days, dayId, currency, className, label = "Add an activity" }: {
  planId: string;
  returnTo: string;
  days: DayChoice[];
  dayId: string;
  currency: string;
  className?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className={className ?? "h-8 bg-secondary px-3 text-xs text-secondary-foreground"}>{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(100%-2rem,40rem)] w-[min(100%-2rem,36rem)] overflow-y-auto p-4">
        <DialogTitle className="text-base">Add an activity</DialogTitle>
        <DialogDescription className="text-[11px]">Drag an activity by its handle, or use Move up and Move down. Costs are added to the budget when tracking is on.</DialogDescription>
        {days.length > 0 ? (
          <form action={saveActivityAction} className="mt-3">
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <ActivityFields days={days} dayId={dayId} currency={currency} />
            <Button className="mt-2 h-8 px-3 text-xs" type="submit">Add activity</Button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Add a day before you add an activity.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
