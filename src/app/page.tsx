import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Gamepad2, Heart, ImageIcon, Lock, Play, Shield, Sparkles } from "lucide-react";
import { ConnectionPreview, FoodQuizPreview, PersonalityPreview, PhoneFrame, StoryPreview } from "@/components/landing-previews";
import { PreviewQuiz } from "@/components/preview-quiz";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: { absolute: "CoupleSync — How Well Do You Really Know Your Person?" },
  description: "Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours. A private quiz for two.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CoupleSync — How Well Do You Really Know Your Person?",
    description: "A private way for two people to learn the small things that make their connection theirs.",
    url: "/",
    siteName: "CoupleSync",
    type: "website",
  },
};

const features = [
  {
    title: "Partner Quiz",
    body: "Guess your partner's favorites, habits, and dreams. Reveal together when the quiz rules say the answers can open.",
    icon: Gamepad2,
    tone: "bg-[#f7e8ff]",
    preview: <FoodQuizPreview />,
  },
  {
    title: "Personality Lab",
    body: "Explore energy, planning, communication, and care preferences. These are reflections, not diagnoses.",
    icon: Brain,
    tone: "bg-[#eee9ff]",
    preview: <PersonalityPreview />,
  },
  {
    title: "Our Connection",
    body: "Compare answers, see shared interests, and keep knowledge separate from preference alignment.",
    icon: Heart,
    tone: "bg-[#ffe8f1]",
    preview: <ConnectionPreview />,
  },
  {
    title: "Our Story",
    body: "Save milestones and memories in a private timeline. Nothing on this page comes from a real couple.",
    icon: ImageIcon,
    tone: "bg-[#e7f1ff]",
    preview: <StoryPreview />,
  },
];

const steps = [
  ["Create your account", "Sign up, confirm your email, and set the name you want your partner to see.", "/register"],
  ["Invite your partner", "Share a private code or link. The space holds two people, and the code can expire.", "/join"],
  ["Start exploring", "Answer on your own. Guesses and personal answers stay separate until a reveal is allowed.", "/register"],
];

