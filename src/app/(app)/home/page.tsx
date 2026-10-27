import Link from "next/link";
import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns";
import { Brain, CalendarHeart, Gamepad2, Heart, ImageIcon, Play, Ticket, type LucideIcon } from "lucide-react";
import { resetDemoAction } from "@/app/actions";
import { BannerUpload } from "@/components/banner-upload";
import { PartnerCycleCard } from "@/components/cycle/partner-panel";
import { Avatar } from "@/components/ui/feedback";
import { requireUser } from "@/lib/auth/session";
import { PHASE_COPY } from "@/lib/cycle/copy";
import { isMissingCycleTable } from "@/lib/cycle/errors";
import { getRepository } from "@/lib/data";
import type { Repository } from "@/lib/data/repository";
import { tracksOwnCycle } from "@/lib/gender";
import { loadOwnerCycle, loadSharedCycle } from "@/lib/services/cycle";
import { activeMembership, otherPartner } from "@/lib/services/access";
import { getConnectionReport } from "@/lib/services/insights";
import { listMySessions } from "@/lib/services/quiz";
import { dayKey } from "@/lib/daily";
import { formatScore, SCORE_DISCLAIMER } from "@/lib/scoring";

const snapshotOrder = [
  ["social", "Social energy"],
  ["planning", "Planning"],
  ["decisions", "Decision making"],
  ["communication", "Communication"],
] as const;

async function loadPartner(repo: Repository, coupleId: string | undefined, userId: string) {
  if (!coupleId) return null;
  const member = await otherPartner(repo, coupleId, userId);
  if (!member) return null;
  return repo.find("profiles", { eq: { id: member.userId } });
}

async function loadTodayQuestion(repo: Repository, coupleId: string | undefined) {
  if (!coupleId) return null;
  const rounds = await repo.list("quizRounds", { eq: { coupleId, mode: "daily" } }, { orderBy: "createdAt", descending: true, limit: 5 });
  const todayRound = rounds.find((round) => dayKey(new Date(round.createdAt)) === dayKey(new Date()));
  if (!todayRound) return null;
  const link = (await repo.list("quizRoundQuestions", { eq: { roundId: todayRound.id } }, { limit: 1 }))[0];
  if (!link) return null;
  return repo.find("questions", { eq: { id: link.questionId } });
}

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function togetherLabel(started: string | null) {
  if (!started) return "Add your start date in profile";
  const start = parseISO(started);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const years = Math.floor(Math.max(months, 0) / 12);
  const remainder = Math.max(months, 0) % 12;
  if (years <= 0) return remainder <= 1 ? "Together for less than a month" : `Together for ${remainder} months`;
  const yearText = `${years} year${years === 1 ? "" : "s"}`;
  return remainder ? `Together for ${yearText}, ${remainder} month${remainder === 1 ? "" : "s"}` : `Together for ${yearText}`;
}

