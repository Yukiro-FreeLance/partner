import type { Repository } from "@/lib/data/repository";
import type {
  DatePlan,
  ItineraryActivity,
  ItineraryChecklist,
  ItineraryComment,
  ItineraryDay,
  ItineraryExpense,
  ItineraryHistory,
} from "@/lib/domain";
import { createId } from "@/lib/ids";
import { formatMoney } from "@/lib/plans/labels";
import { roundMoney, summarizeTrip, type LedgerExpense, type TripSummary } from "@/lib/plans/money";
import type { ActivityInput, DayInput, ExpenseInput, PlanInput } from "@/lib/plans/parse";
import { isSamplePlanTitle, sampleDays, samplePlan, SAMPLE_PLAN_TITLE } from "@/lib/plans/sample";
import { fail, ok, type Result } from "@/lib/result";
import { activeMembership, notifyUser, otherPartner, writeAudit } from "@/lib/services/access";

export type PlanPartner = { userId: string; name: string; index: number };

export type PlanCardModel = { plan: DatePlan; summary: TripSummary };

export type PlanDetail = {
  plan: DatePlan;
  days: ItineraryDay[];
  activities: ItineraryActivity[];
  checklists: ItineraryChecklist[];
  expenses: ItineraryExpense[];
  comments: ItineraryComment[];
  history: ItineraryHistory[];
  partners: PlanPartner[];
  summary: TripSummary;
};

type WriteOptions = { quiet?: boolean };

export async function listDatePlans(repo: Repository, userId: string): Promise<Result<PlanCardModel[]>> {
  const member = await activeMembership(repo, userId);
  if (!member) return ok([]);
  const partners = await loadPartners(repo, member.coupleId);
  const plans = (await repo.list("datePlans", { eq: { coupleId: member.coupleId } })).map(asPlan).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const ids = plans.map((plan) => plan.id);
  const [expenseRows, dayRows] = ids.length
    ? await Promise.all([
      repo.list("itineraryExpenses", { in: { datePlanId: ids } }),
      repo.list("itineraryDays", { in: { datePlanId: ids } }),
    ])
    : [[], []];
  const expenses = expenseRows.map(asExpense);
  const days = dayRows.map(asDay);
  return ok(plans.map((plan) => ({
    plan,
    summary: summaryFor(plan, partners.map((partner) => partner.userId), expenses.filter((expense) => expense.datePlanId === plan.id), days.filter((day) => day.datePlanId === plan.id)),
  })));
}

