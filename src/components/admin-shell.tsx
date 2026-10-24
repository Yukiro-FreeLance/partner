"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Flag, House, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin#questions", label: "Questions", icon: ListChecks },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin#support", label: "Support", icon: LifeBuoy },
  { href: "/home", label: "Couple app", icon: House },
];

export function AdminShell({ children, name, superAdmin }: { children: React.ReactNode; name: string; superAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = superAdmin
    ? [baseLinks[0], baseLinks[1], { href: "/admin/users", label: "Users", icon: Users }, { href: "/admin/settings", label: "Site settings", icon: Settings }, ...baseLinks.slice(2)]
    : baseLinks;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      {open && <button type="button" className="fixed inset-0 z-40 bg-[#2e2440]/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#f3e8f5] bg-white px-3 py-4 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-1">
          <Link href="/admin" className="flex min-h-11 items-center gap-2">
            <img src="/brand/logo.jpg" alt="" width={40} height={40} className="size-10 rounded-2xl object-cover" />
            <span className="text-lg font-bold text-primary">CoupleSync</span>
          </Link>
          <button type="button" className="flex size-11 items-center justify-center lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="mt-3 px-3 text-xs font-semibold tracking-[0.14em] text-rose uppercase">{superAdmin ? "Super Admin" : "Admin"}</p>
        <nav className="mt-3 grid flex-1 content-start gap-1 overflow-y-auto" aria-label="Admin">
          {links.map((item) => {
            const Icon = item.icon;
            const active = "exact" in item && item.exact ? pathname === item.href : item.href.startsWith("/admin/") && pathname.startsWith(item.href);
            return (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm", active ? "bg-[#fde7f3] font-semibold text-primary" : "text-foreground/80 hover:bg-[#faf5ff]")}>
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#f6eef8] px-2 pt-3">
          <p className="truncate text-sm font-medium">{name}</p>
          <form action={logoutAction}><button className="mt-1 flex h-10 w-full items-center gap-2 text-left text-sm text-muted-foreground"><LogOut className="size-4" aria-hidden />Log out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#f3e8f5] bg-[#fbf7fc]/95 px-4 backdrop-blur">
          <button type="button" className="flex size-11 items-center justify-center rounded-2xl bg-white lg:hidden" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-xl">{superAdmin ? "Super Admin" : "Admin"}</p>
          </div>
          <Link href="/home" className="hidden min-h-11 items-center rounded-full bg-white px-4 text-sm font-medium shadow-[var(--shadow)] sm:inline-flex">Open couple app</Link>
        </header>
        <div id="content" className="px-4 py-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
