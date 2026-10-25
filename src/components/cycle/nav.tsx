"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ownerLinks = [
  ["/cycle", "Overview"],
  ["/cycle/check-in", "Check-in"],
  ["/cycle/calendar", "Calendar"],
  ["/cycle/insights", "Insights"],
  ["/cycle/shared", "Shared"],
  ["/cycle/settings", "Privacy"],
] as const;

const partnerLinks = [
  ["/cycle", "Shared"],
  ["/cycle/calendar", "Calendar"],
] as const;

export function CycleNav({ mode = "owner" }: { mode?: "owner" | "partner" }) {
  const pathname = usePathname();
  const links = mode === "partner" ? partnerLinks : ownerLinks;
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Cycle">
      {links.map(([href, label]) => {
        const active = href === "/cycle" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm", active ? "bg-primary font-semibold text-primary-foreground" : "bg-white text-foreground")} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
