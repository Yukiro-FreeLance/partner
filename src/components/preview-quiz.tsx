"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const options = ["Blue", "Green", "A color they have never mentioned"];

export function PreviewQuiz() {
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel border border-white/70 bg-white/90 p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">Sample question · not saved</p>
      <h2 className="mt-3 font-serif text-3xl">What color feels most like your person?</h2>
      <div className="mt-5 grid gap-2">
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={choice === option} onClick={() => setChoice(option)} className={`min-h-11 rounded-2xl border px-4 py-3 text-left ${choice === option ? "border-primary bg-secondary" : "bg-background"}`}>{option}</button>
        ))}
      </div>
      {choice && <p className="mt-4 text-sm text-muted-foreground">This preview stays on your screen. A real quiz waits until your partner can answer too.</p>}
    </motion.div>
  );
}
