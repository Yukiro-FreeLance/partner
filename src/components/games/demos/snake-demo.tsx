"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bomb as LuBomb,
  Magnet as LuMagnet,
  Menu as LuMenu,
  Shield as LuShield,
  Wifi as LuWifi,
  Zap as LuZap,
  ChevronUp as LuChevronUp,
  ChevronDown as LuChevronDown,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
} from "lucide-react";
import { useReportWhen } from "@/components/games/arcade-score";

const W = 640;
const H = 420;
const CELL = 14;
const COLS = Math.floor(W / CELL);
const ROWS = Math.floor(H / CELL);
const MATCH_SECONDS = 205; // 03:25

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type PowerKind = "shield" | "speed" | "magnet" | "bomb";

type BotProfile = {
  id: string;
  name: string;
  color: string;
  glow: string;
};

const BOTS: BotProfile[] = [
  { id: "cyberx", name: "CyberX", color: "#ff3b5c", glow: "#ff6b81" },
  { id: "shadow", name: "Shadow77", color: "#ff8a1f", glow: "#ffb347" },
  { id: "viper", name: "NeonViper", color: "#b44bff", glow: "#d580ff" },
  { id: "fang", name: "NightFang", color: "#7CFF3B", glow: "#b6ff7a" },
];

const ORB_COLORS = ["#ff4d6d", "#ff8fab", "#ff9f1c", "#ffe66d", "#7CFF3B", "#4cc9f0", "#b44bff"];

const POWER_META: Record<PowerKind, { color: string; label: string }> = {
  shield: { color: "#3b82f6", label: "SHIELD" },
  speed: { color: "#22c55e", label: "SPEED" },
  magnet: { color: "#a855f7", label: "MAGNET" },
  bomb: { color: "#ef4444", label: "BOMB" },
};

type SnakeEntity = {
  id: string;
  name: string;
  color: string;
  glow: string;
  body: Point[];
  dir: Dir;
  score: number;
  alive: boolean;
  isPlayer: boolean;
  shield: number;
  speed: number;
  magnet: number;
};

type Orb = Point & { color: string; value: number };
type PowerOrb = Point & { kind: PowerKind };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

