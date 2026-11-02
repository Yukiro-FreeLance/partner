"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function DemoLoader() {
  return (
    <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
      Loading game…
    </div>
  );
}

const loader = { ssr: false as const, loading: () => <DemoLoader /> };

const DEMO_BY_SLUG: Record<string, ComponentType> = {
  "tic-tac-toe": dynamic(() => import("@/components/games/demos/tic-tac-toe-demo"), loader),
  memory: dynamic(() => import("@/components/games/demos/memory-match-demo"), loader),
  snake: dynamic(() => import("@/components/games/demos/snake-demo"), loader),
  "2048": dynamic(() => import("@/components/games/demos/twenty-forty-eight-demo"), loader),
  "typing-challenge": dynamic(() => import("@/components/games/demos/typing-challenge-demo"), loader),
  quiz: dynamic(() => import("@/components/games/demos/quiz-demo"), loader),
  "flappy-bird": dynamic(() => import("@/components/games/demos/flappy-bird-demo"), loader),
  sudoku: dynamic(() => import("@/components/games/demos/sudoku-demo"), loader),
  "maze-escape": dynamic(() => import("@/components/games/demos/maze-escape-demo"), loader),
  "space-defender": dynamic(() => import("@/components/games/demos/space-defender-demo"), loader),
  "chess-ai": dynamic(() => import("@/components/games/demos/chess-ai-demo"), loader),
  bioverse: dynamic(() => import("@/components/games/demos/bioverse-demo"), loader),
  tetris: dynamic(() => import("@/components/games/demos/tetris-demo"), loader),
  "brick-break": dynamic(() => import("@/components/games/demos/brick-break-demo"), loader),
  bitay: dynamic(() => import("@/components/games/demos/bitay-demo"), loader),
};

export function GameDemo({ slug }: { slug: string }) {
  const Demo = DEMO_BY_SLUG[slug];
  if (!Demo) return <p className="text-sm text-muted-foreground">This game is not available yet.</p>;
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[#0b1220] p-3 text-white shadow-[var(--shadow)] sm:p-5">
      <Demo />
    </div>
  );
}
