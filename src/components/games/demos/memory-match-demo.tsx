"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

const SYMBOLS = ["◆", "▲", "●", "■", "✚", "◇", "⬡", "★"];

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function createDeck(): Card[] {
  const pairs = SYMBOLS.flatMap((emoji, i) => [
    { id: i * 2, emoji, flipped: false, matched: false },
    { id: i * 2 + 1, emoji, flipped: false, matched: false },
  ]);
  return pairs.sort(() => Math.random() - 0.5);
}

function createOrderedDeck(): Card[] {
  return SYMBOLS.flatMap((emoji, i) => [
    { id: i * 2, emoji, flipped: false, matched: false },
    { id: i * 2 + 1, emoji, flipped: false, matched: false },
  ]);
}

export default function MemoryMatchDemo() {
  const [cards, setCards] = useState<Card[]>(createOrderedDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [locked, setLocked] = useState(false);
  const won = cards.every((c) => c.matched);
  useReportWhen(won, Math.max(0, 1000 - moves * 8 - seconds));

  useEffect(() => {
    setCards(createDeck());
  }, []);

  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [won]);

  const flip = useCallback(
    (id: number) => {
      if (locked || won) return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;
      if (selected.length === 1 && selected[0] === id) return;

      const next = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
      setCards(next);
      const newSelected = [...selected, id];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setMoves((m) => m + 1);
        setLocked(true);
        const [a, b] = newSelected.map((sid) => next.find((c) => c.id === sid)!);
        if (a.emoji === b.emoji) {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
              )
            );
            setScore((s) => s + 1);
            setSelected([]);
            setLocked(false);
          }, 400);
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
              )
            );
            setSelected([]);
            setLocked(false);
          }, 800);
        }
      }
    },
    [cards, selected, locked, won]
  );

  function reset() {
    setCards(createDeck());
    setSelected([]);
    setScore(0);
    setMoves(0);
    setSeconds(0);
    setLocked(false);
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Pairs" value={`${score}/8`} accent />
        <GameStat label="Moves" value={moves} />
        <GameStat label="Time" value={formatTime(seconds)} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          Restart
        </Button>
      </GameHud>

      {won && (
        <p className="animate-pulse text-lg font-semibold text-primary" aria-live="polite">
          Protocol complete · {moves} moves
        </p>
      )}

      <div
        className="grid grid-cols-4 gap-2 border border-border/50 bg-muted/20 p-3"
        role="grid"
        aria-label="Memory match cards"
      >
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(card.id)}
            disabled={card.matched || locked}
            className={cn(
              "relative flex h-14 w-14 items-center justify-center border text-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-16 md:w-16",
              card.flipped || card.matched
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/60 bg-card/90 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 active:scale-95",
              card.matched && "opacity-70"
            )}
            aria-label={card.flipped || card.matched ? card.emoji : "Hidden card"}
          >
            <span className="font-mono">
              {card.flipped || card.matched ? card.emoji : "·"}
            </span>
          </button>
        ))}
      </div>
      <GameTip>Match signal pairs · Faster clears rank higher</GameTip>
    </div>
  );
}
