"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { deleteActivityAction, deleteChecklistAction, reorderActivitiesAction, saveActivityAction, saveChecklistAction, toggleChecklistAction } from "@/app/(app)/plans/actions";
import { ActivityFields } from "@/components/plans/activity-fields";
import { ConfirmSubmit } from "@/components/plans/confirm-submit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ActivityStatus, ExpenseCategory } from "@/lib/domain";
import { activityStatusLabels, clockSession, formatClockRange, formatMoney } from "@/lib/plans/labels";

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

export function DayBoard({ planId, dayId, dayTitle, currency, days, activities, returnTo = `/plans/${planId}` }: {
  planId: string;
  dayId: string;
  dayTitle: string;
  currency: string;
  days: { id: string; label: string }[];
  activities: BoardActivity[];
  returnTo?: string;
}) {
  const [items, setItems] = useState(activities);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => setItems(activities), [activities]);
  const [pending, startTransition] = useTransition();

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
    const groups = groupSessions(items);
    const fromGroup = groups.find((group) => group.rows.some((row) => row.id === dragId));
    const toGroup = groups.find((group) => group.rows.some((row) => row.id === targetId));
    if (!fromGroup || !toGroup || fromGroup.label !== toGroup.label) {
      setDragId(null);
      return;
    }
    const next = [...fromGroup.rows];
    const from = next.findIndex((item) => item.id === dragId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setDragId(null);
    persist(groups.flatMap((group) => group.label === fromGroup.label ? next : group.rows));
  }

  const groups = groupSessions(items);
  const columns = (["AM", "PM"] as const).map((label) => groups.find((group) => group.label === label) ?? { label, rows: [] as BoardActivity[] });
  const anytime = groups.find((group) => group.label === "Anytime");

  function renderActivity(activity: BoardActivity) {
    const up = sessionMove(items, activity.id, -1);
    const down = sessionMove(items, activity.id, 1);
    const details = [
          activity.location ? <>{activity.location}{activity.mapUrl && <> · <a className="text-primary underline" href={activity.mapUrl} target="_blank" rel="noreferrer">Map</a></>}</> : null,
          activity.estimatedCost > 0 || activity.actualCost > 0 ? `Estimated ${formatMoney(activity.estimatedCost, currency)} · Actual ${formatMoney(activity.actualCost, currency)}` : null,
          activity.reservation ? `Reservation: ${activity.reservation}` : null,
          activity.notes,
        ].filter(Boolean);
    return (
          <li key={activity.id} id={`activity-${activity.id}`} className="relative ml-2.5 border-l border-[#eadcf5] pl-3 lg:ml-0 lg:border-l-0 lg:pl-0" onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(activity.id)}>
            <span className="absolute top-3 -left-[0.28rem] size-2 rounded-full bg-primary lg:hidden" aria-hidden />
            <article className="rounded-xl bg-white p-2.5 shadow-[var(--shadow)]">
              <div className="flex items-start gap-1">
                <button type="button" className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground" draggable aria-label={`Drag to reorder ${activity.title}`} onDragStart={(event) => { setDragId(activity.id); event.dataTransfer.setData("text/plain", activity.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragId(null)}>
                  <GripVertical className="size-3.5" aria-hidden />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-wide text-rose uppercase leading-4">{formatClockRange(activity.startTime, activity.endTime)} · {activityStatusLabels[activity.status]}</p>
                  <h3 className="font-serif text-[13px] leading-snug">{activity.title}</h3>
                  {activity.description && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{activity.description}</p>}
                  {details.length > 0 && (
                    <div className="mt-1 grid gap-0.5 text-[11px] leading-4">
                      {details.map((detail, detailIndex) => <p key={detailIndex}>{detail}</p>)}
                    </div>
                  )}
                  {activity.photoPath && <img src={activity.photoPath} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />}
                </div>
              </div>
              <div className="mt-2 border-t border-[#f3eaf8] pt-1.5">
                {activity.checklist.length > 0 && (
                  <ul className="mb-1.5 grid gap-px">
                    {activity.checklist.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-1 rounded-lg bg-[#fbf7fc] px-2">
                        <form action={toggleChecklistAction} className="min-w-0 flex-1">
                          <input type="hidden" name="planId" value={planId} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <input type="hidden" name="checklistId" value={item.id} />
                          <input type="hidden" name="completed" value={item.isCompleted ? "0" : "1"} />
                          <button type="submit" className="w-full min-h-6 py-0.5 text-left text-[11px] leading-4" aria-pressed={item.isCompleted}>
                            <span className={item.isCompleted ? "text-muted-foreground line-through" : ""}>{item.title}</span>
                          </button>
                        </form>
                        <ConfirmSubmit action={deleteChecklistAction} fields={{ planId, checklistId: item.id, returnTo }} label="Remove" title="Remove this checklist item?" description="This only removes the checklist line." />
                      </li>
                    ))}
                  </ul>
                )}
                <form action={saveChecklistAction} className="flex gap-1">
                  <input type="hidden" name="planId" value={planId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="activityId" value={activity.id} />
                  <Input name="title" maxLength={160} aria-label={`Add a checklist item to ${activity.title}`} placeholder="Add a checklist item" className="h-7 rounded-lg px-2.5 text-[11px]" />
                  <Button type="submit" variant="secondary" size="sm" className="h-7 px-2.5 text-[11px]">Add</Button>
                </form>
                <div className="mt-1 flex flex-wrap items-center gap-0.5">
                  {up && <OrderForm planId={planId} dayId={dayId} order={up} label="Move up" returnTo={returnTo} />}
                  {down && <OrderForm planId={planId} dayId={dayId} order={down} label="Move down" returnTo={returnTo} />}
                  <ConfirmSubmit action={deleteActivityAction} fields={{ planId, activityId: activity.id, returnTo }} label="Delete activity" title="Delete this activity?" description="Checklist items on it are removed. Linked expenses stay in the budget." />
                  <button type="button" className="inline-flex h-6 items-center px-1.5 text-[11px] font-medium text-primary" aria-expanded={editing === activity.id} onClick={() => setEditing((current) => current === activity.id ? null : activity.id)}>
                    {editing === activity.id ? "Close editor" : "Edit activity"}
                  </button>
                </div>
              </div>
              {editing === activity.id && (
                <form action={saveActivityAction} className="mt-2">
                  <input type="hidden" name="planId" value={planId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <ActivityFields days={days} dayId={dayId} currency={currency} activity={activity} />
                  <Button className="mt-2 h-8 px-3 text-xs" type="submit">Save activity</Button>
                </form>
              )}
            </article>
          </li>
    );
  }

  return (
    <div className={pending ? "opacity-70" : ""}>
      {items.length > 0 && <div className="grid items-start gap-3 lg:grid-cols-2">
        {columns.map((group) => (
          <section key={group.label} aria-label={`${dayTitle} ${group.label}`} className={group.rows.length ? "min-w-0" : "hidden min-w-0 lg:block"}>
            <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-rose uppercase">{group.label}</p>
            <ol className="grid gap-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:pr-1">
              {group.rows.map((activity) => renderActivity(activity))}
              {!group.rows.length && <li className="rounded-xl bg-white p-3 text-xs text-muted-foreground shadow-[var(--shadow)]">Nothing scheduled.</li>}
            </ol>
          </section>
        ))}
      </div>}
      {anytime && anytime.rows.length > 0 && (
        <section aria-label={`${dayTitle} Anytime`} className="mt-3 min-w-0">
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.16em] text-rose uppercase">Anytime</p>
          <ol className="grid gap-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:overscroll-y-contain lg:pr-1">
            {anytime.rows.map((activity) => renderActivity(activity))}
          </ol>
        </section>
      )}
      {!items.length && <p className="rounded-xl bg-white p-3 text-xs text-muted-foreground shadow-[var(--shadow)]">No activities on this day yet.</p>}
    </div>
  );
}

