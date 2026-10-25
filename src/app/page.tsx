import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, Gamepad2, Heart, ImageIcon, Lock, Shield, Sparkles } from "lucide-react";
import { ConnectionPreview, FoodQuizPreview, HeroPhones, PersonalityPreview, PhoneFrame, StoryPreview } from "@/components/landing-previews";
import { PreviewQuiz } from "@/components/preview-quiz";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteSettings, siteAssetUrl } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { absolute: settings.title },
    description: settings.description,
    keywords: settings.keywords.split(",").map((item) => item.trim()).filter(Boolean),
    alternates: { canonical: "/" },
    openGraph: {
      title: settings.ogTitle || settings.title,
      description: settings.ogDescription || settings.description,
      url: "/",
      siteName: settings.siteName,
      type: "website",
      images: settings.ogImagePath ? [siteAssetUrl("og")] : undefined,
    },
  };
}

const features = [
  {
    title: "Partner Quiz",
    body: "Guess your partner's favorites, habits, and dreams. Reveal together when the quiz rules say the answers can open.",
    icon: Gamepad2,
    tone: "bg-white",
    preview: <FoodQuizPreview />,
  },
  {
    title: "Personality Lab",
    body: "Explore energy, planning, communication, and care preferences. These are reflections, not diagnoses.",
    icon: Brain,
    tone: "bg-white",
    preview: <PersonalityPreview />,
  },
  {
    title: "Our Connection",
    body: "Compare answers, see shared interests, and keep knowledge separate from preference alignment.",
    icon: Heart,
    tone: "bg-white",
    preview: <ConnectionPreview />,
  },
  {
    title: "Our Story",
    body: "Save milestones and memories in a private timeline. Nothing on this page comes from a real couple.",
    icon: ImageIcon,
    tone: "bg-white",
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
          <img src="/brand/banner.jpg" alt="" className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-[58%_40%] lg:block" />
          <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,#fbf7fc_0%,rgba(251,247,252,0.94)_18%,rgba(251,247,252,0.72)_34%,rgba(251,247,252,0.18)_52%,transparent_68%)] lg:block" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fbf7fc] to-transparent" />
          <img src="/brand/better-together.png" alt="Better together" className="pointer-events-none absolute top-10 right-[12%] z-20 hidden h-16 w-auto lg:block xl:right-[16%] xl:h-20" />
          <img src="/brand/heart-doodle.png" alt="" className="pointer-events-none absolute top-[6.5rem] right-[11%] z-20 hidden h-8 w-auto lg:block xl:right-[14%]" />
          <div className="absolute right-4 bottom-6 z-20 hidden lg:block xl:right-12">
            <HeroPhones />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:min-h-[36rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-8">
            <div className="relative z-10 max-w-xl">
              <p className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">The relationship discovery app</p>
              <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.05] font-bold tracking-[-0.03em] text-[#4c1d95] sm:text-5xl lg:text-6xl">How Well Do You <span className="font-serif text-[1.05em] font-normal text-primary italic">Really</span> Know Your Person?</h1>
              <p className="mt-5 max-w-md text-base leading-7 text-[#6b6280]">Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg"><Link data-testid="start-journey" href="/register">Start Your Couple Journey <ArrowRight className="size-4" aria-hidden /></Link></Button>
                <Button asChild size="lg" variant="outline" className="bg-white/80"><Link href="/join"><Heart className="size-4 text-rose" aria-hidden />Join Your Partner</Link></Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2 text-xs text-[#6b6280]">
                {[
                  { icon: Sparkles, label: "Fun quizzes", href: "/#features" },
                  { icon: Brain, label: "Personality tests", href: "/#features" },
                  { icon: Heart, label: "Deeper connection", href: "/#how-it-works" },
                  { icon: Shield, label: "Private and secure", href: "/privacy" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white bg-white/70 px-3 hover:bg-white">
                      <item.icon className="size-3.5 text-primary" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative lg:hidden">
              <div className="relative h-72 overflow-hidden rounded-[2rem] shadow-[0_28px_60px_-36px_rgba(109,40,217,0.55)] sm:h-80">
                <img src="/brand/banner.jpg" alt="" className="h-full w-full object-cover object-[68%_42%]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#4c1d95]/30 via-transparent to-transparent" />
                <img src="/brand/better-together.png" alt="Better together" className="absolute top-3 right-3 h-10 w-auto drop-shadow-[0_2px_10px_rgba(76,29,149,0.35)] sm:h-12" />
                <img src="/brand/heart-doodle.png" alt="" className="absolute top-12 right-4 h-6 w-auto sm:h-7" />
              </div>
              <div className="relative z-10 -mt-14 flex justify-end pr-1 sm:-mt-16">
                <HeroPhones tone="black" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-20">
          <p className="text-center text-xs font-semibold tracking-[0.22em] text-rose uppercase">Features</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-serif text-4xl leading-tight text-[#3b0764] sm:text-5xl">Everything You Need for a Stronger Connection</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-muted-foreground">From fun quizzes to deep conversations, CoupleSync helps you learn, grow, and celebrate your unique bond.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className={`min-w-0 overflow-hidden border border-white shadow-[0_24px_50px_-36px_rgba(109,40,217,0.55)] motion-safe:transition motion-safe:hover:-translate-y-1 ${feature.tone}`}>
                <CardHeader>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#f3e8ff] text-primary">
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <CardTitle className="mt-4 text-2xl text-[#3b0764]">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{feature.body}</CardDescription>
                </CardHeader>
                <CardContent>
                  <PhoneFrame label={`${feature.title} sample preview`}>{feature.preview}</PhoneFrame>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-rose uppercase">How it works</p>
              <h2 className="mt-3 max-w-xl font-serif text-4xl text-[#3b0764] sm:text-5xl">Start Your Journey in 3 Simple Steps</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">It is easy to get started. Create your account, invite your partner, and begin discovering each other.</p>
              <ol className="mt-8 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                {steps.map(([title, body, href], index) => (
                  <li key={title} className="flex min-w-0 gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3e8ff] font-serif text-lg text-primary">{index + 1}</span>
                    <div>
                      <h3 className="font-serif text-xl text-[#3b0764]">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                      <Link href={href} className="inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline">{index === 1 ? "Open the invite page" : "Create an account"}</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,#fce7f3,transparent_45%),radial-gradient(circle_at_80%_70%,#f3e8ff,transparent_50%),#fff7fb] px-6 py-10">
              <img src="/brand/hearts-lavender.png" alt="" className="absolute top-6 left-6 h-8 w-auto" />
              <img src="/brand/heart-doodle.png" alt="" className="absolute top-8 right-8 h-7 w-auto" />
              <img src="/brand/better-together.png" alt="Better together" className="mb-4 ml-auto h-12 w-auto" />
              <div className="mx-auto max-w-sm">
                <PreviewQuiz />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 lg:grid-cols-2">
          <Card className="border-white bg-white/80 shadow-[0_24px_50px_-36px_rgba(109,40,217,0.45)]">
            <CardHeader>
              <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Sample results · fictional</p>
              <CardTitle className="text-3xl text-[#3b0764]">An example of the score, not a customer</CardTitle>
              <CardDescription>This 77.5% figure shows how a knowledge score can look. It is not from a real couple, and it does not measure love or compatibility.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-[11rem_1fr]">
              <div className="rounded-3xl bg-[#faf7ff] p-4">
                <p className="text-xs text-muted-foreground">Example knowledge score</p>
                <p className="font-serif text-4xl text-[#3b0764]">77.5%</p>
                <p className="text-sm text-emerald-700">Example · Great Connection</p>
                <div className="mt-3 h-2 rounded-full bg-white" aria-hidden><div className="h-2 w-[77.5%] rounded-full bg-emerald-500" /></div>
              </div>
              <div>
                <p className="text-sm font-medium">Example shared interests</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  {["Favorite food: a shared noodle bowl", "A weekend that stays unhurried", "Music for cooking, not a real playlist"].map((item) => (
                    <li key={item} className="rounded-2xl bg-[#faf7ff] px-3 py-2">{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          <Card className="relative border-white bg-white/80 shadow-[0_24px_50px_-36px_rgba(109,40,217,0.45)]">
            <img src="/brand/better-together.png" alt="Better together" className="absolute top-5 right-5 h-10 w-auto" />
            <CardHeader>
              <p className="text-xs font-semibold tracking-[0.16em] text-rose uppercase">Sample stories · not reviews</p>
              <CardTitle className="max-w-sm text-3xl text-[#3b0764]">Written as an illustration</CardTitle>
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
          <h2 className="mt-3 text-center font-serif text-4xl text-[#3b0764] sm:text-5xl">Free to start</h2>
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
          <h2 className="font-serif text-4xl text-[#3b0764] sm:text-5xl">Questions people ask</h2>
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
          <div className="panel flex flex-col items-center bg-white/80 px-6 py-12 text-center">
            <Lock className="text-rose" aria-hidden />
            <h2 className="mt-3 max-w-xl font-serif text-4xl text-[#3b0764] sm:text-5xl">Start with one honest answer.</h2>
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