export async function loadDatePlan(repo: Repository, userId: string, planId: string): Promise<Result<PlanDetail>> {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const plan = access.data;
  const [partners, days, expenses, comments, history] = await Promise.all([
    loadPartners(repo, plan.coupleId),
    repo.list("itineraryDays", { eq: { datePlanId: plan.id } }),
    repo.list("itineraryExpenses", { eq: { datePlanId: plan.id } }),
    repo.list("itineraryComments", { eq: { datePlanId: plan.id } }),
    repo.list("itineraryHistory", { eq: { datePlanId: plan.id } }),
  ]);
  const dayRows = days.map(asDay).sort((a, b) => a.sortOrder - b.sortOrder || a.date.localeCompare(b.date));
  const dayIds = dayRows.map((day) => day.id);
  const activities = dayIds.length ? (await repo.list("itineraryActivities", { in: { itineraryDayId: dayIds } })).map(asActivity) : [];
  const activityIds = activities.map((activity) => activity.id);
  const checklists = activityIds.length ? (await repo.list("itineraryChecklists", { in: { itineraryActivityId: activityIds } })).map(asChecklist) : [];
  activities.sort((a, b) => a.sortOrder - b.sortOrder || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  return ok({
    plan,
    days: dayRows,
    activities,
    checklists: checklists.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    expenses: expenses.map(asExpense).sort((a, b) => a.expenseDate.localeCompare(b.expenseDate)),
    comments: comments.map(asComment).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    history: history.map(asHistory).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    partners,
    summary: summaryFor(plan, partners.map((partner) => partner.userId), expenses.map(asExpense), dayRows),
  });
}

export async function createDatePlan(repo: Repository, userId: string, input: PlanInput, coverImage: string | null = null, options?: WriteOptions) {
  const member = await activeMembership(repo, userId);
  if (!member) return fail("Create or join a couple space before planning a date.");
  const stamp = now();
  const plan: DatePlan = {
    id: createId(),
    coupleId: member.coupleId,
    ...input,
    coverImage,
    createdBy: userId,
    updatedBy: userId,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await repo.insert("datePlans", plan);
  await record(repo, plan.id, userId, "plan.created", `Created ${plan.title}.`);
  await writeAudit(repo, userId, "date_plan.create", plan.coupleId);
  if (!options?.quiet) await tellPartner(repo, plan, userId, "A new plan is ready", `${plan.title} was added to your shared plans.`, `/plans/${plan.id}`);
  return ok(plan);
}

export async function updateDatePlan(repo: Repository, userId: string, planId: string, input: PlanInput, cover?: string | null) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const before = await currentSummary(repo, access.data);
  const plan = await repo.update("datePlans", planId, {
    ...input,
    coverImage: cover === undefined ? access.data.coverImage : cover,
    updatedBy: userId,
    updatedAt: now(),
  });
  const saved = asPlan(plan);
  await record(repo, planId, userId, "plan.updated", `Updated ${saved.title}.`);
  await watchBudget(repo, saved, userId, before);
  await tellPartner(repo, saved, userId, "A plan was updated", `${saved.title} has new dates, budget, or sharing settings.`, `/plans/${planId}/edit`);
  return ok(saved);
}

export async function deleteDatePlan(repo: Repository, userId: string, planId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const plan = access.data;
  await removePlanGraph(repo, plan.id);
  await writeAudit(repo, userId, "date_plan.delete", plan.coupleId);
  await tellPartner(repo, plan, userId, "A plan was removed", `${plan.title} was deleted from your shared plans.`, "/plans");
  return ok({ id: plan.id });
}

export async function createSampleDatePlan(repo: Repository, userId: string) {
  const member = await activeMembership(repo, userId);
  if (!member) return fail("Create or join a couple space before planning a date.");
  const existing = (await repo.list("datePlans", { eq: { coupleId: member.coupleId } })).find((plan) => isSamplePlanTitle(plan.title));
  if (existing) {
    const days = await repo.list("itineraryDays", { eq: { datePlanId: existing.id } });
    if (days.length >= sampleDays.length) return ok({ id: existing.id, created: false });
    await removePlanGraph(repo, existing.id);
  }
  const created = await createDatePlan(repo, userId, {
    title: samplePlan.title,
    description: samplePlan.description,
    destination: samplePlan.destination,
    startDate: samplePlan.startDate,
    endDate: samplePlan.endDate,
    eventType: samplePlan.eventType,
    currency: samplePlan.currency,
    estimatedBudget: samplePlan.estimatedBudget,
    status: samplePlan.status,
    splitMethod: "fifty_fifty",
    customSplitPercent: 50,
    fixedContribution: 0,
    warningThreshold: 80,
    dailyLimit: null,
  }, null, { quiet: true });
  if (!created.ok) return created;
  const stamp = now();
  for (const [index, day] of sampleDays.entries()) {
    const dayId = createId();
    await repo.insert("itineraryDays", {
      id: dayId,
      datePlanId: created.data.id,
      date: day.date,
      title: day.title,
      description: day.description,
      sortOrder: index,
      createdAt: stamp,
      updatedAt: stamp,
    });
    for (const [activityIndex, activity] of day.activities.entries()) {
      const activityId = createId();
      await repo.insert("itineraryActivities", {
        id: activityId,
        itineraryDayId: dayId,
        title: activity.title,
        description: activity.description,
        location: activity.location ?? null,
        mapUrl: activity.mapUrl ?? null,
        startTime: activity.start,
        endTime: activity.end,
        estimatedCost: 0,
        actualCost: 0,
        status: "planned",
        sortOrder: activityIndex,
        notes: activity.notes ?? null,
        reservation: activity.reservation ?? null,
        photoPath: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: stamp,
        updatedAt: stamp,
      });
      for (const item of activity.checklist ?? []) {
        await repo.insert("itineraryChecklists", {
          id: createId(),
          itineraryActivityId: activityId,
          title: item,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
    }
    for (const expense of day.expenses) {
      await repo.insert("itineraryExpenses", {
        id: createId(),
        datePlanId: created.data.id,
        itineraryDayId: dayId,
        itineraryActivityId: null,
        expenseName: expense.name,
        category: expense.category,
        estimatedAmount: expense.estimated,
        actualAmount: 0,
        paidBy: "shared",
        splitMethod: "inherit",
        customSplitPercent: null,
        paymentMethod: null,
        expenseDate: `${day.date}T12:00`,
        receiptPath: null,
        notes: "Sample estimate. Replace it with your own amount.",
        status: "planned",
        createdBy: userId,
        updatedBy: userId,
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  }
  await record(repo, created.data.id, userId, "plan.created", "Added the Manila concert sample itinerary.");
  await tellPartner(repo, created.data, userId, "A sample trip is ready", `${SAMPLE_PLAN_TITLE} is in your shared plans.`, `/plans/${created.data.id}`);
  return ok({ id: created.data.id, created: true });
}

export async function saveItineraryDay(repo: Repository, userId: string, planId: string, input: DayInput, options?: WriteOptions & { sortOrder?: number }) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  if (input.date < access.data.startDate || input.date > access.data.endDate) return fail("That day is outside the plan dates. Update the plan dates first.");
  const stamp = now();
  if (input.id) {
    const day = await dayOnPlan(repo, planId, input.id);
    if (!day) return fail("That day is not on this plan.");
    const saved = asDay(await repo.update("itineraryDays", input.id, {
      date: input.date,
      title: input.title,
      description: input.description,
      updatedAt: stamp,
    }));
    await touch(repo, planId, userId);
    if (!options?.quiet) {
      await record(repo, planId, userId, "day.saved", `Updated ${saved.title}.`);
      await tellPartner(repo, access.data, userId, "The itinerary changed", `${saved.title} was updated on ${access.data.title}.`, `/plans/${planId}`);
    }
    return ok(saved);
  }
  const days = await repo.list("itineraryDays", { eq: { datePlanId: planId } });
  const sortOrder = options?.sortOrder ?? days.reduce((max, day) => Math.max(max, day.sortOrder), -1) + 1;
  const saved = asDay(await repo.insert("itineraryDays", {
    id: createId(),
    datePlanId: planId,
    date: input.date,
    title: input.title,
    description: input.description,
    sortOrder,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  await touch(repo, planId, userId);
  if (!options?.quiet) {
    await record(repo, planId, userId, "day.saved", `Added ${saved.title}.`);
    await tellPartner(repo, access.data, userId, "A day was added", `${saved.title} was added to ${access.data.title}.`, `/plans/${planId}`);
  }
  return ok(saved);
}

export async function deleteItineraryDay(repo: Repository, userId: string, planId: string, dayId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const day = await dayOnPlan(repo, planId, dayId);
  if (!day) return fail("That day is not on this plan.");
  const before = await currentSummary(repo, access.data);
  const activities = await repo.list("itineraryActivities", { eq: { itineraryDayId: dayId } });
  for (const activity of activities) {
    await repo.removeWhere("itineraryChecklists", { eq: { itineraryActivityId: activity.id } });
    await repo.removeWhere("itineraryComments", { eq: { itineraryActivityId: activity.id } });
  }
  await repo.removeWhere("itineraryExpenses", { eq: { itineraryDayId: dayId } });
  for (const activity of activities) {
    const linked = await repo.list("itineraryExpenses", { eq: { itineraryActivityId: activity.id } });
    for (const expense of linked) await repo.update("itineraryExpenses", expense.id, { itineraryActivityId: null, updatedAt: now() });
  }
  await repo.removeWhere("itineraryActivities", { eq: { itineraryDayId: dayId } });
  await repo.remove("itineraryDays", dayId);
  await touch(repo, planId, userId);
  await record(repo, planId, userId, "day.deleted", `Removed ${day.title}.`);
  await watchBudget(repo, access.data, userId, before);
  await tellPartner(repo, access.data, userId, "A day was removed", `${day.title} was removed from ${access.data.title}.`, `/plans/${planId}`);
  return ok({ id: dayId });
}

export async function saveActivity(repo: Repository, userId: string, planId: string, input: ActivityInput, photoPath?: string | null, options?: WriteOptions & { sortOrder?: number }) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const day = await dayOnPlan(repo, planId, input.dayId);
  if (!day) return fail("That day is not on this plan.");
  const before = await currentSummary(repo, access.data);
  const stamp = now();
  let saved: ItineraryActivity;
  if (input.id) {
    const current = await activityOnPlan(repo, planId, input.id);
    if (!current) return fail("That activity is not on this plan.");
    const moved = current.itineraryDayId !== input.dayId;
    const siblings = moved ? await repo.list("itineraryActivities", { eq: { itineraryDayId: input.dayId } }) : [];
    saved = asActivity(await repo.update("itineraryActivities", input.id, {
      ...activityPatch(input),
      itineraryDayId: input.dayId,
      sortOrder: moved ? siblings.reduce((max, activity) => Math.max(max, activity.sortOrder), -1) + 1 : current.sortOrder,
      photoPath: photoPath === undefined ? current.photoPath : photoPath,
      updatedBy: userId,
      updatedAt: stamp,
    }));
  } else {
    const siblings = await repo.list("itineraryActivities", { eq: { itineraryDayId: input.dayId } });
    saved = asActivity(await repo.insert("itineraryActivities", {
      id: createId(),
      itineraryDayId: input.dayId,
      ...activityPatch(input),
      photoPath: photoPath ?? null,
      sortOrder: options?.sortOrder ?? siblings.reduce((max, activity) => Math.max(max, activity.sortOrder), -1) + 1,
      createdBy: userId,
      updatedBy: userId,
      createdAt: stamp,
      updatedAt: stamp,
    }));
  }
  await syncActivityExpense(repo, userId, access.data, day, saved, input);
  await touch(repo, planId, userId);
  await watchBudget(repo, access.data, userId, before);
  if (!options?.quiet) {
    await record(repo, planId, userId, "activity.saved", `${input.id ? "Updated" : "Added"} ${saved.title}.`);
    await tellPartner(repo, access.data, userId, "The schedule changed", `${saved.title} was ${input.id ? "updated" : "added"} on ${access.data.title}.`, `/plans/${planId}`);
  }
  return ok(saved);
}

export async function deleteActivity(repo: Repository, userId: string, planId: string, activityId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const activity = await activityOnPlan(repo, planId, activityId);
  if (!activity) return fail("That activity is not on this plan.");
  await repo.removeWhere("itineraryChecklists", { eq: { itineraryActivityId: activityId } });
  await repo.removeWhere("itineraryComments", { eq: { itineraryActivityId: activityId } });
  const linked = await repo.list("itineraryExpenses", { eq: { itineraryActivityId: activityId } });
  for (const expense of linked) await repo.update("itineraryExpenses", expense.id, { itineraryActivityId: null, updatedAt: now() });
  await repo.remove("itineraryActivities", activityId);
  await touch(repo, planId, userId);
  await record(repo, planId, userId, "activity.deleted", `Removed ${activity.title}.`);
  await tellPartner(repo, access.data, userId, "The schedule changed", `${activity.title} was removed from ${access.data.title}.`, `/plans/${planId}`);
  return ok({ id: activityId });
}

export async function reorderActivities(repo: Repository, userId: string, planId: string, dayId: string, order: string[]) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const day = await dayOnPlan(repo, planId, dayId);
  if (!day) return fail("That day is not on this plan.");
  const activities = await repo.list("itineraryActivities", { eq: { itineraryDayId: dayId } });
  const ids = order.map((id) => id.trim()).filter(Boolean);
  if (ids.length !== activities.length || ids.some((id) => !activities.some((activity) => activity.id === id))) return fail("That activity order is out of date. Refresh and try again.");
  const stamp = now();
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (id) await repo.update("itineraryActivities", id, { sortOrder: index, updatedBy: userId, updatedAt: stamp });
  }
  await touch(repo, planId, userId);
  await record(repo, planId, userId, "activity.reordered", `Reordered activities on ${day.title}.`);
  await tellPartner(repo, access.data, userId, "The schedule changed", `Activities on ${day.title} were reordered.`, `/plans/${planId}`);
  return ok({ order: ids });
}

export async function saveChecklistItem(repo: Repository, userId: string, planId: string, activityId: string, title: string, options?: WriteOptions) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const activity = await activityOnPlan(repo, planId, activityId);
  if (!activity) return fail("That activity is not on this plan.");
  const stamp = now();
  const saved = asChecklist(await repo.insert("itineraryChecklists", {
    id: createId(),
    itineraryActivityId: activityId,
    title,
    isCompleted: false,
    completedBy: null,
    completedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  if (!options?.quiet) {
    await touch(repo, planId, userId);
    await record(repo, planId, userId, "checklist.updated", `Added “${title}” to ${activity.title}.`);
  }
  return ok(saved);
}

export async function toggleChecklistItem(repo: Repository, userId: string, planId: string, checklistId: string, completed: boolean) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const item = await repo.find("itineraryChecklists", { eq: { id: checklistId } });
  if (!item) return fail("That checklist item was not found.");
  const activity = await activityOnPlan(repo, planId, item.itineraryActivityId);
  if (!activity) return fail("That checklist item is not on this plan.");
  const stamp = now();
  const saved = asChecklist(await repo.update("itineraryChecklists", checklistId, {
    isCompleted: completed,
    completedBy: completed ? userId : null,
    completedAt: completed ? stamp : null,
    updatedAt: stamp,
  }));
  await record(repo, planId, userId, "checklist.updated", `${completed ? "Completed" : "Reopened"} “${saved.title}”.`);
  return ok(saved);
}

export async function deleteChecklistItem(repo: Repository, userId: string, planId: string, checklistId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const item = await repo.find("itineraryChecklists", { eq: { id: checklistId } });
  if (!item) return fail("That checklist item was not found.");
  const activity = await activityOnPlan(repo, planId, item.itineraryActivityId);
  if (!activity) return fail("That checklist item is not on this plan.");
  await repo.remove("itineraryChecklists", checklistId);
  await record(repo, planId, userId, "checklist.updated", `Removed “${item.title}”.`);
  return ok({ id: checklistId });
}

export async function saveExpense(repo: Repository, userId: string, planId: string, input: ExpenseInput, receiptPath?: string | null, options?: WriteOptions) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const paid = await assertPayer(repo, access.data.coupleId, input.paidBy);
  if (!paid.ok) return paid;
  if (input.dayId && !(await dayOnPlan(repo, planId, input.dayId))) return fail("That day is not on this plan.");
  if (input.activityId && !(await activityOnPlan(repo, planId, input.activityId))) return fail("That activity is not on this plan.");
  const before = await currentSummary(repo, access.data);
  const stamp = now();
  let saved: ItineraryExpense;
  if (input.id) {
    const current = await repo.find("itineraryExpenses", { eq: { id: input.id, datePlanId: planId } });
    if (!current) return fail("That expense is not on this plan.");
    saved = asExpense(await repo.update("itineraryExpenses", input.id, {
      ...expensePatch(input),
      receiptPath: receiptPath === undefined ? current.receiptPath : receiptPath,
      updatedBy: userId,
      updatedAt: stamp,
    }));
  } else {
    saved = asExpense(await repo.insert("itineraryExpenses", {
      id: createId(),
      datePlanId: planId,
      ...expensePatch(input),
      receiptPath: receiptPath ?? null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: stamp,
      updatedAt: stamp,
    }));
  }
  await touch(repo, planId, userId);
  await watchBudget(repo, access.data, userId, before);
  if (!options?.quiet) {
    await record(repo, planId, userId, "expense.saved", `${input.id ? "Updated" : "Added"} ${saved.expenseName}.`);
    await tellPartner(repo, access.data, userId, "An expense changed", `${saved.expenseName} was ${input.id ? "updated" : "added"} on ${access.data.title}.`, `/plans/${planId}/budget`);
  }
  return ok(saved);
}

export async function patchExpenseAmounts(repo: Repository, userId: string, planId: string, expenseId: string, estimatedAmount: number, actualAmount: number) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  if (estimatedAmount < 0 || actualAmount < 0) return fail("Amounts cannot be negative.");
  const current = await repo.find("itineraryExpenses", { eq: { id: expenseId, datePlanId: planId } });
  if (!current) return fail("That expense is not on this plan.");
  const before = await currentSummary(repo, access.data);
  const saved = asExpense(await repo.update("itineraryExpenses", expenseId, {
    estimatedAmount: roundMoney(estimatedAmount),
    actualAmount: roundMoney(actualAmount),
    updatedBy: userId,
    updatedAt: now(),
  }));
  await touch(repo, planId, userId);
  await record(repo, planId, userId, "expense.saved", `Updated amounts for ${saved.expenseName}.`);
  await watchBudget(repo, access.data, userId, before);
  await tellPartner(repo, access.data, userId, "An expense changed", `Amounts for ${saved.expenseName} were updated.`, `/plans/${planId}/budget`);
  return ok(saved);
}

export async function deleteExpense(repo: Repository, userId: string, planId: string, expenseId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const current = await repo.find("itineraryExpenses", { eq: { id: expenseId, datePlanId: planId } });
  if (!current) return fail("That expense is not on this plan.");
  const before = await currentSummary(repo, access.data);
  await repo.remove("itineraryExpenses", expenseId);
  await touch(repo, planId, userId);
  await record(repo, planId, userId, "expense.deleted", `Removed ${current.expenseName}.`);
  await watchBudget(repo, access.data, userId, before);
  await tellPartner(repo, access.data, userId, "An expense was removed", `${current.expenseName} was removed from ${access.data.title}.`, `/plans/${planId}/budget`);
  return ok({ id: expenseId });
}

export async function saveComment(repo: Repository, userId: string, planId: string, body: string, activityId: string | null) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  if (activityId && !(await activityOnPlan(repo, planId, activityId))) return fail("That activity is not on this plan.");
  const stamp = now();
  const saved = asComment(await repo.insert("itineraryComments", {
    id: createId(),
    datePlanId: planId,
    itineraryActivityId: activityId,
    authorId: userId,
    body,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  await record(repo, planId, userId, "comment.added", "Added a comment.");
  await tellPartner(repo, access.data, userId, "A new comment", `There is a new comment on ${access.data.title}.`, `/plans/${planId}#comments`);
  return ok(saved);
}

export async function deleteComment(repo: Repository, userId: string, planId: string, commentId: string) {
  const access = await owned(repo, userId, planId);
  if (!access.ok) return access;
  const comment = await repo.find("itineraryComments", { eq: { id: commentId, datePlanId: planId } });
  if (!comment) return fail("That comment was not found.");
  if (comment.authorId !== userId) return fail("You can delete your own comments.");
  await repo.remove("itineraryComments", commentId);
  return ok({ id: commentId });
}

async function syncActivityExpense(repo: Repository, userId: string, plan: DatePlan, day: ItineraryDay, activity: ItineraryActivity, input: ActivityInput) {
  const linked = (await repo.list("itineraryExpenses", { eq: { itineraryActivityId: activity.id } }))[0];
  const shouldTrack = input.trackExpense && (input.estimatedCost > 0 || input.actualCost > 0 || Boolean(linked));
  if (!shouldTrack) return;
  const status = input.actualCost <= 0 ? "planned" : input.actualCost < input.estimatedCost ? "partial" : "paid";
  const stamp = now();
  const patch = {
    itineraryDayId: day.id,
    expenseName: activity.title,
    category: input.expenseCategory,
    estimatedAmount: input.estimatedCost,
    actualAmount: input.actualCost,
    expenseDate: `${day.date}T${input.startTime ?? "12:00"}`,
    status,
    updatedBy: userId,
    updatedAt: stamp,
  } as const;
  if (linked) {
    await repo.update("itineraryExpenses", linked.id, patch);
    return;
  }
  await repo.insert("itineraryExpenses", {
    id: createId(),
    datePlanId: plan.id,
    itineraryActivityId: activity.id,
    ...patch,
    paidBy: input.actualCost > 0 ? userId : "shared",
    splitMethod: "inherit",
    customSplitPercent: null,
    paymentMethod: null,
    receiptPath: null,
    notes: null,
    createdBy: userId,
    createdAt: stamp,
  });
}

async function removePlanGraph(repo: Repository, planId: string) {
  const days = await repo.list("itineraryDays", { eq: { datePlanId: planId } });
  const activities = days.length ? await repo.list("itineraryActivities", { in: { itineraryDayId: days.map((day) => day.id) } }) : [];
  for (const activity of activities) await repo.removeWhere("itineraryChecklists", { eq: { itineraryActivityId: activity.id } });
  await repo.removeWhere("itineraryComments", { eq: { datePlanId: planId } });
  await repo.removeWhere("itineraryHistory", { eq: { datePlanId: planId } });
  await repo.removeWhere("itineraryExpenses", { eq: { datePlanId: planId } });
  for (const activity of activities) await repo.remove("itineraryActivities", activity.id);
  for (const day of days) await repo.remove("itineraryDays", day.id);
  await repo.remove("datePlans", planId);
}

async function owned(repo: Repository, userId: string, planId: string): Promise<Result<DatePlan>> {
  const member = await activeMembership(repo, userId);
  if (!member) return fail("Create or join a couple space before planning a date.");
  const plan = await repo.find("datePlans", { eq: { id: planId } });
  if (!plan || plan.coupleId !== member.coupleId) return fail("That plan is not in your couple space.");
  return ok(asPlan(plan));
}

async function dayOnPlan(repo: Repository, planId: string, dayId: string) {
  const day = await repo.find("itineraryDays", { eq: { id: dayId, datePlanId: planId } });
  return day ? asDay(day) : null;
}

async function activityOnPlan(repo: Repository, planId: string, activityId: string) {
  const activity = await repo.find("itineraryActivities", { eq: { id: activityId } });
  if (!activity) return null;
  const day = await repo.find("itineraryDays", { eq: { id: activity.itineraryDayId, datePlanId: planId } });
  return day ? asActivity(activity) : null;
}

async function assertPayer(repo: Repository, coupleId: string, paidBy: string) {
  if (paidBy === "shared") return ok(paidBy);
  const partners = await loadPartners(repo, coupleId);
  if (!partners.some((partner) => partner.userId === paidBy)) return fail("Choose a partner who shares this plan.");
  return ok(paidBy);
}

async function loadPartners(repo: Repository, coupleId: string): Promise<PlanPartner[]> {
  const members = (await repo.list("coupleMembers", { eq: { coupleId, status: "active" } })).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.userId.localeCompare(b.userId));
  const profiles = members.length ? await repo.list("profiles", { in: { id: members.map((member) => member.userId) } }) : [];
  return members.map((member, index) => ({
    userId: member.userId,
    name: profiles.find((profile) => profile.id === member.userId)?.displayName ?? `Partner ${index + 1}`,
    index,
  }));
}

async function currentSummary(repo: Repository, plan: DatePlan) {
  const [expenses, days, partners] = await Promise.all([
    repo.list("itineraryExpenses", { eq: { datePlanId: plan.id } }),
    repo.list("itineraryDays", { eq: { datePlanId: plan.id } }),
    loadPartners(repo, plan.coupleId),
  ]);
  return summaryFor(plan, partners.map((partner) => partner.userId), expenses.map(asExpense), days.map(asDay));
}

async function watchBudget(repo: Repository, plan: DatePlan, userId: string, before: TripSummary) {
  const after = await currentSummary(repo, plan);
  if (before.health === "over" || after.health !== "over") return;
  await tellPartner(
    repo,
    plan,
    userId,
    "Budget overrun",
    `${plan.title} is over its ${formatMoney(after.budget, plan.currency)} budget by ${formatMoney(after.overAmount, plan.currency)}.`,
    `/plans/${plan.id}/budget`,
  );
}

function summaryFor(plan: DatePlan, partnerIds: string[], expenses: ItineraryExpense[], days: ItineraryDay[]) {
  const ledger: LedgerExpense[] = expenses.map((expense) => ({
    dayId: expense.itineraryDayId,
    category: expense.category,
    estimated: expense.estimatedAmount,
    actual: expense.actualAmount,
    status: expense.status,
    paidBy: expense.paidBy,
    splitMethod: expense.splitMethod,
    customSplitPercent: expense.customSplitPercent,
  }));
  return summarizeTrip({
    estimatedBudget: plan.estimatedBudget,
    warningThreshold: plan.warningThreshold,
    dailyLimit: plan.dailyLimit,
    splitMethod: plan.splitMethod,
    customSplitPercent: plan.customSplitPercent,
    fixedContribution: plan.fixedContribution,
    partnerIds,
    days: [...days].sort((a, b) => a.sortOrder - b.sortOrder || a.date.localeCompare(b.date)).map((day) => ({ id: day.id, date: day.date })),
    expenses: ledger,
  });
}

async function tellPartner(repo: Repository, plan: DatePlan, userId: string, title: string, body: string, href: string) {
  const partner = await otherPartner(repo, plan.coupleId, userId);
  if (!partner) return;
  await notifyUser(repo, { userId: partner.userId, coupleId: plan.coupleId, type: "date_plan", title, body, href });
}

async function record(repo: Repository, planId: string, actorId: string, action: string, summary: string) {
  await repo.insert("itineraryHistory", { id: createId(), datePlanId: planId, actorId, action, summary, createdAt: now() });
}

async function touch(repo: Repository, planId: string, userId: string) {
  await repo.update("datePlans", planId, { updatedBy: userId, updatedAt: now() });
}

function activityPatch(input: ActivityInput) {
  return {
    title: input.title,
    description: input.description,
    location: input.location,
    mapUrl: input.mapUrl,
    startTime: input.startTime,
    endTime: input.endTime,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    status: input.status,
    notes: input.notes,
    reservation: input.reservation,
  };
}

function expensePatch(input: ExpenseInput) {
  return {
    itineraryDayId: input.dayId,
    itineraryActivityId: input.activityId,
    expenseName: input.name,
    category: input.category,
    estimatedAmount: input.estimatedAmount,
    actualAmount: input.actualAmount,
    paidBy: input.paidBy,
    splitMethod: input.splitMethod,
    customSplitPercent: input.customSplitPercent,
    paymentMethod: input.paymentMethod,
    expenseDate: input.expenseDate,
    notes: input.notes,
    status: input.status,
  };
}

function asPlan(row: DatePlan): DatePlan {
  return { ...row, estimatedBudget: num(row.estimatedBudget), customSplitPercent: num(row.customSplitPercent), fixedContribution: num(row.fixedContribution), warningThreshold: num(row.warningThreshold) || 80, dailyLimit: row.dailyLimit == null ? null : num(row.dailyLimit) };
}

function asDay(row: ItineraryDay): ItineraryDay {
  return { ...row, sortOrder: num(row.sortOrder) };
}

function asActivity(row: ItineraryActivity): ItineraryActivity {
  return { ...row, estimatedCost: num(row.estimatedCost), actualCost: num(row.actualCost), sortOrder: num(row.sortOrder) };
}

function asExpense(row: ItineraryExpense): ItineraryExpense {
  return { ...row, estimatedAmount: num(row.estimatedAmount), actualAmount: num(row.actualAmount), customSplitPercent: row.customSplitPercent == null ? null : num(row.customSplitPercent) };
}

function asChecklist(row: ItineraryChecklist): ItineraryChecklist {
  return { ...row, isCompleted: flag(row.isCompleted) };
}

function asComment(row: ItineraryComment): ItineraryComment {
  return row;
}

function asHistory(row: ItineraryHistory): ItineraryHistory {
  return row;
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

function flag(value: unknown) {
  return value === true || value === "true" || value === "t" || value === 1;
}

function now() {
  return new Date().toISOString();
}