function opp(d: Dir): Dir {
  return ({ UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" } as const)[d];
}

function step(p: Point, d: Dir): Point {
  switch (d) {
    case "UP":
      return { x: p.x, y: p.y - 1 };
    case "DOWN":
      return { x: p.x, y: p.y + 1 };
    case "LEFT":
      return { x: p.x - 1, y: p.y };
    case "RIGHT":
      return { x: p.x + 1, y: p.y };
  }
}

function inBounds(p: Point) {
  return p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;
}

function occupied(snakes: SnakeEntity[], ignoreId?: string) {
  const set = new Set<string>();
  for (const s of snakes) {
    if (!s.alive || s.id === ignoreId) continue;
    for (const b of s.body) set.add(`${b.x},${b.y}`);
  }
  return set;
}

function randomEmpty(blocked: Set<string>): Point {
  for (let i = 0; i < 80; i++) {
    const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!blocked.has(`${p.x},${p.y}`)) return p;
  }
  return { x: 1, y: 1 };
}

function createSnakes(): SnakeEntity[] {
  const player: SnakeEntity = {
    id: "zenia",
    name: "Zenia",
    color: "#38bdf8",
    glow: "#7dd3fc",
    body: [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
      { x: 7, y: 12 },
    ],
    dir: "RIGHT",
    score: 0,
    alive: true,
    isPlayer: true,
    shield: 0,
    speed: 0,
    magnet: 0,
  };

  const starts: Point[] = [
    { x: COLS - 8, y: 6 },
    { x: COLS - 10, y: ROWS - 8 },
    { x: 8, y: ROWS - 7 },
    { x: Math.floor(COLS / 2), y: 5 },
  ];

  const bots = BOTS.map((b, i) => {
    const head = starts[i];
    return {
      id: b.id,
      name: b.name,
      color: b.color,
      glow: b.glow,
      body: [head, { x: head.x - 1, y: head.y }, { x: head.x - 2, y: head.y }],
      dir: "LEFT" as Dir,
      score: 1200 + i * 340,
      alive: true,
      isPlayer: false,
      shield: 0,
      speed: 0,
      magnet: 0,
    };
  });

  return [player, ...bots];
}

function spawnOrbs(snakes: SnakeEntity[], count: number): Orb[] {
  const block = occupied(snakes);
  return Array.from({ length: count }, () => {
    const p = randomEmpty(block);
    block.add(`${p.x},${p.y}`);
    return {
      ...p,
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
      value: 40 + Math.floor(Math.random() * 80),
    };
  });
}

function spawnPowers(snakes: SnakeEntity[], orbs: Orb[]): PowerOrb[] {
  const block = occupied(snakes);
  orbs.forEach((o) => block.add(`${o.x},${o.y}`));
  const kinds: PowerKind[] = ["shield", "speed", "magnet", "bomb"];
  return kinds.map((kind) => {
    const p = randomEmpty(block);
    block.add(`${p.x},${p.y}`);
    return { ...p, kind };
  });
}

function chooseBotDir(snake: SnakeEntity, orbs: Orb[], block: Set<string>): Dir {
  const head = snake.body[0];
  let target = orbs[0];
  let best = Infinity;
  for (const o of orbs) {
    const d = Math.abs(o.x - head.x) + Math.abs(o.y - head.y);
    if (d < best) {
      best = d;
      target = o;
    }
  }
  if (!target) return snake.dir;

  const options: Dir[] = ["UP", "DOWN", "LEFT", "RIGHT"];
  const scored = options
    .filter((d) => d !== opp(snake.dir))
    .map((d) => {
      const n = step(head, d);
      const key = `${n.x},${n.y}`;
      const hit = !inBounds(n) || block.has(key);
      const dist = Math.abs(n.x - target.x) + Math.abs(n.y - target.y);
      return { d, score: hit ? 9999 : dist + Math.random() * 0.4 };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0]?.d ?? snake.dir;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function drawHexGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(80, 140, 255, 0.07)";
  ctx.lineWidth = 1;
  const size = 18;
  for (let y = -size; y < H + size; y += size * 1.5) {
    for (let x = -size; x < W + size; x += size * Math.sqrt(3)) {
      const ox = (Math.floor(y / (size * 1.5)) % 2) * ((size * Math.sqrt(3)) / 2);
      drawHex(ctx, x + ox, y, size);
    }
  }
  ctx.restore();
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: SnakeEntity,
  crown: boolean
) {
  const { body, color, glow, name, score } = snake;
  if (!body.length) return;

  for (let i = body.length - 1; i >= 0; i--) {
    const p = body[i];
    const cx = p.x * CELL + CELL / 2;
    const cy = p.y * CELL + CELL / 2;
    const isHead = i === 0;
    const r = isHead ? CELL * 0.48 : CELL * 0.38;

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = isHead ? 16 : 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - r, cy - r, r * 2, r * 2, isHead ? 5 : 3);
    ctx.fill();

    if (!isHead) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(cx - r + 2, cy - 1, r * 2 - 4, 2);
    }
    ctx.restore();

    if (isHead) {
      // cyber eyes
      ctx.fillStyle = "#fff";
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 2, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#06101c";
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 2, 1, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy - 2, 1, 0, Math.PI * 2);
      ctx.fill();

      // nametag
      ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      const label = `${crown ? "★ " : ""}${name} ${score.toLocaleString("en-US")}`;
      ctx.fillText(label, cx, cy - CELL - 2);
      ctx.shadowBlur = 0;
    }
  }
}