const faqs = [
  ["Is a low score a bad sign?", "No. The score only describes how many shareable answers matched a guess. A lower score means there is more to discover."],
  ["Can my partner see an answer early?", "No. Actual answers and guesses are stored separately, and partner answers stay hidden until that quiz mode allows a reveal."],
  ["Do both of us need accounts first?", "No. The first person can create the space and invite the other whenever they are ready."],
  ["Are the personality results a diagnosis?", "No. They are private self-reflection tools. They do not label anyone or predict a relationship."],
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="relative overflow-hidden">
          <img src="/brand/banner.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[68%_38%]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,251,0.9)_0%,rgba(255,248,251,0.55)_26%,rgba(255,248,251,0.12)_48%,transparent_68%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-rose uppercase">The relationship discovery app</p>
              <h1 className="mt-5 max-w-xl font-serif text-[2.7rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl lg:text-6xl">How Well Do You <span className="text-primary italic">Really</span> Know Your Person?</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="shadow-[0_12px_30px_-16px_rgb(109_40_217_/_0.8)]"><Link data-testid="start-journey" href="/register"><Play className="size-4 fill-current" aria-hidden />Start Your Couple Journey</Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-white/80"><Link href="/join"><Heart className="size-4 text-rose" aria-hidden />Join Your Partner</Link></Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {[
                  { icon: Sparkles, label: "Fun quizzes", href: "/#features" },
                  { icon: Brain, label: "Personality tests", href: "/#features" },
                  { icon: Heart, label: "Deeper connection", href: "/#how-it-works" },
                  { icon: Shield, label: "Private and secure", href: "/privacy" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white/70 px-3 hover:bg-white">
                      <item.icon className="size-3.5 text-rose" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative mx-auto h-[560px] w-full max-w-xl">
              <p className="absolute top-0 right-2 z-30 font-serif text-3xl text-primary italic drop-shadow-sm">Better together</p>
              <img src="/brand/phone-home.png" alt="Sample home screen. Illustration only, not a customer result." width={508} height={954} className="absolute top-14 left-0 z-10 w-[56%] drop-shadow-[0_22px_36px_rgba(88,28,60,0.28)]" />
              <img src="/brand/phone-quiz.png" alt="Sample partner quiz screen." width={540} height={1059} className="absolute top-12 right-0 z-20 w-[52%] drop-shadow-[0_22px_36px_rgba(88,28,60,0.28)]" />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-20">
          <p className="text-center text-xs font-semibold tracking-[0.22em] text-rose uppercase">Features</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-serif text-4xl leading-tight sm:text-5xl">Everything You Need for a Stronger Connection</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-muted-foreground">From fun quizzes to deep conversations, CoupleSync helps you learn, grow, and celebrate your unique bond.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className={`min-w-0 overflow-hidden border-0 motion-safe:transition motion-safe:hover:-translate-y-1 ${feature.tone}`}>
                <CardHeader>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white/80 text-primary">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <CardTitle className="mt-4 text-2xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{feature.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <PhoneFrame label={`${feature.title} sample preview`}>{feature.preview}</PhoneFrame>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-xs font-medium tracking-[0.18em] text-rose uppercase">How it works</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl sm:text-5xl">Start Your Journey in 3 Simple Steps</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">It is easy to get started. Create your account, invite your partner, and begin discovering each other.</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map(([title, body, href], index) => (
                <li key={title} className="panel flex min-w-0 flex-col p-5">
                  <span className="flex size-11 items-center justify-center rounded-full bg-secondary font-serif text-lg text-primary">{index + 1}</span>
                  <h3 className="mt-4 font-serif text-2xl text-balance">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                  <Link href={href} className="mt-auto inline-flex min-h-11 items-center pt-3 text-sm text-primary underline-offset-4 hover:underline">{index === 1 ? "Open the invite page" : "Create an account"}</Link>
                </li>
              ))}
            </ol>
            <div className="mx-auto mt-8 max-w-xl">
              <PreviewQuiz />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-xs tracking-wide text-rose uppercase">Sample results · fictional</p>
              <CardTitle className="text-3xl">An example of the score, not a customer</CardTitle>
              <CardDescription>This 77.5% figure shows how a knowledge score can look. It is not from a real couple, and it does not measure love or compatibility.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="rounded-3xl bg-secondary p-4">
                <p className="text-xs text-muted-foreground">Example knowledge score</p>
                <p className="font-serif text-4xl">77.5%</p>
                <p className="text-sm text-emerald-700">Example band · Great Connection</p>
                <div className="mt-3 h-2 rounded-full bg-white" aria-hidden><div className="h-2 w-[77.5%] rounded-full bg-emerald-500" /></div>
              </div>
              <div>
                <p className="text-sm font-medium">Example shared interests</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  {["Favorite food: a shared noodle bowl", "A weekend that stays unhurried", "Music for cooking, not a real playlist"].map((item) => (
                    <li key={item} className="rounded-2xl bg-muted px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <p className="text-xs tracking-wide text-rose uppercase">Sample stories · not reviews</p>
              <CardTitle className="text-3xl">Written as an illustration</CardTitle>
              <CardDescription>Genuine testimonials are not published here yet. The note below is fiction, so it is not a customer quote.</CardDescription>
            </CardHeader>
            <CardContent>
              <blockquote className="text-sm leading-7">“We found out we both want rainy-day walks. The quiz did not tell us we were compatible. It gave us a better question.”</blockquote>
              <p className="mt-4 text-sm text-muted-foreground">Sample story · Maya, a fictional character in the demo. Together for a made-up 3 years.</p>
            </CardContent>
          </Card>
        </section>

        <section id="pricing" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-8">
          <p className="text-center text-xs font-medium tracking-[0.18em] text-rose uppercase">Pricing</p>
          <h2 className="mt-3 text-center font-serif text-4xl sm:text-5xl">Free to start</h2>
          <Card className="mx-auto mt-8 max-w-lg text-center">
            <CardHeader>
              <CardTitle>CoupleSync for two</CardTitle>
              <p className="font-serif text-5xl">Free</p>
              <CardDescription>Create a private space, invite one partner, and play the quizzes in this release. There is no subscription to buy on this page.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link href="/register">Get Started</Link></Button>
            </CardContent>
          </Card>
        </section>

        <section id="faq" className="scroll-mt-24 mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-serif text-4xl sm:text-5xl">Questions people ask</h2>
          <div className="mt-6 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="panel p-5 open:bg-white">
                <summary className="min-h-11 cursor-pointer font-medium">{question}</summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="panel flex flex-col items-center bg-gradient-to-r from-secondary via-white to-accent px-6 py-12 text-center">
            <Lock className="text-rose" aria-hidden />
            <h2 className="mt-3 max-w-xl font-serif text-4xl sm:text-5xl">Start with one honest answer.</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Your partner&apos;s answers stay hidden until the reveal rules allow them. After you sign in, supported browsers can install CoupleSync to your home screen.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/register">Start Your Couple Journey</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/login">Log in</Link></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
