import { CalendarHeart, CircleDashed, Droplets, Flower2, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { formatDay } from "@/lib/cycle/dates";

export type CalendarFlags = {
  confirmedPeriod: boolean;
  predictedPeriod: boolean;
  fertile: boolean;
  ovulation: boolean;
  checkIn: boolean;
  event: boolean;
  today: boolean;
  selected: boolean;
  inMonth: boolean;
};

type MarkKey = "confirmedPeriod" | "predictedPeriod" | "fertile" | "ovulation" | "checkIn" | "event";

const marks: { key: MarkKey; label: string; detail: string; icon: LucideIcon; sample: string; iconClass: string }[] = [
  { key: "confirmedPeriod", label: "Recorded period", detail: "Dates you logged", icon: Droplets, sample: "bg-[#ffe4e6] text-[#9f1239]", iconClass: "text-[#9f1239]" },
  { key: "predictedPeriod", label: "Predicted period", detail: "Estimate only", icon: CircleDashed, sample: "border border-dashed border-[#e11d48] bg-white text-[#be123c]", iconClass: "text-[#be123c]" },
  { key: "fertile", label: "Fertile window", detail: "Predicted estimate", icon: Sparkles, sample: "bg-white text-[#6d28d9] shadow-[inset_0_0_0_2px_#c4b5fd]", iconClass: "text-[#6d28d9]" },
  { key: "ovulation", label: "Ovulation", detail: "Predicted, not confirmed", icon: Flower2, sample: "bg-[#f5f3ff] text-[#6d28d9]", iconClass: "text-[#6d28d9]" },
  { key: "checkIn", label: "Check-in", detail: "A private day log", icon: PenLine, sample: "bg-white text-[#6d28d9]", iconClass: "text-[#6d28d9]" },
  { key: "event", label: "Event", detail: "Something on this day", icon: CalendarHeart, sample: "bg-white text-[#7c3aed]", iconClass: "text-[#7c3aed]" },
];

export function daySurface(flags: CalendarFlags) {
  const background = flags.confirmedPeriod ? "bg-[#ffe4e6]" : flags.inMonth ? "bg-white" : "bg-transparent text-muted-foreground";
  const predicted = flags.predictedPeriod && !flags.confirmedPeriod ? "border border-dashed border-[#e11d48]" : "border border-transparent";
  const fertile = flags.fertile ? "shadow-[inset_0_0_0_2px_#c4b5fd]" : "";
  const selected = flags.selected ? "ring-2 ring-primary" : "";
  return `${background} ${predicted} ${fertile} ${selected}`;
}

export function describeDay(day: string, flags: CalendarFlags) {
  const labels = marks.filter((mark) => flags[mark.key]).map((mark) => mark.label);
  if (flags.today) labels.push("Today");
  if (flags.selected) labels.push("Selected");
  return [formatDay(day), ...labels].join(". ");
}

export function DayIdentifiers({ flags }: { flags: CalendarFlags }) {
  const active = marks.filter((mark) => flags[mark.key]);
  if (active.length === 0) return <span className="block h-3.5" />;
  return (
    <span className="flex flex-wrap items-center justify-center gap-0.5">
      {active.map((mark) => {
        const Icon = mark.icon;
        return <Icon key={mark.key} className={`size-3.5 ${mark.iconClass}`} aria-hidden />;
      })}
    </span>
  );
}

export function DayMarkList({ flags }: { flags: CalendarFlags }) {
  const active = marks.filter((mark) => flags[mark.key]);
  if (active.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {active.map((mark) => {
        const Icon = mark.icon;
        return (
          <li key={mark.key} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#faf7ff] px-3 text-sm">
            <Icon className={`size-4 ${mark.iconClass}`} aria-hidden />
            {mark.label}
          </li>
        );
      })}
    </ul>
  );
}

export function CalendarLegend({ audience = "owner" }: { audience?: "owner" | "partner" }) {
  const visible = marks.filter((mark) => audience === "owner" || mark.key !== "checkIn").map((mark) => {
    if (audience === "partner" && mark.key === "confirmedPeriod") return { ...mark, detail: "Dates your partner shared" };
    if (audience === "partner" && mark.key === "event") return { ...mark, detail: "An event they shared" };
    return mark;
  });
  return (
    <section aria-label="Calendar key" className="panel p-4">
      <h2 className="font-serif text-lg">Calendar key</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((mark) => {
          const Icon = mark.icon;
          return (
            <li key={mark.key} className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#faf7ff] px-3 py-2">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${mark.sample}`} aria-hidden>
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{mark.label}</span>
                <span className="block text-xs text-muted-foreground">{mark.detail}</span>
              </span>
            </li>
          );
        })}
        <li className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#faf7ff] px-3 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-primary" aria-hidden>8</span>
          <span>
            <span className="block text-sm font-medium">Today</span>
            <span className="block text-xs text-muted-foreground">Date number turns plum</span>
          </span>
        </li>
        <li className="flex min-h-11 items-center gap-3 rounded-2xl bg-[#faf7ff] px-3 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white ring-2 ring-primary" aria-hidden />
          <span>
            <span className="block text-sm font-medium">Selected day</span>
            <span className="block text-xs text-muted-foreground">Plum ring</span>
          </span>
        </li>
      </ul>
    </section>
  );
}
