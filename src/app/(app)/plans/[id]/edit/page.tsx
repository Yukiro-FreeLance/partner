import Link from "next/link";
import { PlanForm } from "@/components/plans/plan-form";
import { PlanStatus } from "@/components/plans/status";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMissingPlanTable } from "@/lib/plans/errors";
import { loadDatePlan } from "@/lib/services/plans";

export const metadata = { title: "Edit date plan" };

export default async function EditPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  try {
    const loaded = await loadDatePlan(await getRepository(), user.profile.id, id);
    if (!loaded.ok) {
      return (
        <main className="px-4 py-6"><h1 className="font-serif text-4xl">Plan unavailable</h1><p className="mt-2 text-sm">{loaded.error}</p></main>
      );
    }
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <Link href={`/plans/${id}`} className="text-sm text-primary">Back to itinerary</Link>
        <h1 className="mt-3 font-serif text-4xl">Edit plan</h1>
        <div className="mt-4"><PlanStatus saved={query.saved} error={query.error} /></div>
        <div className="mt-4"><PlanForm plan={loaded.data.plan} /></div>
      </main>
    );
  } catch (error) {
    if (!isMissingPlanTable(error)) throw error;
    return <main className="px-4 py-6"><p className="text-sm">Apply the latest database migration, then reload this page.</p></main>;
  }
}
