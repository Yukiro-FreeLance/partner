import { CycleNav } from "@/components/cycle/nav";
import { OfflineNote } from "@/components/cycle/offline-note";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { deliverCycleReminders } from "@/lib/services/cycle";

export const metadata = { title: "Cycle tracker" };

export default async function CycleLayout({ children }: { children: React.ReactNode }) {
  const access = await requireCyclePage();
  let setup = false;
  if (!access.blocked) {
    try {
      await deliverCycleReminders(access.repo, access.user.profile.id);
    } catch (error) {
      if (!isMissingCycleTable(error)) throw error;
      setup = true;
    }
  }
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 lg:px-8 lg:py-6">
      <CycleNav />
      <OfflineNote />
      {setup ? <CycleSetup /> : children}
    </main>
  );
}
