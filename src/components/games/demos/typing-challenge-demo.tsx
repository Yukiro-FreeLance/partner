"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";

const WORD_BANK = [
  "react", "typescript", "nextjs", "tailwind", "component", "function",
  "async", "promise", "browser", "keyboard", "developer", "portfolio",
  "algorithm", "interface", "database", "variable", "framework", "package",
  "module", "compile", "deploy", "server", "client", "router", "state",
];

function pickWords(count: number) {
  const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function TypingChallengeDemo() {
  const [words, setWords] = useState<string[]>(() =>
    ["react", "typescript", "nextjs", "tailwind", "component", "function", "async", "promise"]
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setWords(pickWords(12));
  }, []);

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(id);
  }, [started, done, startTime]);

  const wpm = useMemo(() => {
    const minutes = elapsed / 60000;
    if (minutes <= 0) return 0;
    return Math.round(correct / minutes);
  }, [correct, elapsed]);

  const accuracy = useMemo(() => {
    const total = correct + errors;
    if (total === 0) return 100;
    return Math.round((correct / total) * 100);
  }, [correct, errors]);
  useReportWhen(done, wpm * 10 + accuracy);

  const reset = useCallback(() => {
    setWords(pickWords(12));
    setIndex(0);
    setInput("");
    setStarted(false);
    setStartTime(0);
    setCorrect(0);
    setErrors(0);
    setDone(false);
    setElapsed(0);
  }, []);

  function onChange(value: string) {
    if (done) return;
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
    }

    if (value.endsWith(" ")) {
      const typed = value.trim();
      if (typed === words[index]) setCorrect((c) => c + 1);
      else setErrors((e) => e + 1);

      const next = index + 1;
      setInput("");
      if (next >= words.length) {
        setDone(true);
        setIndex(next);
      } else {
        setIndex(next);
      }
      return;
    }
    setInput(value);
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <span>
          WPM: <strong className="text-primary">{wpm}</strong>
        </span>
        <span>
          Accuracy: <strong>{accuracy}%</strong>
        </span>
        <span>
          Time: <strong>{(elapsed / 1000).toFixed(1)}s</strong>
        </span>
        <Button size="sm" variant="outline" onClick={reset}>
          Restart
        </Button>
      </div>

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-lg leading-relaxed tracking-wide">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className={cn(
              "mr-2 inline-block rounded px-1",
              i === index && "bg-primary/20 text-primary",
              i < index && "text-muted-foreground line-through"
            )}
          >
            {word}
          </span>
        ))}
      </div>

      {done ? (
        <p className="text-lg font-semibold text-primary" aria-live="polite">
          Done! {wpm} WPM · {accuracy}% accuracy
        </p>
      ) : (
        <input
          type="text"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-md rounded-xl border border-border/60 bg-card/80 px-4 py-3 text-center text-lg outline-none focus:border-primary"
          placeholder={started ? "Keep typing…" : "Start typing to begin"}
          autoFocus
          aria-label="Typing input"
        />
      )}

      <p className="text-xs text-muted-foreground">Press space after each word</p>
    </div>
  );
}
