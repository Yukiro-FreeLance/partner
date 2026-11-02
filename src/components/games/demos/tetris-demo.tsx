"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import {
  ChevronDown as LuChevronDown,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChevronUp as LuChevronUp,
  ChevronsDown as LuChevronsDown,
  Pause as LuPause,
  Play as LuPlay,
  RotateCw as LuRotateCw,
} from "lucide-react";
import { useReportWhen } from "@/components/games/arcade-score";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLS = 10;
const ROWS = 20;
const HIDDEN = 2; // spawn buffer above visible board

type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PieceId = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Point = { x: number; y: number };
type Active = { id: PieceId; rot: number; x: number; y: number };

const COLORS: Record<PieceId, string> = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

const COLOR_BY_CELL: Record<number, string> = {
  1: COLORS.I,
  2: COLORS.O,
  3: COLORS.T,
  4: COLORS.S,
  5: COLORS.Z,
  6: COLORS.J,
  7: COLORS.L,
};

const PIECE_INDEX: Record<PieceId, Cell> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

/** SRS-ish shapes: [rotation][cells] relative to piece origin */
const SHAPES: Record<PieceId, Point[][]> = {
  I: [
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ],
    [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
  ],
  O: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  ],
  T: [
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  S: [
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
  Z: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ],
  ],
  J: [
    [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
  ],
  L: [
    [
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
    ],
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  ],
};

const BAG: PieceId[] = ["I", "O", "T", "S", "Z", "J", "L"];

const KICKS: Point[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS + HIDDEN }, () => Array(COLS).fill(0) as Cell[]);
}

