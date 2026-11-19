import { N, PM, TAU, WIDTH } from "./constants";
import { clamp, rand, wrapAngle } from "./math";
import type { Fish, Pellet, Vec } from "./types";
import { pickVariety, VARIETIES } from "./varieties";

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
  const variety = pickVariety();
  const baseLen = rand(92, 118);
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
    const hf = clamp(p.ry / 0.135, 0.25, 1.4);
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
        tx = ptr.x + Math.cos(a) * f.len * 1.2;
        ty = ptr.y + Math.sin(a) * f.len * 1.2;
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

  // Tulang mengikuti kepala dengan batasan kelengkungan anatomi (mencegah ekor melipat/menumpuk sendiri)
  for (let i = 1; i < N; i++) {
    const prev = f.pts[i - 1];
    const curr = f.pts[i];
    let angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);

    if (i === 1) {
      // Ruas pertama di belakang kepala tidak boleh patah dari heading kepala
      const headBackAngle = f.heading + Math.PI;
      const diff = wrapAngle(angle - headBackAngle);
      const maxNeckDiff = 0.22; // ~12.6 derajat
      angle = headBackAngle + clamp(diff, -maxNeckDiff, maxNeckDiff);
    } else {
      const prevPrev = f.pts[i - 2];
      const prevAngle = Math.atan2(prev.y - prevPrev.y, prev.x - prevPrev.x);
      // Batasi kelengkungan antar ruas tulang berturutan (bagian depan lebih kaku, ekor lebih lentur)
      const maxAngleDiff = 0.14 + 0.12 * (i / (N - 1));
      const diff = wrapAngle(angle - prevAngle);
      angle = prevAngle + clamp(diff, -maxAngleDiff, maxAngleDiff);
    }

    curr.x = prev.x + Math.cos(angle) * f.spacing;
    curr.y = prev.y + Math.sin(angle) * f.spacing;
  }

  // Gelombang renang + kontur badan yang kokoh proporsional
  f.phase += dt * (2.4 + (f.v / scale) * 0.05);
  const energy = Math.min(1, f.v / (f.chase * sc));
  const amp = f.len * 0.038 * (0.35 + energy * 0.75);
  const hw = f.len * 0.135;
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
  o[0].x = f.draw[0].x + Math.cos(f.ang[0]) * f.len * 0.046;
  o[0].y = f.draw[0].y + Math.sin(f.ang[0]) * f.len * 0.046;

  updatePatches(f, hw);
};

export const drawTail = (ctx: CanvasRenderingContext2D, f: Fish, energy: number, hw: number) => {
  const prev = f.draw[N - 2];
  const b = f.draw[N - 1];

  // Arah ekor alami mengikuti tangen ruas tulang belakang terakhir
  const spineAngle = Math.atan2(b.y - prev.y, b.x - prev.x);
  // Ayunan halus elastis (tidak patah/kaku)
  const sway = Math.sin(f.phase - (N - 1) * 0.62) * 0.18 * (0.35 + energy * 0.65);
  const tailDir = spineAngle + sway;

  const bw = WIDTH[N - 1] * hw;
  const nx = f.nx[N - 1];
  const ny = f.ny[N - 1];

  // Bagian ekor yg menyambung ke badan diperkecil/disamakan agar tidak ada tekukan
  const tailBaseW = bw * 0.82;
  const baseL: Vec = { x: b.x + nx * tailBaseW, y: b.y + ny * tailBaseW };
  const baseR: Vec = { x: b.x - nx * tailBaseW, y: b.y - ny * tailBaseW };

  // Ukuran ekor lebih ringkas & ramping (agak tertutup sesuai referensi sumi-e 02 & 04)
  const lt = f.len * 0.34;
  const spread = 0.28;
  const at = (a: number, d: number): Vec => ({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d });

  const tipL = at(tailDir - spread, lt);
  const tipR = at(tailDir + spread, lt);
  const notch = at(tailDir, lt * 0.74);

  // Titik kontrol awal: mengalir ke belakang searah ekor tanpa membengkak ke samping (tanpa tekukan)
  const cp1L = {
    x: baseL.x + Math.cos(tailDir - spread * 0.10) * (lt * 0.32),
    y: baseL.y + Math.sin(tailDir - spread * 0.10) * (lt * 0.32),
  };
  const cp1R = {
    x: baseR.x + Math.cos(tailDir + spread * 0.10) * (lt * 0.32),
    y: baseR.y + Math.sin(tailDir + spread * 0.10) * (lt * 0.32),
  };

  const cL = at(tailDir - spread * 0.35, lt * 0.65);
  const cR = at(tailDir + spread * 0.35, lt * 0.65);

  const inL = at(tailDir - spread * 0.12, lt * 0.88);
  const inR = at(tailDir + spread * 0.12, lt * 0.88);

  ctx.beginPath();
  ctx.moveTo(baseL.x, baseL.y);
  ctx.bezierCurveTo(cp1L.x, cp1L.y, cL.x, cL.y, tipL.x, tipL.y);
  ctx.quadraticCurveTo(inL.x, inL.y, notch.x, notch.y);
  ctx.quadraticCurveTo(inR.x, inR.y, tipR.x, tipR.y);
  ctx.bezierCurveTo(cR.x, cR.y, cp1R.x, cp1R.y, baseR.x, baseR.y);
  ctx.closePath();

  // Warna sirip transparan
  ctx.fillStyle = f.variety.fin;
  ctx.fill();

  // Tekstur sinar sirip halus (fin rays) yang membuat sirip tampak nyata & mengalir
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 0.8;
  for (let r = -2; r <= 2; r++) {
    const rayAngle = tailDir + (r / 2) * (spread * 0.70);
    const rayDist = lt * (r === 0 ? 0.65 : 0.94);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(rayAngle) * rayDist, b.y + Math.sin(rayAngle) * rayDist);
    ctx.stroke();
  }
  ctx.restore();

  // Garis tepi halus berkilau (shimmer highlight) di bagian dalam
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
};

