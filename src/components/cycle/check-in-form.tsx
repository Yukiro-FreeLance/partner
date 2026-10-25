"use client";

import { useState } from "react";
import { ACTIVITY_OPTIONS, BLEEDING_OPTIONS, CONTRACEPTION_OPTIONS, DRIVE_OPTIONS, INTIMACY_OPTIONS, LEVEL_WORDS, MOMENT_OPTIONS, MOOD_OPTIONS, MUCUS_OPTIONS, SHAREABLE_FIELDS, SYMPTOM_OPTIONS } from "@/lib/cycle/copy";
import type { CycleCheckIn } from "@/lib/domain";
import { saveCheckInAction } from "@/app/(app)/cycle/actions";

export function CheckInForm({ day, initial }: { day: string; initial: CycleCheckIn | null }) {
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [drive, setDrive] = useState(initial?.sexDrive ?? "");
  const [bleeding, setBleeding] = useState(initial?.bleeding ?? "");
  const [mucus, setMucus] = useState(initial?.cervicalMucus ?? "");
  const [moment, setMoment] = useState(initial?.moment ?? "");
  const [intimacy, setIntimacy] = useState(initial?.intimacyPreference ?? "");
  const [activity, setActivity] = useState(initial?.sexualActivity ?? "");
  const [contraception, setContraception] = useState(initial?.contraception ?? "");
  const [shareLevel, setShareLevel] = useState(initial?.shareLevel ?? "private");
  const toggle = (value: string) => setSymptoms((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  return (
    <form action={saveCheckInAction} className="grid gap-5">
      <input type="hidden" name="day" value={day} />
      {symptoms.map((symptom) => <input key={symptom} type="hidden" name="symptoms" value={symptom} />)}
      <input type="hidden" name="mood" value={mood} />
      <input type="hidden" name="sexDrive" value={drive} />
      <input type="hidden" name="bleeding" value={bleeding} />
      <input type="hidden" name="cervicalMucus" value={mucus} />
      <input type="hidden" name="moment" value={moment} />
      <input type="hidden" name="intimacyPreference" value={intimacy} />
      <input type="hidden" name="sexualActivity" value={activity} />
      <input type="hidden" name="contraception" value={contraception} />
      <input type="hidden" name="shareLevel" value={shareLevel} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Today&apos;s symptoms</legend>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={symptoms.includes(value)} className={chip(symptoms.includes(value))} onClick={() => toggle(value)}>{label}</button>
          ))}
        </div>
        <label className="grid gap-1 text-sm">Custom symptoms, separated by commas
          <input name="customSymptoms" defaultValue={initial?.customSymptoms.join(", ") ?? ""} className="h-11 rounded-2xl border px-3" />
        </label>
      </fieldset>
      <ChipSet legend="Mood" options={MOOD_OPTIONS} value={mood} onChange={setMood} />
      <Range name="energy" label="Energy level" defaultValue={initial?.energy ?? 3} />
      <ChipSet legend="Sex drive" options={DRIVE_OPTIONS} value={drive} onChange={setDrive} />
      <p className="text-xs text-muted-foreground">Sex drive is your own note. A cycle phase does not decide desire.</p>
      <ChipSet legend="Bleeding" options={BLEEDING_OPTIONS} value={bleeding} onChange={setBleeding} />
      <ChipSet legend="Cervical mucus, optional" options={MUCUS_OPTIONS} value={mucus} onChange={setMucus} />
      <Range name="sleepQuality" label="Sleep quality" defaultValue={initial?.sleepQuality ?? 3} />
      <Range name="stressLevel" label="Stress level" defaultValue={initial?.stressLevel ?? 3} />
      <label className="grid gap-1 text-sm">Exercise or wellness note
        <input name="wellnessNote" defaultValue={initial?.wellnessNote ?? ""} maxLength={500} className="h-11 rounded-2xl border px-3" />
      </label>
      <ChipSet legend="Moment of the day" options={MOMENT_OPTIONS} value={moment} onChange={setMoment} />
      <fieldset className="grid gap-3 rounded-3xl bg-[#faf5ff] p-4">
        <legend className="px-1 text-sm font-medium">Intimacy and connection, optional</legend>
        <Range name="affection" label="Preferred physical affection" defaultValue={initial?.affection ?? 3} />
        <Range name="emotionalCloseness" label="Desire for emotional closeness" defaultValue={initial?.emotionalCloseness ?? 3} />
        <ChipSet legend="Closeness or personal space" options={INTIMACY_OPTIONS} value={intimacy} onChange={setIntimacy} />
        <Range name="comfort" label="Comfort" defaultValue={initial?.comfort ?? 3} />
        <Range name="readiness" label="Readiness for intimacy" defaultValue={initial?.readiness ?? 3} />
      </fieldset>
      <ChipSet legend="Sexual activity, optional" options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
      <ChipSet legend="Contraception, optional" options={CONTRACEPTION_OPTIONS} value={contraception} onChange={setContraception} />
      <label className="grid gap-1 text-sm">Personal notes
        <textarea name="notes" defaultValue={initial?.notes ?? ""} maxLength={2000} className="min-h-28 rounded-2xl border px-3 py-3" placeholder="Private journal entry" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Sharing for this day</legend>
        {[["private", "Private to me"], ["summary", "Share a mood and energy summary"], ["selected", "Share selected details"]].map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" checked={shareLevel === value} onChange={() => setShareLevel(value as "private" | "summary" | "selected")} />{label}</label>
        ))}
        {shareLevel === "selected" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SHAREABLE_FIELDS.map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="sharedFields" value={value} defaultChecked={initial?.sharedFields.includes(value)} />{label}</label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">A day stays private until you choose otherwise. Category switches in Privacy must also be on. Pregnancy test results are never shared.</p>
      </fieldset>
      <button type="submit" className="sticky bottom-20 z-10 min-h-12 rounded-full bg-primary px-5 font-medium text-primary-foreground lg:static">Save check-in</button>
    </form>
  );
}

function chip(active: boolean) {
  return active ? "min-h-11 rounded-full bg-primary px-3 text-sm text-primary-foreground" : "min-h-11 rounded-full bg-white px-3 text-sm ring-1 ring-[#efe7f6]";
}

function ChipSet({ legend, options, value, onChange }: { legend: string; options: readonly (readonly [string, string])[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([option, label]) => (
          <button key={option} type="button" aria-pressed={value === option} className={chip(value === option)} onClick={() => onChange(value === option ? "" : option)}>{label}</button>
        ))}
      </div>
    </fieldset>
  );
}

function Range({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className="grid gap-1 text-sm">{label}: {LEVEL_WORDS[value - 1]}
      <input name={name} type="range" min={1} max={5} value={value} onChange={(event) => setValue(Number(event.target.value))} />
    </label>
  );
}
