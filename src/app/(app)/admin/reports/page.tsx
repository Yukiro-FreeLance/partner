import { adminReportAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { isStaffRole, requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (!isStaffRole(actor.role)) return <main className="p-6">Admin only.</main>;
  const reports = await (await getRepository()).list("reports", {}, { orderBy: "createdAt", descending: true, limit: 50 });
  return (
    <main className="grid gap-6">
      <h1 className="font-serif text-4xl">Reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review the reason and target id. Answer text is not included.</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-3xl border bg-card p-4 text-sm">
            <p>{report.status} · {report.targetType} · {report.targetId}</p>
            <p className="mt-2">{report.reason}</p>
            <form action={adminReportAction} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="reportId" value={report.id} />
              <label className="text-xs"><input type="checkbox" name="disable" /> Disable custom question</label>
              <Button name="status" value="reviewed" size="sm" type="submit">Reviewed</Button>
              <Button name="status" value="dismissed" size="sm" variant="outline" type="submit">Dismiss</Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
