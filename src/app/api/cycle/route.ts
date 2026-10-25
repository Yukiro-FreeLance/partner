import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { tracksOwnCycle } from "@/lib/gender";
import { loadOwnerCycle } from "@/lib/services/cycle";

export async function GET() {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  if (!tracksOwnCycle(access.user.profile.gender)) return cycleJson({ error: "Cycle tracking is available when gender is set to Female in Profile." }, 403);
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
