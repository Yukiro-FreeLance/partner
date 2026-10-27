import Link from "next/link";
import { PlanScreen } from "@/components/plans/plan-screen";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { loadDatePlan } from "@/lib/services/plans";

export const metadata = { title: "Itinerary" };

export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  try {
    const loaded = await loadDatePlan(await getRepository(), user.profile.id, id);
    if (!loaded.ok) {
      return (
        <main className="px-4 py-6 lg:px-8">
          <h1 className="font-serif text-4xl">Plan unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loaded.error}</p>
          <Link href="/plans" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary">Back to plans</Link>
        </main>
      );
    }
    return <PlanScreen detail={loaded.data} view={query.view ?? "timeline"} saved={query.saved} error={query.error} viewerId={user.profile.id} />;
  } catch (error) {
    if (!isMissingPlanTable(error)) throw error;
    return <main className="px-4 py-6 lg:px-8"><h1 className="font-serif text-4xl">Date plans</h1><p className="mt-2 text-sm text-muted-foreground">Apply the latest database migration, then reload this page.</p></main>;
  }
}
