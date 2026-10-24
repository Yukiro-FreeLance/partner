"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DAILY_TIME_ZONE } from "@/lib/daily";

export function DailyCountdown({ resetAt, completed }: { resetAt: string; completed: boolean }) {
  const router = useRouter();
  const target = new Date(resetAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (now != null && now >= target) router.refresh();
  }, [now, router, target]);

  const remaining = Math.max(0, target - (now ?? target));
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  const resetLabel = new Intl.DateTimeFormat("en-US", { timeZone: DAILY_TIME_ZONE, weekday: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(resetAt));

  return (
    <div>
      <p className="font-serif text-4xl tabular-nums" aria-live="polite">{now == null ? "—" : clock}</p>
      <p className="mt-2 text-sm text-muted-foreground">{completed ? "Next quiz available in the time above." : "Today's quiz stays open until the reset above."} Next reset: {resetLabel}.</p>
    </div>
  );
}
