import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { loadOwnerCycle } from "@/lib/services/cycle";

export async function GET() {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const snapshot = await loadOwnerCycle(access.repo, access.user.profile.id);
  return cycleJson({
    today: snapshot.today,
    profile: snapshot.stored ? snapshot.profile : null,
    estimate: snapshot.estimate,
    fertility: snapshot.fertility,
    periods: snapshot.periods,
    checkIns: snapshot.checkIns,
    pregnancyLogs: snapshot.tests,
    reminders: snapshot.reminders,
    events: snapshot.events,
  });
}
