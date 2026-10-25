import { CycleNav } from "@/components/cycle/nav";
import { OfflineNote } from "@/components/cycle/offline-note";
import { CycleSetup } from "@/components/cycle/setup";
import { requireCyclePage } from "@/lib/cycle/access";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { tracksOwnCycle } from "@/lib/gender";
import { deliverCycleReminders } from "@/lib/services/cycle";

export const metadata = { title: "Cycle tracker" };

export default async function CycleLayout({ children }: { children: React.ReactNode }) {
  const access = await requireCyclePage();
  const tracker = !access.blocked && tracksOwnCycle(access.user.profile.gender);
  let setup = false;
  if (tracker) {
    try {
      await deliverCycleReminders(access.repo, access.user.profile.id);
    } catch (error) {
      if (!isMissingCycleTable(error)) throw error;
      setup = true;
    }
  }
  return (
    <main className="grid w-full gap-4 px-4 py-4 lg:px-8 lg:py-6">
      <CycleNav mode={tracker ? "owner" : "partner"} />
      <OfflineNote />
      {setup ? <CycleSetup /> : children}
    </main>
  );
}
