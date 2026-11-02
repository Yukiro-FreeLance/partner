"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

const SIZE = 21;

type Cell = 0 | 1; // 0 path, 1 wall
type Pos = { x: number; y: number };

function generateMaze(size: number): Cell[][] {
  const maze: Cell[][] = Array.from({ length: size }, () => Array(size).fill(1));
  const stack: Pos[] = [{ x: 1, y: 1 }];
  maze[1][1] = 0;

  const dirs = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length) {
    const current = stack[stack.length - 1];
    const neighbors = dirs
      .map(([dx, dy]) => ({ x: current.x + dx, y: current.y + dy, dx, dy }))
      .filter(
        (n) =>
          n.x > 0 &&
          n.y > 0 &&
          n.x < size - 1 &&
          n.y < size - 1 &&
          maze[n.y][n.x] === 1
      )
      .sort(() => Math.random() - 0.5);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[0];
    maze[current.y + next.dy / 2][current.x + next.dx / 2] = 0;
    maze[next.y][next.x] = 0;
    stack.push({ x: next.x, y: next.y });
  }

  maze[1][1] = 0;
  maze[size - 2][size - 2] = 0;
  return maze;
}

function createInitialMaze() {
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) =>
      x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 1 : 0
    )
  ) as Cell[][];
}

export default function MazeEscapeDemo() {
  const [maze, setMaze] = useState<Cell[][]>(createInitialMaze);
  const [player, setPlayer] = useState<Pos>({ x: 1, y: 1 });
  const [moves, setMoves] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const goal = { x: SIZE - 2, y: SIZE - 2 };
  const won = player.x === goal.x && player.y === goal.y;
  useReportWhen(won, Math.max(0, 800 - moves * 4));

  useEffect(() => {
    setMaze(generateMaze(SIZE));
    setPlayer({ x: 1, y: 1 });
  }, []);

  const reset = useCallback(() => {
    setMaze(generateMaze(SIZE));
    setPlayer({ x: 1, y: 1 });
    setMoves(0);
  }, []);

  const tryMove = useCallback(
    (dx: number, dy: number) => {
      if (won) return;
      setPlayer((p) => {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (ny < 0 || nx < 0 || ny >= SIZE || nx >= SIZE) return p;
        if (maze[ny][nx] === 1) return p;
        setMoves((m) => m + 1);
        return { x: nx, y: ny };
      });
    },
    [maze, won]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        W: [0, -1],
        s: [0, 1],
        S: [0, 1],
        a: [-1, 0],
        A: [-1, 0],
        d: [1, 0],
        D: [1, 0],
      };
      if (map[e.key]) {
        e.preventDefault();
        const [dx, dy] = map[e.key];
        tryMove(dx, dy);
      }
      if (e.key === "r" || e.key === "R") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryMove, reset]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
    else tryMove(0, dy > 0 ? 1 : -1);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Moves" value={moves} accent />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          New Maze
        </Button>
      </GameHud>

      {won && (
        <p className="animate-pulse text-lg font-semibold text-primary" aria-live="polite">
          Extracted in {moves} moves
        </p>
      )}

      <div
        className="grid aspect-square w-full max-w-[30rem] gap-0.5 rounded-2xl border border-emerald-500/25 bg-[#06140f] p-3 shadow-[0_0_30px_rgba(16,185,129,0.12)] sm:p-4"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Maze"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {maze.map((row, y) =>
          row.map((cell, x) => {
            const isPlayer = player.x === x && player.y === y;
            const isGoal = goal.x === x && goal.y === y;
            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "aspect-square min-h-0 min-w-0 transition-all duration-150",
                  cell === 1 && "rounded-[2px] bg-emerald-950/90",
                  cell === 0 && "bg-transparent",
                  isGoal && !isPlayer && "animate-pulse rounded-sm bg-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
                  isPlayer && "scale-110 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                )}
              />
            );
          })
        )}
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-2 md:hidden" aria-label="Maze touch controls">
        <div />
        <Button type="button" aria-label="Move up" size="sm" variant="secondary" className="h-16 rounded-2xl text-3xl" onClick={() => tryMove(0, -1)}>
          ↑
        </Button>
        <div />
        <Button type="button" aria-label="Move left" size="sm" variant="secondary" className="h-16 rounded-2xl text-3xl" onClick={() => tryMove(-1, 0)}>
          ←
        </Button>
        <Button type="button" aria-label="Reset maze" size="sm" variant="outline" className="h-16 rounded-2xl text-2xl" onClick={reset}>
          ↻
        </Button>
        <Button type="button" aria-label="Move right" size="sm" variant="secondary" className="h-16 rounded-2xl text-3xl" onClick={() => tryMove(1, 0)}>
          →
        </Button>
        <div />
        <Button type="button" aria-label="Move down" size="sm" variant="secondary" className="h-16 rounded-2xl text-3xl" onClick={() => tryMove(0, 1)}>
          ↓
        </Button>
        <div />
      </div>

      <GameTip>WASD / Arrows · Glow = exit node</GameTip>
    </div>
  );
}
