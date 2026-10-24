"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, Heart } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { completeQuizAction, saveQuizAction } from "@/app/actions";
import type { AnswerPayload, AnswerType, QuestionConfig, QuizMode } from "@/lib/domain";

export type PlayerQuestion = {
  id: string;
  selfPrompt: string;
  guessPrompt: string;
  reversePrompt: string;
  answerType: AnswerType;
  sensitive: boolean;
  options: { value: string; label: string; imageUrl: string | null }[];
  config: QuestionConfig;
  category: string;
  difficulty: string;
};

type Draft = { payload: AnswerPayload; skipped: boolean };

export function QuizPlayer({ sessionId, mode, title, questions, partnerName, timerSeconds, initialIndex, initial }: {
  sessionId: string;
  mode: QuizMode;
  title: string;
  questions: PlayerQuestion[];
  partnerName: string;
  timerSeconds: number | null;
  initialIndex: number;
  initial: Record<string, { self?: Draft; guess?: Draft }>;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const needsSelf = mode === "reveal" || mode === "exchange" || mode === "daily";
  const needsGuess = mode !== "reveal";
  const steps = useMemo(() => questions.flatMap((question) => {
    const list: { question: PlayerQuestion; phase: "self" | "guess" }[] = [];
    if (needsSelf) list.push({ question, phase: "self" });
    if (needsGuess) list.push({ question, phase: "guess" });
    return list;
  }), [questions, needsGuess, needsSelf]);
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(steps.length - 1, 0)));
  const [drafts, setDrafts] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(timerSeconds);
  const step = steps[index];
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!timerSeconds) return;
    setSeconds(timerSeconds);
    const timer = window.setInterval(() => setSeconds((value) => (value && value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [index, timerSeconds]);

  if (!step) return <p className="p-6">This quiz has no questions yet.</p>;
  const draft = drafts[step.question.id]?.[step.phase] ?? { payload: {}, skipped: false };
  const prompt = step.phase === "self" ? step.question.selfPrompt : mode === "reverse" ? step.question.reversePrompt : step.question.guessPrompt.replace("your partner", partnerName);

  function update(payload: AnswerPayload, skipped = false) {
    setDrafts((current) => ({ ...current, [step.question.id]: { ...current[step.question.id], [step.phase]: { payload, skipped } } }));
  }

  async function persist(nextIndex: number) {
    setPending(true);
    setError("");
    const current = drafts[step.question.id] ?? {};
    const phaseDraft = current[step.phase] ?? draft;
    const result = await saveQuizAction({
      sessionId,
      questionId: step.question.id,
      currentIndex: nextIndex,
      selfAnswer: step.phase === "self" ? phaseDraft : current.self ?? null,
      prediction: step.phase === "guess" ? phaseDraft : current.guess ?? null,
    });
    setPending(false);
    if (result && "ok" in result && !result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  async function go(nextIndex: number) {
    if (nextIndex > index && !draft.skipped && !hasPayload(draft.payload)) {
      setError("Choose an answer, or skip this question.");
      return;
    }
    const saved = await persist(nextIndex);
    if (!saved) return;
    setIndex(nextIndex);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const current = stepRef.current;
      if (!current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void go(Math.min(index + 1, steps.length - 1));
      const choiceTypes = ["single", "boolean", "yesno", "either", "emoji", "image"];
      if (!choiceTypes.includes(current.question.answerType)) return;
      const number = Number(event.key);
      const option = current.question.options[number - 1];
      if (option) update({ ...draft.payload, choice: option.value });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, steps.length]);

  const minutes = Math.max(1, Math.round((steps.length * 25) / 60));
  const choice = ["single", "boolean", "yesno", "either", "emoji", "image"].includes(step.question.answerType);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-4 lg:max-w-xl lg:py-8">
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2">
        {index === 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Exit"><ChevronLeft /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle className="font-serif text-2xl">Leave this quiz?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">Your saved answers stay on this round. You can resume it from Play.</AlertDialogDescription>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialogCancel className="rounded-full border px-4 py-2">Keep going</AlertDialogCancel>
                <AlertDialogAction className="rounded-full bg-primary px-4 py-2 text-primary-foreground" onClick={() => router.push("/play")}>Exit</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button type="button" variant="ghost" size="icon" aria-label="Previous" disabled={pending} onClick={() => { if (hasPayload(draft.payload) || draft.skipped) void persist(index); setIndex((value) => Math.max(0, value - 1)); }}><ChevronLeft /></Button>
        )}
        <p className="truncate text-center text-sm font-semibold">{title}</p>
        <p className="text-sm font-medium text-primary tabular-nums">{index + 1} / {steps.length}</p>
      </div>
      <Progress className="mt-3 h-1.5" value={((index + 1) / steps.length) * 100} aria-label={`Question ${index + 1} of ${steps.length}`} />
      <motion.section key={`${step.question.id}-${step.phase}`} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className="mt-8">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#fde7f3] text-rose"><Heart className="size-7 fill-rose" aria-hidden /></span>
          <p className="mt-4 text-sm text-muted-foreground">{step.phase === "self" ? "Your answer" : "Guess mode"} · {step.question.category}</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight">{prompt}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{choice ? "Choose one option" : "Answer in your own way"} · About {minutes} min{timerSeconds ? ` · ${seconds}s` : ""}</p>
        </div>
        {step.question.sensitive && <p className="mt-4 text-center text-sm text-muted-foreground">This one is optional and private unless you turn on sharing. Skip it if you would rather not answer.</p>}
        <div className="mt-6">
          <AnswerControl question={step.question} draft={draft} onChange={update} />
        </div>
      </motion.section>
      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
      {pending && <p className="mt-3 text-center text-sm text-muted-foreground">Saving…</p>}
      <div className="mt-auto grid gap-3 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => update({}, true)}>Skip for now</Button>
          <Button type="button" variant="ghost" onClick={() => update({}, false)}>Clear</Button>
        </div>
        {index < steps.length - 1 ? (
          <Button type="button" className="h-12 w-full" disabled={pending} onClick={() => go(index + 1)}>Next</Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" className="h-12 w-full" disabled={pending}>Submit</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle className="font-serif text-2xl">Submit this quiz?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">You can review with Back before submitting. After this, the round follows its reveal rules.</AlertDialogDescription>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialogCancel className="rounded-full border px-4 py-2">Keep editing</AlertDialogCancel>
                <AlertDialogAction className="rounded-full bg-primary px-4 py-2 text-primary-foreground" onClick={async () => { const saved = await persist(steps.length); if (saved) await completeQuizAction(sessionId); }}>Submit answers</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <p className="pb-2 text-center text-xs text-muted-foreground">Press 1–9 to choose a listed answer. The timer is only a gentle clock.</p>
    </main>
  );
}

function swatch(label: string) {
  const name = label.trim().toLowerCase();
  const known: Record<string, string> = {
    blue: "#60a5fa", pink: "#f472b6", purple: "#c084fc", green: "#4ade80", yellow: "#facc15",
    black: "#27272a", red: "#fb7185", orange: "#fb923c", white: "#f8fafc", brown: "#b45309",
  };
  return known[name] ?? "#e9d5ff";
}

function hasPayload(payload: AnswerPayload) {
  return Boolean(payload.choice || payload.choices?.length || typeof payload.scale === "number" || payload.ranking?.length || payload.text || payload.date || payload.mediaId);
}

function AnswerControl({ question, draft, onChange }: { question: PlayerQuestion; draft: Draft; onChange: (payload: AnswerPayload, skipped?: boolean) => void }) {
  const type = question.answerType;
  if (["single", "boolean", "yesno", "either", "emoji", "image"].includes(type)) {
    return (
      <div className={type === "image" ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
        {question.options.map((option) => {
          const selected = draft.payload.choice === option.value;
          return (
            <button key={option.value} type="button" data-testid="quiz-option" aria-pressed={selected} onClick={() => onChange({ ...draft.payload, choice: option.value }, false)} className={`flex min-h-14 items-center gap-3 rounded-full border bg-white px-4 py-3 text-left transition ${type === "image" ? "flex-col rounded-3xl p-3" : ""} ${selected ? "border-primary shadow-[0_8px_24px_-16px_rgb(109_40_217_/_0.8)]" : "border-[#f1e7f6]"}`}>
              {option.imageUrl && <img src={option.imageUrl} alt="" className="h-24 w-full rounded-2xl object-cover" />}
              {type !== "image" && <span className="size-4 shrink-0 rounded-full border border-white shadow-sm" style={{ background: swatch(option.label) }} aria-hidden />}
              <span className="min-w-0 flex-1 font-medium">{option.label}</span>
              {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
            </button>
          );
        })}
        {question.sensitive && <ShareToggle draft={draft} onChange={onChange} />}
      </div>
    );
  }
  if (type === "multi") {
    const selected = new Set(draft.payload.choices ?? []);
    return (
      <div className="grid gap-3">
        {question.options.map((option) => {
          const on = selected.has(option.value);
          return <button key={option.value} type="button" aria-pressed={on} className={`min-h-14 rounded-2xl border px-4 py-3 text-left ${on ? "border-primary bg-secondary" : "bg-card"}`} onClick={() => { const next = new Set(selected); if (on) next.delete(option.value); else next.add(option.value); onChange({ ...draft.payload, choices: [...next] }, false); }}>{option.label}</button>;
        })}
      </div>
    );
  }
  if (type === "scale") {
    const min = question.config.scaleMin ?? 1;
    const max = question.config.scaleMax ?? 5;
    const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
    return (
      <div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>{question.config.scaleLabels?.[0]}</span><span>{question.config.scaleLabels?.[1]}</span></div>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {values.map((value) => <button key={value} type="button" aria-pressed={draft.payload.scale === value} className={`h-12 rounded-2xl border ${draft.payload.scale === value ? "bg-primary text-primary-foreground" : "bg-card"}`} onClick={() => onChange({ scale: value }, false)}>{value}</button>)}
        </div>
      </div>
    );
  }
  if (type === "ranking") {
    const ranking = draft.payload.ranking ?? [];
    return (
      <div className="grid gap-3">
        {question.options.map((option) => {
          const place = ranking.indexOf(option.value);
          return <button key={option.value} type="button" className="min-h-14 rounded-2xl border bg-card px-4 py-3 text-left" onClick={() => { const next = ranking.filter((value) => value !== option.value); if (place === -1) next.push(option.value); onChange({ ranking: next }, false); }}>{place >= 0 ? `${place + 1}. ` : ""}{option.label}</button>;
        })}
      </div>
    );
  }
  if (type === "date") return <input type="date" className="h-11 rounded-2xl border bg-card px-3" value={draft.payload.date ?? ""} onChange={(event) => onChange({ date: event.target.value }, false)} />;
  if (type === "voice") {
    return (
      <div className="grid gap-3">
        <Textarea placeholder={question.config.placeholder ?? "A short caption"} maxLength={question.config.maxLength ?? 140} value={draft.payload.text ?? ""} onChange={(event) => onChange({ ...draft.payload, text: event.target.value }, false)} />
        <input type="file" accept="audio/webm,audio/mpeg,audio/mp4,audio/wav" aria-label="Voice note" onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const body = new FormData();
          body.set("file", file);
          const response = await fetch("/api/media", { method: "POST", body });
          const json = await response.json();
          if (json.id) onChange({ ...draft.payload, mediaId: json.id }, false);
        }} />
        <p className="text-xs text-muted-foreground">Voice notes stay in private storage. You can also just type.</p>
      </div>
    );
  }
  return <Textarea maxLength={question.config.maxLength ?? 500} placeholder={question.config.placeholder} value={draft.payload.text ?? ""} onChange={(event) => onChange({ text: event.target.value }, false)} />;
}

function ShareToggle({ draft, onChange }: { draft: Draft; onChange: (payload: AnswerPayload, skipped?: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.payload.shareWithPartner)} onChange={(event) => onChange({ ...draft.payload, shareWithPartner: event.target.checked })} /> Share this sensitive answer with my partner</label>;
}