export const metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const repo = await getRepository();
  const membership = await activeMembership(repo, user.profile.id);
  const coupleId = membership?.coupleId;
  const tracks = tracksOwnCycle(user.profile.gender);
  const [couple, partner, report, sessions, memories, invites, notes, challenges, personality, shared, ownCycle, todayQuestion] = await Promise.all([
    coupleId ? repo.find("couples", { eq: { id: coupleId } }) : Promise.resolve(null),
    loadPartner(repo, coupleId, user.profile.id),
    membership ? getConnectionReport(repo, user.profile.id, { scoresOnly: true }) : Promise.resolve(null),
    listMySessions(repo, user.profile.id),
    coupleId ? repo.list("coupleMemories", { eq: { coupleId } }, { orderBy: "createdAt", descending: true, limit: 3 }) : Promise.resolve([]),
    coupleId ? repo.list("coupleInvitations", { eq: { coupleId, status: "pending" } }) : Promise.resolve([]),
    repo.list("notifications", { eq: { userId: user.profile.id } }, { orderBy: "createdAt", descending: true, limit: 5 }),
    repo.list("coupleChallenges", { eq: { isActive: true } }),
    repo.list("personalityResults", { eq: { userId: user.profile.id } }, { orderBy: "createdAt", descending: true, limit: 1 }),
    loadSharedCycle(repo, user.profile.id).catch((error: unknown) => {
      if (isMissingCycleTable(error)) return null;
      throw error;
    }),
    tracks
      ? loadOwnerCycle(repo, user.profile.id).catch((error: unknown) => {
          if (isMissingCycleTable(error)) return null;
          throw error;
        })
      : Promise.resolve(null),
    loadTodayQuestion(repo, coupleId),
  ]);
  const resume = sessions.find((item) => item.session.status === "in_progress");
  const latestReview = sessions.find((item) => item.session.status === "completed");
  const recentNotes = notes;
  const weeklyChallenges = challenges.filter((item) => item.cadence === "weekly").slice(0, 2);
  const personalitySnapshot = personality[0] ?? null;
  const started = couple?.relationshipStartedOn ?? user.profile.relationshipStartedOn;
  const daysTogether = started ? Math.max(differenceInCalendarDays(new Date(), parseISO(started)), 0) : null;
  const score = report?.knowledge.score ?? null;
  const ownPhase = ownCycle?.estimate.hasHistory && ownCycle.estimate.phase !== "unknown" ? PHASE_COPY[ownCycle.estimate.phase].title : null;
  const cycleFeature = tracks
    ? { href: "/cycle", title: "Cycle Tracker", detail: "Follow your cycle and share only what you choose.", action: "Open tracker", icon: CalendarHeart, tone: "bg-[#fde7f3]" }
    : { href: "/cycle", title: "Partner cycle", detail: "See the cycle details your partner chooses to share.", action: "View shared cycle", icon: CalendarHeart, tone: "bg-[#fde7f3]" };
  const features: { href: string; title: string; detail: string; action: string; icon: LucideIcon; tone: string }[] = [
    { href: "/play", title: "Partner Quiz", detail: "Guess what your partner answered and reveal together.", action: "Start Quiz", icon: Gamepad2, tone: "bg-[#f7e8ff]" },
    { href: "/personality", title: "Personality Lab", detail: "Explore personalities, communication styles, and love languages.", action: "Take Test", icon: Brain, tone: "bg-[#eee9ff]" },
    { href: "/connection", title: "Our Connection", detail: "Compare your answers, find shared interests, and discover new things.", action: "View Insights", icon: Heart, tone: "bg-[#ffe8f1]" },
    { href: "/memories", title: "Our Story", detail: "Save milestones, memories, and your future dreams together.", action: "Open Timeline", icon: ImageIcon, tone: "bg-[#e7f1ff]" },
    { href: "/plans", title: "Date plans", detail: "Build a shared itinerary and keep the trip budget in one place.", action: "Open plans", icon: Ticket, tone: "bg-[#fff1e7]" },
    cycleFeature,
  ];

  return (
    <main className="grid w-full gap-4 px-4 py-4 lg:px-8 lg:py-6">
      {!couple && <h1 className="font-serif text-4xl">Your home</h1>}
      {!membership && (
        <section className="panel p-6">
          <h2 className="font-serif text-3xl">Create a space, or join one</h2>
          <p className="mt-2 text-sm text-muted-foreground">You do not need your partner to register before you begin.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-primary-foreground" href="/onboarding?step=pairing">Create or join</Link>
        </section>
      )}
      {membership && !partner && (
        <section className="panel bg-secondary p-6">
          <h2 className="font-serif text-3xl">Invite your partner</h2>
          <p className="mt-2 text-sm">Share this code. It expires and can be revoked.</p>
          <p data-testid="invite-code" className="mt-4 font-serif text-4xl tracking-widest">{invites[0]?.code ?? "Create a code in pairing"}</p>
          <Link href="/pairing" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">Open QR code and invitation</Link>
        </section>
      )}
      <BannerUpload src={user.profile.bannerUrl} className="h-44 w-full rounded-[1.75rem] lg:hidden" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
        <div className="order-2 grid gap-4 lg:col-start-1 lg:row-start-1 lg:order-none">
          <BannerUpload src={user.profile.bannerUrl} className="hidden min-h-72 rounded-[2rem] lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/10" />
            <div className="relative z-10 max-w-xl p-8">
              <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">{greeting()}, {user.profile.displayName.split(" ")[0]}</p>
              <h2 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] text-[#4c1d95]">How well do you know your partner?</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/play" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"><Play className="size-4 fill-current" aria-hidden />Play a Quiz</Link>
                <Link href="/connection" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white bg-white/80 px-5 text-sm font-medium"><Heart className="size-4 text-rose" aria-hidden />View Our Connection</Link>
              </div>
            </div>
            <img src="/brand/better-together.png" alt="Better together" className="absolute top-6 right-6 z-10 h-12 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]" />
          </BannerUpload>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.href} className={`flex min-h-28 flex-col rounded-2xl p-3 sm:min-h-36 sm:rounded-[1.75rem] sm:p-4 ${feature.tone}`}>
                <span className="flex size-8 items-center justify-center rounded-xl bg-white/80 text-primary sm:size-11 sm:rounded-2xl"><feature.icon className="size-4 sm:size-5" aria-hidden /></span>
                <span className="mt-2 font-serif text-base leading-tight sm:mt-3 sm:text-xl">{feature.title}</span>
                <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:mt-1 sm:text-xs sm:leading-5">{feature.detail}</span>
                <span className="mt-auto pt-2 text-xs font-medium text-primary sm:pt-3 sm:text-sm">{feature.action} →</span>
              </Link>
            ))}
          </section>
          <section className="hidden gap-4 lg:grid lg:grid-cols-2">
            <article className="panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Latest Quiz Results</h2>
                <Link href="/play" className="text-sm text-primary">View All</Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ScoreRing value={report?.mine.score ?? null} label="Your Score" detail={report?.mine.eligible ? `${report.mine.correct}/${report.mine.eligible} matched` : "Not enough answers yet"} />
                <ScoreRing value={report?.partnerKnowledge?.score ?? null} label="Partner's Score" detail={report?.partnerKnowledge?.eligible ? `${report.partnerKnowledge.correct}/${report.partnerKnowledge.eligible} matched` : "Waiting on their round"} />
              </div>
              <Link href={latestReview ? `/play/results/${latestReview.round.id}` : "/play"} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary">View Details</Link>
            </article>
            <article className="panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Your Personality Snapshot</h2>
                <Link href="/personality" className="text-sm text-primary">View Details</Link>
              </div>
              {personalitySnapshot ? (
                <div className="mt-4 grid gap-3">
                  <p className="text-sm text-muted-foreground">{personalitySnapshot.summary.split(". ")[0]}.</p>
                  {snapshotOrder.map(([key, label]) => {
                    const value = personalitySnapshot.scores[key];
                    if (typeof value !== "number") return null;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs"><span>{label}</span><span>{Math.round(value)}%</span></div>
                        <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Take a personality reflection to see social energy, planning, decision making, and communication. Results stay private until you share them.</p>
              )}
            </article>
          </section>
          <section className="hidden gap-4 lg:grid lg:grid-cols-3">
            <article className="panel p-5">
              <div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Upcoming Challenges</h2><Link href="/play" className="text-sm text-primary">View All</Link></div>
              {weeklyChallenges.map((challenge) => (
                <div key={challenge.id} className="mt-3 rounded-2xl bg-secondary p-3">
                  <p className="text-sm font-medium">{challenge.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{challenge.description}</p>
                </div>
              ))}
              {!weeklyChallenges.length && <p className="mt-3 text-sm text-muted-foreground">Weekly challenges show up here. Missing a day does not take points away.</p>}
            </article>
            <article className="panel p-5">
              <div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Today&apos;s Question</h2><Link href="/play/daily" className="text-sm text-primary">View All</Link></div>
              <p className="mt-3 font-serif text-2xl leading-snug">{todayQuestion?.guessPrompt ?? "A new question is ready when you are."}</p>
              <p className="mt-2 text-xs text-muted-foreground">Your partner&apos;s answer stays hidden until this round&apos;s reveal rules allow it.</p>
              <Link href="/play/daily" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-foreground">Answer Now</Link>
            </article>
            <article className="panel hidden p-5 lg:block">
              <h2 className="font-serif text-2xl">Memories</h2>
              {memories.slice(0, 3).map((memory) => <p key={memory.id} className="mt-2 text-sm">{memory.title}{memory.occurredOn ? ` · ${format(parseISO(memory.occurredOn), "MMM d, yyyy")}` : ""}</p>)}
              {!memories.length && <p className="mt-2 text-sm text-muted-foreground">Your timeline is empty, and that is a fine place to start.</p>}
              <Link href="/memories" className="mt-3 inline-flex min-h-11 items-center text-sm text-primary">Open timeline</Link>
            </article>
          </section>
        </div>
        <aside className="order-1 grid gap-4 lg:col-start-2 lg:row-start-1 lg:order-none">
          <section className="panel p-5">
            <p className="text-sm text-muted-foreground lg:hidden">{greeting()}</p>
            <div className="mt-1 flex items-center gap-3 lg:mt-0">
              <Avatar name={user.profile.displayName} src={user.profile.avatarUrl} className="hidden size-14 lg:inline-flex" />
              {partner && <Heart className="hidden size-4 fill-rose text-rose lg:block" aria-hidden />}
              {partner && <Avatar name={partner.displayName} src={partner.avatarUrl} className="hidden size-14 lg:inline-flex" />}
              <div>
                {couple ? <h1 className="font-serif text-4xl leading-none lg:text-2xl">{couple.name}</h1> : <p className="font-serif text-3xl">{user.profile.displayName}</p>}
                <p className="mt-1 font-serif text-base text-muted-foreground italic lg:hidden">Better together, always.</p>
                <p className="mt-1 hidden text-xs text-muted-foreground lg:block">{partner ? `${user.profile.displayName.split(" ")[0]} and ${partner.displayName.split(" ")[0]}` : "Waiting for your person"}</p>
                <p className="text-xs text-muted-foreground">{togetherLabel(started)}</p>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Our Knowledge Score</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p data-testid="knowledge-score" className="font-serif text-4xl">{formatScore(score)}</p>
              <p className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">{report?.knowledge.label ?? "Not enough answers yet"}</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-secondary" aria-hidden>
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${score ?? 0}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{SCORE_DISCLAIMER}</p>
            <p className="mt-2 text-xs text-muted-foreground">{daysTogether ?? "—"} days together · {user.preferences.dailyStreak} day streak · {user.preferences.points} points</p>
          </section>
          {tracks && (
            <section className="panel p-5">
              <h2 className="font-serif text-2xl">Your cycle</h2>
              <p className="mt-1 text-xs leading-4 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">{ownPhase ? `${ownPhase} phase estimate.` : "Log a period to start a personal estimate."} Predictions are estimates, not confirmed medical information.</p>
              <Link href="/cycle" className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-primary sm:mt-3 sm:min-h-11 sm:text-sm">Open tracker</Link>
            </section>
          )}
          {shared && <PartnerCycleCard shared={shared} />}
          <section className="panel hidden p-5 lg:block">
            <div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Recent Activity</h2><Link href="/notifications" className="text-sm text-primary">View All</Link></div>
            <ActivityList notes={recentNotes} />
          </section>
          <section className="panel hidden p-5 lg:block">
            <h2 className="font-serif text-2xl">Quick Actions</h2>
            <div className="mt-3 grid gap-2">
              {[
                ["/play", "Start a Quiz"],
                ["/personality", "Take Personality Test"],
                ["/play/daily", "Ask a Question"],
                ["/memories/new", "Add a Memory"],
                ["/plans", "Plan a date"],
              ].map(([href, label]) => (
                <Link key={label} href={href} className="flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm">{label}</Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {resume && <Link href={`/play/quiz/${resume.session.id}`} className="panel bg-secondary p-5">Resume {resume.round.title}</Link>}
      {user.profile.isDemo && <form action={resetDemoAction}><button className="text-sm underline">Reset fictional demo data</button></form>}
    </main>
  );
}

function ActivityList({ notes }: { notes: { id: string; type: string; title: string; href: string | null; createdAt: string }[] }) {
  if (!notes.length) return <p className="mt-3 text-sm text-muted-foreground">Activity appears after a quiz, memory, or challenge. Partner answers are not included here.</p>;
  return (
    <ol className="mt-4 grid gap-3">
      {notes.map((note) => {
        const time = formatDistanceToNow(parseISO(note.createdAt), { addSuffix: true });
        const body = (
          <span className="relative block border-l-2 border-[#eadcf5] py-1 pl-4">
            <span className={`absolute top-2 -left-[5px] size-2 rounded-full ${note.type === "achievement" ? "bg-emerald-500" : note.type === "memory" ? "bg-rose" : "bg-primary"}`} aria-hidden />
            <span className="block text-sm font-medium">{note.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{time}</span>
          </span>
        );
        return <li key={note.id}>{note.href ? <Link href={note.href} className="block min-h-11 rounded-2xl hover:bg-secondary/60">{body}</Link> : body}</li>;
      })}
    </ol>
  );
}

function ScoreRing({ value, label, detail }: { value: number | null; label: string; detail: string }) {
  const score = value ?? 0;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = value == null ? 0 : (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <div className="text-center">
      <svg width="84" height="84" viewBox="0 0 84 84" className="mx-auto" role="img" aria-label={value == null ? `${label}, not enough answers yet` : `${label} ${Math.round(score)} percent`}>
        <circle cx="42" cy="42" r={radius} fill="none" className="stroke-secondary" strokeWidth="8" />
        <circle cx="42" cy="42" r={radius} fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 42 42)" />
        <text x="42" y="47" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor">{value == null ? "—" : `${Math.round(score)}%`}</text>
      </svg>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
