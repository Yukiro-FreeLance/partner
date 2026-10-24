"use client";

import { useState } from "react";
import { completePersonalityAction, personalityAnswerAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { AnswerPayload } from "@/lib/domain";

type Question = { id: string; prompt: string; helpText: string | null; answerType: "scale" | "single" | "multi"; options: { value: string; label: string }[] };

export function PersonalityPlayer({ slug, sessionId, questions }: { slug: string; sessionId: string; questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const question = questions[index];
  if (!question) return null;
  async function save(payload: AnswerPayload, skipped: boolean) {
    const result = await personalityAnswerAction({ sessionId, questionId: question.id, payload, skipped });
    if (result && "ok" in result && !result.ok) {
      setError(result.error);
      return;
    }
    setSelected([]);
    if (index === questions.length - 1) {
      const done = await completePersonalityAction(sessionId, slug);
      if (done && "error" in done) setError(done.error);
      return;
    }
    setIndex((value) => value + 1);
  }
  return (
    <section className="mt-6">
      <p className="text-sm text-muted-foreground">{index + 1} / {questions.length}</p>
      <h2 className="mt-2 font-serif text-3xl">{question.prompt}</h2>
      {question.helpText && <p className="mt-2 text-sm text-muted-foreground">{question.helpText}</p>}
      <div className="mt-4 grid gap-2">
        {question.answerType === "multi" ? question.options.map((option) => {
          const on = selected.includes(option.value);
          return <button key={option.value} type="button" aria-pressed={on} className={`rounded-2xl border px-4 py-3 text-left ${on ? "bg-secondary" : "bg-card"}`} onClick={() => setSelected((current) => on ? current.filter((value) => value !== option.value) : [...current, option.value])}>{option.label}</button>;
        }) : question.options.map((option) => <button key={option.value} type="button" className="rounded-2xl border bg-card px-4 py-3 text-left" onClick={() => save(question.answerType === "scale" ? { scale: Number(option.value) } : { choice: option.value }, false)}>{option.label}</button>)}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex gap-2">
        {question.answerType === "multi" && <Button type="button" onClick={() => save({ choices: selected }, false)}>Save selection</Button>}
        <Button type="button" variant="ghost" onClick={() => save({}, true)}>Skip this question</Button>
      </div>
    </section>
  );
}
