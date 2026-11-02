"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

type Entry = { word: string; hint: string; category: string };

const BANK: Entry[] = [
  { word: "WENDEV", hint: "This studio's brand", category: "Studio" },
  { word: "REACT", hint: "UI library by Meta", category: "Tech" },
  { word: "NEXTJS", hint: "React meta-framework", category: "Tech" },
  { word: "PRISMA", hint: "Type-safe ORM", category: "Tech" },
  { word: "TAILWIND", hint: "Utility-first CSS", category: "Tech" },
  { word: "TYPESCRIPT", hint: "Typed JavaScript", category: "Tech" },
  { word: "LARAVEL", hint: "PHP web framework", category: "Tech" },
  { word: "HANGMAN", hint: "The classic this is based on", category: "Game" },
  { word: "BITAY", hint: "Filipino for this game", category: "Wika" },
  { word: "KAIBIGAN", hint: "Filipino for friend", category: "Wika" },
  { word: "KALAYAAN", hint: "Filipino for freedom", category: "Wika" },
  { word: "BAYANIHAN", hint: "Communal help", category: "Wika" },
  { word: "ALGORITHM", hint: "Step-by-step solution", category: "Tech" },
  { word: "DATABASE", hint: "Where records live", category: "Tech" },
  { word: "PORTFOLIO", hint: "A developer's showcase", category: "Studio" },
  { word: "CLOUDFLARE", hint: "Edge network this site uses", category: "Tech" },
  { word: "COMPONENT", hint: "Reusable UI piece", category: "Tech" },
  { word: "FUNCTION", hint: "Named block of code", category: "Tech" },
];

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MAX_WRONG = 6;

