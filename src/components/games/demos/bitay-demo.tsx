"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star as LuStar, Volume2 as LuVolume2, VolumeX as LuVolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useArcadeScore, useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";
import { isGameSfxMuted, playGameSfx, setGameSfxMuted } from "@/lib/game-sfx";
import { BITAY_EXTRA_BANK } from "@/lib/games/bitay-bank";

type Entry = { word: string; hint: string; category: string };

const BASE_BANK: Entry[] = [
  { word: "TIGER", hint: "Striped big cat", category: "Animals" },
  { word: "ELEPHANT", hint: "Largest land animal", category: "Animals" },
  { word: "PENGUIN", hint: "Flightless bird that swims", category: "Animals" },
  { word: "DOLPHIN", hint: "Marine mammal known for clicks", category: "Animals" },
  { word: "GIRAFFE", hint: "Tallest living animal", category: "Animals" },
  { word: "PANDA", hint: "Black-and-white bamboo eater", category: "Animals" },
  { word: "KANGAROO", hint: "Pouched jumper from Australia", category: "Animals" },
  { word: "EAGLE", hint: "Bird of prey with sharp vision", category: "Animals" },
  { word: "OCTOPUS", hint: "Eight-armed sea creature", category: "Animals" },
  { word: "CHEETAH", hint: "Fastest land animal", category: "Animals" },
  { word: "SOCCER", hint: "Played with a round ball and goals", category: "Sports" },
  { word: "TENNIS", hint: "Racket sport on a court", category: "Sports" },
  { word: "BOXING", hint: "Fought in a ring with gloves", category: "Sports" },
  { word: "BASEBALL", hint: "Bat, ball, and nine innings", category: "Sports" },
  { word: "SWIMMING", hint: "Raced in a pool or open water", category: "Sports" },
  { word: "CYCLING", hint: "Raced on two wheels", category: "Sports" },
  { word: "HOCKEY", hint: "Played with a puck or ball and a stick", category: "Sports" },
  { word: "GOLF", hint: "Lowest score on the course wins", category: "Sports" },
  { word: "RUGBY", hint: "Oval ball and scrums", category: "Sports" },
  { word: "BOWLING", hint: "Knock down ten pins", category: "Sports" },
  { word: "PIZZA", hint: "Baked round pie with toppings", category: "Food" },
  { word: "BURGER", hint: "Stacked sandwich on a bun", category: "Food" },
  { word: "SUSHI", hint: "Vinegared rice and seafood", category: "Food" },
  { word: "MANGO", hint: "Sweet tropical fruit", category: "Food" },
  { word: "NOODLES", hint: "Long strands in a bowl", category: "Food" },
  { word: "PANCAKE", hint: "Breakfast stack with syrup", category: "Food" },
  { word: "AVOCADO", hint: "Green fruit used in guacamole", category: "Food" },
  { word: "COCONUT", hint: "Hard-shelled tropical fruit", category: "Food" },
  { word: "BANANA", hint: "Yellow fruit that peels", category: "Food" },
  { word: "CHEESE", hint: "Dairy block on a pizza", category: "Food" },
  { word: "MANILA", hint: "Capital of the Philippines", category: "Places" },
  { word: "TOKYO", hint: "Capital of Japan", category: "Places" },
  { word: "LONDON", hint: "Capital of England", category: "Places" },
  { word: "PARIS", hint: "City of the Eiffel Tower", category: "Places" },
  { word: "CEBU", hint: "Island in the Visayas", category: "Places" },
  { word: "ISLAND", hint: "Land surrounded by water", category: "Places" },
  { word: "DESERT", hint: "Dry, sandy region", category: "Places" },
  { word: "CASTLE", hint: "Fortified royal home", category: "Places" },
  { word: "BRIDGE", hint: "Structure that spans a river", category: "Places" },
  { word: "MARKET", hint: "Place to buy and sell goods", category: "Places" },
  { word: "REACT", hint: "UI library by Meta", category: "Tech" },
  { word: "PYTHON", hint: "Popular scripting language", category: "Tech" },
  { word: "ANDROID", hint: "Mobile OS by Google", category: "Tech" },
  { word: "BROWSER", hint: "App that opens the web", category: "Tech" },
  { word: "KEYBOARD", hint: "Device you type on", category: "Tech" },
  { word: "MONITOR", hint: "Screen on a desk", category: "Tech" },
  { word: "SERVER", hint: "Machine that hosts a site", category: "Tech" },
  { word: "ROUTER", hint: "Device that shares Wi-Fi", category: "Tech" },
  { word: "DATABASE", hint: "Where records are stored", category: "Tech" },
  { word: "FIREWALL", hint: "Network security barrier", category: "Tech" },
];

