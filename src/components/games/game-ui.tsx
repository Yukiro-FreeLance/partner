"use client";

import { cn } from "@/lib/utils";

export function GameHud({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 border border-border/50 bg-muted/25 p-2 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function GameStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[4.5rem] border border-border/40 bg-background/55 px-3 py-1.5 text-center transition-colors hover:border-primary/35">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", accent && "text-primary")}>{value}</p>
    </div>
  );
}

export function GamePulseBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden bg-muted/60">
      <div
        className="h-full bg-gradient-to-r from-primary via-teal-400 to-sky-400 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function GameTip({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}
