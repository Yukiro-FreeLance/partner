"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

type Color = "w" | "b";
type PieceChar = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p";
type Square = PieceChar | null;
type Board = Square[]; // 64 squares, index = r*8+c

type Move = {
  from: number;
  to: number;
  piece: PieceChar;
  captured: Square;
  promotion?: PieceChar;
};

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const GLYPH: Record<PieceChar, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const VALUE: Record<string, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// Piece-square tables (white perspective; flip for black)
const PST: Record<string, number[]> = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  B: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  R: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  Q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  K: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function isWhite(p: Square) {
  return !!p && p === p.toUpperCase();
}

function colorOf(p: PieceChar): Color {
  return isWhite(p) ? "w" : "b";
}

function flipIndex(i: number) {
  return 63 - i;
}

function parseFen(fen: string): { board: Board; turn: Color } {
  const [placement, turn] = fen.split(" ");
  const board: Board = Array(64).fill(null);
  let i = 0;
  for (const ch of placement) {
    if (ch === "/") continue;
    if (/\d/.test(ch)) i += parseInt(ch, 10);
    else {
      board[i] = ch as PieceChar;
      i++;
    }
  }
  return { board, turn: turn === "b" ? "b" : "w" };
}

function cloneBoard(board: Board): Board {
  return board.slice() as Board;
}

