"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ScoreReveal({ score, label }: { score: number | null; label: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce || score == null ? score : 0);
  useEffect(() => {
    if (reduce || score == null) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      setShown(Math.round(score * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, score]);

  const value = shown ?? 0;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = score == null ? 0 : (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div className="relative mx-auto w-40 text-center">
      {!reduce && score != null && score >= 75 && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {["♥", "♥", "♥"].map((heart, index) => (
            <motion.span key={heart + index} className="absolute text-rose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0, 1, 0], y: -28 }} transition={{ delay: index * 0.2, duration: 1.4 }} style={{ left: `${20 + index * 28}%` }}>{heart}</motion.span>
          ))}
        </div>
      )}
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={score == null ? `${label}. Not enough comparable answers yet.` : `${label}. ${score} percent.`}>
        <circle cx="80" cy="80" r={radius} fill="none" className="stroke-secondary" strokeWidth="12" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 80 80)" />
        <text x="80" y="86" textAnchor="middle" fontSize="28" fontWeight="600" fill="currentColor">{score == null ? "—" : `${shown ?? score}%`}</text>
      </svg>
      <p className="font-medium">{label}</p>
    </div>
  );
}

export function CategoryChart({ rows }: { rows: { name: string; score: number }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Category scores appear after a guess can be compared with a visible answer.</p>;
  return (
    <div className="h-56" role="img" aria-label={rows.map((row) => `${row.name} ${row.score} percent`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [`${value}%`, "Matched"]} />
          <Bar dataKey="score" fill="#7c3aed" radius={8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShareResult({ summary }: { summary: string }) {
  const [includeMine, setIncludeMine] = useState(false);
  const [note, setNote] = useState("");
  const text = includeMine ? summary : summary.split("\n").filter((line) => !line.startsWith("I answered:")).join("\n");
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await navigator.clipboard.writeText(text);
          setNote("Copied. Partner answers are not included.");
        } catch {
          setNote("Copy this text yourself. Partner answers are not included.");
        }
      }}
    >
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={includeMine} onChange={(event) => setIncludeMine(event.target.checked)} />
        Include my own answers. Leave this off to share only the score.
      </label>
      <button type="submit" className="min-h-11 rounded-full bg-secondary px-4 text-sm">Copy a private summary</button>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </form>
  );
}
