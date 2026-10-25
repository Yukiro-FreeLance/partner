import { Heart, NotebookPen, Smile, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { DRIVE_OPTIONS, levelWord, MOOD_OPTIONS, optionLabel, SYMPTOM_OPTIONS } from "@/lib/cycle/copy";
import type { CycleCheckIn } from "@/lib/domain";

export function DayReadout({ entry }: { entry: CycleCheckIn | undefined }) {
  if (!entry) return <p className="text-sm text-muted-foreground">No check-in on this day.</p>;
  const symptoms = [...entry.symptoms.map((item) => optionLabel(SYMPTOM_OPTIONS, item) ?? item), ...entry.customSymptoms];
  return (
    <div className="grid gap-3">
      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Readout icon={Smile} label="Mood" value={optionLabel(MOOD_OPTIONS, entry.mood) ?? "Not logged"} tone="bg-[#f5f3ff] text-[#6d28d9]" />
        <Readout icon={Zap} label="Energy" value={levelWord(entry.energy) ?? "Not logged"} tone="bg-[#fde7f3] text-[#9d174d]" />
        <Readout icon={Heart} label="Sex drive" value={optionLabel(DRIVE_OPTIONS, entry.sexDrive) ?? "Not logged"} tone="bg-[#fce7f3] text-[#9f1239]" />
        <Readout icon={Sparkles} label="Symptoms" value={symptoms.join(", ") || "None logged"} tone="bg-[#fff1f2] text-[#9f1239]" />
      </dl>
      {entry.notes && (
        <blockquote className="rounded-2xl bg-[#faf7ff] px-4 py-3 text-sm leading-6">
          <p className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"><NotebookPen className="size-3.5" aria-hidden />Journal</p>
          <p>{entry.notes}</p>
        </blockquote>
      )}
    </div>
  );
}

function Readout({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl bg-[#faf7ff] px-3 py-2">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`} aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium leading-5">{value}</dd>
      </div>
    </div>
  );
}
