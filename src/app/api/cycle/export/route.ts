import { cycleApiContext, isCycleResponse } from "@/lib/cycle/access";
import { exportCycleData } from "@/lib/services/cycle";

export async function GET() {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const data = await exportCycleData(access.repo, access.user.profile.id);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=couplesync-cycle.json",
      "Cache-Control": "private, no-store",
    },
  });
}
