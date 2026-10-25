import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { tracksOwnCycle } from "@/lib/gender";
import { exportCycleData } from "@/lib/services/cycle";

export async function GET() {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  if (!tracksOwnCycle(access.user.profile.gender)) return cycleJson({ error: "Cycle tracking is available when gender is set to Female in Profile." }, 403);
  const data = await exportCycleData(access.repo, access.user.profile.id);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=couplesync-cycle.json",
      "Cache-Control": "private, no-store",
    },
  });
}
