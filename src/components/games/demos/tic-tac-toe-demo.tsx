"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useArcadeScore, useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameTip } from "@/components/games/game-ui";

type Player = "X" | "O" | null;
type Board = Player[];

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Board): Player | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

function minimax(board: Board, isMax: boolean): number {
  const result = checkWinner(board);
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
  const winner = checkWinner(board);
  const isXTurn = board.filter(Boolean).length % 2 === 0;
  useEffect(() => {
    if (arcade.pvp) setMode("pvp");
  }, [arcade.pvp]);
  useReportWhen(Boolean(winner), winner === "X" ? 100 : winner === "draw" ? 50 : 0);

  const handleClick = useCallback(
    (index: number) => {
      if (board[index] || winner) return;
      if (mode === "ai" && !isXTurn) return;

      const next = [...board];
      next[index] = isXTurn ? "X" : "O";
      setBoard(next);

      if (mode === "ai" && !checkWinner(next)) {
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
    [board, winner, mode, isXTurn]
  );

  function reset() {
    setBoard(Array(9).fill(null));
  }

  const status = winner
    ? winner === "draw"
      ? "Draw!"
      : `${winner} wins!`
    : mode === "ai"
      ? isXTurn
        ? "Your turn (X)"
        : "AI thinking…"
      : `${isXTurn ? "X" : "O"}'s turn`;

  return (
    <div className="flex flex-col items-center gap-4">
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
      </GameHud>

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
        className="grid grid-cols-3 gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3 shadow-inner"
        role="grid"
        aria-label="Tic tac toe board"
      >
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            disabled={!!cell || !!winner || (mode === "ai" && !isXTurn)}
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-lg border text-3xl font-black transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-20 md:w-20",
              "border-border/60 bg-card/90 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 active:scale-95",
              cell === "X" && "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]",
              cell === "O" && "border-violet-500/40 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(167,139,250,0.25)]",
              winner && WIN_LINES.some((line) => line.includes(i) && line.every((idx) => board[idx] === winner)) &&
                "ring-2 ring-primary scale-105"
            )}
            aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Empty cell ${i + 1}`}
          >
            <span className={cn(cell && "transition-transform duration-200")}>{cell}</span>
          </button>
        ))}
      </div>
      <GameTip>Perfect-information duel · Minimax opponent</GameTip>
    </div>
  );
}
