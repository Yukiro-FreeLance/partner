import { cycleApiContext, cycleJson, isCycleResponse } from "@/lib/cycle/access";
import { saveCycleProfile } from "@/lib/services/cycle";

export async function POST(request: Request) {
  const access = await cycleApiContext();
  if (isCycleResponse(access)) return access;
  const body = await request.json().catch(() => null);
  const result = await saveCycleProfile(access.repo, access.user.profile.id, body);
  if (!result.ok) return cycleJson({ error: result.error }, 400);
  return cycleJson({
    profile: {
      sharePeriodSummary: result.data.sharePeriodSummary,
      shareFertileSummary: result.data.shareFertileSummary,
      shareMoodSummary: result.data.shareMoodSummary,
      shareSymptomSummary: result.data.shareSymptomSummary,
      shareIntimacySummary: result.data.shareIntimacySummary,
      shareSelectedDetails: result.data.shareSelectedDetails,
    },
  });
}
