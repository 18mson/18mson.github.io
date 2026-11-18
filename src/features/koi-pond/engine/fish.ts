import { N, PM, TAU, WIDTH } from "./constants";
import { clamp, rand, wrapAngle } from "./math";
import type { Fish, Pellet, Vec } from "./types";
import { VARIETIES } from "./varieties";

/** Kurva tertutup halus melalui titik-titik kontur. */
export const trace = (ctx: CanvasRenderingContext2D, pts: Vec[]) => {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.closePath();
};

export const spawnFish = (w: number, h: number, scale: number): Fish => {
  const variety = VARIETIES[Math.floor(Math.random() * VARIETIES.length)];
  const baseLen = rand(100, 140);
  const len = baseLen * scale;
  const heading = rand(0, TAU);
  const x = rand(0.1, 0.9) * w;
  const y = rand(0.1, 0.9) * h;
  const spacing = len / (N - 1);
  const mk = () => Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  const pts = mk().map((_, i) => ({
    x: x - Math.cos(heading) * i * spacing,
    y: y - Math.sin(heading) * i * spacing,
  }));
  return {
    pts,
    draw: mk(),
    ang: new Array(N).fill(heading),
    nx: new Array(N).fill(0),
    ny: new Array(N).fill(0),
    outline: Array.from({ length: N * 2 + 1 }, () => ({ x: 0, y: 0 })),
    heading,
    v: 0,
    baseLen,
    len,
    spacing,
    phase: rand(0, TAU),
    cruise: rand(46, 78),
    chase: rand(150, 210),
    boost: 0,
    orbit: Math.random() < 0.5 ? -1 : 1,
    wp: null,
    wpUntil: 0,
    variety,
    patches: variety.patches().map((d) => ({
      ...d,
      pts: Array.from({ length: PM * 2 - 2 }, () => ({ x: 0, y: 0 })),
      wob: Array.from({ length: PM }, () => rand(0.78, 1.22)),
    })),
  };
};

/** Bentuk ulang tiap corak di sepanjang tulang, jadi ikut melengkung saat ikan berbelok. */
export const updatePatches = (f: Fish, hw: number) => {
  for (const p of f.patches) {
    const t0 = clamp(p.t - p.rx, 0, 1);
    const t1 = clamp(p.t + p.rx, 0, 1);
    const hf = clamp(p.ry / 0.095, 0.25, 1.4);
    for (let j = 0; j < PM; j++) {
      const s = j / (PM - 1);
      const env = Math.pow(Math.sin(Math.PI * s), 0.7) * p.wob[j];
      const ft = (t0 + (t1 - t0) * s) * (N - 1);
      const i = Math.min(N - 2, Math.floor(ft));
      const k = ft - i;
      const x = f.draw[i].x * (1 - k) + f.draw[i + 1].x * k;
      const y = f.draw[i].y * (1 - k) + f.draw[i + 1].y * k;
      const nx = f.nx[i] * (1 - k) + f.nx[i + 1] * k;
      const ny = f.ny[i] * (1 - k) + f.ny[i + 1] * k;
      const w = (WIDTH[i] * (1 - k) + WIDTH[i + 1] * k) * hw;
      const top = (p.off + hf * env) * w;
      p.pts[j].x = x + nx * top;
      p.pts[j].y = y + ny * top;
      if (j > 0 && j < PM - 1) {
        const bot = (p.off - hf * env) * w;
        const q = p.pts[PM * 2 - 2 - j];
        q.x = x + nx * bot;
        q.y = y + ny * bot;
      }
    }
  }
};