function drawOrb(ctx: CanvasRenderingContext2D, orb: Orb, t: number) {
  const cx = orb.x * CELL + CELL / 2;
  const cy = orb.y * CELL + CELL / 2;
  const pulse = 1 + Math.sin(t * 0.008 + orb.x) * 0.12;
  ctx.save();
  ctx.shadowColor = orb.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = orb.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.2 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPower(ctx: CanvasRenderingContext2D, p: PowerOrb, t: number) {
  const cx = p.x * CELL + CELL / 2;
  const cy = p.y * CELL + CELL / 2;
  const meta = POWER_META[p.kind];
  const pulse = 1 + Math.sin(t * 0.006 + p.x) * 0.08;
  ctx.save();
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 11 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `${meta.color}33`;
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  if (p.kind === "shield") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy - 2);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx - 5, cy - 2);
    ctx.closePath();
    ctx.stroke();
  } else if (p.kind === "speed") {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();
  } else if (p.kind === "magnet") {
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx, cy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export default function SnakeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakesRef = useRef<SnakeEntity[]>(createSnakes());
  const orbsRef = useRef<Orb[]>([]);
  const powersRef = useRef<PowerOrb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const dirQueueRef = useRef<Dir[]>([]);
  const tickAccRef = useRef(0);
  const lastRef = useRef(0);
  const boostRef = useRef(0);
  const runningRef = useRef(true);

  const [hp, setHp] = useState(100);
  const [exp, setExp] = useState(42);
  const [level, setLevel] = useState(15);
  const [coins, setCoins] = useState(2480);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [boost, setBoost] = useState(100);
  const [notify, setNotify] = useState<string | null>(null);
  const [ranking, setRanking] = useState<{ name: string; score: number; color: string; you?: boolean }[]>([]);
  const [minimap, setMinimap] = useState<{ id: string; x: number; y: number; color: string }[]>([]);
  const [alive, setAlive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [ping] = useState(67);
  const hudTickRef = useRef(0);

  const flash = useCallback((msg: string) => {
    setNotify(msg);
    window.setTimeout(() => setNotify(null), 1800);
  }, []);

  const reset = useCallback(() => {
    snakesRef.current = createSnakes();
    orbsRef.current = spawnOrbs(snakesRef.current, 28);
    powersRef.current = spawnPowers(snakesRef.current, orbsRef.current);
    particlesRef.current = [];
    dirQueueRef.current = [];
    boostRef.current = 100;
    runningRef.current = true;
    setHp(100);
    setExp(42);
    setLevel(15);
    setCoins(2480);
    setCombo(0);
    setTimeLeft(MATCH_SECONDS);
    setBoost(100);
    setAlive(true);
    setPaused(false);
    setNotify(null);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (paused || !alive) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          runningRef.current = false;
          setAlive(false);
          flash("MATCH OVER");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, alive, flash]);

  const pushDir = useCallback((next: Dir) => {
    const player = snakesRef.current.find((s) => s.isPlayer);
    if (!player?.alive) return;
    const current = dirQueueRef.current[dirQueueRef.current.length - 1] ?? player.dir;
    if (next === opp(current) || next === current) return;
    if (dirQueueRef.current.length < 2) dirQueueRef.current.push(next);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
        W: "UP",
        S: "DOWN",
        A: "LEFT",
        D: "RIGHT",
      };
      if (e.key === " " || e.key === "Shift") {
        e.preventDefault();
        if (boostRef.current > 12) {
          const p = snakesRef.current.find((s) => s.isPlayer);
          if (p) {
            p.speed = Math.max(p.speed, 90);
            boostRef.current = Math.max(0, boostRef.current - 18);
            setBoost(boostRef.current);
            flash("You got SPEED BOOST!");
          }
        }
        return;
      }
      if (e.key === "p" || e.key === "P") {
        setPaused((v) => !v);
        return;
      }
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      pushDir(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flash, pushDir]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const tickSnakes = () => {
      if (!runningRef.current || paused) return;

      const snakes = snakesRef.current;
      const player = snakes.find((s) => s.isPlayer)!;

      if (dirQueueRef.current.length) {
        player.dir = dirQueueRef.current.shift()!;
      }

      // magnet pulls nearest orbs
      if (player.magnet > 0 && player.alive) {
        const head = player.body[0];
        orbsRef.current = orbsRef.current.map((o) => {
          const dx = head.x - o.x;
          const dy = head.y - o.y;
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist > 0 && dist <= 5) {
            return {
              ...o,
              x: o.x + Math.sign(dx),
              y: o.y + Math.sign(dy),
            };
          }
          return o;
        });
      }

      const blockBase = occupied(snakes);

      for (const snake of snakes) {
        if (!snake.alive) continue;
        if (!snake.isPlayer) {
          snake.dir = chooseBotDir(snake, orbsRef.current, blockBase);
        }

        const head = step(snake.body[0], snake.dir);
        const key = `${head.x},${head.y}`;
        const wall = !inBounds(head);
        const selfHit = snake.body.slice(0, -1).some((b) => b.x === head.x && b.y === head.y);
        const others = occupied(
          snakes.filter((s) => s.id !== snake.id),
        );
        const otherHit = others.has(key);

        if (wall || selfHit || otherHit) {
          if (snake.shield > 0) {
            snake.shield = 0;
          } else if (snake.isPlayer) {
            setHp((h) => {
              const nh = Math.max(0, h - 18);
              if (nh <= 0) {
                snake.alive = false;
                runningRef.current = false;
                setAlive(false);
                flash("SIGNAL LOST");
              }
              return nh;
            });
            setCombo(0);
            // bounce: don't move into death immediately if still alive
            if (snake.alive) continue;
          } else {
            snake.alive = false;
            continue;
          }
        }

        if (!snake.alive) continue;

        snake.body.unshift(head);
        // rebuild block for subsequent snakes
        blockBase.add(key);

        // orbs
        const orbIdx = orbsRef.current.findIndex((o) => o.x === head.x && o.y === head.y);
        if (orbIdx >= 0) {
          const orb = orbsRef.current[orbIdx];
          orbsRef.current.splice(orbIdx, 1);
          snake.score += orb.value;
          particlesRef.current.push(
            ...Array.from({ length: 8 }, () => ({
              x: head.x * CELL + CELL / 2,
              y: head.y * CELL + CELL / 2,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 1,
              color: orb.color,
            }))
          );
          if (snake.isPlayer) {
            setCombo((c) => c + 1);
            setExp((e) => {
              const next = e + 6;
              if (next >= 100) {
                setLevel((l) => l + 1);
                return next - 100;
              }
              return next;
            });
            setCoins((c) => c + Math.floor(orb.value / 4));
            boostRef.current = Math.min(100, boostRef.current + 3);
            setBoost(boostRef.current);
          }
          // grow
          if (orbsRef.current.length < 18) {
            orbsRef.current.push(...spawnOrbs(snakes, 1));
          }
        } else {
          snake.body.pop();
        }

        // powers
        const pIdx = powersRef.current.findIndex((p) => p.x === head.x && p.y === head.y);
        if (pIdx >= 0) {
          const power = powersRef.current[pIdx];
          powersRef.current.splice(pIdx, 1);
          if (power.kind === "shield") snake.shield = 180;
          if (power.kind === "speed") snake.speed = 120;
          if (power.kind === "magnet") snake.magnet = 140;
          if (power.kind === "bomb") {
            // destroy nearby orbs into score burst + hurt nearby bots lightly
            orbsRef.current = orbsRef.current.filter((o) => {
              const near = Math.abs(o.x - head.x) + Math.abs(o.y - head.y) <= 3;
              if (near && snake.isPlayer) snake.score += o.value;
              return !near;
            });
          }
          if (snake.isPlayer) flash(`You got ${POWER_META[power.kind].label}!`);
          window.setTimeout(() => {
            const block = occupied(snakesRef.current);
            orbsRef.current.forEach((o) => block.add(`${o.x},${o.y}`));
            powersRef.current.forEach((p) => block.add(`${p.x},${p.y}`));
            const spot = randomEmpty(block);
            powersRef.current.push({ ...spot, kind: power.kind });
          }, 4500);
        }

        if (snake.shield > 0) snake.shield -= 1;
        if (snake.speed > 0) snake.speed -= 1;
        if (snake.magnet > 0) snake.magnet -= 1;
      }

      hudTickRef.current += 1;
      if (hudTickRef.current % 3 === 0) {
        const ranks = [...snakes]
          .filter((s) => s.alive || s.isPlayer)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map((s) => ({ name: s.name, score: s.score, color: s.color, you: s.isPlayer }));
        setRanking(ranks);
        setMinimap(
          snakes
            .filter((s) => s.alive)
            .map((s) => ({
              id: s.id,
              x: s.body[0].x,
              y: s.body[0].y,
              color: s.color,
            }))
        );
      }

      // refill orbs
      if (orbsRef.current.length < 16) {
        orbsRef.current.push(...spawnOrbs(snakes, 4));
      }
    };

    const loop = (ts: number) => {
      if (!lastRef.current) lastRef.current = ts;
      const dt = ts - lastRef.current;
      lastRef.current = ts;

      const player = snakesRef.current.find((s) => s.isPlayer);
      const stepMs = player && player.speed > 0 ? 68 : 110;

      if (!paused && runningRef.current) {
        tickAccRef.current += dt;
        while (tickAccRef.current >= stepMs) {
          tickAccRef.current -= stepMs;
          tickSnakes();
        }
        // regen boost slowly
        if (boostRef.current < 100) {
          boostRef.current = Math.min(100, boostRef.current + dt * 0.008);
          if (Math.floor(ts / 250) !== Math.floor((ts - dt) / 250)) setBoost(Math.round(boostRef.current));
        }
      }

      // particles
      particlesRef.current = particlesRef.current
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.04 }))
        .filter((p) => p.life > 0);

      // draw
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 40, W * 0.5, H * 0.5, W * 0.7);
      g.addColorStop(0, "#152038");
      g.addColorStop(0.55, "#0b1220");
      g.addColorStop(1, "#060910");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // bokeh lights
      for (let i = 0; i < 10; i++) {
        const x = ((i * 97) % W) + Math.sin(ts * 0.0003 + i) * 8;
        const y = ((i * 53) % H) + Math.cos(ts * 0.0004 + i) * 6;
        ctx.beginPath();
        ctx.fillStyle = `rgba(120,160,255,${0.03 + (i % 3) * 0.015})`;
        ctx.arc(x, y, 18 + (i % 4) * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      drawHexGrid(ctx);

      for (const orb of orbsRef.current) drawOrb(ctx, orb, ts);
      for (const p of powersRef.current) drawPower(ctx, p, ts);

      const leaderId = [...snakesRef.current].sort((a, b) => b.score - a.score)[0]?.id;
      for (const snake of snakesRef.current) {
        if (!snake.alive && !snake.isPlayer) continue;
        if (!snake.alive && snake.isPlayer) {
          // draw faded corpse
          ctx.globalAlpha = 0.35;
          drawSnake(ctx, snake, snake.id === leaderId);
          ctx.globalAlpha = 1;
        } else {
          drawSnake(ctx, snake, snake.id === leaderId);
          if (snake.shield > 0) {
            const h = snake.body[0];
            ctx.save();
            ctx.strokeStyle = "rgba(59,130,246,0.7)";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#3b82f6";
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, CELL * 0.95, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, flash]);

  const activateBoost = () => {
    if (boostRef.current < 15) return;
    const p = snakesRef.current.find((s) => s.isPlayer);
    if (!p?.alive) return;
    p.speed = Math.max(p.speed, 100);
    boostRef.current = Math.max(0, boostRef.current - 20);
    setBoost(boostRef.current);
    flash("You got SPEED BOOST!");
  };

  const playerScore = ranking.find((r) => r.you)?.score ?? 0;
  useReportWhen(timeLeft === 0, playerScore);

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none overflow-hidden border border-cyan-400/20 bg-[#070b14] text-cyan-50 shadow-[0_0_60px_rgba(56,189,248,0.12)]">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(100,160,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(100,160,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* top HUD */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pt-3 sm:px-4">
        {/* player card */}
        <div className="flex items-start gap-2">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-cyan-400/70 bg-gradient-to-br from-sky-500 to-blue-800 shadow-[0_0_16px_rgba(56,189,248,0.45)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-50" aria-hidden>
              <path
                fill="currentColor"
                d="M12 3c-2 3-5 4-5 7a5 5 0 0 0 10 0c0-3-3-4-5-7zm-3 9.5c.4 2.2 1.5 3.5 3 4.5 1.5-1 2.6-2.3 3-4.5H9z"
              />
            </svg>
            <span className="absolute -bottom-1 rounded bg-cyan-400 px-1 font-mono text-[8px] font-bold text-slate-950">
              Lv.{level}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-semibold tracking-wide text-cyan-100">Zenia</span>
              <span className="font-mono text-[10px] text-amber-300">✦ {coins.toLocaleString("en-US")}</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-6 font-mono text-[8px] text-emerald-400">HP</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-all" style={{ width: `${hp}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 font-mono text-[8px] text-sky-400">EXP</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all" style={{ width: `${exp}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* title + timer */}
        <div className="flex flex-col items-center">
          <h3
            className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-violet-400 bg-clip-text text-sm font-black tracking-[0.18em] text-transparent sm:text-base"
            style={{ textShadow: "0 0 18px rgba(168,85,247,0.35)" }}
          >
            SNAKE ZENIA
          </h3>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-cyan-100 sm:text-xl">
            {formatTime(timeLeft)}
          </p>
        </div>

        {/* net + minimap */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-[10px] text-cyan-200/80">
            <span className="font-mono">{ping}ms</span>
            <LuWifi className="h-3.5 w-3.5 text-emerald-400" />
            <button
              type="button"
              className="rounded border border-cyan-400/30 p-1 hover:bg-cyan-400/10"
              onClick={() => setPaused((p) => !p)}
              aria-label="Menu"
            >
              <LuMenu className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-cyan-400/40 bg-slate-950/80 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            {minimap.map((s) => (
              <span
                key={s.id}
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${(s.x / COLS) * 100}%`,
                  top: `${(s.y / ROWS) * 100}%`,
                  background: s.color,
                  boxShadow: `0 0 6px ${s.color}`,
                }}
              />
            ))}
            <span className="pointer-events-none absolute inset-1 rounded-full border border-cyan-400/20" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-2 grid grid-cols-[auto_1fr] gap-2 px-2 sm:px-3">
        {/* ranking */}
        <aside className="hidden w-32 shrink-0 flex-col border border-cyan-400/20 bg-slate-950/55 p-2 backdrop-blur-sm sm:flex">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300/80">Ranking</p>
          <ol className="space-y-1">
            {ranking.map((r, i) => (
              <li
                key={r.name}
                className={`flex items-center justify-between gap-1 rounded px-1 py-0.5 text-[10px] ${
                  r.you ? "bg-amber-400/15 text-amber-200" : "text-cyan-100/80"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1">
                  <span className="font-mono text-cyan-400/70">#{i + 1}</span>
                  <span className="truncate" style={{ color: r.you ? undefined : r.color }}>
                    {r.name}
                  </span>
                </span>
                <span className="font-mono tabular-nums">{r.score.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ol>
        </aside>

        {/* arena */}
        <div className="relative overflow-hidden border border-cyan-400/25 bg-black/40">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="h-auto w-full"
            role="img"
            aria-label="Snake Zenia arena"
          />

          {notify && (
            <div className="pointer-events-none absolute bottom-14 left-1/2 z-20 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-slate-950/80 px-4 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_20px_rgba(56,189,248,0.35)] backdrop-blur-md">
              {notify.includes("SPEED") ? (
                <>
                  You got <span className="text-lime-300">SPEED BOOST!</span>
                </>
              ) : (
                notify
              )}
            </div>
          )}

          {(paused || !alive) && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/75 backdrop-blur-sm">
              <p className="font-mono text-sm uppercase tracking-[0.25em] text-cyan-200">
                {paused && alive ? "Paused" : "Match Over"}
              </p>
              <p className="text-xs text-cyan-100/70">Score {playerScore.toLocaleString("en-US")}</p>
              <div className="flex gap-2">
                {paused && alive && (
                  <button
                    type="button"
                    onClick={() => setPaused(false)}
                    className="border border-cyan-400/50 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
                  >
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="border border-fuchsia-400/50 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/30"
                >
                  Redeploy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* bottom controls */}
      <div className="relative z-10 mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-3 pb-3 sm:px-4">
        {/* d-pad */}
        <div className="flex justify-start">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <PadButton onClick={() => pushDir("UP")} aria-label="Up">
              <LuChevronUp className="h-4 w-4" />
            </PadButton>
            <span />
            <PadButton onClick={() => pushDir("LEFT")} aria-label="Left">
              <LuChevronLeft className="h-4 w-4" />
            </PadButton>
            <PadButton onClick={() => pushDir("DOWN")} aria-label="Down">
              <LuChevronDown className="h-4 w-4" />
            </PadButton>
            <PadButton onClick={() => pushDir("RIGHT")} aria-label="Right">
              <LuChevronRight className="h-4 w-4" />
            </PadButton>
          </div>
        </div>

        {/* power legend + tip */}
        <div className="hidden flex-col items-center gap-1 sm:flex">
          <div className="flex flex-wrap justify-center gap-2">
            {(Object.keys(POWER_META) as PowerKind[]).map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                style={{ borderColor: `${POWER_META[k].color}88`, color: POWER_META[k].color }}
              >
                {k === "shield" && <LuShield className="h-3 w-3" />}
                {k === "speed" && <LuZap className="h-3 w-3" />}
                {k === "magnet" && <LuMagnet className="h-3 w-3" />}
                {k === "bomb" && <LuBomb className="h-3 w-3" />}
                {POWER_META[k].label}
              </span>
            ))}
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-300/50">
            WASD · Space boost · P pause
          </p>
        </div>

        {/* combo + boost */}
        <div className="flex items-end justify-end gap-3">
          {combo >= 3 && (
            <div className="pb-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]">
                Combo x{combo}
              </p>
              <p className="text-[9px] font-semibold text-amber-300">PERFECT!</p>
            </div>
          )}
          <button
            type="button"
            onClick={activateBoost}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-gradient-to-br from-sky-500/40 to-blue-900/60 shadow-[0_0_22px_rgba(56,189,248,0.45)] transition hover:scale-105 active:scale-95"
            aria-label="Boost"
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2.5" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#67e8f9"
                strokeWidth="2.5"
                strokeDasharray={`${(boost / 100) * 97} 97`}
                strokeLinecap="round"
              />
            </svg>
            <LuZap className="relative h-5 w-5 text-cyan-100" />
          </button>
        </div>
      </div>

      {/* mobile ranking strip */}
      <div className="relative z-10 flex gap-2 overflow-x-auto border-t border-cyan-400/15 px-3 py-2 sm:hidden">
        {ranking.slice(0, 4).map((r, i) => (
          <span
            key={r.name}
            className={`shrink-0 rounded border px-2 py-1 font-mono text-[10px] ${
              r.you ? "border-amber-400/40 text-amber-200" : "border-cyan-400/20 text-cyan-100/80"
            }`}
          >
            #{i + 1} {r.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PadButton({
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/50 bg-sky-500/20 text-cyan-100 shadow-[0_0_12px_rgba(56,189,248,0.25)] active:scale-90"
    >
      {children}
    </button>
  );
}
