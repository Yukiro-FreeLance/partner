import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { deleteReminder, deliverCycleReminders, saveReminder } from "@/lib/services/cycle";

export async function POST(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && "run" in body) {
    await deliverCycleReminders(access.repo, access.user.profile.id);
    return cycleJson({ delivered: true });
  }
  const result = await saveReminder(access.repo, access.user.profile.id, body);
  return result.ok ? cycleJson({ reminder: result.data }) : cycleJson({ error: result.error }, 400);
}

export async function DELETE(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const result = await deleteReminder(access.repo, access.user.profile.id, new URL(request.url).searchParams.get("id") ?? "");
  return result.ok ? cycleJson(result.data) : cycleJson({ error: result.error }, 404);
}
