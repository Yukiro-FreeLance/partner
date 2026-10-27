import Link from "next/link";
import { PlanForm } from "@/components/plans/plan-form";
import { PlanStatus } from "@/components/plans/status";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { activeMembership } from "@/lib/services/access";

export const metadata = { title: "New date plan" };

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const membership = await activeMembership(await getRepository(), user.profile.id);
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <Link href="/plans" className="text-sm text-primary">Back to plans</Link>
      <h1 className="mt-3 font-serif text-4xl">New date plan</h1>
      <p className="mt-2 text-sm text-muted-foreground">Both of you can edit the itinerary after it is created.</p>
      <div className="mt-4"><PlanStatus error={query.error} /></div>
      {membership ? <div className="mt-4"><PlanForm /></div> : <p className="mt-4 text-sm">Create or join a couple space before saving a plan.</p>}
    </main>
  );
}
