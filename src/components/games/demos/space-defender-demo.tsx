"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReportWhen } from "@/components/games/arcade-score";
import { GameTip } from "@/components/games/game-ui";

const W = 400;
const H = 640;
const PLAYER_Y = H - 110;

type Bullet = {
  x: number;
  y: number;
  vy: number;
  friendly: boolean;
  dmg: number;
  kind: "laser" | "missile" | "enemy";
};
type Enemy = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kind: "fighter" | "boss";
  shootCd: number;
  vx: number;
};
type Asteroid = { x: number; y: number; r: number; vy: number; rot: number; vr: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Star = { x: number; y: number; s: number; sp: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function drawShipPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, thrust: number) {
  ctx.save();
  ctx.translate(x, y);

  // thruster glow
  const g = ctx.createRadialGradient(0, 22, 2, 0, 28, 28);
  g.addColorStop(0, `rgba(56,189,248,${0.55 + thrust * 0.35})`);
  g.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 26, 28, 0, Math.PI * 2);
  ctx.fill();

  // wings
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.lineTo(-28, 18);
  ctx.lineTo(-10, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(28, 18);
  ctx.lineTo(10, 14);
  ctx.closePath();
  ctx.fill();

  // body
  const body = ctx.createLinearGradient(0, -24, 0, 20);
  body.addColorStop(0, "#e2e8f0");
  body.addColorStop(0.45, "#94a3b8");
  body.addColorStop(1, "#334155");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(12, 8);
  ctx.lineTo(8, 18);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();

  // cockpit
  ctx.fillStyle = "#38bdf8";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(0, -6, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // engines
  ctx.fillStyle = "#0ea5e9";
  [-7, 0, 7].forEach((ox, i) => {
    ctx.beginPath();
    ctx.moveTo(ox - 3, 16);
    ctx.lineTo(ox + 3, 16);
    ctx.lineTo(ox, 22 + thrust * 6 + (i === 1 ? 4 : 0));
    ctx.closePath();
    ctx.fill();
  });

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const scale = e.kind === "boss" ? 1.7 : 1;

  ctx.scale(scale, scale);

  // red thrusters (facing down visually as engines on top of descending ship)
  ctx.fillStyle = "#fb923c";
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 12;
  [-10, 0, 10].forEach((ox) => {
    ctx.beginPath();
    ctx.moveTo(ox - 3, -18);
    ctx.lineTo(ox + 3, -18);
    ctx.lineTo(ox, -28);
    ctx.closePath();
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // hull
  const hull = ctx.createLinearGradient(0, -16, 0, 16);
  hull.addColorStop(0, "#1e293b");
  hull.addColorStop(1, "#0f172a");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(18, -4);
  ctx.lineTo(12, -16);
  ctx.lineTo(-12, -16);
  ctx.lineTo(-18, -4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // core
  ctx.fillStyle = "#f97316";
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, e.kind === "boss" ? 5 : 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (e.kind === "boss") {
    ctx.fillStyle = "rgba(239,68,68,0.35)";
    ctx.fillRect(-22, 18, 44 * (e.hp / e.maxHp), 3);
  }

  ctx.restore();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.fillStyle = "#78716c";
  ctx.strokeStyle = "#57534e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2;
    const rr = a.r * (0.75 + ((i * 37) % 5) * 0.06);
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function spawnBurst(particles: Particle[], x: number, y: number, color: string, n = 14) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 3.5;
    particles.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: 0.4 + Math.random() * 0.5,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

export default function SpaceDefenderDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ui, setUi] = useState({
    score: 0,
    hp: 100,
    wave: 1,
    enemiesLeft: 0,
    paused: false,
    running: false,
    over: false,
    shield: 2,
    missile: 3,
    lightning: 2,
    nova: 1,
  });
  useReportWhen(ui.over, ui.score);

  const state = useRef({
    playerX: W / 2,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    asteroids: [] as Asteroid[],
    particles: [] as Particle[],
    stars: [] as Star[],
    keys: {} as Record<string, boolean>,
    score: 0,
    hp: 100,
    wave: 1,
    waveQuota: 8,
    spawned: 0,
    spawnCd: 0,
    shootCd: 0,
    invuln: 0,
    shieldActive: 0,
    frame: 0,
    running: false,
    over: false,
    paused: false,
    abilities: { shield: 2, missile: 3, lightning: 2, nova: 1 },
  });

  const syncUi = useCallback(() => {
    const s = state.current;
    setUi({
      score: s.score,
      hp: Math.max(0, Math.round(s.hp)),
      wave: s.wave,
      enemiesLeft: s.enemies.length + Math.max(0, s.waveQuota - s.spawned),
      paused: s.paused,
      running: s.running,
      over: s.over,
      shield: s.abilities.shield,
      missile: s.abilities.missile,
      lightning: s.abilities.lightning,
      nova: s.abilities.nova,
    });
  }, []);

  const reset = useCallback(() => {
    const s = state.current;
    s.playerX = W / 2;
    s.bullets = [];
    s.enemies = [];
    s.particles = [];
    s.asteroids = Array.from({ length: 6 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 10 + Math.random() * 18,
      vy: 0.4 + Math.random() * 0.8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.02,
    }));
    s.stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.6 + Math.random() * 1.8,
      sp: 0.2 + Math.random() * 0.7,
    }));
    s.score = 0;
    s.hp = 100;
    s.wave = 1;
    s.waveQuota = 8;
    s.spawned = 0;
    s.spawnCd = 40;
    s.shootCd = 0;
    s.invuln = 0;
    s.shieldActive = 0;
    s.frame = 0;
    s.running = true;
    s.over = false;
    s.paused = false;
    s.abilities = { shield: 2, missile: 3, lightning: 2, nova: 1 };
    syncUi();
  }, [syncUi]);

  const activateAbility = useCallback(
    (id: "shield" | "missile" | "lightning" | "nova") => {
      const s = state.current;
      if (!s.running || s.over || s.paused) return;
      if (s.abilities[id] <= 0) return;
      s.abilities[id] -= 1;

      if (id === "shield") {
        s.shieldActive = 180;
      } else if (id === "missile") {
        for (const ang of [-0.25, 0, 0.25]) {
          s.bullets.push({
            x: s.playerX + Math.sin(ang) * 8,
            y: PLAYER_Y - 20,
            vy: -7,
            friendly: true,
            dmg: 3,
            kind: "missile",
          });
        }
      } else if (id === "lightning") {
        s.enemies.forEach((e) => {
          e.hp -= 2;
          spawnBurst(s.particles, e.x, e.y, "#67e8f9", 8);
        });
        s.enemies = s.enemies.filter((e) => {
          if (e.hp <= 0) {
            s.score += e.kind === "boss" ? 500 : 100;
            spawnBurst(s.particles, e.x, e.y, "#fb923c", 18);
            return false;
          }
          return true;
        });
      } else if (id === "nova") {
        s.enemies = [];
        s.bullets = s.bullets.filter((b) => b.friendly);
        spawnBurst(s.particles, s.playerX, PLAYER_Y, "#38bdf8", 40);
        spawnBurst(s.particles, s.playerX, PLAYER_Y, "#f97316", 20);
        s.score += 250;
      }
      syncUi();
    },
    [syncUi]
  );

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const s = state.current;
      s.keys[e.key] = true;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (!s.running && !s.over) reset();
        else if (s.over) reset();
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (s.running && !s.over) {
          s.paused = !s.paused;
          syncUi();
        }
      }
      if (e.key === "1") activateAbility("shield");
      if (e.key === "2") activateAbility("missile");
      if (e.key === "3") activateAbility("lightning");
      if (e.key === "4") activateAbility("nova");
      if (e.key === "r" || e.key === "R") reset();
    }
    function up(e: KeyboardEvent) {
      state.current.keys[e.key] = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [reset, syncUi, activateAbility]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    // init ambient once
    if (state.current.stars.length === 0) {
      state.current.stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        s: 0.6 + Math.random() * 1.8,
        sp: 0.2 + Math.random() * 0.7,
      }));
      state.current.asteroids = Array.from({ length: 6 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.7,
        r: 10 + Math.random() * 18,
        vy: 0.35 + Math.random() * 0.7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.02,
      }));
    }

    const loop = () => {
      const s = state.current;
      s.frame++;

      // background nebula
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.45, "#0b1224");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // soft nebula clouds
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      ctx.beginPath();
      ctx.ellipse(W * 0.7, H * 0.25, 120, 60, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(14,165,233,0.06)";
      ctx.beginPath();
      ctx.ellipse(W * 0.2, H * 0.55, 100, 70, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // planet
      const planetX = 70;
      const planetY = H - 40;
      const planetG = ctx.createRadialGradient(planetX - 20, planetY - 30, 10, planetX, planetY, 90);
      planetG.addColorStop(0, "#7dd3fc");
      planetG.addColorStop(0.5, "#0369a1");
      planetG.addColorStop(1, "#0c4a6e");
      ctx.fillStyle = planetG;
      ctx.beginPath();
      ctx.arc(planetX, planetY, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(15,23,42,0.35)";
      ctx.beginPath();
      ctx.arc(planetX + 10, planetY + 10, 85, 0, Math.PI * 2);
      ctx.fill();

      // stars
      s.stars.forEach((st) => {
        st.y += st.sp;
        if (st.y > H) {
          st.y = 0;
          st.x = Math.random() * W;
        }
        ctx.fillStyle = `rgba(226,232,240,${0.4 + (st.s % 1) * 0.5})`;
        ctx.fillRect(st.x, st.y, st.s, st.s);
      });

      // asteroids
      s.asteroids.forEach((a) => {
        a.y += a.vy;
        a.rot += a.vr;
        if (a.y - a.r > H) {
          a.y = -a.r;
          a.x = Math.random() * W;
        }
        drawAsteroid(ctx, a);
      });

      const active = s.running && !s.over && !s.paused;

      if (active) {
        // movement
        const speed = 5.2;
        if (s.keys.ArrowLeft || s.keys.a || s.keys.A) s.playerX -= speed;
        if (s.keys.ArrowRight || s.keys.d || s.keys.D) s.playerX += speed;
        s.playerX = clamp(s.playerX, 28, W - 28);

        // auto fire (arcade twin lasers)
        s.shootCd--;
        if (s.shootCd <= 0) {
          const hold = s.keys[" "] || s.keys.Space;
          s.shootCd = hold ? 7 : 12;
          s.bullets.push({
            x: s.playerX - 6,
            y: PLAYER_Y - 22,
            vy: -10,
            friendly: true,
            dmg: 1,
            kind: "laser",
          });
          s.bullets.push({
            x: s.playerX + 6,
            y: PLAYER_Y - 22,
            vy: -10,
            friendly: true,
            dmg: 1,
            kind: "laser",
          });
        }

        // spawn enemies
        s.spawnCd--;
        if (s.spawnCd <= 0 && s.spawned < s.waveQuota) {
          const isBoss = s.spawned === s.waveQuota - 1 && s.wave % 3 === 0;
          s.enemies.push({
            x: 40 + Math.random() * (W - 80),
            y: -30,
            hp: isBoss ? 18 + s.wave * 2 : 1 + Math.floor(s.wave / 2),
            maxHp: isBoss ? 18 + s.wave * 2 : 1 + Math.floor(s.wave / 2),
            kind: isBoss ? "boss" : "fighter",
            shootCd: 40 + Math.random() * 40,
            vx: (Math.random() - 0.5) * 1.4,
          });
          s.spawned++;
          s.spawnCd = Math.max(18, 50 - s.wave * 2);
        }

        // advance wave
        if (s.spawned >= s.waveQuota && s.enemies.length === 0) {
          s.wave++;
          s.waveQuota = 8 + s.wave * 2;
          s.spawned = 0;
          s.spawnCd = 50;
          s.abilities.shield = Math.min(3, s.abilities.shield + 1);
          s.abilities.missile = Math.min(4, s.abilities.missile + 1);
          spawnBurst(s.particles, W / 2, H / 2, "#38bdf8", 24);
        }

        // bullets update
        s.bullets.forEach((b) => {
          b.y += b.vy;
          if (b.kind === "missile") b.vy -= 0.15;
        });
        s.bullets = s.bullets.filter((b) => b.y > -40 && b.y < H + 40);

        // enemies update
        s.enemies.forEach((e) => {
          e.y += e.kind === "boss" ? 0.7 : 1.4 + Math.min(2, s.wave * 0.08);
          e.x += e.vx;
          if (e.x < 24 || e.x > W - 24) e.vx *= -1;
          e.shootCd--;
          if (e.shootCd <= 0 && e.y > 20 && e.y < PLAYER_Y - 40) {
            e.shootCd = e.kind === "boss" ? 28 : 55 + Math.random() * 30;
            const shots = e.kind === "boss" ? [-1, 0, 1] : [0];
            shots.forEach((dx) => {
              s.bullets.push({
                x: e.x + dx * 10,
                y: e.y + 14,
                vy: 3.2 + Math.min(2, s.wave * 0.1),
                friendly: false,
                dmg: e.kind === "boss" ? 12 : 8,
                kind: "enemy",
              });
            });
          }
        });

        // collisions player bullets vs enemies / asteroids
        s.bullets = s.bullets.filter((b) => {
          if (!b.friendly) return true;
          let hit = false;
          s.enemies = s.enemies.filter((e) => {
            const rad = e.kind === "boss" ? 28 : 16;
            if (Math.hypot(b.x - e.x, b.y - e.y) < rad) {
              e.hp -= b.dmg;
              hit = true;
              spawnBurst(s.particles, b.x, b.y, "#7dd3fc", 6);
              if (e.hp <= 0) {
                s.score += e.kind === "boss" ? 500 : 100;
                spawnBurst(s.particles, e.x, e.y, "#fb923c", 20);
                // chance to "explode asteroid" nearby for flair
                const a = s.asteroids[Math.floor(Math.random() * s.asteroids.length)];
                if (a && Math.random() < 0.35) spawnBurst(s.particles, a.x, a.y, "#f97316", 16);
                return false;
              }
            }
            return true;
          });
          return !hit;
        });

        // enemy bullets vs player
        if (s.invuln > 0) s.invuln--;
        if (s.shieldActive > 0) s.shieldActive--;
        s.bullets = s.bullets.filter((b) => {
          if (b.friendly) return true;
          if (Math.hypot(b.x - s.playerX, b.y - PLAYER_Y) < 20) {
            if (s.shieldActive > 0) {
              spawnBurst(s.particles, b.x, b.y, "#38bdf8", 10);
              return false;
            }
            if (s.invuln <= 0) {
              s.hp -= b.dmg;
              s.invuln = 35;
              spawnBurst(s.particles, s.playerX, PLAYER_Y, "#f87171", 12);
              if (s.hp <= 0) {
                s.hp = 0;
                s.over = true;
                s.running = false;
                spawnBurst(s.particles, s.playerX, PLAYER_Y, "#f97316", 36);
              }
            }
            return false;
          }
          return true;
        });

        // enemy ram
        s.enemies = s.enemies.filter((e) => {
          if (e.y > H + 40) return false;
          if (Math.hypot(e.x - s.playerX, e.y - PLAYER_Y) < (e.kind === "boss" ? 34 : 24)) {
            if (s.shieldActive <= 0 && s.invuln <= 0) {
              s.hp -= e.kind === "boss" ? 25 : 15;
              s.invuln = 40;
              if (s.hp <= 0) {
                s.hp = 0;
                s.over = true;
                s.running = false;
              }
            }
            spawnBurst(s.particles, e.x, e.y, "#fb923c", 14);
            return e.kind === "boss";
          }
          return true;
        });

        if (s.frame % 12 === 0) syncUi();
      }

      // particles
      s.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vy += 0.02;
      });
      s.particles = s.particles.filter((p) => p.life > 0);
      s.particles.forEach((p) => {
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // draw enemies
      s.enemies.forEach((e) => drawEnemy(ctx, e));

      // bullets
      s.bullets.forEach((b) => {
        if (b.friendly) {
          ctx.save();
          ctx.strokeStyle = b.kind === "missile" ? "#fbbf24" : "#67e8f9";
          ctx.shadowColor = b.kind === "missile" ? "#f59e0b" : "#22d3ee";
          ctx.shadowBlur = 10;
          ctx.lineWidth = b.kind === "missile" ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y + 8);
          ctx.lineTo(b.x, b.y - 10);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = "#fb923c";
          ctx.shadowColor = "#ea580c";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // player
      if (!s.over) {
        if (s.shieldActive > 0) {
          ctx.save();
          ctx.strokeStyle = "rgba(56,189,248,0.75)";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 16;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.playerX, PLAYER_Y, 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        const blink = s.invuln > 0 && Math.floor(s.frame / 3) % 2 === 0;
        if (!blink) drawShipPlayer(ctx, s.playerX, PLAYER_Y, active ? 1 : 0.4);
      }

      // ─── HUD ───────────────────────────────────────────
      // Title
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 12;
      ctx.fillText("SPACE", W / 2, 36);
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("◆  DEFENDER  ◆", W / 2, 54);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Top left player panel
      ctx.fillStyle = "rgba(15,23,42,0.55)";
      roundRect(ctx, 12, 68, 118, 48, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.35)";
      ctx.stroke();
      // mini ship icon
      ctx.save();
      ctx.translate(28, 88);
      ctx.scale(0.45, 0.45);
      drawShipPlayer(ctx, 0, 0, 0.5);
      ctx.restore();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("PLAYER 1", 46, 84);
      // xp/energy bar
      ctx.fillStyle = "rgba(30,41,59,0.9)";
      roundRect(ctx, 46, 90, 72, 6, 3);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      roundRect(ctx, 46, 90, 72 * clamp(s.hp / 100, 0, 1), 6, 3);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.fillText(s.score.toLocaleString("en-US"), 46, 110);

      // Top right wave panel
      ctx.fillStyle = "rgba(15,23,42,0.55)";
      roundRect(ctx, W - 130, 68, 100, 48, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.35)";
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillText(`WAVE ${s.wave}`, W - 40, 86);
      ctx.fillStyle = "#f87171";
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillText("ENEMIES LEFT", W - 40, 100);
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(
        String(s.enemies.length + Math.max(0, s.waveQuota - s.spawned)),
        W - 40,
        116
      );

      // Pause button
      ctx.fillStyle = "rgba(15,23,42,0.7)";
      roundRect(ctx, W - 36, 14, 24, 24, 6);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(W - 28, 20, 3, 12);
      ctx.fillRect(W - 21, 20, 3, 12);

      // Bottom HP bar
      ctx.fillStyle = "rgba(15,23,42,0.65)";
      roundRect(ctx, 70, H - 42, W - 140, 16, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(56,189,248,0.4)";
      ctx.stroke();
      const hpW = (W - 144) * clamp(s.hp / 100, 0, 1);
      const hpG = ctx.createLinearGradient(72, 0, 72 + hpW, 0);
      hpG.addColorStop(0, "#0ea5e9");
      hpG.addColorStop(1, "#67e8f9");
      ctx.fillStyle = hpG;
      roundRect(ctx, 72, H - 40, Math.max(0, hpW), 12, 6);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "700 10px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("HP", 78, H - 30);

      // Ability buttons
      const abs = [
        { x: 28, icon: "shield", n: s.abilities.shield, key: "1" },
        { x: 68, icon: "missile", n: s.abilities.missile, key: "2" },
        { x: W - 68, icon: "bolt", n: s.abilities.lightning, key: "3" },
        { x: W - 28, icon: "nova", n: s.abilities.nova, key: "4" },
      ] as const;
      abs.forEach((ab) => {
        ctx.beginPath();
        ctx.fillStyle = "rgba(15,23,42,0.75)";
        ctx.arc(ab.x, H - 72, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ab.n > 0 ? "#38bdf8" : "#334155";
        ctx.lineWidth = 2;
        ctx.shadowColor = ab.n > 0 ? "#38bdf8" : "transparent";
        ctx.shadowBlur = ab.n > 0 ? 10 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = ab.n > 0 ? "#7dd3fc" : "#64748b";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        const glyph =
          ab.icon === "shield" ? "🛡️" : ab.icon === "missile" ? "🚀" : ab.icon === "bolt" ? "⚡" : "💥";
        ctx.fillText(glyph, ab.x, H - 67);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "700 10px system-ui, sans-serif";
        ctx.fillText(String(ab.n), ab.x, H - 48);
      });

      // overlays
      if (!s.running && !s.over) {
        ctx.fillStyle = "rgba(2,6,23,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("SPACE DEFENDER", W / 2, H / 2 - 10);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("Press Space to deploy", W / 2, H / 2 + 18);
      }
      if (s.paused) {
        ctx.fillStyle = "rgba(2,6,23,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#67e8f9";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText("PAUSED", W / 2, H / 2);
      }
      if (s.over) {
        ctx.fillStyle = "rgba(2,6,23,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#fb7185";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.fillText("HULL DESTROYED", W / 2, H / 2 - 8);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(`Score ${s.score.toLocaleString("en-US")} · Space to retry`, W / 2, H / 2 + 22);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reset, syncUi]);

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const s = state.current;

    // pause button
    if (x >= W - 36 && x <= W - 12 && y >= 14 && y <= 38) {
      if (s.running && !s.over) {
        s.paused = !s.paused;
        syncUi();
      }
      return;
    }

    // abilities
    const hits: { x: number; id: "shield" | "missile" | "lightning" | "nova" }[] = [
      { x: 28, id: "shield" },
      { x: 68, id: "missile" },
      { x: W - 68, id: "lightning" },
      { x: W - 28, id: "nova" },
    ];
    for (const h of hits) {
      if (Math.hypot(x - h.x, y - (H - 72)) < 20) {
        activateAbility(h.id);
        return;
      }
    }

    if (!s.running) reset();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="rounded-sm" onClick={reset}>
          {ui.running ? "Restart" : "Deploy"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-sm"
          onClick={() => {
            const s = state.current;
            if (s.running && !s.over) {
              s.paused = !s.paused;
              syncUi();
            }
          }}
        >
          {ui.paused ? "Resume" : "Pause"}
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={onCanvasClick}
        className="max-w-full cursor-crosshair rounded-xl border border-sky-400/30 shadow-[0_0_50px_rgba(56,189,248,0.18)]"
        aria-label="Space Defender game"
      />

      <GameTip>
        ← → move · hold Space rapid fire · 1 Shield · 2 Missiles · 3 Lightning · 4 Nova · P pause
      </GameTip>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
