"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";

type Grid = number[][];

const EMPTY = 0;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(grid: Grid, row: number, col: number, num: number) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function solve(grid: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === EMPTY) {
        for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValid(grid, r, c, num)) {
            grid[r][c] = num;
            if (solve(grid)) return true;
            grid[r][c] = EMPTY;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generatePuzzle(removals = 40): { puzzle: Grid; solution: Grid } {
  const solution: Grid = Array.from({ length: 9 }, () => Array(9).fill(EMPTY));
  solve(solution);
  const puzzle = solution.map((row) => [...row]);
  let removed = 0;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  for (const [r, c] of positions) {
    if (removed >= removals) break;
    puzzle[r][c] = EMPTY;
    removed++;
  }
  return { puzzle, solution };
}

function createEmptyPuzzle() {
  return {
    puzzle: Array.from({ length: 9 }, () => Array(9).fill(EMPTY)) as Grid,
    solution: Array.from({ length: 9 }, () => Array(9).fill(EMPTY)) as Grid,
  };
}

export default function SudokuDemo() {
  const [{ puzzle: initial, solution }, setGenerated] = useState(createEmptyPuzzle);
  const [grid, setGrid] = useState<Grid>(() => initial.map((r) => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [hints, setHints] = useState(3);

  useEffect(() => {
    const gen = generatePuzzle(42);
    setGenerated(gen);
    setGrid(gen.puzzle.map((r) => [...r]));
  }, []);

  const fixed = useMemo(() => {
    const set = new Set<string>();
    initial.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v !== EMPTY) set.add(`${r}-${c}`);
      })
    );
    return set;
  }, [initial]);

  const complete = grid.every((row, r) => row.every((v, c) => v === solution[r][c]));
  const playable = solution.some((row) => row.some((value) => value !== EMPTY));
  useReportWhen(complete && playable, 400 + hints * 200);

  const reset = useCallback(() => {
    const gen = generatePuzzle(42);
    setGenerated(gen);
    setGrid(gen.puzzle.map((r) => [...r]));
    setSelected(null);
    setHints(3);
  }, []);

  const place = useCallback(
    (num: number) => {
      if (!selected) return;
      const [r, c] = selected;
      if (fixed.has(`${r}-${c}`)) return;
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = num;
        return next;
      });
    },
    [selected, fixed]
  );

  const hint = useCallback(() => {
    if (hints <= 0 || !selected) return;
    const [r, c] = selected;
    if (fixed.has(`${r}-${c}`)) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = solution[r][c];
      return next;
    });
    setHints((h) => h - 1);
  }, [hints, selected, fixed, solution]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "9") place(parseInt(e.key, 10));
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place(0);
      if (e.key === "h" || e.key === "H") hint();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place, hint]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <span>
          Hints: <strong className="text-primary">{hints}</strong>
        </span>
        <Button size="sm" variant="outline" onClick={hint} disabled={hints <= 0 || !selected}>
          Hint
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          New Puzzle
        </Button>
      </div>

      {complete && (
        <p className="text-lg font-semibold text-primary" aria-live="polite">
          Puzzle solved! 🎉
        </p>
      )}

      <div className="grid w-full max-w-[36rem] grid-cols-9 gap-0.5 rounded-2xl border border-border/60 bg-border/40 p-1.5 sm:gap-1 sm:p-2">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isFixed = fixed.has(`${r}-${c}`);
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const wrong = val !== EMPTY && val !== solution[r][c];
            const thickRight = c === 2 || c === 5;
            const thickBottom = r === 2 || r === 5;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSelected([r, c])}
                className={cn(
                  "flex aspect-square min-h-8 min-w-0 items-center justify-center text-base font-medium sm:text-lg md:text-xl",
                  "bg-card/90 hover:bg-primary/10",
                  isFixed && "font-bold text-foreground",
                  !isFixed && "text-primary",
                  isSelected && "ring-2 ring-primary ring-inset",
                  wrong && "bg-red-500/15 text-red-500",
                  thickRight && "mr-1",
                  thickBottom && "mb-1"
                )}
                aria-label={`Row ${r + 1} column ${c + 1}${val ? `, value ${val}` : ""}`}
              >
                {val || ""}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
         <Button key={n} size="sm" variant="secondary" className="h-11 w-11 p-0 text-base sm:h-12 sm:w-12" onClick={() => place(n)}>
            {n}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => place(0)}>
          Clear
        </Button>
      </div>
    </div>
  );
}