const BANK: Entry[] = [...BASE_BANK, ...BITAY_EXTRA_BANK];
const CATEGORIES = ["All", ...Array.from(new Set(BANK.map((item) => item.category)))];
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MAX_WRONG = 6;

function inCategory(item: Entry, category: string) {
  return category === "All" || item.category === category;
}

function pick(exclude?: string, category = "All"): Entry {
  const scoped = BANK.filter((item) => inCategory(item, category));
  const pool = scoped.filter((item) => item.word !== exclude);
  const source = pool.length ? pool : scoped;
  return source[Math.floor(Math.random() * source.length)] ?? BANK[0];
}

function categoryCount(category: string) {
  if (category === "All") return BANK.length;
  return BANK.filter((item) => item.category === category).length;
}

function Gallows({ wrong, lost, won }: { wrong: number; lost: boolean; won: boolean }) {
  const body = lost ? "var(--destructive)" : won ? "var(--primary)" : "var(--rose)";
  const rope = lost ? "var(--destructive)" : "var(--primary)";
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="h-44 w-[9.5rem] overflow-visible text-muted-foreground sm:h-52 sm:w-44 md:h-60 md:w-52"
      animate={lost ? { x: [0, -5, 5, -3, 3, 0] } : won ? { y: [0, -5, 0] } : {}}
      transition={{ duration: 0.5 }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 226h156" />
        <path d="M50 226V22h102" />
        <path d="M50 50h28" />
      </g>
      <path d="M152 22v30" fill="none" stroke={rope} strokeWidth="6" strokeLinecap="round" />
      <g
        fill="none"
        stroke={body}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transformOrigin: "152px 22px" }}
      >
        {wrong >= 1 && <circle cx="152" cy="70" r="16" />}
        {wrong >= 2 && <path d="M152 86v48" />}
        {wrong >= 3 && <path d="M152 104l-26 20" />}
        {wrong >= 4 && <path d="M152 104l26 20" />}
        {wrong >= 5 && <path d="M152 134l-22 32" />}
        {wrong >= 6 && <path d="M152 134l22 32" />}
        {won && wrong >= 1 && <path d="M144 66h16" stroke="var(--primary)" />}
      </g>
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

type Reward = { id: number; points: number; stars: number; complete: boolean };

function RewardBurst({ reward }: { reward: Reward }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute left-1/2 top-[30%] flex -translate-x-1/2 flex-col items-center gap-1"
        initial={{ opacity: 0, y: 16, scale: 0.7 }}
        animate={{ opacity: [0, 1, 1, 0], y: -56, scale: [0.7, 1.18, 1] }}
        transition={{ duration: reward.complete ? 1.15 : 0.85, ease: "easeOut" }}
      >
        <span className="rounded-sm border border-primary/30 bg-secondary px-2.5 py-1 font-mono text-lg font-bold text-secondary-foreground sm:text-xl">
          +{reward.points}
        </span>
        {reward.complete && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Star earned</span>
        )}
      </motion.div>
      {Array.from({ length: reward.stars }, (_, i) => {
        const angle = (i / reward.stars) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[34%] text-primary"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.35, rotate: 0 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * (reward.complete ? 92 : 64),
              y: Math.sin(angle) * (reward.complete ? 58 : 42) - 12,
              scale: 1.25,
              rotate: 200,
            }}
            transition={{ duration: reward.complete ? 1.05 : 0.75, ease: "easeOut" }}
          >
            <LuStar className="h-4 w-4 fill-primary" />
          </motion.span>
        );
      })}
    </motion.div>
  );
}

type RoundRef = {
  word: string;
  guessed: Set<string>;
  wrong: number;
  done: boolean;
  points: number;
};

function makeRound(entry: Entry): RoundRef {
  return { word: entry.word, guessed: new Set(), wrong: 0, done: false, points: 0 };
}

