import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { loadSharedCycle } from "@/lib/services/cycle";

export async function GET() {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const shared = await loadSharedCycle(access.repo, access.user.profile.id);
  return cycleJson({ partnerName: shared.partnerName, view: shared.view });
}
