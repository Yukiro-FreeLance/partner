"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip, GamePulseBar } from "@/components/games/game-ui";

type Question = {
  prompt: string;
  options: string[];
  answer: number;
  category: string;
};

const QUESTIONS: Question[] = [
  {
    category: "Tech",
    prompt: "What does JSX stand for?",
    options: ["JavaScript XML", "Java Syntax Extension", "JSON XML", "JavaScript XHR"],
    answer: 0,
  },
  {
    category: "Tech",
    prompt: "Which hook runs after render in React?",
    options: ["useMemo", "useEffect", "useRef", "useId"],
    answer: 1,
  },
  {
    category: "Science",
    prompt: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"],
    answer: 2,
  },
  {
    category: "Tech",
    prompt: "Tailwind CSS is primarily a…",
    options: ["CSS framework", "Database", "Runtime", "Package manager"],
    answer: 0,
  },
  {
    category: "General",
    prompt: "How many bits are in a byte?",
    options: ["4", "8", "16", "32"],
    answer: 1,
  },
  {
    category: "Science",
    prompt: "What planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Mercury"],
    answer: 2,
  },
];

export default function QuizDemo() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  useReportWhen(done, score);

  const question = QUESTIONS[index];
  const progress = useMemo(
    () => Math.round(((done ? QUESTIONS.length : index) / QUESTIONS.length) * 100),
    [index, done]
  );

  const reset = useCallback(() => {
    setIndex(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    setStreak(0);
  }, []);

  function choose(optionIndex: number) {
    if (selected !== null || done) return;
    setSelected(optionIndex);
    const correct = optionIndex === question.answer;
    if (correct) {
      setScore((s) => s + 100 + streak * 20);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (index + 1 >= QUESTIONS.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  if (done) {
    return (
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-5xl" role="img" aria-hidden="true">
          ❓
        </p>
        <h3 className="text-xl font-semibold">Quiz Complete</h3>
        <p className="text-muted-foreground">
          Score: <strong className="text-primary">{score}</strong>
        </p>
        <Button onClick={reset} className="rounded-full">
          Play Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <GameHud>
        <GameStat label="Q" value={`${index + 1}/${QUESTIONS.length}`} />
        <GameStat label="Score" value={score} accent />
        <GameStat label="Streak" value={streak > 0 ? `×${streak}` : "—"} />
      </GameHud>

      <GamePulseBar value={progress} />

      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">{question.category}</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{question.prompt}</h3>
      </div>

      <div className="grid gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.answer;
          const isSelected = selected === i;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(i)}
              disabled={selected !== null}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200",
                selected === null && "border-border/60 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md",
                selected !== null && isCorrect && "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)]",
                selected !== null && isSelected && !isCorrect && "border-red-500/50 bg-red-500/10",
                selected !== null && !isSelected && !isCorrect && "opacity-40"
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <Button onClick={next} className="self-end rounded-sm">
          {index + 1 >= QUESTIONS.length ? "Results" : "Next →"}
        </Button>
      )}
      <GameTip>Streak bonuses amplify correct answers</GameTip>
    </div>
  );
}
