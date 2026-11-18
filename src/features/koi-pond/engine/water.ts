import { MAX_RIPPLES, TAU } from "./constants";
import { clamp, rand } from "./math";
import type { Pellet, Ripple } from "./types";

export const dropPellet = (pellets: Pellet[], x: number, y: number) => {
  pellets.push({ x, y, vx: rand(-4, 4), vy: rand(-4, 4), age: 0, life: 9, landed: false });
};

export const addRipple = (
  ripples: Ripple[],
  x: number,
  y: number,
  maxR: number,
  strength: number,
  life: number,
  scale: number,
) => {
  if (ripples.length >= MAX_RIPPLES) ripples.shift();
  ripples.push({ x, y, age: 0, life, maxR: maxR * Math.max(0.7, scale), strength });
};

export const updatePellets = (
  pellets: Pellet[],
  dt: number,
  onLanded: (x: number, y: number) => void,
) => {
  for (let i = pellets.length - 1; i >= 0; i--) {
    const p = pellets[i];
    p.age += dt;
    if (!p.landed && p.age >= 0.35) {
      p.landed = true;
      onLanded(p.x, p.y);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 0.3 * dt;
    p.vy *= 1 - 0.3 * dt;
    if (p.age > p.life) pellets.splice(i, 1);
  }
};

export const updateRipples = (ripples: Ripple[], dt: number) => {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += dt;
    if (r.age >= r.life) ripples.splice(i, 1);
  }
};

export const drawPellets = (ctx: CanvasRenderingContext2D, pellets: Pellet[], scale: number) => {
  for (const p of pellets) {
    const fall = clamp(1 - p.age / 0.35, 0, 1);
    const fade = p.age > p.life - 1.5 ? (p.life - p.age) / 1.5 : 1;
    const r = (2.6 + fall * 2.5) * Math.max(0.8, scale);
    ctx.globalAlpha = clamp(fade, 0, 1) * (0.55 + 0.45 * (1 - fall));
    ctx.fillStyle = "#c07a38";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

export const drawRipples = (ctx: CanvasRenderingContext2D, ripples: Ripple[]) => {
  for (const r of ripples) {
    const p = r.age / r.life;
    const e = 1 - Math.pow(1 - p, 3);
    const R = r.maxR * e;
    const a = Math.pow(1 - p, 1.5) * r.strength;
    for (let k = 0; k < 3; k++) {
      const rr = R - k * r.maxR * 0.13;
      if (rr <= 1) continue;
      const ak = a * (1 - k * 0.28);
      ctx.lineWidth = 1.6 - k * 0.3;
      ctx.strokeStyle = `rgba(12,56,60,${(ak * 0.22).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(r.x + 1.2, r.y + 1.8, rr, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(ak * 0.95).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rr, 0, TAU);
      ctx.stroke();
    }
  }
};
