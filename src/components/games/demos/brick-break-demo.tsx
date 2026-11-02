"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameHud, GameStat, GameTip } from "@/components/games/game-ui";

const W = 480;
const H = 500;
const WALL = 16;
const COLS = 23;
const ROWS = 16;
const CELL = 16;
const FIELD_X = (W - COLS * CELL) / 2;
const FIELD_Y = WALL + 16;
const DOOR_DOWN = 2;
const FIELD_BOTTOM = FIELD_Y + ROWS * CELL;
const BALL_R = 5;
const PADDLE_H = 12;
const PADDLE_Y = H - 42;
const MAX_BALL_SPEED = 10.6;
const MAX_BALLS = 28;
const PURPLE = ["#5b21b6", "#6d28d9", "#7c3aed", "#8b5cf6"];
const YELLOW = "#f5c518";

type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  max: number;
  color: string;
  alive: boolean;
  steel: boolean;
  bumper: boolean;
};
type VoidCell = { c: number; r: number };
type LevelLayout = { bricks: Brick[]; voids: VoidCell[]; mouthCol: number };
type Ball = { x: number; y: number; vx: number; vy: number; glued: boolean };
type Shard = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Drop = { x: number; y: number; kind: "add" | "mul"; value: number };
type Floater = { x: number; y: number; text: string; life: number; color: string };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function boxOf(brick: Brick) {
  return { x: brick.x, y: brick.y, w: CELL, h: CELL };
}

function circleRect(cx: number, cy: number, r: number, b: { x: number; y: number; w: number; h: number }) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function penetration(cx: number, cy: number, r: number, b: { x: number; y: number; w: number; h: number }) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  const dx = cx - nx;
  const dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return -1;
  if (d2 < 1e-8) {
    const inset = Math.min(cx - b.x, b.x + b.w - cx, cy - b.y, b.y + b.h - cy);
    return r + Math.max(0, inset);
  }
  return r - Math.sqrt(d2);
}

function resolveCircleAabb(ball: Ball, box: { x: number; y: number; w: number; h: number }) {
  const closestX = clamp(ball.x, box.x, box.x + box.w);
  const closestY = clamp(ball.y, box.y, box.y + box.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const d2 = dx * dx + dy * dy;
  let ux = 0;
  let uy = 0;

  if (d2 < 1e-8) {
    const left = ball.x - box.x;
    const right = box.x + box.w - ball.x;
    const top = ball.y - box.y;
    const bottom = box.y + box.h - ball.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) {
      ux = -1;
      ball.x = box.x - BALL_R;
    } else if (min === right) {
      ux = 1;
      ball.x = box.x + box.w + BALL_R;
    } else if (min === top) {
      uy = -1;
      ball.y = box.y - BALL_R;
    } else {
      uy = 1;
      ball.y = box.y + box.h + BALL_R;
    }
  } else if (Math.abs(dx) > Math.abs(dy)) {
    ux = Math.sign(dx) || 1;
    ball.x = closestX + ux * BALL_R;
  } else {
    uy = Math.sign(dy) || 1;
    ball.y = closestY + uy * BALL_R;
  }

  const vn = ball.vx * ux + ball.vy * uy;
  if (vn < 0) {
    ball.vx -= 2 * vn * ux;
    ball.vy -= 2 * vn * uy;
  }
}

function separateFromBox(ball: Ball, box: { x: number; y: number; w: number; h: number }) {
  const closestX = clamp(ball.x, box.x, box.x + box.w);
  const closestY = clamp(ball.y, box.y, box.y + box.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 > BALL_R * BALL_R && d2 > 1e-8) return;
  if (d2 < 1e-8) {
    const left = ball.x - box.x;
    const right = box.x + box.w - ball.x;
    const top = ball.y - box.y;
    const bottom = box.y + box.h - ball.y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) ball.x = box.x - BALL_R;
    else if (min === right) ball.x = box.x + box.w + BALL_R;
    else if (min === top) ball.y = box.y - BALL_R;
    else ball.y = box.y + box.h + BALL_R;
    return;
  }
  const d = Math.sqrt(d2);
  ball.x = closestX + (dx / d) * BALL_R;
  ball.y = closestY + (dy / d) * BALL_R;
}