function shuffleBag(): PieceId[] {
  const bag = [...BAG];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function cellsOf(piece: Active): Point[] {
  return SHAPES[piece.id][piece.rot].map((c) => ({ x: piece.x + c.x, y: piece.y + c.y }));
}

function fits(board: Cell[][], piece: Active) {
  return cellsOf(piece).every((c) => {
    if (c.x < 0 || c.x >= COLS || c.y >= ROWS + HIDDEN) return false;
    if (c.y < 0) return true;
    return board[c.y][c.x] === 0;
  });
}

function spawn(id: PieceId): Active {
  return { id, rot: 0, x: 3, y: 0 };
}

function gravityMs(level: number) {
  return Math.max(80, 800 - (level - 1) * 70);
}

function lineScore(lines: number, level: number, combo: number) {
  const base = [0, 100, 300, 500, 800][lines] ?? 0;
  return base * level + combo * 50 * lines;
}

function MiniPiece({ id, size = 14 }: { id: PieceId | null; size?: number }) {
  if (!id) {
    return (
      <div className="flex h-10 w-10 items-center justify-center text-[10px] text-muted-foreground sm:h-12 sm:w-12">
        —
      </div>
    );
  }
  const shape = SHAPES[id][0];
  const minX = Math.min(...shape.map((c) => c.x));
  const minY = Math.min(...shape.map((c) => c.y));
  const maxX = Math.max(...shape.map((c) => c.x));
  const maxY = Math.max(...shape.map((c) => c.y));
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  return (
    <div
      className="grid place-content-center gap-px sm:gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${w}, ${size}px)`,
        gridTemplateRows: `repeat(${h}, ${size}px)`,
      }}
    >
      {Array.from({ length: w * h }).map((_, i) => {
        const x = (i % w) + minX;
        const y = Math.floor(i / w) + minY;
        const on = shape.some((c) => c.x === x && c.y === y);
        return (
          <span
            key={i}
            className="block"
            style={{
              width: size,
              height: size,
              background: on ? COLORS[id] : "transparent",
              boxShadow: on ? `0 0 8px ${COLORS[id]}66` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export default function TetrisDemo() {
  const [board, setBoard] = useState<Cell[][]>(emptyBoard);
  const [active, setActive] = useState<Active | null>(null);
  const [queue, setQueue] = useState<PieceId[]>([]);
  const [hold, setHold] = useState<PieceId | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  useReportWhen(gameOver, score);
  const [clearFlash, setClearFlash] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const bagRef = useRef<PieceId[]>([]);
  const boardRef = useRef(board);
  const activeRef = useRef(active);
  const queueRef = useRef(queue);
  const holdRef = useRef(hold);
  const canHoldRef = useRef(canHold);
  const levelRef = useRef(level);
  const comboRef = useRef(combo);
  const pausedRef = useRef(paused);
  const overRef = useRef(gameOver);
  const lockRef = useRef(0);

  boardRef.current = board;
  activeRef.current = active;
  queueRef.current = queue;
  holdRef.current = hold;
  canHoldRef.current = canHold;
  levelRef.current = level;
  comboRef.current = combo;
  pausedRef.current = paused;
  overRef.current = gameOver;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }, []);

  const takeNext = useCallback((): PieceId => {
    if (bagRef.current.length === 0) bagRef.current = shuffleBag();
    const id = bagRef.current.shift()!;
    if (bagRef.current.length < 7) bagRef.current.push(...shuffleBag());
    return id;
  }, []);

  const refillQueue = useCallback(
    (current: PieceId[]) => {
      const next = [...current];
      while (next.length < 5) next.push(takeNext());
      return next;
    },
    [takeNext]
  );

  const lockPiece = useCallback(
    (piece: Active, currentBoard: Cell[][]) => {
      const nextBoard = currentBoard.map((row) => [...row]) as Cell[][];
      const value = PIECE_INDEX[piece.id];
      for (const c of cellsOf(piece)) {
        if (c.y >= 0 && c.y < ROWS + HIDDEN && c.x >= 0 && c.x < COLS) {
          nextBoard[c.y][c.x] = value;
        }
      }

      const fullRows: number[] = [];
      for (let y = 0; y < ROWS + HIDDEN; y++) {
        if (nextBoard[y].every((v) => v !== 0)) fullRows.push(y);
      }

      if (fullRows.length) {
        setClearFlash(fullRows);
        window.setTimeout(() => setClearFlash([]), 160);
        const cleared = nextBoard.filter((_, y) => !fullRows.includes(y));
        while (cleared.length < ROWS + HIDDEN) cleared.unshift(Array(COLS).fill(0) as Cell[]);
        const gained = lineScore(fullRows.length, levelRef.current, comboRef.current);
        const labels = ["", "Single", "Double", "Triple", "TETRIS"];
        flash(labels[fullRows.length] ?? "Clear");
        setCombo((c) => c + 1);
        setScore((s) => {
          const ns = s + gained;
          setBest((b) => {
            if (ns > b) {
              localStorage.setItem("tetris-neon-best", String(ns));
              return ns;
            }
            return b;
          });
          return ns;
        });
        setLines((l) => {
          const nl = l + fullRows.length;
          setLevel(Math.floor(nl / 10) + 1);
          return nl;
        });
        setBoard(cleared);
        boardRef.current = cleared;
        return cleared;
      }

      setCombo(0);
      setBoard(nextBoard);
      boardRef.current = nextBoard;
      return nextBoard;
    },
    [flash]
  );

  const spawnFromQueue = useCallback(
    (q: PieceId[], boardState: Cell[][]) => {
      const [nextId, ...rest] = refillQueue(q);
      const piece = spawn(nextId);
      setQueue(rest);
      queueRef.current = rest;
      if (!fits(boardState, piece)) {
        setGameOver(true);
        setActive(null);
        activeRef.current = null;
        flash("TOP OUT");
        return;
      }
      setActive(piece);
      activeRef.current = piece;
      setCanHold(true);
      canHoldRef.current = true;
      lockRef.current = 0;
    },
    [flash, refillQueue]
  );

  const reset = useCallback(() => {
    bagRef.current = shuffleBag();
    const startBoard = emptyBoard();
    const q = refillQueue([]);
    setBoard(startBoard);
    boardRef.current = startBoard;
    setHold(null);
    holdRef.current = null;
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(0);
    setPaused(false);
    setGameOver(false);
    setClearFlash([]);
    setToast(null);
    spawnFromQueue(q, startBoard);
  }, [refillQueue, spawnFromQueue]);

  useEffect(() => {
    const saved = localStorage.getItem("tetris-neon-best");
    if (saved) setBest(parseInt(saved, 10) || 0);
    reset();
  }, [reset]);

  const tryMove = useCallback((dx: number, dy: number) => {
    const piece = activeRef.current;
    if (!piece || pausedRef.current || overRef.current) return false;
    const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!fits(boardRef.current, next)) return false;
    setActive(next);
    activeRef.current = next;
    if (dy > 0) lockRef.current = 0;
    return true;
  }, []);

  const tryRotate = useCallback((dir: 1 | -1) => {
    const piece = activeRef.current;
    if (!piece || pausedRef.current || overRef.current) return;
    const rot = (piece.rot + dir + 4) % 4;
    for (const kick of KICKS) {
      const next = { ...piece, rot, x: piece.x + kick.x, y: piece.y + kick.y };
      if (fits(boardRef.current, next)) {
        setActive(next);
        activeRef.current = next;
        lockRef.current = 0;
        return;
      }
    }
  }, []);

  const hardDrop = useCallback(() => {
    const piece = activeRef.current;
    if (!piece || pausedRef.current || overRef.current) return;
    let next = piece;
    let dist = 0;
    while (fits(boardRef.current, { ...next, y: next.y + 1 })) {
      next = { ...next, y: next.y + 1 };
      dist += 1;
    }
    setScore((s) => s + dist * 2);
    const lockedBoard = lockPiece(next, boardRef.current);
    setActive(null);
    activeRef.current = null;
    spawnFromQueue(queueRef.current, lockedBoard);
  }, [lockPiece, spawnFromQueue]);

  const doHold = useCallback(() => {
    const piece = activeRef.current;
    if (!piece || !canHoldRef.current || pausedRef.current || overRef.current) return;
    const held = holdRef.current;
    setHold(piece.id);
    holdRef.current = piece.id;
    setCanHold(false);
    canHoldRef.current = false;
    if (held) {
      const swapped = spawn(held);
      if (fits(boardRef.current, swapped)) {
        setActive(swapped);
        activeRef.current = swapped;
      }
    } else {
      spawnFromQueue(queueRef.current, boardRef.current);
    }
  }, [spawnFromQueue]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "p" || e.key === "P") {
        if (!overRef.current) setPaused((p) => !p);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        reset();
        return;
      }
      if (pausedRef.current || overRef.current) return;

      const map: Record<string, () => void> = {
        ArrowLeft: () => tryMove(-1, 0),
        ArrowRight: () => tryMove(1, 0),
        ArrowDown: () => {
          if (tryMove(0, 1)) setScore((s) => s + 1);
        },
        ArrowUp: () => tryRotate(1),
        x: () => tryRotate(1),
        X: () => tryRotate(1),
        z: () => tryRotate(-1),
        Z: () => tryRotate(-1),
        " ": () => {
          e.preventDefault();
          hardDrop();
        },
        c: () => doHold(),
        C: () => doHold(),
        Shift: () => doHold(),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doHold, hardDrop, reset, tryMove, tryRotate]);

  // gravity + lock delay
  useEffect(() => {
    if (paused || gameOver) return;
    const id = window.setInterval(() => {
      const piece = activeRef.current;
      if (!piece) return;
      if (tryMove(0, 1)) return;
      lockRef.current += 1;
      if (lockRef.current >= 2) {
        const lockedBoard = lockPiece(piece, boardRef.current);
        setActive(null);
        activeRef.current = null;
        spawnFromQueue(queueRef.current, lockedBoard);
      }
    }, gravityMs(level));
    return () => clearInterval(id);
  }, [paused, gameOver, level, lockPiece, spawnFromQueue, tryMove]);

  const ghost = useMemo(() => {
    if (!active) return null;
    let g = active;
    while (fits(board, { ...g, y: g.y + 1 })) g = { ...g, y: g.y + 1 };
    return g;
  }, [active, board]);

  const touchRef = useRef<{
    x: number;
    y: number;
    originX: number;
    originY: number;
    t: number;
    moved: boolean;
  } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.changedTouches[0];
    touchRef.current = {
      x: t.clientX,
      y: t.clientY,
      originX: t.clientX,
      originY: t.clientY,
      t: Date.now(),
      moved: false,
    };
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      const start = touchRef.current;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      e.preventDefault();
      start.moved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) tryMove(1, 0);
        else tryMove(-1, 0);
        start.x = t.clientX;
        start.y = t.clientY;
      } else if (dy > 0) {
        if (tryMove(0, 1)) setScore((s) => s + 1);
        start.x = t.clientX;
        start.y = t.clientY;
      }
    },
    [tryMove]
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      const start = touchRef.current;
      touchRef.current = null;
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.originX;
      const dy = t.clientY - start.originY;
      const dt = Date.now() - start.t;
      if (!start.moved && dt < 250 && Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        tryRotate(1);
        return;
      }
      if (dy < -48 && Math.abs(dy) > Math.abs(dx)) hardDrop();
    },
    [hardDrop, tryRotate]
  );

  return (
    <div className="mx-auto w-full max-w-lg select-none touch-manipulation">
      <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary sm:text-[10px]">
            Neon Stack
          </p>
          <h3 className="truncate text-base font-semibold tracking-tight sm:text-lg">Modern Tetris</h3>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-sm px-2 sm:h-9 sm:px-3"
            onClick={() => !gameOver && setPaused((p) => !p)}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <LuPlay className="h-3.5 w-3.5" /> : <LuPause className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-sm px-2 sm:h-9 sm:px-3" onClick={reset}>
            Restart
          </Button>
        </div>
      </div>

      {/* Mobile compact HUD */}
      <div className="mb-2 grid grid-cols-3 gap-1.5 sm:hidden">
        <Panel label="Hold" compact>
          <div className="flex justify-center">
            <MiniPiece id={hold} size={10} />
          </div>
        </Panel>
        <Panel label="Match" compact>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Stat label="Score" value={score.toLocaleString("en-US")} accent compact />
            <Stat label="Best" value={best.toLocaleString("en-US")} compact />
            <Stat label="Lines" value={lines} compact />
            <Stat label="Lv" value={level} compact />
          </div>
          {combo > 1 && (
            <p className="mt-1 text-center font-mono text-[10px] text-primary">Combo x{combo}</p>
          )}
        </Panel>
        <Panel label="Next" compact>
          <div className="flex flex-col items-center gap-1">
            {queue.slice(0, 2).map((id, i) => (
              <MiniPiece key={`${id}-${i}`} id={id} size={i === 0 ? 10 : 8} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Desktop / tablet layout */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[80px_minmax(0,1fr)_80px] sm:gap-3 md:grid-cols-[88px_minmax(0,1fr)_88px]">
        <div className="hidden space-y-2 sm:block">
          <Panel label="Hold">
            <div className="flex justify-center">
              <MiniPiece id={hold} />
            </div>
          </Panel>
          <Panel label="Stats">
            <Stat label="Score" value={score.toLocaleString("en-US")} accent />
            <Stat label="Best" value={best.toLocaleString("en-US")} />
            <Stat label="Lines" value={lines} />
            <Stat label="Level" value={level} />
            {combo > 1 && <Stat label="Combo" value={`x${combo}`} accent />}
          </Panel>
        </div>

        <div className="relative mx-auto w-full max-w-[min(100%,320px)] sm:max-w-none">
          <div
            className="relative mx-auto aspect-[10/20] w-full overflow-hidden border border-primary/30 bg-[#07110e] shadow-[0_0_40px_rgba(16,185,129,0.12)] touch-none"
            role="img"
            aria-label="Tetris board"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(16,185,129,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.8) 1px, transparent 1px)",
                backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
              }}
            />

            {board.slice(HIDDEN).map((row, y) =>
              row.map((cell, x) => {
                if (!cell) return null;
                const flashing = clearFlash.includes(y + HIDDEN);
                return (
                  <Block
                    key={`b-${x}-${y}`}
                    x={x}
                    y={y}
                    color={COLOR_BY_CELL[cell]}
                    flash={flashing}
                  />
                );
              })
            )}

            {ghost &&
              cellsOf(ghost).map((c, i) =>
                c.y >= HIDDEN ? (
                  <Block
                    key={`g-${i}`}
                    x={c.x}
                    y={c.y - HIDDEN}
                    color={COLORS[ghost.id]}
                    ghost
                  />
                ) : null
              )}

            {active &&
              cellsOf(active).map((c, i) =>
                c.y >= HIDDEN ? (
                  <Block key={`a-${i}`} x={c.x} y={c.y - HIDDEN} color={COLORS[active.id]} />
                ) : null
              )}

            {(paused || gameOver) && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/80 px-3 text-center backdrop-blur-sm">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  {gameOver ? "Top Out" : "Paused"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Score {score.toLocaleString("en-US")}
                </p>
                <Button size="sm" className="rounded-sm" onClick={gameOver ? reset : () => setPaused(false)}>
                  {gameOver ? "Play again" : "Resume"}
                </Button>
              </div>
            )}

            {toast && (
              <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 border border-primary/40 bg-background/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary shadow-lg sm:text-[11px]">
                {toast}
              </div>
            )}
          </div>
        </div>

        <div className="hidden space-y-2 sm:block">
          <Panel label="Next">
            <div className="flex flex-col items-center gap-2">
              {queue.slice(0, 3).map((id, i) => (
                <MiniPiece key={`${id}-${i}`} id={id} size={i === 0 ? 14 : 11} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Touch controls — larger on mobile */}
      <div className="mt-3 sm:mt-4">
        <div className="mx-auto grid max-w-sm grid-cols-4 gap-2 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center">
          <Pad onClick={() => doHold()} label="Hold" large />
          <Pad onClick={() => tryMove(-1, 0)} ariaLabel="Left" large>
            <LuChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          </Pad>
          <Pad onClick={() => tryRotate(1)} ariaLabel="Rotate" large>
            <LuRotateCw className="h-5 w-5 sm:h-4 sm:w-4" />
          </Pad>
          <Pad onClick={() => tryMove(1, 0)} ariaLabel="Right" large>
            <LuChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
          </Pad>
          <Pad onClick={() => tryRotate(-1)} ariaLabel="Rotate left" large>
            <LuChevronUp className="h-5 w-5 rotate-180 sm:h-4 sm:w-4" />
          </Pad>
          <Pad
            onClick={() => {
              if (tryMove(0, 1)) setScore((s) => s + 1);
            }}
            ariaLabel="Soft drop"
            large
          >
            <LuChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />
          </Pad>
          <Pad onClick={hardDrop} ariaLabel="Hard drop" large className="col-span-2">
            <LuChevronsDown className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="ml-1.5 text-[11px]">Drop</span>
          </Pad>
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:mt-3 sm:text-[10px] sm:tracking-[0.14em]">
        <span className="sm:hidden">Swipe move · Tap rotate · Swipe up drop</span>
        <span className="hidden sm:inline">
          Arrows move · Up/X rotate · Z reverse · Space hard drop · C hold · P pause
        </span>
      </p>
    </div>
  );
}