export const updateFish = ({
  f,
  dt,
  w,
  h,
  scale,
  speed,
  t,
  pointer,
  pellets,
  allFish,
  onEatPellet,
}: {
  f: Fish;
  dt: number;
  w: number;
  h: number;
  scale: number;
  speed: number;
  t: number;
  pointer: { x: number; y: number; inside: boolean; lastMove: number };
  pellets: Pellet[];
  allFish: Fish[];
  onEatPellet: (x: number, y: number) => void;
}) => {
  const head = f.pts[0];
  const sc = scale * speed;
  const see = 340 * scale + f.len;
  const ptr = pointer;

  let tx = 0;
  let ty = 0;
  let speedT = f.cruise * sc;
  let hasTarget = false;

  // 1) Pakan terdekat
  let best: Pellet | undefined;
  let bestD = see;
  for (const pl of pellets) {
    if (!pl.landed) continue;
    const d = Math.hypot(pl.x - head.x, pl.y - head.y);
    if (d < bestD) {
      bestD = d;
      best = pl;
    }
  }

  if (best) {
    tx = best.x;
    ty = best.y;
    speedT = f.chase * sc;
    hasTarget = true;
    const mx = head.x + Math.cos(f.heading) * f.len * 0.05;
    const my = head.y + Math.sin(f.heading) * f.len * 0.05;
    if (Math.hypot(best.x - mx, best.y - my) < f.len * 0.13) {
      const idx = pellets.indexOf(best);
      if (idx !== -1) pellets.splice(idx, 1);
      onEatPellet(best.x, best.y);
      f.boost = 1;
    }
  } else if (ptr.inside && t - ptr.lastMove < 2.2) {
    // 2) Tertarik ke kursor, lalu berputar pelan di sekitarnya
    const d = Math.hypot(ptr.x - head.x, ptr.y - head.y);
    if (d < see * 1.3) {
      if (d > f.len * 0.9) {
        tx = ptr.x;
        ty = ptr.y;
        speedT = (f.cruise + (f.chase - f.cruise) * 0.6) * sc;
      } else {
        const a = Math.atan2(head.y - ptr.y, head.x - ptr.x) + f.orbit * 1.1;
        tx = ptr.x + Math.cos(a) * f.len * 0.9;
        ty = ptr.y + Math.sin(a) * f.len * 0.9;
        speedT = f.cruise * 0.7 * sc;
      }
      hasTarget = true;
    }
  }

  // 3) Berkeliling ke titik acak
  if (!hasTarget) {
    const m = Math.min(f.len * 0.9, w * 0.2, h * 0.2);
    if (!f.wp || t > f.wpUntil || Math.hypot(f.wp.x - head.x, f.wp.y - head.y) < f.len * 0.7) {
      f.wp = { x: rand(m, w - m), y: rand(m, h - m) };
      f.wpUntil = t + rand(4, 9);
    }
    tx = f.wp.x;
    ty = f.wp.y;
  }

  let dx = tx - head.x;
  let dy = ty - head.y;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;

  // Menjauh dari ikan lain
  const sepR = f.len * 0.9;
  for (const o of allFish) {
    if (o === f) continue;
    const ox = head.x - o.pts[0].x;
    const oy = head.y - o.pts[0].y;
    const d = Math.hypot(ox, oy);
    if (d < sepR && d > 0.001) {
      const k = (1 - d / sepR) * 1.6;
      dx += (ox / d) * k;
      dy += (oy / d) * k;
    }
  }

  // Menjauh dari tepi
  const wm = f.len * 1.1;
  if (head.x < wm) dx += ((wm - head.x) / wm) * 2;
  if (head.x > w - wm) dx -= ((head.x - (w - wm)) / wm) * 2;
  if (head.y < wm) dy += ((wm - head.y) / wm) * 2;
  if (head.y > h - wm) dy -= ((head.y - (h - wm)) / wm) * 2;

  // Belok halus
  const desired = Math.atan2(dy, dx);
  const maxTurn = 2.4 * dt;
  f.heading += clamp(wrapAngle(desired - f.heading) * Math.min(1, dt * 3.5), -maxTurn, maxTurn);

  // Kecepatan
  f.v += (speedT * (1 + f.boost * 0.35) - f.v) * Math.min(1, dt * 2.2);
  f.boost = Math.max(0, f.boost - dt * 1.2);

  head.x = clamp(head.x + Math.cos(f.heading) * f.v * dt, 0, w);
  head.y = clamp(head.y + Math.sin(f.heading) * f.v * dt, 0, h);

  // Tulang mengikuti kepala
  for (let i = 1; i < N; i++) {
    const a = f.pts[i - 1];
    const b = f.pts[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const d = Math.hypot(vx, vy) || 0.0001;
    b.x = a.x + (vx / d) * f.spacing;
    b.y = a.y + (vy / d) * f.spacing;
  }

  // Gelombang renang + kontur badan
  f.phase += dt * (2.4 + (f.v / scale) * 0.05);
  const energy = Math.min(1, f.v / (f.chase * sc));
  const amp = f.len * 0.045 * (0.35 + energy * 0.75);
  const hw = f.len * 0.095;
  const o = f.outline;
  for (let i = 0; i < N; i++) {
    const prev = f.pts[Math.max(0, i - 1)];
    const next = f.pts[Math.min(N - 1, i + 1)];
    const a = Math.atan2(prev.y - next.y, prev.x - next.x);
    f.ang[i] = a;
    const tVal = i / (N - 1);
    const off = Math.sin(f.phase - i * 0.62) * amp * (0.25 + 0.75 * tVal);
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    f.nx[i] = nx;
    f.ny[i] = ny;
    const d = f.draw[i];
    d.x = f.pts[i].x + nx * off;
    d.y = f.pts[i].y + ny * off;
    const wVal = WIDTH[i] * hw;
    o[1 + i].x = d.x + nx * wVal;
    o[1 + i].y = d.y + ny * wVal;
    o[N * 2 - i].x = d.x - nx * wVal;
    o[N * 2 - i].y = d.y - ny * wVal;
  }
  o[0].x = f.draw[0].x + Math.cos(f.ang[0]) * f.len * 0.06;
  o[0].y = f.draw[0].y + Math.sin(f.ang[0]) * f.len * 0.06;

  updatePatches(f, hw);
};

export const drawTail = (ctx: CanvasRenderingContext2D, f: Fish, energy: number) => {
  const b = f.draw[N - 1];
  const dir = f.ang[N - 1] + Math.PI + Math.sin(f.phase - N * 0.62 - 0.4) * 0.45 * (0.4 + energy * 0.6);
  const lt = f.len * 0.34;
  const spread = 0.5;
  const at = (a: number, d: number): Vec => ({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d });

  const tipL = at(dir - spread, lt);
  const tipR = at(dir + spread, lt);
  const notch = at(dir, lt * 0.55);
  const cL = at(dir - spread * 0.3, lt * 0.75);
  const cR = at(dir + spread * 0.3, lt * 0.75);
  const concave = (p: Vec): Vec => {
    const mx = (p.x + notch.x) / 2;
    const my = (p.y + notch.y) / 2;
    return { x: mx + (b.x - mx) * 0.25, y: my + (b.y - my) * 0.25 };
  };
  const nL = concave(tipL);
  const nR = concave(tipR);

  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.quadraticCurveTo(cL.x, cL.y, tipL.x, tipL.y);
  ctx.quadraticCurveTo(nL.x, nL.y, notch.x, notch.y);
  ctx.quadraticCurveTo(nR.x, nR.y, tipR.x, tipR.y);
  ctx.quadraticCurveTo(cR.x, cR.y, b.x, b.y);
  ctx.closePath();
  ctx.fillStyle = f.variety.fin;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,42,44,0.10)";
  ctx.stroke();
};