function stabilizeBall(ball: Ball) {
  if (Math.abs(ball.vy) < 0.95) ball.vy = 0.95 * Math.sign(ball.vy || -1);
  if (Math.abs(ball.vx) < 0.5) ball.vx = 0.5 * Math.sign(ball.vx || 1);
  const speed = Math.hypot(ball.vx, ball.vy) || 4;
  const target = clamp(speed, 3.6, MAX_BALL_SPEED);
  ball.vx *= target / speed;
  ball.vy *= target / speed;
}

function cellKey(c: number, r: number) {
  return `${c},${r}`;
}

function cellBrick(c: number, r: number, steel: boolean, hp: number, color: string, bumper = false): Brick {
  return {
    x: FIELD_X + c * CELL,
    y: FIELD_Y + r * CELL,
    w: CELL - 1,
    h: CELL - 1,
    hp,
    max: hp,
    color,
    alive: true,
    steel,
    bumper,
  };
}

function carveMaze(level: number) {
  const carved = new Set<string>();
  const mouthCol = clamp(6 + ((level * 5) % 11), 4, COLS - 5);
  let c = mouthCol;
  let r = ROWS - 1;
  const mark = (cc: number, rr: number) => {
    if (cc >= 2 && cc <= COLS - 3 && rr >= 3 && rr < ROWS) carved.add(cellKey(cc, rr));
  };
  mark(c, r);

  const dir = level % 2 === 0 ? -1 : 1;
  const runs = [
    { dc: 0, dr: -1, n: 2 },
    { dc: dir, dr: 0, n: 5 },
    { dc: 0, dr: -1, n: 2 },
    { dc: -dir, dr: 0, n: 9 },
    { dc: 0, dr: -1, n: 2 },
    { dc: dir, dr: 0, n: 4 },
    { dc: 0, dr: -1, n: 1 },
  ];
  for (const run of runs) {
    for (let i = 0; i < run.n; i++) {
      const nc = clamp(c + run.dc, 2, COLS - 3);
      const nr = clamp(r + run.dr, 4, ROWS - 1);
      if (nc === c && nr === r) continue;
      c = nc;
      r = nr;
      mark(c, r);
    }
  }

  const alcoveTop = clamp(r - 1, 3, ROWS - 3);
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = 0; dr <= 1; dr++) {
      mark(clamp(c + dc, 2, COLS - 3), clamp(alcoveTop + dr, 3, ROWS - 2));
    }
  }

  return { carved, mouthCol, alcoveTop };
}

function isBaffle(c: number, r: number, level: number, carved: Set<string>) {
  if (carved.has(cellKey(c, r)) || c === 0 || c === COLS - 1) return false;
  if (r === 3) {
    const gap = 3 + ((level * 4) % (COLS - 7));
    return c !== gap;
  }
  if (r === 6 && level >= 2) {
    const gap = COLS - 4 - ((level * 3) % (COLS - 7));
    return c !== gap;
  }
  return false;
}

function makeLevel(level: number): LevelLayout {
  const { carved, mouthCol, alcoveTop } = carveMaze(level);
  const bricks: Brick[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (carved.has(cellKey(c, r))) continue;
      const outer = r === 0 || c === 0 || c === COLS - 1 || r === ROWS - 1;
      const nextToPath = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].some(([rr, cc]) => carved.has(cellKey(cc, rr)));
      const alcoveCeiling = r === alcoveTop - 1 && carved.has(cellKey(c, r + 1));
      const baffle = isBaffle(c, r, level, carved);
      const bumper = !outer && ((c === 4 && r === 2) || (c === COLS - 5 && r === 2) || (level >= 3 && c === 11 && r === 5));
      const steel = outer || bumper || (!alcoveCeiling && (baffle || nextToPath));
      const hp = steel
        ? 99
        : 1 +
          ((c + r + level) % 3 === 0 ? 1 : 0) +
          (level >= 2 && (c * 3 + r) % 5 === 0 ? 1 : 0) +
          (level >= 4 ? 1 : 0);
      bricks.push(
        cellBrick(
          c,
          r,
          steel,
          hp,
          bumper ? "#f59e0b" : steel ? YELLOW : PURPLE[(hp - 1) % PURPLE.length],
          bumper
        )
      );
    }
  }

  for (let step = 0; step < DOOR_DOWN; step++) {
    bricks.push(cellBrick(mouthCol - 1, ROWS + step, true, 99, YELLOW));
    bricks.push(cellBrick(mouthCol + 1, ROWS + step, true, 99, YELLOW));
  }

  const voids = [...carved].map((item) => {
    const [c, r] = item.split(",").map(Number);
    return { c, r };
  });
  return { bricks, voids, mouthCol };
}

