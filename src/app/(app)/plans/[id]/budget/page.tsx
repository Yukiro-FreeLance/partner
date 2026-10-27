import { BudgetScreen } from "@/components/plans/budget-screen";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { loadDatePlan } from "@/lib/services/plans";

export const metadata = { title: "Trip budget" };

export default async function BudgetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  try {
    const loaded = await loadDatePlan(await getRepository(), user.profile.id, id);
    if (!loaded.ok) return <main className="px-4 py-6"><h1 className="font-serif text-4xl">Plan unavailable</h1><p className="mt-2 text-sm">{loaded.error}</p></main>;
    return <BudgetScreen detail={loaded.data} saved={query.saved} error={query.error} />;
  } catch (error) {
    if (!isMissingPlanTable(error)) throw error;
    return <main className="px-4 py-6"><p className="text-sm">Apply the latest database migration, then reload this page.</p></main>;
  }
}