function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  next[move.from] = null;
  next[move.to] = move.promotion ?? move.piece;
  return next;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function squareAttacked(board: Board, sq: number, by: Color): boolean {
  const tr = Math.floor(sq / 8);
  const tc = sq % 8;

  // Pawns
  const pr = by === "w" ? tr + 1 : tr - 1;
  for (const dc of [-1, 1]) {
    const c = tc + dc;
    if (inBounds(pr, c)) {
      const p = board[pr * 8 + c];
      if (p === (by === "w" ? "P" : "p")) return true;
    }
  }

  // Knights
  for (const [dr, dc] of [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ]) {
    const r = tr + dr;
    const c = tc + dc;
    if (!inBounds(r, c)) continue;
    const p = board[r * 8 + c];
    if (p === (by === "w" ? "N" : "n")) return true;
  }

  // King
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = tr + dr;
      const c = tc + dc;
      if (!inBounds(r, c)) continue;
      const p = board[r * 8 + c];
      if (p === (by === "w" ? "K" : "k")) return true;
    }
  }

  // Sliding
  const rays: [number, number, string[]][] = [
    [-1, 0, ["R", "Q"]], [1, 0, ["R", "Q"]], [0, -1, ["R", "Q"]], [0, 1, ["R", "Q"]],
    [-1, -1, ["B", "Q"]], [-1, 1, ["B", "Q"]], [1, -1, ["B", "Q"]], [1, 1, ["B", "Q"]],
  ];
  for (const [dr, dc, types] of rays) {
    let r = tr + dr;
    let c = tc + dc;
    while (inBounds(r, c)) {
      const p = board[r * 8 + c];
      if (p) {
        const want = types.map((t) => (by === "w" ? t : t.toLowerCase()));
        if (want.includes(p)) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

function findKing(board: Board, color: Color): number {
  const k = color === "w" ? "K" : "k";
  return board.findIndex((p) => p === k);
}

function generatePseudoMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = [];
  const enemy = (p: Square) => !!p && colorOf(p as PieceChar) !== color;
  const empty = (p: Square) => !p;

  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || colorOf(piece) !== color) continue;
    const r = Math.floor(from / 8);
    const c = from % 8;
    const type = piece.toUpperCase();

    const push = (to: number, promotion?: PieceChar) => {
      moves.push({ from, to, piece, captured: board[to], promotion });
    };

    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promoRow = color === "w" ? 0 : 7;
      const one = (r + dir) * 8 + c;
      if (inBounds(r + dir, c) && empty(board[one])) {
        if (r + dir === promoRow) {
          for (const promo of color === "w" ? (["Q", "R", "B", "N"] as PieceChar[]) : (["q", "r", "b", "n"] as PieceChar[])) {
            push(one, promo);
          }
        } else push(one);
        if (r === startRow) {
          const two = (r + dir * 2) * 8 + c;
          if (empty(board[two])) push(two);
        }
      }
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const to = nr * 8 + nc;
        if (enemy(board[to])) {
          if (nr === promoRow) {
            for (const promo of color === "w" ? (["Q", "R", "B", "N"] as PieceChar[]) : (["q", "r", "b", "n"] as PieceChar[])) {
              push(to, promo);
            }
          } else push(to);
        }
      }
      continue;
    }

    if (type === "N") {
      for (const [dr, dc] of [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const to = nr * 8 + nc;
        if (empty(board[to]) || enemy(board[to])) push(to);
      }
      continue;
    }

    if (type === "K") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const to = nr * 8 + nc;
          if (empty(board[to]) || enemy(board[to])) push(to);
        }
      }
      continue;
    }

    const dirs =
      type === "B"
        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        : type === "R"
          ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
          : [
              [-1, -1], [-1, 1], [1, -1], [1, 1],
              [-1, 0], [1, 0], [0, -1], [0, 1],
            ];

    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const to = nr * 8 + nc;
        if (empty(board[to])) push(to);
        else {
          if (enemy(board[to])) push(to);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

function legalMoves(board: Board, color: Color): Move[] {
  const pseudo = generatePseudoMoves(board, color);
  return pseudo.filter((m) => {
    const next = applyMove(board, m);
    const king = findKing(next, color);
    if (king < 0) return false;
    return !squareAttacked(next, king, color === "w" ? "b" : "w");
  });
}

function evaluate(board: Board): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const type = p.toUpperCase();
    const base = VALUE[p] ?? 0;
    const table = PST[type] ?? PST.P;
    const pst = isWhite(p) ? table[i] : table[flipIndex(i)];
    score += isWhite(p) ? base + pst : -(base + pst);
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const capA = a.captured ? VALUE[a.captured] * 10 - VALUE[a.piece] : 0;
    const capB = b.captured ? VALUE[b.captured] * 10 - VALUE[b.piece] : 0;
    const promoA = a.promotion ? 800 : 0;
    const promoB = b.promotion ? 800 : 0;
    return capB + promoB - (capA + promoA);
  });
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  deadline: number
): number {
  if (Date.now() > deadline) return evaluate(board);

  const color: Color = maximizing ? "w" : "b";
  const moves = legalMoves(board, color);

  if (moves.length === 0) {
    const king = findKing(board, color);
    const inCheck = king >= 0 && squareAttacked(board, king, color === "w" ? "b" : "w");
    if (inCheck) return maximizing ? -100000 + (4 - depth) : 100000 - (4 - depth);
    return 0;
  }

  if (depth === 0) return evaluate(board);

  const ordered = orderMoves(moves);
  if (maximizing) {
    let best = -Infinity;
    for (const m of ordered) {
      const score = minimax(applyMove(board, m), depth - 1, alpha, beta, false, deadline);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const m of ordered) {
    const score = minimax(applyMove(board, m), depth - 1, alpha, beta, true, deadline);
    best = Math.min(best, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return best;
}

function depthForLevel(level: number): { depth: number; timeMs: number } {
  if (level >= 95) return { depth: 5, timeMs: 2500 };
  if (level >= 85) return { depth: 4, timeMs: 1800 };
  if (level >= 70) return { depth: 4, timeMs: 1200 };
  if (level >= 50) return { depth: 3, timeMs: 900 };
  if (level >= 30) return { depth: 3, timeMs: 600 };
  if (level >= 15) return { depth: 2, timeMs: 400 };
  return { depth: 1, timeMs: 200 };
}

function chooseAiMove(board: Board, level: number): Move | null {
  const moves = legalMoves(board, "b");
  if (moves.length === 0) return null;

  const { depth, timeMs } = depthForLevel(level);
  const deadline = Date.now() + timeMs;
  const ordered = orderMoves(moves);

  let bestMove = ordered[0];
  let bestScore = Infinity;

  // Iterative deepening for stronger play at high levels
  const maxDepth = depth;
  for (let d = 1; d <= maxDepth; d++) {
    let localBest = ordered[0];
    let localScore = Infinity;
    for (const m of ordered) {
      if (Date.now() > deadline) break;
      const score = minimax(applyMove(board, m), d - 1, -Infinity, Infinity, true, deadline);
      if (score < localScore) {
        localScore = score;
        localBest = m;
      }
    }
    if (Date.now() <= deadline || d === 1) {
      bestMove = localBest;
      bestScore = localScore;
    }
    if (Date.now() > deadline) break;
  }

  // Tiny randomness only on low levels
  if (level < 20 && ordered.length > 1 && Math.random() < 0.25) {
    return ordered[Math.floor(Math.random() * Math.min(3, ordered.length))];
  }

  void bestScore;
  return bestMove;
}

function sqLabel(i: number) {
  return `${"abcdefgh"[i % 8]}${8 - Math.floor(i / 8)}`;
}

export default function ChessAiDemo() {
  const initial = useMemo(() => parseFen(START_FEN), []);
  const [board, setBoard] = useState<Board>(() => initial.board.slice() as Board);
  const [turn, setTurn] = useState<Color>("w");
  const [selected, setSelected] = useState<number | null>(null);
  const [legal, setLegal] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [level, setLevel] = useState(100);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState("Your move — Pro AI ready");
  const [history, setHistory] = useState<Board[]>([]);
  const aiBusy = useRef(false);

  const whiteMoves = useMemo(() => legalMoves(board, "w"), [board]);
  const blackMoves = useMemo(() => legalMoves(board, "b"), [board]);

  const gameOver = useMemo(() => {
    if (turn === "w" && whiteMoves.length === 0) {
      const king = findKing(board, "w");
      return king >= 0 && squareAttacked(board, king, "b") ? "AI wins by checkmate" : "Draw — stalemate";
    }
    if (turn === "b" && blackMoves.length === 0) {
      const king = findKing(board, "b");
      return king >= 0 && squareAttacked(board, king, "w") ? "You win by checkmate!" : "Draw — stalemate";
    }
    return null;
  }, [board, turn, whiteMoves, blackMoves]);
  useReportWhen(
    Boolean(gameOver),
    gameOver?.includes("You win") ? 1000 : gameOver?.includes("stalemate") ? 400 : 100,
  );

  const reset = useCallback(() => {
    const start = parseFen(START_FEN);
    setBoard(start.board);
    setTurn("w");
    setSelected(null);
    setLegal([]);
    setLastMove(null);
    setThinking(false);
    setHistory([]);
    setStatus(`Your move — Level ${level}`);
    aiBusy.current = false;
  }, [level]);

  const runAi = useCallback(
    (current: Board) => {
      if (aiBusy.current) return;
      aiBusy.current = true;
      setThinking(true);
      setStatus(`Pro engine calculating · L${level}…`);

      // Yield so UI can paint "thinking"
      setTimeout(() => {
        const move = chooseAiMove(current, level);
        if (!move) {
          setThinking(false);
          aiBusy.current = false;
          return;
        }
        const next = applyMove(current, move);
        setBoard(next);
        setLastMove({ from: move.from, to: move.to });
        setTurn("w");
        setThinking(false);
        aiBusy.current = false;
        setStatus(`AI: ${sqLabel(move.from)}→${sqLabel(move.to)} · Your turn`);
      }, 40);
    },
    [level]
  );

  function onSquare(i: number) {
    if (gameOver || thinking || turn !== "w") return;
    const piece = board[i];

    if (selected !== null) {
      if (legal.includes(i)) {
        const moving = board[selected]!;
        const promotion =
          moving === "P" && Math.floor(i / 8) === 0 ? ("Q" as PieceChar) : undefined;
        const move: Move = {
          from: selected,
          to: i,
          piece: moving,
          captured: board[i],
          promotion,
        };
        setHistory((h) => [...h, board.slice() as Board]);
        const next = applyMove(board, move);
        setBoard(next);
        setLastMove({ from: selected, to: i });
        setSelected(null);
        setLegal([]);
        setTurn("b");
        runAi(next);
        return;
      }
      if (piece && isWhite(piece)) {
        setSelected(i);
        setLegal(whiteMoves.filter((m) => m.from === i).map((m) => m.to));
        return;
      }
      setSelected(null);
      setLegal([]);
      return;
    }

    if (piece && isWhite(piece)) {
      setSelected(i);
      setLegal(whiteMoves.filter((m) => m.from === i).map((m) => m.to));
    }
  }

  function undo() {
    if (thinking || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBoard(prev);
    setTurn("w");
    setSelected(null);
    setLegal([]);
    setLastMove(null);
    setStatus("Move undone — your turn");
  }

  useEffect(() => {
    if (gameOver) setStatus(gameOver);
  }, [gameOver]);

  const inCheck =
    turn === "w" &&
    (() => {
      const k = findKing(board, "w");
      return k >= 0 && squareAttacked(board, k, "b");
    })();

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Side" value="White" accent />
        <GameStat label="Level" value={level >= 95 ? "PRO" : level} accent={level >= 85} />
        <GameStat label="Engine" value={thinking ? "…" : "Ready"} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={undo} disabled={!history.length || thinking}>
          Undo
        </Button>
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          New
        </Button>
      </GameHud>

      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="chess-level" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            AI Level {level}{level >= 95 ? " · Pro" : ""}
          </label>
          <span className="font-mono text-[10px] text-primary">
            Depth {depthForLevel(level).depth}
          </span>
        </div>
        <input
          id="chess-level"
          type="range"
          min={1}
          max={100}
          value={level}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setLevel(v);
            setStatus(`Difficulty set to Level ${v}${v >= 95 ? " (Pro)" : ""}`);
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Beginner</span>
          <span>Club</span>
          <span>Master</span>
          <span>Pro 100</span>
        </div>
      </div>

      <p
        className={cn(
          "min-h-[1.25rem] text-center text-sm font-medium transition-colors",
          thinking && "animate-pulse text-amber-400",
          inCheck && !thinking && "text-red-400",
          gameOver?.includes("win") && "text-primary"
        )}
      >
        {status}
      </p>

      <div
        className={cn(
          "relative grid grid-cols-8 overflow-hidden rounded-xl border-2 border-border/70 shadow-xl shadow-black/30 transition-transform",
          thinking && "scale-[0.99] opacity-95"
        )}
        role="grid"
        aria-label="Chess board"
      >
        {thinking && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-primary/5 via-transparent to-primary/10" />
        )}
        {board.map((piece, i) => {
          const r = Math.floor(i / 8);
          const c = i % 8;
          const dark = (r + c) % 2 === 1;
          const isSel = selected === i;
          const isLegal = legal.includes(i);
          const isLast = lastMove?.from === i || lastMove?.to === i;
          const isKingCheck =
            inCheck && piece === "K";

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSquare(i)}
              disabled={!!gameOver || thinking}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center text-2xl transition-all duration-150 md:h-12 md:w-12 md:text-[1.75rem]",
                dark
                  ? "bg-[#1a3a2f] hover:brightness-110"
                  : "bg-[#d5e6d0] text-zinc-900 hover:brightness-95 dark:bg-[#2a4a3c] dark:text-zinc-100",
                isSel && "ring-2 ring-inset ring-amber-400 brightness-110",
                isLast && "bg-amber-400/25",
                isKingCheck && "bg-red-500/35 animate-pulse",
                isLegal && !piece && "after:absolute after:h-3 after:w-3 after:rounded-full after:bg-primary/55 after:content-['']",
                isLegal && piece && "after:absolute after:inset-1 after:rounded-sm after:border-2 after:border-primary/70 after:content-['']"
              )}
              aria-label={`${sqLabel(i)}${piece ? `, ${piece}` : ""}`}
            >
              {piece && (
                <span
                  className={cn(
                    "relative z-[1] drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)] transition-transform duration-150",
                    isSel && "-translate-y-0.5 scale-110"
                  )}
                >
                  {GLYPH[piece]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <GameTip>
        Legal moves highlighted · Level 100 = Pro engine (depth 5 + PST)
      </GameTip>
    </div>
  );
}