function dropForLevel(level: number): Pick<Drop, "kind" | "value"> {
  if (Math.random() < 0.28) {
    return { kind: "mul", value: Math.random() < 0.72 ? 2 : 3 };
  }
  const pool = level > 2 ? [1, 1, 2, 2, 3] : [1, 1, 1, 2];
  return { kind: "add", value: pool[Math.floor(Math.random() * pool.length)] };
}

export default function BrickBreakDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [ballsHud, setBallsHud] = useState(1);
  const [status, setStatus] = useState<"ready" | "play" | "pause" | "over" | "clear">("ready");
  useReportWhen(status === "over", score);

  const paddleX = useRef(W / 2);
  const paddleW = useRef(64);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<Brick[]>([]);
  const shards = useRef<Shard[]>([]);
  const drops = useRef<Drop[]>([]);
  const floaters = useRef<Floater[]>([]);
  const voids = useRef<VoidCell[]>([]);
  const mouthCol = useRef(11);
  const keys = useRef({ left: false, right: false });
  const bank = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const statusRef = useRef<"ready" | "play" | "pause" | "over" | "clear">("ready");
  const raf = useRef(0);
  const last = useRef(0);

  const paddleMin = () => WALL + paddleW.current / 2 + 4;
  const paddleMax = () => W - WALL - paddleW.current / 2 - 4;

  const syncBallsHud = useCallback(() => {
    setBallsHud(Math.max(1, balls.current.filter((ball) => ball.y < H + 20).length + bank.current));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("brickbreak-best");
    if (saved) setBest(parseInt(saved, 10) || 0);
  }, []);

  const makeBall = useCallback((glued: boolean, spread = 0): Ball => {
    const speed = 5.2 + Math.min(3.4, (levelRef.current - 1) * 0.48);
    const angle = -Math.PI / 2 + spread;
    return {
      x: paddleX.current,
      y: PADDLE_Y - BALL_R - 3,
      vx: Math.cos(angle) * speed * (glued ? 0.2 : 1),
      vy: Math.sin(angle) * speed,
      glued,
    };
  }, []);

  const startLevel = useCallback(
    (nextLevel: number, keepScore = true) => {
      levelRef.current = nextLevel;
      setLevel(nextLevel);
      const layout = makeLevel(nextLevel);
      bricks.current = layout.bricks;
      voids.current = layout.voids;
      mouthCol.current = layout.mouthCol;
      const mouthX = FIELD_X + layout.mouthCol * CELL + CELL / 2;
      drops.current = [
        { x: mouthX, y: FIELD_BOTTOM - CELL * 2, kind: "add", value: 1 },
        { x: mouthX, y: FIELD_BOTTOM + 6, kind: "mul", value: 2 },
      ];
      shards.current = [];
      floaters.current = [];
      paddleW.current = Math.max(48, 66 - (nextLevel - 1) * 5);
      paddleX.current = mouthX;
      const queued = keepScore ? Math.max(1, 1 + bank.current) : 1;
      if (!keepScore) {
        bank.current = 0;
        scoreRef.current = 0;
        setScore(0);
        livesRef.current = 3;
        setLives(3);
      }
      balls.current = Array.from({ length: queued }, (_, index) => makeBall(true, (index - (queued - 1) / 2) * 0.08));
      statusRef.current = "ready";
      setStatus("ready");
      setBallsHud(queued);
    },
    [makeBall]
  );

  const launch = useCallback(() => {
    if (statusRef.current === "over") {
      startLevel(1, false);
      return;
    }
    if (statusRef.current === "clear") return;
    if (statusRef.current === "pause") {
      statusRef.current = "play";
      setStatus("play");
      return;
    }
    const glued = balls.current.filter((ball) => ball.glued);
    glued.forEach((ball, index) => {
      ball.glued = false;
      const speed = 5.4 + Math.min(3.4, (levelRef.current - 1) * 0.48);
      const spread = (index - (glued.length - 1) / 2) * 0.12;
      ball.vx = Math.sin(spread) * speed;
      ball.vy = -Math.cos(spread) * speed;
    });
    bank.current = 0;
    statusRef.current = "play";
    setStatus("play");
    syncBallsHud();
  }, [startLevel, syncBallsHud]);

  useEffect(() => {
    startLevel(1, false);
  }, [startLevel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.current.left = e.type === "keydown";
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.current.right = e.type === "keydown";
      if (e.type === "keydown") {
        if (e.code === "Space") {
          e.preventDefault();
          launch();
        }
        if (e.key === "p" || e.key === "P") {
          if (statusRef.current === "play") {
            statusRef.current = "pause";
            setStatus("pause");
          } else if (statusRef.current === "pause") {
            statusRef.current = "play";
            setStatus("play");
          }
        }
        if (e.key === "r" || e.key === "R") startLevel(1, false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [launch, startLevel]);

  const pointerToPaddle = useCallback((clientX: number, target: HTMLCanvasElement) => {
    const rect = target.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    paddleX.current = clamp(x, paddleMin(), paddleMax());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const burst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        shards.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.8) * 5,
          life: 1,
          color,
        });
      }
    };

    const float = (x: number, y: number, text: string, color: string) => {
      floaters.current.push({ x, y, text, life: 1, color });
    };

    const addBalls = (count: number, fromX: number, fromY: number) => {
      const room = Math.max(0, MAX_BALLS - balls.current.length);
      const n = Math.min(count, room);
      for (let i = 0; i < n; i++) {
        const spread = ((i + 1) / (n + 1) - 0.5) * 0.9;
        const ball = makeBall(false, spread);
        ball.x = fromX;
        ball.y = Math.min(fromY, PADDLE_Y - 18);
        balls.current.push(ball);
      }
    };

    const multiplyBalls = (factor: number) => {
      const live = balls.current.filter((ball) => !ball.glued && ball.y < H);
      const extras: Ball[] = [];
      for (const ball of live) {
        for (let i = 1; i < factor; i++) {
          if (balls.current.length + extras.length >= MAX_BALLS) break;
          const tilt = (i % 2 === 0 ? 1 : -1) * (0.28 + i * 0.08);
          const speed = Math.hypot(ball.vx, ball.vy) || 5;
          const angle = Math.atan2(ball.vy, ball.vx) + tilt;
          extras.push({
            x: ball.x,
            y: ball.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            glued: false,
          });
        }
      }
      balls.current.push(...extras);
    };

    const tick = (now: number) => {
      const dt = Math.min(1.55, (now - (last.current || now)) / 16.67);
      last.current = now;

      ctx.fillStyle = "#07060a";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#3f3f46";
      ctx.fillRect(0, 0, W, WALL);
      ctx.fillRect(0, H - WALL, W, WALL);
      ctx.fillRect(0, 0, WALL, H);
      ctx.fillRect(W - WALL, 0, WALL, H);

      ctx.fillStyle = "#000000";
      for (const hole of voids.current) {
        ctx.fillRect(FIELD_X + hole.c * CELL, FIELD_Y + hole.r * CELL, CELL, CELL);
      }
      const mouthLeft = FIELD_X + mouthCol.current * CELL;
      ctx.fillRect(mouthLeft, FIELD_BOTTOM, CELL, DOOR_DOWN * CELL);

      if (keys.current.left) paddleX.current -= 8.4 * dt;
      if (keys.current.right) paddleX.current += 8.4 * dt;
      paddleX.current = clamp(paddleX.current, paddleMin(), paddleMax());

      const playing = statusRef.current === "play";

      if (playing) {
        for (const drop of drops.current) drop.y += 2.15 * dt;
        drops.current = drops.current.filter((drop) => {
          const hit =
            drop.y > PADDLE_Y - 14 &&
            drop.y < PADDLE_Y + PADDLE_H + 10 &&
            Math.abs(drop.x - paddleX.current) < paddleW.current / 2 + 12;
          if (!hit) return drop.y < H - WALL;
          if (drop.kind === "add") {
            addBalls(drop.value, paddleX.current, PADDLE_Y - 16);
            float(drop.x, drop.y, `+${drop.value}`, "#86efac");
          } else {
            multiplyBalls(drop.value);
            float(drop.x, drop.y, `x${drop.value}`, "#fde047");
          }
          syncBallsHud();
          return false;
        });

        const hitBrick = (ball: Ball, brick: Brick) => {
          if (brick.bumper) {
            const speed = Math.min(MAX_BALL_SPEED, Math.hypot(ball.vx, ball.vy) * 1.18 || 6);
            const angle = Math.atan2(ball.vy, ball.vx);
            ball.vx = Math.cos(angle) * speed;
            ball.vy = Math.sin(angle) * speed;
            burst(brick.x + brick.w / 2, brick.y + brick.h / 2, "#fbbf24");
            return;
          }
          if (brick.steel) return;
          brick.hp -= 1;
          if (brick.hp <= 0) {
            brick.alive = false;
            scoreRef.current += 40 * levelRef.current;
            setScore(scoreRef.current);
            burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);
            if (Math.random() < 0.16) {
              drops.current.push({
                x: brick.x + brick.w / 2,
                y: brick.y,
                ...dropForLevel(levelRef.current),
              });
            }
          } else {
            brick.color = PURPLE[Math.min(PURPLE.length - 1, brick.hp - 1)];
          }
        };

        const bounceWorld = (ball: Ball) => {
          if (ball.x < WALL + BALL_R) {
            ball.x = WALL + BALL_R;
            if (ball.vx < 0) ball.vx *= -1;
          } else if (ball.x > W - WALL - BALL_R) {
            ball.x = W - WALL - BALL_R;
            if (ball.vx > 0) ball.vx *= -1;
          }
          if (ball.y < WALL + BALL_R) {
            ball.y = WALL + BALL_R;
            if (ball.vy < 0) ball.vy *= -1;
          }
        };

        const bouncePaddle = (ball: Ball) => {
          if (ball.vy <= 0) return;
          if (ball.y + BALL_R < PADDLE_Y || ball.y - BALL_R > PADDLE_Y + PADDLE_H) return;
          if (Math.abs(ball.x - paddleX.current) > paddleW.current / 2 + BALL_R) return;
          const hit = clamp((ball.x - paddleX.current) / (paddleW.current / 2), -1, 1);
          const angle = hit * 1.05;
          const speed = Math.min(MAX_BALL_SPEED, Math.max(3.8, Math.hypot(ball.vx, ball.vy) * 1.01));
          ball.vx = speed * Math.sin(angle);
          ball.vy = -Math.abs(speed * Math.cos(angle));
          ball.y = PADDLE_Y - BALL_R - 0.5;
          stabilizeBall(ball);
        };

        const bounceBricks = (ball: Ball, touched: Set<Brick>) => {
          let best: Brick | null = null;
          let bestPen = -1;
          for (const brick of bricks.current) {
            if (!brick.alive) continue;
            const pen = penetration(ball.x, ball.y, BALL_R, boxOf(brick));
            if (pen > bestPen) {
              bestPen = pen;
              best = brick;
            }
          }
          if (!best || bestPen < 0) return;
          resolveCircleAabb(ball, boxOf(best));
          if (!touched.has(best)) {
            touched.add(best);
            hitBrick(ball, best);
          }
          for (const brick of bricks.current) {
            if (!brick.alive || brick === best) continue;
            if (circleRect(ball.x, ball.y, BALL_R, boxOf(brick))) separateFromBox(ball, boxOf(brick));
          }
          stabilizeBall(ball);
        };

        for (const ball of balls.current) {
          if (ball.glued) {
            ball.x = paddleX.current;
            ball.y = PADDLE_Y - BALL_R - 3;
            continue;
          }
          const travel = Math.hypot(ball.vx, ball.vy) * dt;
          const steps = Math.max(1, Math.ceil(travel / 3.2));
          const stepDt = dt / steps;
          const touched = new Set<Brick>();
          for (let step = 0; step < steps; step++) {
            ball.x += ball.vx * stepDt;
            ball.y += ball.vy * stepDt;
            bounceWorld(ball);
            bouncePaddle(ball);
            bounceBricks(ball, touched);
          }
        }

        const remaining = balls.current.filter((ball) => ball.y < H - WALL + 8);
        if (remaining.length === 0) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          bank.current = 0;
          if (livesRef.current <= 0) {
            statusRef.current = "over";
            setStatus("over");
            setBest((prev) => {
              const next = Math.max(prev, scoreRef.current);
              localStorage.setItem("brickbreak-best", String(next));
              return next;
            });
          } else {
            balls.current = [makeBall(true)];
            statusRef.current = "ready";
            setStatus("ready");
          }
          syncBallsHud();
        } else {
          balls.current = remaining;
        }

        if (bricks.current.every((brick) => !brick.alive || brick.steel)) {
          bank.current = Math.max(0, balls.current.length - 1);
          statusRef.current = "clear";
          setStatus("clear");
        }
      } else {
        for (const ball of balls.current) {
          if (ball.glued) {
            ball.x = paddleX.current;
            ball.y = PADDLE_Y - BALL_R - 3;
          }
        }
      }

      shards.current = shards.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.12 * dt;
        p.life -= 0.03 * dt;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
        return p.life > 0;
      });

      for (const brick of bricks.current) {
        if (!brick.alive) continue;
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        ctx.strokeStyle = brick.steel ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.22)";
        ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
        if (brick.bumper) {
          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.beginPath();
          ctx.moveTo(brick.x + brick.w / 2, brick.y + 3);
          ctx.lineTo(brick.x + brick.w - 3, brick.y + brick.h / 2);
          ctx.lineTo(brick.x + brick.w / 2, brick.y + brick.h - 3);
          ctx.lineTo(brick.x + 3, brick.y + brick.h / 2);
          ctx.closePath();
          ctx.stroke();
        } else if (!brick.steel && brick.hp > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(brick.hp), brick.x + brick.w / 2, brick.y + brick.h / 2 + 3);
        }
      }

      for (const drop of drops.current) {
        const color = drop.kind === "mul" ? "#facc15" : "#4ade80";
        ctx.beginPath();
        ctx.arc(drop.x, drop.y + 8, 11, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.stroke();
        ctx.fillStyle = "#111827";
        ctx.font = "bold 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(drop.kind === "mul" ? `x${drop.value}` : `+${drop.value}`, drop.x, drop.y + 12);
      }

      floaters.current = floaters.current.filter((item) => {
        item.y -= 0.7 * dt;
        item.life -= 0.018 * dt;
        ctx.globalAlpha = Math.max(0, item.life);
        ctx.fillStyle = item.color;
        ctx.font = "bold 14px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(item.text, item.x, item.y);
        ctx.globalAlpha = 1;
        return item.life > 0;
      });

      const px = paddleX.current - paddleW.current / 2;
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.roundRect(px, PADDLE_Y, paddleW.current, PADDLE_H, 5);
      ctx.fill();
      ctx.fillStyle = YELLOW;
      ctx.fillRect(px + 6, PADDLE_Y + 3, paddleW.current - 12, 3);

      for (const ball of balls.current) {
        const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
        g.addColorStop(0, "#fff7ed");
        g.addColorStop(1, "#f5c518");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }

      if (statusRef.current !== "play") {
        ctx.fillStyle = "rgba(7,6,10,0.52)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.font = "bold 26px ui-sans-serif, system-ui";
        const copy =
          statusRef.current === "over"
            ? "Gate sealed"
            : statusRef.current === "clear"
              ? "Chamber cleared"
              : statusRef.current === "pause"
                ? "Paused"
                : "BrickBreak";
        ctx.fillText(copy, W / 2, H / 2 - 6);
        ctx.font = "13px ui-sans-serif, system-ui";
        ctx.fillStyle = "#fde68a";
        ctx.fillText(
          statusRef.current === "clear" ? "Launching next chamber" : "Thread the 1-square gate · catch +N / xN",
          W / 2,
          H / 2 + 22
        );
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [makeBall, syncBallsHud]);

  useEffect(() => {
    if (status !== "clear") return;
    const t = window.setTimeout(() => startLevel(levelRef.current + 1), 900);
    return () => window.clearTimeout(t);
  }, [status, startLevel]);

  return (
    <div className="flex flex-col items-center gap-4">
      <GameHud>
        <GameStat label="Score" value={score} accent />
        <GameStat label="Best" value={best} />
        <GameStat label="Balls" value={ballsHud} />
        <GameStat label="Lives" value={lives} />
        <GameStat label="Sector" value={level} />
        <Button size="sm" variant="outline" className="rounded-sm" onClick={() => startLevel(1, false)}>
          Restart
        </Button>
      </GameHud>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="max-w-full cursor-none touch-none rounded-sm border border-yellow-500/30 shadow-[0_0_40px_rgba(245,197,24,0.12)]"
        aria-label="BrickBreak game canvas"
        onMouseMove={(event) => pointerToPaddle(event.clientX, event.currentTarget)}
        onClick={launch}
        onTouchStart={(event) => {
          pointerToPaddle(event.touches[0].clientX, event.currentTarget);
          launch();
        }}
        onTouchMove={(event) => {
          event.preventDefault();
          pointerToPaddle(event.touches[0].clientX, event.currentTarget);
        }}
      />
      <GameTip>One-square gate · zigzag tunnel · yellow baffles · bumper diamonds boost speed</GameTip>
    </div>
  );
}
