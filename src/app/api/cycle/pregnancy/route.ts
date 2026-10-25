import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { deletePregnancyLog, savePregnancyLog } from "@/lib/services/cycle";

export async function POST(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const body = await request.json().catch(() => null);
  const result = await savePregnancyLog(access.repo, access.user.profile.id, body);
  return result.ok ? cycleJson({ log: result.data }) : cycleJson({ error: result.error }, 400);
}

export async function DELETE(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const result = await deletePregnancyLog(access.repo, access.user.profile.id, new URL(request.url).searchParams.get("id") ?? "");
  return result.ok ? cycleJson(result.data) : cycleJson({ error: result.error }, 404);
}
