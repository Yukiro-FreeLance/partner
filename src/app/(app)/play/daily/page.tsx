import Link from "next/link";
import { redirect } from "next/navigation";
import { DailyCountdown } from "@/components/daily-countdown";
import { Button } from "@/components/ui/button";
import { dailyAction } from "@/app/actions";
import { requireUser } from "@/lib/auth/session";
import { DAILY_TIME_ZONE, dayKey, nextDailyReset } from "@/lib/daily";
import { getRepository } from "@/lib/data";
import { activeMembership } from "@/lib/services/access";

export const metadata = { title: "Daily quiz" };

export default async function DailyPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  if (!membership) redirect("/play?error=Create%20or%20join%20a%20couple%20before%20playing%20today%27s%20question.");
  const rounds = await repo.list("quizRounds", { eq: { coupleId: membership.coupleId, mode: "daily" } });
  const today = rounds.find((round) => dayKey(new Date(round.createdAt)) === dayKey(new Date()));
  const session = today ? await repo.find("quizSessions", { eq: { roundId: today.id, userId: user.profile.id } }) : null;
  const resetAt = nextDailyReset(new Date()).toISOString();
  const completed = session?.status === "completed";

  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-6">
      <p className="text-xs tracking-wide text-rose uppercase">Today&apos;s Couple Challenge</p>
      <h1 className="font-serif text-4xl">Five questions to discover something new</h1>
      <p className="text-sm leading-6 text-muted-foreground">The set is chosen on the server for {DAILY_TIME_ZONE}. Refreshing the page does not create another round or another reward. A missed day starts the streak over at one the next time you play. It does not take points away.</p>
      <section className="panel p-5">
        <p className="text-sm font-medium">{completed ? "Status: Completed" : session ? "Status: In progress" : "Status: Ready"}</p>
        <div className="mt-4">
          <DailyCountdown resetAt={resetAt} completed={Boolean(completed)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Next reset follows midnight in {DAILY_TIME_ZONE}, not the clock on this device.</p>
      </section>
      {completed && today && <Link href={`/play/results/${today.id}`} className="text-sm text-primary underline">Review today&apos;s results</Link>}
      {!completed && session && <Link href={`/play/quiz/${session.id}`} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-primary-foreground">Resume today&apos;s quiz</Link>}
      {!session && (
        <form action={dailyAction}>
          <Button type="submit">Start today&apos;s quiz</Button>
        </form>
      )}
    </main>
  );
}