function pick(exclude?: string): Entry {
  const pool = BANK.filter((item) => item.word !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? BANK[0];
}

function Gallows({ wrong, lost, won }: { wrong: number; lost: boolean; won: boolean }) {
  const sway = lost ? { rotate: [0, 8, -6, 4, 0] } : won ? { y: [0, -6, 0] } : { rotate: 0 };
  return (
    <motion.svg
      viewBox="0 0 220 260"
      className="h-56 w-48 overflow-visible text-foreground sm:h-64 sm:w-56"
      animate={lost ? { x: [0, -6, 6, -4, 4, 0] } : won ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: lost ? 0.55 : 0.6 }}
    >
      <motion.g
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M28 236h164" className="text-muted-foreground" />
        <path d="M56 236V28h108" className="text-muted-foreground" />
        <path d="M56 56h36" className="text-muted-foreground" />
        <motion.path
          d="M164 28v28"
          className={cn(lost ? "text-rose-400" : "text-teal-400")}
          animate={lost ? { rotate: [0, 2, -2, 0] } : {}}
          style={{ originX: "164px", originY: "28px" }}
        />
      </motion.g>

      <motion.g
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        animate={sway}
        transition={{ duration: lost ? 1.4 : 1.1, repeat: lost || won ? Infinity : 0, ease: "easeInOut" }}
        style={{ originX: "164px", originY: "28px" }}
      >
        {wrong >= 1 && (
          <motion.circle
            cx="164"
            cy="78"
            r="18"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
          />
        )}
        {wrong >= 2 && (
          <motion.path
            d="M164 96v52"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35 }}
          />
        )}
        {wrong >= 3 && (
          <motion.path
            d="M164 112l-28 22"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {wrong >= 4 && (
          <motion.path
            d="M164 112l28 22"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {wrong >= 5 && (
          <motion.path
            d="M164 148l-24 34"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {wrong >= 6 && (
          <motion.path
            d="M164 148l24 34"
            className={lost ? "stroke-rose-400" : won ? "stroke-emerald-400" : "stroke-amber-300"}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        {won && wrong >= 1 && (
          <motion.path
            d="M156 74h16"
            className="stroke-emerald-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </motion.g>
    </motion.svg>
  );
}

function Sparks({ tone }: { tone: "ok" | "bad" }) {
  const color = tone === "ok" ? "bg-emerald-400" : "bg-rose-400";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          className={cn("absolute h-1.5 w-1.5 rounded-full", color)}
          style={{ left: `${12 + (i * 7) % 76}%`, top: `${20 + (i * 11) % 50}%` }}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={{ opacity: 0, scale: 0.3, y: tone === "ok" ? -28 : 24 }}
          transition={{ duration: 0.55, delay: i * 0.02 }}
        />
      ))}
    </div>
  );
}

export default function BitayDemo() {
  const [entry, setEntry] = useState<Entry>(BANK[0]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wins, setWins] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [pop, setPop] = useState<string | null>(null);

  const letters = useMemo(() => entry.word.split(""), [entry.word]);
  const revealed = letters.map((ch) => (guessed.has(ch) ? ch : ""));
  const won = letters.every((ch) => guessed.has(ch));
  const lost = wrong >= MAX_WRONG;
  const done = won || lost;
  useReportWhen(done, won ? score : 0);

  useEffect(() => {
    const saved = localStorage.getItem("bitay-best");
    if (saved) setBest(parseInt(saved, 10) || 0);
  }, []);

  const nextRound = useCallback(() => {
    setEntry((prev) => pick(prev.word));
    setGuessed(new Set());
    setWrong(0);
    setFlash(null);
    setPop(null);
    if (lost) setScore(0);
  }, [lost]);

  const guess = useCallback(
    (raw: string) => {
      const letter = raw.toUpperCase();
      if (done || !/^[A-Z]$/.test(letter) || guessed.has(letter)) return;
      const hit = letters.includes(letter);
      setGuessed((prev) => new Set(prev).add(letter));
      setPop(letter);
      setFlash(hit ? "ok" : "bad");
      window.setTimeout(() => {
        setFlash(null);
        setPop(null);
      }, 520);

      if (hit) {
        const gained = 40 + letters.filter((ch) => ch === letter).length * 20;
        const nextScore = score + gained;
        const complete = letters.every((ch) => ch === letter || guessed.has(ch));
        const total = complete ? nextScore + 180 : nextScore;
        setScore(total);
        if (complete) {
          setWins((w) => w + 1);
          setBest((prev) => {
            const next = Math.max(prev, total);
            localStorage.setItem("bitay-best", String(next));
            return next;
          });
        }
      } else {
        setWrong((w) => w + 1);
      }
    },
    [done, guessed, letters, score]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && done) {
        nextRound();
        return;
      }
      guess(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, guess, nextRound]);

  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden">
      <AnimatePresence>{flash ? <Sparks tone={flash} /> : null}</AnimatePresence>
      <GameHud>
        <GameStat label="Score" value={score} accent />
        <GameStat label="Best" value={best} />
        <GameStat label="Wins" value={wins} />
        <GameStat label="Misses" value={`${wrong}/${MAX_WRONG}`} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={() => { setScore(0); nextRound(); }}>
          New word
        </Button>
      </GameHud>

      <motion.div
        className={cn(
          "relative w-full max-w-lg border border-border/60 bg-card/80 p-4 sm:p-5",
          flash === "bad" && "ring-1 ring-rose-400/70",
          flash === "ok" && "ring-1 ring-emerald-400/70"
        )}
        animate={flash === "bad" ? { x: [0, -10, 10, -6, 6, 0] } : flash === "ok" ? { scale: [1, 1.015, 1] } : {}}
        transition={{ duration: 0.38 }}
      >
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-teal-400">{entry.category}</p>
        <div className="mt-2 flex justify-center">
          <Gallows wrong={wrong} lost={lost} won={won} />
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">Hint · {entry.hint}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {letters.map((ch, i) => {
            const show = Boolean(revealed[i]);
            return (
              <motion.span
                key={`${entry.word}-${i}`}
                className={cn(
                  "flex h-11 w-8 items-center justify-center border font-mono text-lg font-semibold sm:h-12 sm:w-9 sm:text-xl",
                  show
                    ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-200"
                    : "border-border/70 bg-background/50 text-muted-foreground/40"
                )}
                animate={show && pop === ch ? { y: [8, -6, 0], scale: [0.6, 1.15, 1] } : show ? { scale: 1 } : {}}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
              >
                {show ? ch : ""}
              </motion.span>
            );
          })}
        </div>

        <AnimatePresence>
          {done && (
            <motion.div
              className="mt-4 border border-border/50 bg-background/80 px-3 py-2 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className={cn("text-sm font-semibold", won ? "text-emerald-400" : "text-rose-400")}>
                {won ? "Saved — the rope never dropped." : `Bitay. The word was ${entry.word}.`}
              </p>
              <Button size="sm" className="mt-2 rounded-sm" onClick={nextRound}>
                Next round
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="flex w-full max-w-lg flex-col items-center gap-1.5">
        {ROWS.map((row) => (
          <div key={row} className="flex justify-center gap-1">
            {row.split("").map((letter) => {
              const used = guessed.has(letter);
              const good = used && letters.includes(letter);
              const bad = used && !letters.includes(letter);
              return (
                <motion.button
                  key={letter}
                  type="button"
                  disabled={used || done}
                  onClick={() => guess(letter)}
                  className={cn(
                    "h-9 w-7 rounded-sm border font-mono text-xs font-semibold sm:h-10 sm:w-8 sm:text-sm",
                    !used && "border-border/60 bg-muted/30 hover:border-teal-400/50 hover:bg-teal-500/10",
                    good && "border-emerald-400/60 bg-emerald-500/15 text-emerald-300",
                    bad && "border-rose-400/50 bg-rose-500/15 text-rose-300 line-through opacity-70"
                  )}
                  animate={pop === letter ? { scale: [1, 1.2, 1], y: good ? [-6, 0] : [4, 0] } : {}}
                  whileTap={used ? undefined : { scale: 0.92 }}
                >
                  {letter}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
      <GameTip>Type or tap a letter · green pop on hits · red shake draws the gallows</GameTip>
    </div>
  );
}