export const drawFish = (ctx: CanvasRenderingContext2D, f: Fish, scale: number, speed: number) => {
  const hw = f.len * 0.095;
  const energy = Math.min(1, f.v / (f.chase * scale * speed));

  drawTail(ctx, f, energy);

  // Sirip dada
  ctx.fillStyle = f.variety.fin;
  for (const side of [-1, 1]) {
    const i = 2;
    const d = f.draw[i];
    const a = f.ang[i];
    const w = WIDTH[i] * hw * 0.9;
    const bx = d.x + Math.cos(a + Math.PI / 2) * side * w;
    const by = d.y + Math.sin(a + Math.PI / 2) * side * w;
    const fa = a + side * (Math.PI / 2 + 0.9 + 0.22 * Math.sin(f.phase * 1.3 + side));
    const fl = f.len * 0.17;
    ctx.beginPath();
    ctx.ellipse(bx + Math.cos(fa) * fl * 0.5, by + Math.sin(fa) * fl * 0.5, fl * 0.5, f.len * 0.04, fa, 0, TAU);
    ctx.fill();
  }

  // Badan
  trace(ctx, f.outline);
  ctx.fillStyle = f.variety.base;
  ctx.fill();

  // Corak mengikuti lengkung badan dan dipotong di tepi badan
  ctx.save();
  ctx.clip();
  for (const p of f.patches) {
    trace(ctx, p.pts);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.restore();

  // Garis tepi tipis supaya ikan putih tetap terlihat di air terang
  trace(ctx, f.outline);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,42,44,0.16)";
  ctx.stroke();

  // Mata
  ctx.fillStyle = "rgba(20,40,42,0.85)";
  for (const side of [-1, 1]) {
    const a = f.ang[1];
    const w = WIDTH[1] * hw * 0.55;
    ctx.beginPath();
    ctx.arc(
      f.draw[1].x + Math.cos(a + Math.PI / 2) * side * w,
      f.draw[1].y + Math.sin(a + Math.PI / 2) * side * w,
      Math.max(1.2, f.len * 0.014),
      0,
      TAU,
    );
    ctx.fill();
  }
};