function OrderForm({ planId, dayId, order, label, returnTo }: { planId: string; dayId: string; order: string[]; label: string; returnTo: string }) {
  return (
    <form action={reorderActivitiesAction}>
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="order" value={order.join(",")} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button type="submit" variant="secondary" size="sm" className="h-6 px-2 text-[11px]">{label}</Button>
    </form>
  );
}

function groupSessions(activities: BoardActivity[]) {
  return (["AM", "PM", "Anytime"] as const)
    .map((label) => ({
      label,
      rows: activities
        .filter((activity) => clockSession(activity.startTime, activity.endTime) === label)
        .slice()
        .sort((a, b) => (a.startTime ?? a.endTime ?? "99:99").localeCompare(b.startTime ?? b.endTime ?? "99:99") || (a.endTime ?? "").localeCompare(b.endTime ?? "")),
    }))
    .filter((group) => group.rows.length > 0);
}

function sessionMove(activities: BoardActivity[], activityId: string, direction: -1 | 1) {
  const groups = groupSessions(activities);
  const session = groups.find((group) => group.rows.some((row) => row.id === activityId));
  if (!session) return null;
  const index = session.rows.findIndex((row) => row.id === activityId);
  const swapped = swap(session.rows.map((row) => row.id), index, direction);
  if (!swapped) return null;
  return groups.flatMap((group) => group.label === session.label ? swapped : group.rows.map((row) => row.id));
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