export default function BitayDemo() {
  const [category, setCategory] = useState<string>("All");
  const [entry, setEntry] = useState<Entry>(() => pick());
  const [guessed, setGuessed] = useState<Set<string>>(() => new Set());
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [wins, setWins] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [pop, setPop] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [muted, setMuted] = useState(false);
  const [scorePulse, setScorePulse] = useState(0);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [roundPoints, setRoundPoints] = useState(0);
  const [roundStars, setRoundStars] = useState(0);
  const { reportProgress } = useArcadeScore();
  const progressRef = useRef(reportProgress);
  progressRef.current = reportProgress;
  const roundRef = useRef<RoundRef>(makeRound(entry));
  const scoreRef = useRef(0);
  const rewardId = useRef(0);

  const letters = useMemo(() => entry.word.split(""), [entry.word]);
  const won = letters.every((ch) => guessed.has(ch));
  const lost = wrong >= MAX_WRONG;
  const done = won || lost;
  useReportWhen(done, won ? score : 0);

  useEffect(() => {
    const saved = localStorage.getItem("bitay-best");
    if (saved) setBest(parseInt(saved, 10) || 0);
    const quiet = localStorage.getItem("bitay-mute") === "1";
    setMuted(quiet);
    setGameSfxMuted(quiet);
  }, []);

  const begin = useCallback((next: Entry, resetScore = false) => {
    roundRef.current = makeRound(next);
    setEntry(next);
    setGuessed(new Set());
    setWrong(0);
    setFlash(null);
    setPop(null);
    setRewards([]);
    setResult(null);
    setRoundPoints(0);
    setRoundStars(0);
    if (resetScore) {
      scoreRef.current = 0;
      setScore(0);
    }
  }, []);

  const nextRound = useCallback(
    (resetScore = false) => {
      begin(pick(roundRef.current.word, category), resetScore);
    },
    [begin, category]
  );

  function selectCategory(next: string) {
    if (next === category) return;
    setCategory(next);
    begin(pick(roundRef.current.word, next));
  }

  const guess = useCallback((raw: string) => {
    const letter = raw.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    const round = roundRef.current;
    if (round.done || round.guessed.has(letter)) return;

    round.guessed.add(letter);
    const hit = round.word.includes(letter);
    if (!hit) round.wrong += 1;
    const complete = [...round.word].every((ch) => round.guessed.has(ch));
    const failed = round.wrong >= MAX_WRONG;
    round.done = complete || failed;

    setGuessed(new Set(round.guessed));
    setWrong(round.wrong);
    setPop(letter);
    setFlash(hit ? "ok" : "bad");
    window.setTimeout(() => {
      setFlash(null);
      setPop(null);
    }, 520);

    if (!hit) {
      playGameSfx(failed ? "lose" : "miss");
      progressRef.current(`Miss ${letter}`, scoreRef.current);
      if (failed) setResult("lose");
      return;
    }

    const gained = 40 + [...round.word].filter((ch) => ch === letter).length * 20;
    const bonus = complete ? 180 : 0;
    const stars = complete ? 1 + (MAX_WRONG - round.wrong) : 0;
    round.points += gained + bonus;
    const total = scoreRef.current + gained + bonus;
    scoreRef.current = total;
    setScore(total);
    setRoundPoints(round.points);
    setScorePulse((n) => n + 1);
    const reward: Reward = {
      id: ++rewardId.current,
      points: gained + bonus,
      stars: complete ? 10 : 5,
      complete,
    };
    setRewards((prev) => [...prev.slice(-2), reward]);
    window.setTimeout(() => {
      setRewards((prev) => prev.filter((item) => item.id !== reward.id));
    }, 1200);

    playGameSfx("hit");
    playGameSfx("star");
    progressRef.current(complete ? `Solved ${round.word}` : `Letter ${letter}`, total);
    if (!complete) return;
    setRoundStars(stars);
    setResult("win");
    playGameSfx("win");
    setWins((w) => w + 1);
    setBest((prev) => {
      const next = Math.max(prev, total);
      localStorage.setItem("bitay-best", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && roundRef.current.done) {
        nextRound(roundRef.current.wrong >= MAX_WRONG);
        return;
      }
      guess(e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess, nextRound]);

  return (
    <div className="relative flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-hidden sm:gap-4">
      <AnimatePresence>{flash ? <Sparks tone={flash} /> : null}</AnimatePresence>
      <AnimatePresence>
        {rewards.map((reward) => (
          <RewardBurst key={reward.id} reward={reward} />
        ))}
      </AnimatePresence>
      <GameHud className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <motion.div key={scorePulse} initial={{ scale: 1 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.35 }}>
          <GameStat label="Score" value={score} accent />
        </motion.div>
        <GameStat label="Best" value={best} />
        <GameStat label="Wins" value={wins} />
        <GameStat label="Misses" value={`${wrong}/${MAX_WRONG}`} />
        <Button
          size="sm"
          variant="outline"
          className="rounded-sm"
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          onClick={() => {
            const next = !isGameSfxMuted();
            setGameSfxMuted(next);
            setMuted(next);
            localStorage.setItem("bitay-mute", next ? "1" : "0");
          }}
        >
          {muted ? <LuVolumeX className="h-4 w-4" /> : <LuVolume2 className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" className="rounded-sm" onClick={() => nextRound(true)}>
          New word
        </Button>
      </GameHud>

      <div className="flex w-full min-w-0 flex-wrap gap-1.5 pb-0.5">
        {CATEGORIES.map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => selectCategory(item)}
              className={cn(
                "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-2.5 sm:tracking-[0.14em] sm:text-[11px]",
                active
                  ? "border-primary/50 bg-secondary text-secondary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {item}
              <span className={cn("ml-1.5 tabular-nums", active ? "text-primary" : "text-muted-foreground")}>
                {categoryCount(item)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative w-full overflow-hidden border border-border/60 bg-card/80">
      <motion.div
        className={cn(
          "grid w-full min-w-0 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] md:items-start md:p-5",
          flash === "bad" && "ring-1 ring-rose-400/70",
          flash === "ok" && "ring-1 ring-emerald-400/70"
        )}
        animate={result ? {} : flash === "bad" ? { x: [0, -10, 10, -6, 6, 0] } : flash === "ok" ? { scale: [1, 1.015, 1] } : {}}
        transition={{ duration: 0.38 }}
      >
        <div className="flex flex-col items-center">
          <span className="rounded-sm border border-primary/30 bg-secondary px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary-foreground">
            {entry.category}
          </span>
          <div className="mt-2 flex justify-center">
            <Gallows wrong={wrong} lost={lost} won={won} />
          </div>
          <p className="mt-1 max-w-[16rem] text-center text-xs text-muted-foreground sm:text-sm">
            Hint · {entry.hint}
          </p>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex w-full min-w-0 flex-nowrap justify-center gap-1 md:justify-start">
            {letters.map((ch, i) => {
              const show = guessed.has(ch) || lost;
              const missed = lost && !guessed.has(ch);
              return (
                <motion.span
                  key={`${entry.word}-${i}`}
                  className={cn(
                        "flex h-11 min-w-0 flex-1 items-center justify-center border font-mono text-base font-semibold sm:h-12 sm:max-w-[2.8rem] sm:text-lg md:text-xl",
                    show && !missed && "border-primary/40 bg-secondary text-secondary-foreground",
                    missed && "border-destructive/50 bg-destructive/10 text-destructive",
                    !show && "border-border/70 bg-background/50 text-muted-foreground/40"
                  )}
                  animate={show && pop === ch ? { y: [8, -6, 0], scale: [0.6, 1.15, 1] } : show ? { scale: 1 } : {}}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                >
                  {show ? ch : ""}
                </motion.span>
              );
            })}
          </div>

          <div className="mt-3 flex w-full flex-col items-stretch gap-1 sm:mt-4 sm:gap-1.5">
            {ROWS.map((row) => (
              <div key={row} className="flex justify-center gap-0.5 sm:gap-1">
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
                        "h-11 min-w-0 flex-1 rounded-sm border font-mono text-xs font-semibold sm:h-12 sm:max-w-[2.8rem] sm:text-sm",
                        !used && !done && "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-secondary",
                        !used && done && "border-border/40 bg-muted/10 opacity-40",
                        good && "border-primary/40 bg-secondary text-secondary-foreground",
                        bad && "border-destructive/40 bg-destructive/10 text-destructive line-through opacity-70"
                      )}
                      animate={pop === letter ? { scale: [1, 1.2, 1], y: good ? [-6, 0] : [4, 0] } : {}}
                      whileTap={used || done ? undefined : { scale: 0.92 }}
                    >
                      {letter}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </motion.div>
        {result && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/95 p-5 text-center text-card-foreground backdrop-blur-sm">
              {result === "lose" ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">The rope dropped</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-destructive sm:text-3xl">You are now in BITAY</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The word was{" "}
                    <span className="font-mono font-semibold tracking-[0.14em] text-foreground">{entry.word}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    <LuStar className="h-3.5 w-3.5 fill-primary" />
                    {roundStars} {roundStars === 1 ? "star" : "stars"} earned
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-primary sm:text-3xl">Saved from BITAY</h3>
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <span className="rounded-sm border border-primary/30 bg-secondary px-3 py-1 font-mono text-xl font-bold text-secondary-foreground">
                      +{roundPoints}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      {Array.from({ length: roundStars }, (_, i) => (
                        <LuStar key={i} className="h-4 w-4 fill-primary" />
                      ))}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      The word was{" "}
                      <span className="font-mono font-semibold tracking-[0.14em] text-foreground">{entry.word}</span>
                    </p>
                  </div>
                </>
              )}
              <Button size="sm" className="mt-5 rounded-sm" onClick={() => nextRound(result === "lose")}>
                Next round
              </Button>
            </div>
          )}
      </div>
      <GameTip>Correct letters earn points and stars · mute in the HUD · type or tap a letter</GameTip>
    </div>
  );
}