/** Kontur utuh terpadu: badan dan ekor menyambung mulus dalam satu garis kuas tanpa terpotong & tanpa tekukan */
export const traceFishWithTail = (
  ctx: CanvasRenderingContext2D,
  f: Fish,
  energy: number,
  hw: number
) => {
  const o = f.outline;
  const n = o.length;

  const prev = f.draw[N - 2];
  const b = f.draw[N - 1];
  const spineAngle = Math.atan2(b.y - prev.y, b.x - prev.x);
  const sway = Math.sin(f.phase - (N - 1) * 0.62) * 0.18 * (0.35 + energy * 0.65);
  const tailDir = spineAngle + sway;

  const bw = WIDTH[N - 1] * hw;
  const nx = f.nx[N - 1];
  const ny = f.ny[N - 1];

  // Sambungan ekor yang diperkecil & menyatu mulus ke pedunkel badan (tanpa tekukan)
  const tailBaseW = bw * 0.82;
  const baseL: Vec = { x: b.x + nx * tailBaseW, y: b.y + ny * tailBaseW };
  const baseR: Vec = { x: b.x - nx * tailBaseW, y: b.y - ny * tailBaseW };

  const lt = f.len * 0.34;
  const spread = 0.28;
  const at = (a: number, d: number): Vec => ({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d });

  const tipL = at(tailDir - spread, lt);
  const tipR = at(tailDir + spread, lt);
  const notch = at(tailDir, lt * 0.74);

  const cp1L = {
    x: baseL.x + Math.cos(tailDir - spread * 0.10) * (lt * 0.32),
    y: baseL.y + Math.sin(tailDir - spread * 0.10) * (lt * 0.32),
  };
  const cp1R = {
    x: baseR.x + Math.cos(tailDir + spread * 0.10) * (lt * 0.32),
    y: baseR.y + Math.sin(tailDir + spread * 0.10) * (lt * 0.32),
  };

  const cL = at(tailDir - spread * 0.35, lt * 0.65);
  const cR = at(tailDir + spread * 0.35, lt * 0.65);
  const inL = at(tailDir - spread * 0.12, lt * 0.88);
  const inR = at(tailDir + spread * 0.12, lt * 0.88);

  ctx.beginPath();
  // 1. Mulai dari ujung moncong depan
  ctx.moveTo(o[0].x, o[0].y);

  // 2. Garis sisi kiri tubuh turun ke pangkal ekor kiri
  for (let i = 0; i < N; i++) {
    const p = o[i];
    const q = o[i + 1];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.lineTo(baseL.x, baseL.y);

  // 3. Menyambung langsung ke sirip ekor tanpa tekukan keluar
  ctx.bezierCurveTo(cp1L.x, cp1L.y, cL.x, cL.y, tipL.x, tipL.y);
  ctx.quadraticCurveTo(inL.x, inL.y, notch.x, notch.y);
  ctx.quadraticCurveTo(inR.x, inR.y, tipR.x, tipR.y);
  ctx.bezierCurveTo(cR.x, cR.y, cp1R.x, cp1R.y, baseR.x, baseR.y);

  // 4. Garis sisi kanan tubuh naik kembali ke moncong depan
  ctx.lineTo(baseR.x, baseR.y);
  for (let i = N + 1; i < n - 1; i++) {
    const p = o[i];
    const q = o[i + 1];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.quadraticCurveTo(o[n - 1].x, o[n - 1].y, o[0].x, o[0].y);
  ctx.closePath();
};

/** Sirip dada (pectoral fins) sayap mengalir gaya sumi-e yang merapat ke tubuh ke arah ekor */
export const drawPectoralFins = (
  ctx: CanvasRenderingContext2D,
  f: Fish,
  hw: number,
  energy: number
) => {
  const i = 2; // Ruas bahu di belakang insang
  const d = f.draw[i];
  const a = f.ang[i];
  const w = WIDTH[i] * hw;
  const nextD = f.draw[i + 1];
  const nextW = WIDTH[i + 1] * hw;

  const fl = f.len * 0.26; // Panjang sirip dada yang proporsional merapat ke tubuh
  const fw = f.len * 0.10;

  ctx.fillStyle = f.variety.fin;

  // Arah ke belakang menuju ekor (kebalikan dari heading kepala 'a')
  const tailDir = a + Math.PI;

  for (const side of [-1, 1]) {
    // Pangkal depan di tepi tubuh (sisi insang)
    const bx = d.x + f.nx[i] * side * (w * 0.90);
    const by = d.y + f.ny[i] * side * (w * 0.90);

    // Pangkal belakang di sisi tubuh ruas berikutnya
    const bx2 = nextD.x + f.nx[i + 1] * side * (nextW * 0.90);
    const by2 = nextD.y + f.ny[i + 1] * side * (nextW * 0.90);

    // Ayunan lembut merapat & meregang saat berenang (tidak terbuka 90 derajat)
    const sway = Math.sin(f.phase * 1.3 + side * 0.6) * 0.08 * (0.4 + energy * 0.6);

    // Sirip mengarah ke belakang (ke arah ekor) dengan sudut bukaan lembut ~22-26 derajat dari tubuh
    const sweep = 0.40 + sway;
    const finAngle = tailDir - side * sweep;

    // Ujung luar sayap sirip dada (berada di belakang bahu mengikuti arus air)
    const tipX = bx + Math.cos(finAngle) * fl;
    const tipY = by + Math.sin(finAngle) * fl;

    // Tepi depan (leading edge yang membusur anggun membelah air)
    const leadCtrlAngle = finAngle - side * 0.16;
    const leadCtrlX = bx + Math.cos(leadCtrlAngle) * (fl * 0.55);
    const leadCtrlY = by + Math.sin(leadCtrlAngle) * (fl * 0.55);

    // Tepi belakang (trailing edge yang kembali merapat halus ke tubuh)
    const trailCtrlAngle = finAngle + side * 0.22;
    const trailCtrlX = bx2 + Math.cos(trailCtrlAngle) * (fw * 1.4);
    const trailCtrlY = by2 + Math.sin(trailCtrlAngle) * (fw * 1.4);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(leadCtrlX, leadCtrlY, tipX, tipY);
    ctx.quadraticCurveTo(trailCtrlX, trailCtrlY, bx2, by2);
    ctx.closePath();
    ctx.fill();

    // Sinar sirip halus (fin rays) meradiasi dari pangkal ke ujung
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.8;
    for (let r = 0; r <= 3; r++) {
      const rayFrac = r / 3;
      const rayA = finAngle - side * 0.12 + side * rayFrac * 0.26;
      const rayL = fl * (0.75 + (1 - Math.abs(rayFrac - 0.5)) * 0.24);
      ctx.beginPath();
      ctx.moveTo(
        bx * (1 - rayFrac * 0.4) + bx2 * (rayFrac * 0.4),
        by * (1 - rayFrac * 0.4) + by2 * (rayFrac * 0.4)
      );
      ctx.lineTo(bx + Math.cos(rayA) * rayL, by + Math.sin(rayA) * rayL);
      ctx.stroke();
    }
    ctx.restore();

    // Outline tepi sirip dada tinta sumi-e tegas
    ctx.strokeStyle = "rgba(15, 36, 38, 0.38)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Garis kilau tepi halus
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
};

/** Sirip perut / pinggul (pelvic fins) di bagian tengah tubuh merapat ke lekuk tubuh */
export const drawPelvicFins = (
  ctx: CanvasRenderingContext2D,
  f: Fish,
  hw: number
) => {
  const i = 6; // Ruas pinggul / perut tengah
  const d = f.draw[i];
  const a = f.ang[i];
  const w = WIDTH[i] * hw;

  const fl = f.len * 0.16; // Sirip perut ramping merapat ke badan
  const fw = f.len * 0.055;

  ctx.fillStyle = f.variety.fin;

  // Arah ke belakang menuju ekor
  const tailDir = a + Math.PI;

  for (const side of [-1, 1]) {
    const bx = d.x + f.nx[i] * side * (w * 0.92);
    const by = d.y + f.ny[i] * side * (w * 0.92);

    // Sangat ramping dan merapat ke garis pinggul (~14 derajat)
    const sway = Math.sin(f.phase - i * 0.5) * 0.05;
    const sweep = 0.24 + sway;
    const finAngle = tailDir - side * sweep;

    const tipX = bx + Math.cos(finAngle) * fl;
    const tipY = by + Math.sin(finAngle) * fl;

    const leadAngle = finAngle - side * 0.10;
    const ctrlX = bx + Math.cos(leadAngle) * (fl * 0.55);
    const ctrlY = by + Math.sin(leadAngle) * (fl * 0.55);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(bx + Math.cos(finAngle) * (fl * 0.4), by + Math.sin(finAngle) * (fl * 0.4), bx, by);
    ctx.closePath();
    ctx.fill();

    // Outline tepi sirip perut tinta sumi-e
    ctx.strokeStyle = "rgba(15, 36, 38, 0.32)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.30)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
};

/** Sirip punggung (dorsal fin) di sepanjang garis tengah tulang belakang */
export const drawDorsalFin = (ctx: CanvasRenderingContext2D, f: Fish) => {
  const startIdx = 4;
  const endIdx = 8;
  const p0 = f.draw[startIdx];
  const pEnd = f.draw[endIdx];

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const prev = f.draw[i - 1];
    const curr = f.draw[i];
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
  }
  ctx.lineTo(pEnd.x, pEnd.y);

  // Garis punggung halus yang menangkap pantulan air
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.strokeStyle = "rgba(15, 42, 44, 0.12)";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
};

export const drawFish = (ctx: CanvasRenderingContext2D, f: Fish, scale: number, speed: number) => {
  const hw = f.len * 0.135;
  const energy = Math.min(1, f.v / (f.chase * scale * speed));

  // 1. Sirip ekor sutra
  drawTail(ctx, f, energy, hw);

  // 2. Sirip perut / pinggul (pelvic fins)
  drawPelvicFins(ctx, f, hw);

  // 3. Sirip dada lebar (pectoral fins)
  drawPectoralFins(ctx, f, hw, energy);

  // 4. Badan ikan (teardrop proporsional)
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

  // Garis kontur utuh (badan dan ekor menyambung mulus tanpa terpotong & tanpa tekukan)
  const isDark = f.variety.base.startsWith("#2");
  traceFishWithTail(ctx, f, energy, hw);
  ctx.lineWidth = Math.max(0.9, 1.1 * scale);
  ctx.strokeStyle = isDark ? "rgba(200, 220, 225, 0.30)" : "rgba(15, 36, 38, 0.30)";
  ctx.stroke();

  // 5. Sirip punggung (dorsal ridge)
  drawDorsalFin(ctx, f);

  // 6. Titik mata (sapuan kuas sumi-e berbentuk almond) di dalam kepala
  for (const side of [-1, 1]) {
    const eyeWidthFrac = 0.72;

    const tFront = 0.32;
    const frontSpineX = f.draw[0].x * (1 - tFront) + f.draw[1].x * tFront;
    const frontSpineY = f.draw[0].y * (1 - tFront) + f.draw[1].y * tFront;
    const frontW = (WIDTH[0] * (1 - tFront) + WIDTH[1] * tFront) * hw * eyeWidthFrac;
    const frontX = frontSpineX + f.nx[1] * side * frontW;
    const frontY = frontSpineY + f.ny[1] * side * frontW;

    const tBack = 0.74;
    const backSpineX = f.draw[0].x * (1 - tBack) + f.draw[1].x * tBack;
    const backSpineY = f.draw[0].y * (1 - tBack) + f.draw[1].y * tBack;
    const backW = (WIDTH[0] * (1 - tBack) + WIDTH[1] * tBack) * hw * eyeWidthFrac;
    const backX = backSpineX + f.nx[1] * side * backW;
    const backY = backSpineY + f.ny[1] * side * backW;

    const midX = (frontX + backX) * 0.5;
    const midY = (frontY + backY) * 0.5;

    const dx = backX - frontX;
    const dy = backY - frontY;
    const segLen = Math.hypot(dx, dy) || 1;

    const outNx = (dy / segLen) * side;
    const outNy = (-dx / segLen) * side;

    const thick = Math.max(1.8, f.len * 0.024);

    ctx.beginPath();
    ctx.moveTo(frontX, frontY);
    ctx.quadraticCurveTo(midX + outNx * (thick * 0.8), midY + outNy * (thick * 0.8), backX, backY);
    ctx.quadraticCurveTo(midX - outNx * (thick * 0.5), midY - outNy * (thick * 0.5), frontX, frontY);
    ctx.closePath();
    ctx.fillStyle = "rgba(10, 18, 20, 0.98)";
    ctx.fill();

    if (isDark) {
      ctx.strokeStyle = "rgba(235, 245, 248, 0.60)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
};

/** Menggambar bayangan siluet ikan lengkap dengan ekor dan sirip di dasar kolam */
export const drawFishShadow = (
  ctx: CanvasRenderingContext2D,
  f: Fish,
  scale: number,
  speed: number
) => {
  const hw = f.len * 0.135;
  const energy = Math.min(1, f.v / (f.chase * scale * speed));

  // 1. Siluet badan dan ekor terpadu
  traceFishWithTail(ctx, f, energy, hw);
  ctx.fill();

  // 2. Siluet sirip dada (pectoral fins) ikut membayangi dasar kolam
  const i = 2;
  const d = f.draw[i];
  const a = f.ang[i];
  const w = WIDTH[i] * hw;
  const nextD = f.draw[i + 1];
  const nextW = WIDTH[i + 1] * hw;
  const fl = f.len * 0.26;
  const fw = f.len * 0.10;
  const tailDir = a + Math.PI;

  for (const side of [-1, 1]) {
    const bx = d.x + f.nx[i] * side * (w * 0.90);
    const by = d.y + f.ny[i] * side * (w * 0.90);
    const bx2 = nextD.x + f.nx[i + 1] * side * (nextW * 0.90);
    const by2 = nextD.y + f.ny[i + 1] * side * (nextW * 0.90);

    const sway = Math.sin(f.phase * 1.3 + side * 0.6) * 0.08 * (0.4 + energy * 0.6);
    const sweep = 0.40 + sway;
    const finAngle = tailDir - side * sweep;

    const tipX = bx + Math.cos(finAngle) * fl;
    const tipY = by + Math.sin(finAngle) * fl;

    const leadCtrlAngle = finAngle - side * 0.16;
    const leadCtrlX = bx + Math.cos(leadCtrlAngle) * (fl * 0.55);
    const leadCtrlY = by + Math.sin(leadCtrlAngle) * (fl * 0.55);

    const trailCtrlAngle = finAngle + side * 0.22;
    const trailCtrlX = bx2 + Math.cos(trailCtrlAngle) * (fw * 1.4);
    const trailCtrlY = by2 + Math.sin(trailCtrlAngle) * (fw * 1.4);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(leadCtrlX, leadCtrlY, tipX, tipY);
    ctx.quadraticCurveTo(trailCtrlX, trailCtrlY, bx2, by2);
    ctx.closePath();
    ctx.fill();
  }
};
