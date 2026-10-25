"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const destinations = [
  { href: "/home", label: "Home" },
  { href: "/play", label: "Partner Quiz" },
  { href: "/play/daily", label: "Daily Question" },
  { href: "/play#quick-quiz", label: "Quick Quiz" },
  { href: "/play#deep-dive", label: "Deep Dive" },
  { href: "/play/custom", label: "Custom Quiz" },
  { href: "/play/library", label: "Question Library" },
  { href: "/personality", label: "Personality Lab" },
  { href: "/connection", label: "Our Connection" },
  { href: "/memories", label: "Memories" },
  { href: "/cycle", label: "Cycle tracker" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/notifications", label: "Notifications" },
];

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return destinations.filter((item) => item.label.toLowerCase().includes(text)).slice(0, 6);
  }, [query]);

  return (
    <form
      className="relative mx-auto w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        const target = matches[0];
        if (!target) return;
        setQuery("");
        router.push(target.href);
      }}
    >
      <label className="sr-only" htmlFor="app-search">Search questions, insights, or anything</label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="app-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search questions, insights, or anything"
        className="h-11 w-full rounded-full border bg-card pr-4 pl-11 text-sm outline-none"
        autoComplete="off"
      />
      {matches.length > 0 && (
        <ul className="absolute top-[calc(100%+0.4rem)] z-30 w-full overflow-hidden rounded-2xl bg-card shadow-[var(--shadow)]">
          {matches.map((item) => (
            <li key={item.href}>
              <button type="button" className="flex min-h-11 w-full items-center px-4 text-left text-sm hover:bg-secondary" onClick={() => { setQuery(""); router.push(item.href); }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