function Panel({
  label,
  children,
  compact,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("border border-border/60 bg-card/50 backdrop-blur-sm", compact ? "p-1.5" : "p-2")}>
      <p
        className={cn(
          "font-mono uppercase tracking-[0.16em] text-muted-foreground",
          compact ? "mb-1 text-[8px]" : "mb-1.5 text-[9px]"
        )}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  compact,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(!compact && "mb-1.5 last:mb-0")}>
      <p
        className={cn(
          "font-mono uppercase tracking-wider text-muted-foreground",
          compact ? "text-[7px]" : "text-[8px]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tabular-nums",
          compact ? "text-xs" : "text-sm",
          accent && "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Block({
  x,
  y,
  color,
  ghost,
  flash,
}: {
  x: number;
  y: number;
  color: string;
  ghost?: boolean;
  flash?: boolean;
}) {
  return (
    <span
      className="absolute box-border p-px"
      style={{
        left: `${(x / COLS) * 100}%`,
        top: `${(y / ROWS) * 100}%`,
        width: `${100 / COLS}%`,
        height: `${100 / ROWS}%`,
      }}
    >
      <span
        className="block h-full w-full"
        style={{
          background: ghost ? "transparent" : flash ? "#fff" : color,
          border: ghost ? `1px solid ${color}` : `1px solid rgba(255,255,255,0.22)`,
          opacity: ghost ? 0.35 : 1,
          boxShadow: ghost || flash ? undefined : `inset 0 0 8px rgba(255,255,255,0.25), 0 0 10px ${color}55`,
        }}
      />
    </span>
  );
}

function Pad({
  onClick,
  children,
  label,
  ariaLabel,
  large,
  className,
}: {
  onClick: () => void;
  children?: ReactNode;
  label?: string;
  ariaLabel?: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex items-center justify-center border border-border/70 bg-muted/40 font-mono uppercase tracking-wider text-foreground transition hover:border-primary/40 active:scale-95",
        large
          ? "h-12 min-w-12 px-3 text-[11px] sm:h-9 sm:min-w-9 sm:px-2 sm:text-[10px]"
          : "h-9 min-w-9 px-2 text-[10px]",
        className
      )}
    >
      {children ?? label}
    </button>
  );
}
