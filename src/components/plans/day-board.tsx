"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { deleteActivityAction, deleteChecklistAction, reorderActivitiesAction, saveActivityAction, saveChecklistAction, toggleChecklistAction } from "@/app/(app)/plans/actions";
import { ActivityFields } from "@/components/plans/activity-fields";
import { ConfirmSubmit } from "@/components/plans/confirm-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ActivityStatus, ExpenseCategory } from "@/lib/domain";
import { activityStatusLabels, formatMoney } from "@/lib/plans/labels";

export type BoardActivity = {
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
  photoPath: string | null;
  expenseCategory: ExpenseCategory;
  tracked: boolean;
  checklist: { id: string; title: string; isCompleted: boolean }[];
};

export function DayBoard({ planId, dayId, dayTitle, currency, days, activities }: {
  planId: string;
  dayId: string;
  dayTitle: string;
  currency: string;
  days: { id: string; label: string }[];
  activities: BoardActivity[];
}) {
  const [items, setItems] = useState(activities);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => setItems(activities), [activities]);
  const [pending, startTransition] = useTransition();
  const ids = items.map((item) => item.id);

  function persist(next: BoardActivity[]) {
    setItems(next);
    const data = new FormData();
    data.set("planId", planId);
    data.set("dayId", dayId);
    data.set("order", next.map((item) => item.id).join(","));
    startTransition(() => reorderActivitiesAction(data));
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...items];
    const from = next.findIndex((item) => item.id === dragId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setDragId(null);
    persist(next);
  }

  return (
    <ol className={`grid gap-2.5 sm:gap-4 lg:grid-cols-2 ${pending ? "opacity-70" : ""}`} aria-label={`${dayTitle} timeline`}>
      {items.map((activity, index) => {
        const up = swap(ids, index, -1);
        const down = swap(ids, index, 1);
        return (
          <li key={activity.id} id={`activity-${activity.id}`} className="relative ml-3 border-l-2 border-[#eadcf5] pl-5 lg:ml-0 lg:border-l-0 lg:pl-0" onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(activity.id)}>
            <span className="absolute top-4 -left-[0.4rem] size-3 rounded-full bg-primary lg:hidden" aria-hidden />
            <article className="h-full rounded-2xl bg-white p-3 shadow-[var(--shadow)] sm:rounded-[1.5rem] sm:p-4">
              <div className="flex items-start gap-1.5">
                <button type="button" className="mt-0.5 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-xl text-muted-foreground sm:size-11 sm:rounded-2xl" draggable aria-label={`Drag to reorder ${activity.title}`} onDragStart={(event) => { setDragId(activity.id); event.dataTransfer.setData("text/plain", activity.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragId(null)}>
                  <GripVertical className="size-3.5 sm:size-4" aria-hidden />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-wide text-rose uppercase leading-4 sm:text-xs">{timeLabel(activity)} · {activityStatusLabels[activity.status]}</p>
                  <h3 className="mt-0.5 font-serif text-base leading-snug sm:text-lg lg:text-2xl">{activity.title}</h3>
                  {activity.description && <p className="mt-1 text-xs leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-5">{activity.description}</p>}
                  {activity.location && <p className="mt-1 text-xs leading-4 sm:mt-2 sm:text-sm">{activity.location}{activity.mapUrl && <> · <a className="text-primary underline" href={activity.mapUrl} target="_blank" rel="noreferrer">Map</a></>}</p>}
                  {(activity.estimatedCost > 0 || activity.actualCost > 0) && <p className="mt-1 text-xs leading-4 sm:mt-2 sm:text-sm">Estimated {formatMoney(activity.estimatedCost, currency)} · Actual {formatMoney(activity.actualCost, currency)}</p>}
                  {activity.reservation && <p className="mt-1 text-xs leading-4 sm:mt-2 sm:text-sm">Reservation: {activity.reservation}</p>}
                  {activity.notes && <p className="mt-1 text-xs leading-4 sm:mt-2 sm:text-sm sm:leading-5">{activity.notes}</p>}
                  {activity.photoPath && <img src={activity.photoPath} alt="" className="mt-3 h-36 w-full rounded-2xl object-cover" />}
                </div>
              </div>
              {activity.checklist.length > 0 && (
                <ul className="mt-2 grid gap-0.5 sm:mt-3 sm:gap-1">
                  {activity.checklist.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#fbf7fc] px-2">
                      <form action={toggleChecklistAction}>
                        <input type="hidden" name="planId" value={planId} />
                        <input type="hidden" name="returnTo" value={`/plans/${planId}`} />
                        <input type="hidden" name="checklistId" value={item.id} />
                        <input type="hidden" name="completed" value={item.isCompleted ? "0" : "1"} />
                        <button type="submit" className="min-h-8 py-1 text-left text-xs leading-4 sm:min-h-11 sm:text-sm" aria-pressed={item.isCompleted}>
                          <span className={item.isCompleted ? "text-muted-foreground line-through" : ""}>{item.title}</span>
                        </button>
                      </form>
                      <ConfirmSubmit action={deleteChecklistAction} fields={{ planId, checklistId: item.id, returnTo: `/plans/${planId}` }} label="Remove" title="Remove this checklist item?" description="This only removes the checklist line." />
                    </li>
                  ))}
                </ul>
              )}
              <form action={saveChecklistAction} className="mt-2 flex gap-1.5 sm:mt-3 sm:gap-2">
                <input type="hidden" name="planId" value={planId} />
                <input type="hidden" name="returnTo" value={`/plans/${planId}`} />
                <input type="hidden" name="activityId" value={activity.id} />
                <Input name="title" maxLength={160} aria-label={`Add a checklist item to ${activity.title}`} placeholder="Add a checklist item" className="h-8 px-3 text-xs sm:h-11 sm:text-sm" />
                <Button type="submit" variant="secondary" size="sm" className="h-8 px-3 text-xs sm:h-9">Add</Button>
              </form>
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {up && <OrderForm planId={planId} dayId={dayId} order={up} label="Move up" />}
                {down && <OrderForm planId={planId} dayId={dayId} order={down} label="Move down" />}
                <ConfirmSubmit action={deleteActivityAction} fields={{ planId, activityId: activity.id, returnTo: `/plans/${planId}` }} label="Delete activity" title="Delete this activity?" description="Checklist items on it are removed. Linked expenses stay in the budget." />
              </div>
              <button type="button" className="mt-1.5 flex min-h-8 items-center text-xs font-medium text-primary sm:mt-3 sm:min-h-11 sm:text-sm" aria-expanded={editing === activity.id} onClick={() => setEditing((current) => current === activity.id ? null : activity.id)}>
                {editing === activity.id ? "Close editor" : "Edit activity"}
              </button>
              {editing === activity.id && (
                <form action={saveActivityAction} className="mt-3">
                  <input type="hidden" name="planId" value={planId} />
                  <input type="hidden" name="returnTo" value={`/plans/${planId}`} />
                  <ActivityFields days={days} dayId={dayId} currency={currency} activity={activity} />
                  <Button className="mt-3" type="submit">Save activity</Button>
                </form>
              )}
            </article>
          </li>
        );
      })}
      {!items.length && <li className="rounded-[1.5rem] bg-white p-4 text-sm text-muted-foreground shadow-[var(--shadow)] lg:col-span-2">No activities on this day yet.</li>}
    </ol>
  );
}

function OrderForm({ planId, dayId, order, label }: { planId: string; dayId: string; order: string[]; label: string }) {
  return (
    <form action={reorderActivitiesAction}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="order" value={order.join(",")} />
      <Button type="submit" variant="secondary" size="sm" className="h-7 px-2.5 text-[11px] sm:h-9 sm:px-3 sm:text-xs">{label}</Button>
    </form>
  );
}

function swap(ids: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const current = next[index];
  const other = next[target];
  if (!current || !other) return null;
  next[index] = other;
  next[target] = current;
  return next;
}

function timeLabel(activity: BoardActivity) {
  if (activity.startTime && activity.endTime) return `${activity.startTime}–${activity.endTime}`;
  return activity.startTime ?? activity.endTime ?? "Anytime";
}
