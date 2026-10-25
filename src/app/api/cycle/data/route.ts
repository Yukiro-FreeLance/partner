import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { deleteCycleData } from "@/lib/services/cycle";

export async function DELETE(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || (body as { confirm?: string }).confirm !== "DELETE") {
    return cycleJson({ error: "Send confirm: DELETE to erase cycle data." }, 400);
  }
  const result = await deleteCycleData(access.repo, access.user.profile.id);
  return result.ok ? cycleJson(result.data) : cycleJson({ error: result.error }, 400);
}
