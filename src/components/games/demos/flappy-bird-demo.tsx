"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

const W = 320;
const H = 480;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_GAP = 140;
const PIPE_W = 52;
const PIPE_SPEED = 2.4;
const BIRD_R = 14;

type Pipe = { x: number; gapY: number };

export default function FlappyBirdDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  useReportWhen(over, score);
  const birdY = useRef(H / 2);
  const birdV = useRef(0);
  const pipes = useRef<Pipe[]>([]);
  const frame = useRef(0);
  const scoreRef = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("flappy-best");
    if (saved) setBest(parseInt(saved, 10));
  }, []);

  const reset = useCallback(() => {
    birdY.current = H / 2;
    birdV.current = 0;
    pipes.current = [{ x: W + 40, gapY: H / 2 }];
    frame.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    setRunning(true);
  }, []);

  const flap = useCallback(() => {
    if (over) {
      reset();
      return;
    }
    if (!running) {
      setRunning(true);
      return;
    }
    birdV.current = FLAP;
  }, [over, running, reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        flap();
      }
      if (e.key === "r" || e.key === "R") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, W, H);

      // parallax stars
      for (let i = 0; i < 50; i++) {
        const sx = (i * 53) % W;
        const sy = (i * 97 + frame.current * (0.3 + (i % 3) * 0.2)) % H;
        ctx.fillStyle = i % 4 === 0 ? "#67e8f9" : "#94a3b8";
        ctx.globalAlpha = 0.35 + (i % 5) * 0.1;
        ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 1;

      // ground
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, H - 24, W, 24);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, H - 24, W, 3);

      if (running && !over) {
        birdV.current += GRAVITY;
        birdY.current += birdV.current;
        frame.current++;

        if (frame.current % 90 === 0) {
          pipes.current.push({
            x: W + 10,
            gapY: 100 + Math.random() * (H - 220),
          });
        }

        pipes.current.forEach((p) => {
          p.x -= PIPE_SPEED;
        });
        pipes.current = pipes.current.filter((p) => p.x > -PIPE_W);

        for (const p of pipes.current) {
          const hitX = W / 2 + BIRD_R > p.x && W / 2 - BIRD_R < p.x + PIPE_W;
          const hitY =
            birdY.current - BIRD_R < p.gapY - PIPE_GAP / 2 ||
            birdY.current + BIRD_R > p.gapY + PIPE_GAP / 2;
          if (hitX && hitY) {
            setOver(true);
            setRunning(false);
            setBest((b) => {
              const nb = Math.max(b, scoreRef.current);
              localStorage.setItem("flappy-best", String(nb));
              return nb;
            });
          }
          if (!("scored" in p) && p.x + PIPE_W < W / 2) {
            (p as Pipe & { scored?: boolean }).scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }

        if (birdY.current + BIRD_R > H - 24 || birdY.current - BIRD_R < 0) {
          setOver(true);
          setRunning(false);
          setBest((b) => {
            const nb = Math.max(b, scoreRef.current);
            localStorage.setItem("flappy-best", String(nb));
            return nb;
          });
        }
      }

      // pipes
      for (const p of pipes.current) {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad.addColorStop(0, "#16a34a");
        grad.addColorStop(0.5, "#4ade80");
        grad.addColorStop(1, "#15803d");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY - PIPE_GAP / 2);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP / 2, PIPE_W, H - (p.gapY + PIPE_GAP / 2) - 24);
        ctx.fillStyle = "#86efac";
        ctx.fillRect(p.x - 2, p.gapY - PIPE_GAP / 2 - 12, PIPE_W + 4, 12);
        ctx.fillRect(p.x - 2, p.gapY + PIPE_GAP / 2, PIPE_W + 4, 12);
      }

      // bird with glow
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.fillStyle = "#fde047";
      ctx.arc(W / 2, birdY.current, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(W / 2 + 5, birdY.current - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(W / 2 + 10, birdY.current);
      ctx.lineTo(W / 2 + 18, birdY.current + 3);
      ctx.lineTo(W / 2 + 10, birdY.current + 6);
      ctx.fill();

      if (!running && !over) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Click / Space to start", W / 2, H / 2 + 60);
      }
      if (over) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", W / 2, H / 2);
        ctx.font = "14px sans-serif";
        ctx.fillText("Click or Space to retry", W / 2, H / 2 + 28);
      }

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [running, over]);

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Score" value={score} accent />
        <GameStat label="Best" value={best} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          Restart
        </Button>
      </GameHud>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={flap}
        className="cursor-pointer rounded-xl border border-sky-500/30 shadow-[0_0_40px_rgba(56,189,248,0.15)]"
        aria-label="Flappy Bird game canvas"
      />
      <GameTip>Space / click to thrust</GameTip>
    </div>
  );
}
