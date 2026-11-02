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

const DEMO_BY_SLUG: Record<string, ComponentType> = {
  "tic-tac-toe": dynamic(() => import("@/components/games/demos/tic-tac-toe-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  memory: dynamic(() => import("@/components/games/demos/memory-match-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  snake: dynamic(() => import("@/components/games/demos/snake-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "2048": dynamic(() => import("@/components/games/demos/twenty-forty-eight-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "typing-challenge": dynamic(() => import("@/components/games/demos/typing-challenge-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  quiz: dynamic(() => import("@/components/games/demos/quiz-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "flappy-bird": dynamic(() => import("@/components/games/demos/flappy-bird-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  sudoku: dynamic(() => import("@/components/games/demos/sudoku-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "maze-escape": dynamic(() => import("@/components/games/demos/maze-escape-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "space-defender": dynamic(() => import("@/components/games/demos/space-defender-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "chess-ai": dynamic(() => import("@/components/games/demos/chess-ai-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  bioverse: dynamic(() => import("@/components/games/demos/bioverse-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  tetris: dynamic(() => import("@/components/games/demos/tetris-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  "brick-break": dynamic(() => import("@/components/games/demos/brick-break-demo"), { ssr: false, loading: () => <DemoLoader /> }),
  bitay: dynamic(() => import("@/components/games/demos/bitay-demo"), { ssr: false, loading: () => <DemoLoader /> }),
};

export function GameDemo({ slug }: { slug: string }) {
  const Demo = DEMO_BY_SLUG[slug];
  if (!Demo) return <p className="text-sm text-muted-foreground">This game is not available yet.</p>;
  return (
    <div className="min-h-[26rem] overflow-hidden rounded-[1.75rem] border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow)] sm:min-h-[32rem] sm:p-7 lg:min-h-[38rem]">
      <Demo />
    </div>
  );
}
