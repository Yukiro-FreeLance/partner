"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Brain, CalendarHeart, ChevronDown, Gamepad2, Heart, House, ImageIcon, Shield, UserRound } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { DashboardSearch } from "@/components/dashboard-search";
import { Avatar } from "@/components/ui/feedback";
import { PwaClient } from "@/components/pwa-client";
import { navigationCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const playLinks = [
  { href: "/play", label: "Partner Quiz", exact: true },
  { href: "/play/daily", label: "Daily Question" },
  { href: "/play#quick-quiz", label: "Quick Quiz" },
  { href: "/play#deep-dive", label: "Deep Dive" },
  { href: "/play/custom", label: "Custom Quiz" },
  { href: "/play/library", label: "Question Library" },
];

export function AppShell({ children, name, avatarUrl, demo, unread, locale, impersonating = false, superAdmin = false }: { children: React.ReactNode; name: string; avatarUrl: string | null; demo: boolean; unread: number; locale: string; impersonating?: boolean; superAdmin?: boolean }) {
  const pathname = usePathname();
  const copy = navigationCopy(locale);
  const [count, setCount] = useState(unread);
  const [playOpen, setPlayOpen] = useState(true);
  const quiz = pathname.includes("/play/quiz/");
  const wide = pathname.startsWith("/admin");
  const phone = !quiz && !wide;
  const mobile = [
    { href: "/home", label: copy.home, icon: House },
    { href: "/play", label: copy.play, icon: Gamepad2 },
    { href: "/personality", label: copy.personality, icon: Brain },
    { href: "/connection", label: copy.connection, icon: Heart },
    { href: "/profile", label: copy.profile, icon: UserRound },
  ];

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const body = (await response.json()) as { unread?: number };
      if (!cancelled && typeof body.unread === "number") setCount(body.unread);
    }
    const timer = window.setInterval(() => void poll(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={cn("min-h-dvh", impersonating && "pt-14", phone && "lg:grid lg:grid-cols-[240px_minmax(0,1fr)]")}>
      {impersonating && (
        <form method="post" action="/api/admin/impersonate/stop" className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 bg-[#4c1d95] px-4 py-2 text-sm text-white">
          <p>Viewing the app as {name}.</p>
          <button type="submit" className="min-h-11 rounded-full bg-white px-4 font-medium text-primary">Return to admin</button>
        </form>
      )}
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-3 focus:py-2">{copy.skip}</a>
      <p className="sr-only">Signed in as {name}</p>
      {phone && (
        <aside className={cn("sticky hidden grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-[#f3e8f5] bg-white px-3 pt-4 pb-4 lg:grid", impersonating ? "top-14 h-[calc(100dvh-3.5rem)]" : "top-0 h-dvh")}>
          <div className="px-1"><Logo /></div>
          <nav className="mt-4 grid content-start gap-1 overflow-y-auto pr-1" aria-label="Desktop">
            <ShellLink href="/home" active={pathname.startsWith("/home")} icon={House}>{copy.home}</ShellLink>
            <div>
              <div className={cn("flex items-center rounded-2xl", pathname.startsWith("/play") && "bg-[#fde7f3]")}>
                <Link href="/play" className="flex min-h-11 flex-1 items-center gap-3 px-3 text-sm font-medium">
                  <Gamepad2 className="size-4" aria-hidden />
                  Partner Quiz
                </Link>
                <button type="button" className="flex size-11 items-center justify-center" aria-expanded={playOpen} aria-label="Quiz sections" onClick={() => setPlayOpen((open) => !open)}>
                  <ChevronDown className={cn("size-4 transition-transform", playOpen && "rotate-180")} aria-hidden />
                </button>
              </div>
              {playOpen && (
                <div className="mt-1 grid gap-0.5 pl-9">
                  {playLinks.map((item) => {
                    const path = item.href.split("#")[0];
                    const active = item.href.includes("#") ? false : item.exact ? pathname === path : pathname.startsWith(path);
                    return (
                      <Link key={item.label} href={item.href} className={cn("flex min-h-11 items-center rounded-xl px-3 text-sm", active ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            <ShellLink href="/personality" active={pathname.startsWith("/personality")} icon={Brain}>Personality Lab</ShellLink>
            <ShellLink href="/connection" active={pathname.startsWith("/connection")} icon={Heart}>Our Connection</ShellLink>
            <ShellLink href="/memories" active={pathname.startsWith("/memories")} icon={ImageIcon}>Memories</ShellLink>
            <ShellLink href="/cycle" active={pathname.startsWith("/cycle")} icon={CalendarHeart}>Cycle</ShellLink>
            <ShellLink href="/profile" active={pathname.startsWith("/profile")} icon={UserRound}>{copy.profile}</ShellLink>
            {superAdmin && <ShellLink href="/admin/users" active={pathname.startsWith("/admin/users")} icon={Shield}>User list</ShellLink>}
          </nav>
          <div className="border-t border-[#f6eef8] px-2 pt-3 pb-1">
            <p className="font-serif text-xs leading-4 font-medium text-muted-foreground italic">Better questions. Deeper conversations. A stronger us.</p>
            <form action={logoutAction}><button className="mt-1 flex h-10 w-full items-center text-left text-sm text-muted-foreground">{copy.logout}</button></form>
          </div>
        </aside>
      )}
      <div className="min-w-0">
        {phone && (
          <header className="sticky top-0 z-30 hidden items-center gap-4 border-b border-transparent bg-[#fbf7fc]/90 px-6 py-4 backdrop-blur lg:flex">
            <DashboardSearch />
            <Link href="/notifications" className="relative flex size-11 items-center justify-center rounded-full bg-white shadow-[var(--shadow)]" aria-label={count ? `Notifications, ${count} unread` : "Notifications"}>
              <Bell className="size-4" aria-hidden />
              {count > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-rose" />}
            </Link>
            <Link href="/profile" className="flex min-h-11 items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 shadow-[var(--shadow)]" aria-label="Profile">
              <Avatar name={name} src={avatarUrl} className="size-9 text-xs" />
              <span className="text-sm font-medium">{name.split(" ")[0]}</span>
            </Link>
          </header>
        )}
        {phone && (
          <header className="sticky top-0 z-30 flex items-center justify-between bg-[#fbf7fc]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 backdrop-blur lg:hidden">
            <Logo />
            <div className="flex items-center gap-1">
              <Link href="/cycle" className="flex size-11 items-center justify-center" aria-label="Cycle tracker"><CalendarHeart className="size-5" aria-hidden /></Link>
              <Link href="/notifications" className="relative flex size-11 items-center justify-center" aria-label={count ? `Notifications, ${count} unread` : "Notifications"}>
                <Bell className="size-5" aria-hidden />
                {count > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />}
              </Link>
              <Link href="/profile" className="flex size-11 items-center justify-center" aria-label="Profile"><Avatar name={name} src={avatarUrl} className="size-9 text-xs" /></Link>
            </div>
          </header>
        )}
        {demo && phone && <p className="mx-4 mt-3 rounded-2xl bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">Fictional demo. Maya and Jordan are sample people, not real users.</p>}
        {phone && <PwaClient />}
        <div id="content" className={cn(phone && "safe-pb")}>{children}</div>
      </div>
      {phone && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f3e8f5] bg-white/95 px-1 pt-1 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }} aria-label="App">
          <ul className="grid grid-cols-5">
            {mobile.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground", active && "font-semibold text-primary")} aria-current={active ? "page" : undefined}>
                    <Icon className={cn("size-5", active && "fill-secondary")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/home" className="flex min-h-11 items-center gap-2 px-1">
      <img src="/brand/logo.jpg" alt="" width={40} height={40} className="size-10 rounded-2xl object-cover" />
      <span className="text-xl font-bold tracking-tight text-primary">CoupleSync</span>
    </Link>
  );
}

function ShellLink({ href, active, icon: Icon, children }: { href: string; active: boolean; icon: typeof House; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm", active ? "bg-[#fde7f3] font-semibold text-primary" : "text-foreground/80 hover:bg-[#faf5ff]")}>
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
