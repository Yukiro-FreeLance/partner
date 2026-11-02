"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useArcadeScore, useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameTip } from "@/components/games/game-ui";

type Player = "X" | "O" | null;
type Board = Player[];

function winLines(size: number) {
  const lines: number[][] = [];
  for (let row = 0; row < size; row += 1) lines.push(Array.from({ length: size }, (_, col) => row * size + col));
  for (let col = 0; col < size; col += 1) lines.push(Array.from({ length: size }, (_, row) => row * size + col));
  lines.push(Array.from({ length: size }, (_, i) => i * (size + 1)));
  lines.push(Array.from({ length: size }, (_, i) => (i + 1) * (size - 1)));
  return lines;
}

function checkWinner(board: Board, size: number): Player | "draw" | null {
  for (const line of winLines(size)) {
    const first = line[0];
    if (board[first] && line.every((index) => board[index] === board[first])) return board[first];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

function minimax(board: Board, isMax: boolean): number {
  const result = checkWinner(board, 3);
  if (result === "O") return 1;
  if (result === "X") return -1;
  if (result === "draw") return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  }
  let best = Infinity;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "X";
      best = Math.min(best, minimax(board, true));
      board[i] = null;
    }
  }
  return best;
}

function bestMove(board: Board): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export default function TicTacToeDemo() {
  const arcade = useArcadeScore();
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [mode, setMode] = useState<"ai" | "pvp">(arcade.pvp ? "pvp" : "ai");
  const [boardSize, setBoardSize] = useState(3);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const challenge = arcade.kind === "challenge";
  const activeSize = challenge ? 3 : boardSize;
  const cells: Board = challenge ? (arcade.board ?? Array<Player>(9).fill(null)) : board;
  const winner = checkWinner(cells, activeSize);
  const winningLines = winLines(activeSize);
  const isXTurn = cells.filter(Boolean).length % 2 === 0;
  useEffect(() => {
    if (arcade.pvp) setMode("pvp");
  }, [arcade.pvp]);
  useEffect(() => {
    if (boardSize > 3) setMode("pvp");
  }, [boardSize]);
  useReportWhen(!challenge && Boolean(winner), winner === "X" ? 100 : winner === "draw" ? 50 : 0);

  const handleClick = useCallback(
    (index: number) => {
      if (challenge) {
        if (!arcade.canPlay) return;
        arcade.playMove(index);
        return;
      }
      if (board[index] || winner) return;
      if (mode === "ai" && !isXTurn) return;

      const next = [...board];
      next[index] = isXTurn ? "X" : "O";
      setBoard(next);

       if (mode === "ai" && boardSize === 3 && !checkWinner(next, boardSize)) {
        setTimeout(() => {
          const aiBoard = [...next];
          const move = bestMove(aiBoard);
          if (move >= 0) {
            aiBoard[move] = "O";
            setBoard(aiBoard);
          }
        }, 300);
      }
    },
    [board, winner, mode, isXTurn, challenge, arcade, boardSize]
  );

  function reset() {
    setBoard(Array(boardSize * boardSize).fill(null));
  }

  const status = winner
    ? winner === "draw"
      ? "Draw!"
      : `${winner} wins!`
    : challenge
      ? arcade.pending
        ? "Sending move…"
        : arcade.canPlay
          ? `Your turn (${arcade.seat === "host" ? "X" : "O"})`
          : "Partner's turn"
      : mode === "ai"
      ? isXTurn
        ? "Your turn (X)"
        : "AI thinking…"
      : `${isXTurn ? "X" : "O"}'s turn`;

  return (
    <div className="flex flex-col items-center gap-4">
      {!challenge && (
        <GameHud>
          <Button
            size="sm"
            className="rounded-sm"
            variant={mode === "ai" ? "default" : "outline"}
            onClick={() => {
              setMode("ai");
              reset();
            }}
          >
            vs AI
          </Button>
          <Button
            size="sm"
            className="rounded-sm"
            variant={mode === "pvp" ? "default" : "outline"}
            onClick={() => {
              setMode("pvp");
              reset();
            }}
          >
            2 Player
          </Button>
          <Button size="sm" variant="ghost" className="rounded-sm" onClick={reset}>
            Reset
          </Button>
          <Button size="icon" variant="outline" aria-label="Open tic tac toe settings" title="Board settings" onClick={() => setSettingsOpen(true)}>
            <Settings2 aria-hidden />
          </Button>
        </GameHud>
      )}

      {settingsOpen && !challenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSettingsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="tic-settings-title" className="w-full max-w-sm rounded-3xl border border-white/70 bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Game settings</p><h2 id="tic-settings-title" className="mt-1 font-serif text-2xl">Choose your board</h2></div><Button type="button" size="icon" variant="ghost" aria-label="Close board settings" onClick={() => setSettingsOpen(false)}><X aria-hidden /></Button></div>
            <p className="mt-2 text-sm text-muted-foreground">Complete a row, column, or diagonal to win. Larger boards use two-player mode.</p>
            <div className="mt-5 grid grid-cols-3 gap-2">{[3, 4, 5].map((size) => <button key={size} type="button" onClick={() => { setBoardSize(size); setMode(size === 3 ? mode : "pvp"); setBoard(Array(size * size).fill(null)); setSettingsOpen(false); }} className={cn("h-14 rounded-xl border text-sm font-semibold transition", boardSize === size ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-secondary")}><span className="block text-lg">{size}×{size}</span><span className="text-[10px] font-normal text-muted-foreground">{size === 3 ? "Classic" : "Two player"}</span></button>)}</div>
          </section>
        </div>
      )}

      <p
        className={cn(
          "text-sm font-semibold tracking-tight",
          winner && winner !== "draw" && "text-primary animate-pulse",
          !winner && "text-muted-foreground"
        )}
        aria-live="polite"
      >
        {status}
      </p>

      <div
        className="grid aspect-square w-full max-w-[30rem] grid-cols-3 gap-2.5 rounded-2xl border border-border/50 bg-muted/20 p-3 shadow-inner sm:gap-3 sm:p-4"
        role="grid"
        aria-label="Tic tac toe board"
      >
        {cells.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            disabled={!!cell || !!winner || (challenge ? !arcade.canPlay || arcade.pending : mode === "ai" && !isXTurn)}
            className={cn(
              "relative flex aspect-square min-h-20 items-center justify-center rounded-xl border text-4xl font-black transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-5xl md:text-6xl",
              "border-border/60 bg-card/90 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:scale-95",
              cell === "X" && "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]",
              cell === "O" && "border-violet-500/40 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(167,139,250,0.25)]",
              winner && winningLines.some((line) => line.includes(i) && line.every((idx) => cells[idx] === winner)) &&
                "ring-2 ring-primary scale-105"
            )}
            aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Empty cell ${i + 1}`}
          >
            <span className={cn(cell && "transition-transform duration-200")}>{cell}</span>
          </button>
        ))}
      </div>
      <GameTip>{challenge ? `Two devices · challenging ${arcade.partnerName ?? "your partner"} · host is X, guest is O` : "Perfect-information duel · Minimax opponent"}</GameTip>
    </div>
  );
}
