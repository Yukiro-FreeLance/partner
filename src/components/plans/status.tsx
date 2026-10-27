export function PlanStatus({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>;
  if (saved === "deleted") return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Plan deleted.</p>;
  if (saved === "sample") return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">The Manila sample plan is ready. Replace the sample amounts with yours.</p>;
  if (saved) return <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>;
  return null;
}
