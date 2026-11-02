"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

type Board = number[][];

function emptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandom(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((n) => n !== 0);
  const result: number[] = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      gained += merged;
      i++;
    } else {
      result.push(filtered[i]);
    }
  }
  while (result.length < 4) result.push(0);
  return { row: result, gained };
}

function rotate(board: Board): Board {
  return board[0].map((_, i) => board.map((row) => row[i]).reverse());
}

function move(board: Board, dir: "L" | "R" | "U" | "D"): { board: Board; gained: number; moved: boolean } {
  let working = board.map((r) => [...r]);
  let rotations = 0;
  if (dir === "U") rotations = 3;
  if (dir === "R") rotations = 2;
  if (dir === "D") rotations = 1;
  for (let i = 0; i < rotations; i++) working = rotate(working);

  let gained = 0;
  let moved = false;
  working = working.map((row) => {
    const { row: next, gained: g } = slide(row);
    if (next.some((v, i) => v !== row[i])) moved = true;
    gained += g;
    return next;
  });

  for (let i = 0; i < (4 - rotations) % 4; i++) working = rotate(working);
  return { board: working, gained, moved };
}

function canMove(board: Board) {
  return (["L", "R", "U", "D"] as const).some((d) => move(board, d).moved);
}

const TILE_STYLES: Record<number, string> = {
  2: "bg-muted text-foreground",
  4: "bg-muted/80 text-foreground",
  8: "bg-orange-400/80 text-white",
  16: "bg-orange-500 text-white",
  32: "bg-orange-600 text-white",
  64: "bg-red-500 text-white",
  128: "bg-amber-400 text-white",
  256: "bg-amber-500 text-white",
  512: "bg-amber-600 text-white",
  1024: "bg-yellow-400 text-black",
  2048: "bg-yellow-300 text-black",
};

export default function TwentyFortyEightDemo() {
  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(emptyBoard())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  useReportWhen(over, score);

  useEffect(() => {
    const saved = localStorage.getItem("2048-best");
    if (saved) setBest(parseInt(saved, 10));
  }, []);

  const reset = useCallback(() => {
    setBoard(addRandom(addRandom(emptyBoard())));
    setScore(0);
    setWon(false);
    setOver(false);
  }, []);

  const applyMove = useCallback(
    (dir: "L" | "R" | "U" | "D") => {
      if (over) return;
      setBoard((prev) => {
        const { board: next, gained, moved } = move(prev, dir);
        if (!moved) return prev;
        const withTile = addRandom(next);
        setScore((s) => {
          const ns = s + gained;
          setBest((b) => {
            const nb = Math.max(b, ns);
            localStorage.setItem("2048-best", String(nb));
            return nb;
          });
          return ns;
        });
        if (withTile.some((row) => row.includes(2048))) setWon(true);
        if (!canMove(withTile)) setOver(true);
        return withTile;
      });
    },
    [over]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, "L" | "R" | "U" | "D"> = {
        ArrowLeft: "L",
        ArrowRight: "R",
        ArrowUp: "U",
        ArrowDown: "D",
      };
      if (map[e.key]) {
        e.preventDefault();
        applyMove(map[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove]);

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Score" value={score} accent />
        <GameStat label="Best" value={best} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          New
        </Button>
      </GameHud>

      {(won || over) && (
        <p className="animate-pulse text-lg font-semibold text-primary" aria-live="polite">
          {won && !over ? "2048 unlocked — keep merging" : "Board locked"}
        </p>
      )}

      <div
        className="grid aspect-square w-full max-w-[30rem] grid-cols-4 gap-2.5 rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-background p-3 shadow-inner sm:gap-3 sm:p-4"
        role="grid"
        aria-label="2048 board"
      >
        {board.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "flex aspect-square min-h-16 items-center justify-center rounded-xl text-xl font-bold transition-all duration-200 sm:text-2xl md:text-3xl",
                val
                  ? cn(TILE_STYLES[val] ?? "bg-amber-200 text-black", "scale-100 shadow-md")
                  : "bg-card/40"
              )}
            >
              {val || ""}
            </div>
          ))
        )}
      </div>

      <GameTip>Arrow keys slide · Combine equal tiles</GameTip>
    </div>
  );
}
