/**
 * Koi pond — Canvas 2D engine tanpa dependensi.
 *
 * - Ikan: rantai tulang (spine) yang mengikuti kepala, digambar sebagai badan + sirip + ekor.
 * - Perilaku: berkeliling ke titik acak, tertarik ke pakan (pellet) yang dijatuhkan kursor,
 *   menghindari tepi kolam dan saling menjauh.
 * - Air: ring ripple dari kursor, pakan jatuh, ikan makan, tap/klik, dan tetes acak.
 */

interface Vec {
  x: number;
  y: number;
}

interface PatchDef {
  t: number; // posisi sepanjang badan, 0 = kepala, 1 = ekor
  off: number; // geser menyamping, -1..1
  rx: number; // setengah panjang, relatif terhadap panjang ikan
  ry: number; // setengah lebar, relatif terhadap panjang ikan
  color: string;
}

/** Corak berupa poligon yang dibentuk ulang tiap frame mengikuti lengkung badan. */
interface Patch extends PatchDef {
  pts: Vec[];
  wob: number[]; // sedikit ketidakteraturan supaya bentuknya organik
}

interface Pad {
  fx: number; // posisi relatif terhadap kolam (0..1)
  fy: number;
  baseR: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  ph: number;
  gap: number; // lebar takik daun
  tone: number;
  flower: boolean;
}

interface Variety {
  base: string;
  fin: string;
  patches: () => PatchDef[];
}

interface Fish {
  pts: Vec[]; // posisi tulang sebenarnya
  draw: Vec[]; // posisi tulang setelah gelombang renang
  ang: number[]; // arah tiap ruas
  nx: number[]; // normal tiap ruas
  ny: number[];
  outline: Vec[]; // kontur badan (dihitung sekali per frame)
  heading: number;
  v: number;
  baseLen: number;
  len: number;
  spacing: number;
  phase: number;
  cruise: number;
  chase: number;
  boost: number;
  orbit: 1 | -1;
  wp: Vec | null;
  wpUntil: number;
  variety: Variety;
  patches: Patch[];
}

interface Pellet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  landed: boolean;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
  maxR: number;
  strength: number;
}

export interface KoiOptions {
  reducedMotion?: boolean;
}

const TAU = Math.PI * 2;
const N = 12; // jumlah titik tulang
const WIDTH = [0.62, 0.84, 0.97, 1, 0.94, 0.8, 0.64, 0.5, 0.38, 0.28, 0.2, 0.15];
const MAX_PELLETS = 36;
const MAX_RIPPLES = 40;
const PM = 9; // jumlah sampel sepanjang corak
const PAD_COLORS = ["#6fae8a", "#79b894", "#62a07f"];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

const RED = "#e8501f";
const BLACK = "#1f2426";

const kohakuPatches = (): PatchDef[] => {
  const n = 3 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, (_, i) => ({
    t: 0.06 + (i / n) * 0.72 + rand(-0.03, 0.05),
    off: rand(-0.35, 0.35),
    rx: rand(0.07, 0.14),
    ry: rand(0.06, 0.1),
    color: RED,
  }));
};

const VARIETIES: Variety[] = [
  // Kohaku: putih dengan bercak merah
  { base: "#fbf9f4", fin: "rgba(255,255,255,0.85)", patches: kohakuPatches },
  // Sanke: kohaku + bintik hitam
  {
    base: "#fbf9f4",
    fin: "rgba(255,255,255,0.85)",
    patches: () => [
      ...kohakuPatches(),
      ...Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
        t: rand(0.2, 0.8),
        off: rand(-0.5, 0.5),
        rx: rand(0.03, 0.06),
        ry: rand(0.025, 0.05),
        color: BLACK,
      })),
    ],
  },
  // Tancho: putih dengan satu bulatan merah di kepala
  {
    base: "#fbf9f4",
    fin: "rgba(255,255,255,0.85)",
    patches: () => [{ t: 0.07, off: 0, rx: 0.055, ry: 0.055, color: RED }],
  },
  // Ogon: emas polos
  {
    base: "#f3b63a",
    fin: "rgba(249,205,98,0.8)",
    patches: () => [
      { t: 0.3, off: -0.2, rx: 0.2, ry: 0.05, color: "#f9d66f" },
      { t: 0.62, off: 0.25, rx: 0.14, ry: 0.04, color: "#f9d66f" },
    ],
  },
  // Hi: oranye polos
  {
    base: "#f0642d",
    fin: "rgba(246,140,96,0.8)",
    patches: () => [
      { t: 0.35, off: 0.1, rx: 0.18, ry: 0.05, color: "#f58a57" },
      { t: 0.7, off: -0.2, rx: 0.1, ry: 0.04, color: "#f58a57" },
    ],
  },
];

export class KoiPond {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private t = 0;
  private active = true;
  private nextDrop = 2;
  private speed: number;
  private reduced: boolean;

  private fish: Fish[] = [];
  private pellets: Pellet[] = [];
  private ripples: Ripple[] = [];
  private pads: Pad[] = [];

  private pointer = { x: 0, y: 0, inside: false, lastMove: -10, lastX: 0, lastY: 0, travel: 0, lastRipple: -10 };

  /** Dipanggil sekali, saat pengguna pertama kali menyentuh/menggerakkan kursor di kolam. */
  onFirstFeed?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    opts: KoiOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D tidak tersedia");
    this.ctx = ctx;
    this.reduced = !!opts.reducedMotion;
    this.speed = this.reduced ? 0.4 : 1;
  }

  /* ------------------------------------------------------------------ API */

  resize(w: number, h: number, dpr: number) {
    if (w === 0 || h === 0) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(dpr, w < 768 ? 1.5 : 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.scale = clamp(w / 1300, 0.55, 1.1);

    const target = w < 640 ? 5 : w < 1024 ? 8 : 11;
    while (this.fish.length < target) this.fish.push(this.spawnFish());
    if (this.fish.length > target) this.fish.length = target;
    this.layoutPads();
    for (const f of this.fish) {
      f.len = f.baseLen * this.scale;
      f.spacing = f.len / (N - 1);
      f.pts[0].x = clamp(f.pts[0].x, 0, w);
      f.pts[0].y = clamp(f.pts[0].y, 0, h);
    }
  }

  setActive(active: boolean) {
    this.active = active;
  }

  pointerMove(x: number, y: number) {
    const p = this.pointer;
    p.inside = x >= 0 && y >= 0 && x <= this.w && y <= this.h;
    if (!p.inside) return;
    p.x = x;
    p.y = y;

    if (this.t - p.lastMove > 0.4) {
      p.lastX = x;
      p.lastY = y;
      p.travel = 0;
    }
    p.travel += Math.hypot(x - p.lastX, y - p.lastY);
    p.lastX = x;
    p.lastY = y;
    p.lastMove = this.t;

    // Pakan jatuh di sepanjang jejak kursor.
    const step = 34 * Math.max(0.8, this.scale);
    while (p.travel >= step) {
      p.travel -= step;
      if (this.pellets.length < MAX_PELLETS) this.dropPellet(x + rand(-14, 14), y + rand(-14, 14));
    }

    if (this.t - p.lastRipple > 0.18) {
      this.addRipple(x, y, 26, 0.35, 1.4);
      p.lastRipple = this.t;
    }
    this.firstFeed();
  }

  pointerDown(x: number, y: number) {
    if (x < 0 || y < 0 || x > this.w || y > this.h) return;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.inside = true;
    this.pointer.lastMove = this.t;
    this.addRipple(x, y, 150, 0.6, 2.4);
    for (let i = 0; i < 5 && this.pellets.length < MAX_PELLETS; i++) {
      const a = rand(0, TAU);
      const r = rand(10, 46);
      this.dropPellet(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    this.firstFeed();
  }

  pointerLeave() {
    this.pointer.inside = false;
  }

  frame(dt: number) {
    if (!this.active || this.w === 0) return;
    this.t += dt;
    this.update(dt);
    this.render();
  }

  /* --------------------------------------------------------------- spawn */

  private firstFeed() {
    if (this.onFirstFeed) {
      const cb = this.onFirstFeed;
      this.onFirstFeed = undefined;
      cb();
    }
  }

  private spawnFish(): Fish {
    const variety = VARIETIES[Math.floor(Math.random() * VARIETIES.length)];
    const baseLen = rand(100, 140);
    const len = baseLen * this.scale;
    const heading = rand(0, TAU);
    const x = rand(0.1, 0.9) * this.w;
    const y = rand(0.1, 0.9) * this.h;
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
  }

  private dropPellet(x: number, y: number) {
    this.pellets.push({ x, y, vx: rand(-4, 4), vy: rand(-4, 4), age: 0, life: 9, landed: false });
  }

  private addRipple(x: number, y: number, maxR: number, strength: number, life: number) {
    if (this.ripples.length >= MAX_RIPPLES) this.ripples.shift();
    this.ripples.push({ x, y, age: 0, life, maxR: maxR * Math.max(0.7, this.scale), strength });
  }

  /* -------------------------------------------------------------- update */

  private update(dt: number) {
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i];
      p.age += dt;
      if (!p.landed && p.age >= 0.35) {
        p.landed = true;
        this.addRipple(p.x, p.y, 34, 0.4, 1.6);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 0.3 * dt;
      p.vy *= 1 - 0.3 * dt;
      if (p.age > p.life) this.pellets.splice(i, 1);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.life) this.ripples.splice(i, 1);
    }

    if (!this.reduced) {
      this.nextDrop -= dt;
      if (this.nextDrop <= 0) {
        this.addRipple(rand(0.1, 0.9) * this.w, rand(0.1, 0.9) * this.h, 52, 0.3, 2.2);
        this.nextDrop = rand(2.5, 5);
      }
    }

    for (const f of this.fish) this.updateFish(f, dt);
    this.updatePads(dt);
  }

  private updateFish(f: Fish, dt: number) {
    const head = f.pts[0];
    const sc = this.scale * this.speed;
    const see = 340 * this.scale + f.len;
    const ptr = this.pointer;

    let tx = 0;
    let ty = 0;
    let speedT = f.cruise * sc;
    let hasTarget = false;

    // 1) Pakan terdekat
    let best: Pellet | undefined;
    let bestD = see;
    for (const pl of this.pellets) {
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
        this.pellets.splice(this.pellets.indexOf(best), 1);
        this.addRipple(best.x, best.y, 64, 0.55, 2);
        f.boost = 1;
      }
    } else if (ptr.inside && this.t - ptr.lastMove < 2.2) {
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
      const m = Math.min(f.len * 0.9, this.w * 0.2, this.h * 0.2);
      if (!f.wp || this.t > f.wpUntil || Math.hypot(f.wp.x - head.x, f.wp.y - head.y) < f.len * 0.7) {
        f.wp = { x: rand(m, this.w - m), y: rand(m, this.h - m) };
        f.wpUntil = this.t + rand(4, 9);
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
    for (const o of this.fish) {
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
    if (head.x > this.w - wm) dx -= ((head.x - (this.w - wm)) / wm) * 2;
    if (head.y < wm) dy += ((wm - head.y) / wm) * 2;
    if (head.y > this.h - wm) dy -= ((head.y - (this.h - wm)) / wm) * 2;

    // Belok halus
    const desired = Math.atan2(dy, dx);
    const maxTurn = 2.4 * dt;
    f.heading += clamp(wrapAngle(desired - f.heading) * Math.min(1, dt * 3.5), -maxTurn, maxTurn);

    // Kecepatan
    f.v += (speedT * (1 + f.boost * 0.35) - f.v) * Math.min(1, dt * 2.2);
    f.boost = Math.max(0, f.boost - dt * 1.2);

    head.x = clamp(head.x + Math.cos(f.heading) * f.v * dt, 0, this.w);
    head.y = clamp(head.y + Math.sin(f.heading) * f.v * dt, 0, this.h);

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
    f.phase += dt * (2.4 + (f.v / this.scale) * 0.05);
    const energy = Math.min(1, f.v / (f.chase * sc));
    const amp = f.len * 0.045 * (0.35 + energy * 0.75);
    const hw = f.len * 0.095;
    const o = f.outline;
    for (let i = 0; i < N; i++) {
      const prev = f.pts[Math.max(0, i - 1)];
      const next = f.pts[Math.min(N - 1, i + 1)];
      const a = Math.atan2(prev.y - next.y, prev.x - next.x);
      f.ang[i] = a;
      const t = i / (N - 1);
      const off = Math.sin(f.phase - i * 0.62) * amp * (0.25 + 0.75 * t);
      const nx = Math.cos(a + Math.PI / 2);
      const ny = Math.sin(a + Math.PI / 2);
      f.nx[i] = nx;
      f.ny[i] = ny;
      const d = f.draw[i];
      d.x = f.pts[i].x + nx * off;
      d.y = f.pts[i].y + ny * off;
      const w = WIDTH[i] * hw;
      o[1 + i].x = d.x + nx * w;
      o[1 + i].y = d.y + ny * w;
      o[N * 2 - i].x = d.x - nx * w;
      o[N * 2 - i].y = d.y - ny * w;
    }
    o[0].x = f.draw[0].x + Math.cos(f.ang[0]) * f.len * 0.06;
    o[0].y = f.draw[0].y + Math.sin(f.ang[0]) * f.len * 0.06;

    this.updatePatches(f, hw);
  }

  /** Bentuk ulang tiap corak di sepanjang tulang, jadi ikut melengkung saat ikan berbelok. */
  private updatePatches(f: Fish, hw: number) {
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
  }

  /* -------------------------------------------------------------- render */

  private render() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);

    // Bayangan di dasar kolam
    c.save();
    c.translate(6 * this.scale, 11 * this.scale);
    c.fillStyle = "rgba(8,48,52,0.10)";
    for (const f of this.fish) {
      this.trace(f.outline);
      c.fill();
    }
    c.restore();

    for (const f of this.fish) this.drawFish(f);
    for (const p of this.pads) this.drawPad(p);
    for (const p of this.pads) if (p.flower) this.drawLotus(p);
    this.drawPellets();
    this.drawRipples();
  }

  /** Kurva tertutup halus melalui titik-titik kontur. */
  private trace(pts: Vec[]) {
    const c = this.ctx;
    const n = pts.length;
    c.beginPath();
    c.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % n];
      c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    c.closePath();
  }

  private drawFish(f: Fish) {
    const c = this.ctx;
    const hw = f.len * 0.095;
    const energy = Math.min(1, f.v / (f.chase * this.scale * this.speed));

    this.drawTail(f, energy);

    // Sirip dada
    c.fillStyle = f.variety.fin;
    for (const side of [-1, 1]) {
      const i = 2;
      const d = f.draw[i];
      const a = f.ang[i];
      const w = WIDTH[i] * hw * 0.9;
      const bx = d.x + Math.cos(a + Math.PI / 2) * side * w;
      const by = d.y + Math.sin(a + Math.PI / 2) * side * w;
      const fa = a + side * (Math.PI / 2 + 0.9 + 0.22 * Math.sin(f.phase * 1.3 + side));
      const fl = f.len * 0.17;
      c.beginPath();
      c.ellipse(bx + Math.cos(fa) * fl * 0.5, by + Math.sin(fa) * fl * 0.5, fl * 0.5, f.len * 0.04, fa, 0, TAU);
      c.fill();
    }

    // Badan
    this.trace(f.outline);
    c.fillStyle = f.variety.base;
    c.fill();

    // Corak mengikuti lengkung badan dan dipotong di tepi badan
    c.save();
    c.clip();
    for (const p of f.patches) {
      this.trace(p.pts);
      c.fillStyle = p.color;
      c.fill();
    }
    c.restore();

    // Garis tepi tipis supaya ikan putih tetap terlihat di air terang
    this.trace(f.outline);
    c.lineWidth = 1;
    c.strokeStyle = "rgba(15,42,44,0.16)";
    c.stroke();

    // Mata
    c.fillStyle = "rgba(20,40,42,0.85)";
    for (const side of [-1, 1]) {
      const a = f.ang[1];
      const w = WIDTH[1] * hw * 0.55;
      c.beginPath();
      c.arc(
        f.draw[1].x + Math.cos(a + Math.PI / 2) * side * w,
        f.draw[1].y + Math.sin(a + Math.PI / 2) * side * w,
        Math.max(1.2, f.len * 0.014),
        0,
        TAU,
      );
      c.fill();
    }
  }

  private drawTail(f: Fish, energy: number) {
    const c = this.ctx;
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

    c.beginPath();
    c.moveTo(b.x, b.y);
    c.quadraticCurveTo(cL.x, cL.y, tipL.x, tipL.y);
    c.quadraticCurveTo(nL.x, nL.y, notch.x, notch.y);
    c.quadraticCurveTo(nR.x, nR.y, tipR.x, tipR.y);
    c.quadraticCurveTo(cR.x, cR.y, b.x, b.y);
    c.closePath();
    c.fillStyle = f.variety.fin;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = "rgba(15,42,44,0.10)";
    c.stroke();
  }

  /* ------------------------------------------------------------ teratai */

  /** Letakkan daun di pinggir kolam, menjauhi pita tengah tempat nama berada. */
  private layoutPads() {
    const target = this.w < 640 ? 3 : this.w < 1024 ? 5 : 7;
    if (this.pads.length !== target) {
      const flowers = this.w < 640 ? 1 : 2;
      const pads: Pad[] = [];
      let guard = 0;
      while (pads.length < target && guard++ < 300) {
        const flower = pads.length < flowers;
        const baseR = flower ? rand(46, 58) : rand(30, 46);
        const fx = rand(0.04, 0.96);
        const fy = rand(0.06, 0.94);
        if (Math.abs(fy - 0.5) < 0.16) continue;
        if (pads.some((q) => Math.hypot((fx - q.fx) * 1300, (fy - q.fy) * 800) < (baseR + q.baseR) * 1.5)) continue;
        pads.push({
          fx,
          fy,
          baseR,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          r: baseR,
          rot: rand(0, TAU),
          ph: rand(0, TAU),
          gap: rand(0.22, 0.4),
          tone: Math.floor(Math.random() * PAD_COLORS.length),
          flower,
        });
      }
      this.pads = pads;
      for (const p of pads) {
        p.x = p.fx * this.w;
        p.y = p.fy * this.h;
      }
    }
    for (const p of this.pads) p.r = p.baseR * this.scale;
  }

  private updatePads(dt: number) {
    for (const p of this.pads) {
      const hx = p.fx * this.w + Math.sin(this.t * 0.2 + p.ph) * 6;
      const hy = p.fy * this.h + Math.cos(this.t * 0.17 + p.ph) * 5;
      // Pegas pelan ke posisi asal, redaman supaya tidak bergoyang terus
      p.vx += (hx - p.x) * 3 * dt - p.vx * 2.2 * dt;
      p.vy += (hy - p.y) * 3 * dt - p.vy * 2.2 * dt;
      // Terdorong kepala ikan yang lewat
      for (const f of this.fish) {
        const head = f.pts[0];
        const dx = p.x - head.x;
        const dy = p.y - head.y;
        const d = Math.hypot(dx, dy);
        const reach = p.r + f.len * 0.12;
        if (d < reach && d > 0.001) {
          const k = (1 - d / reach) * 220 * dt;
          p.vx += (dx / d) * k;
          p.vy += (dy / d) * k;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private drawPad(p: Pad) {
    const c = this.ctx;
    const r = p.r;
    const rot = p.rot + Math.sin(this.t * 0.12 + p.ph) * 0.06;
    const a0 = rot + p.gap / 2;
    const a1 = rot + TAU - p.gap / 2;
    const path = () => {
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.arc(p.x, p.y, r, a0, a1);
      c.closePath();
    };

    c.save();
    c.translate(5 * this.scale, 9 * this.scale);
    path();
    c.fillStyle = "rgba(8,48,52,0.12)";
    c.fill();
    c.restore();

    path();
    c.fillStyle = PAD_COLORS[p.tone];
    c.fill();

    c.save();
    path();
    c.clip();
    c.fillStyle = "rgba(255,255,255,0.14)";
    c.beginPath();
    c.arc(p.x - r * 0.18, p.y - r * 0.2, r * 0.7, 0, TAU);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.28)";
    c.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      const a = a0 + ((k + 0.5) / 9) * (TAU - p.gap);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      c.stroke();
    }
    c.restore();

    path();
    c.lineWidth = 1.2;
    c.strokeStyle = "rgba(20,80,55,0.35)";
    c.stroke();
  }

  private drawLotus(p: Pad) {
    const c = this.ctx;
    const R = p.r * 0.82;
    const breathe = 1 + Math.sin(this.t * 0.8 + p.ph) * 0.015;
    const layers = [
      { n: 9, r0: R * 0.25, r1: R, w: R * 0.34, fill: "#f9dbe3", off: 0 },
      { n: 8, r0: R * 0.18, r1: R * 0.78, w: R * 0.32, fill: "#f4b3c6", off: Math.PI / 8 },
      { n: 6, r0: R * 0.1, r1: R * 0.5, w: R * 0.28, fill: "#ec86a5", off: 0.3 },
    ];
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot * 0.5 + p.ph);
    c.scale(breathe, breathe);
    c.lineWidth = 0.8;
    c.strokeStyle = "rgba(180,70,105,0.35)";
    for (const L of layers) {
      c.fillStyle = L.fill;
      for (let i = 0; i < L.n; i++) {
        c.save();
        c.rotate(L.off + (i * TAU) / L.n);
        const mid = (L.r0 + L.r1) / 2;
        c.beginPath();
        c.moveTo(L.r0, 0);
        c.quadraticCurveTo(mid, L.w, L.r1, 0);
        c.quadraticCurveTo(mid, -L.w, L.r0, 0);
        c.fill();
        c.stroke();
        c.restore();
      }
    }
    c.fillStyle = "#f4d35e";
    c.beginPath();
    c.arc(0, 0, R * 0.14, 0, TAU);
    c.fill();
    c.fillStyle = "#e8a93a";
    for (let i = 0; i < 10; i++) {
      const a = (i * TAU) / 10;
      c.beginPath();
      c.arc(Math.cos(a) * R * 0.21, Math.sin(a) * R * 0.21, Math.max(1, R * 0.03), 0, TAU);
      c.fill();
    }
    c.restore();
  }

  private drawPellets() {
    const c = this.ctx;
    for (const p of this.pellets) {
      const fall = clamp(1 - p.age / 0.35, 0, 1);
      const fade = p.age > p.life - 1.5 ? (p.life - p.age) / 1.5 : 1;
      const r = (2.6 + fall * 2.5) * Math.max(0.8, this.scale);
      c.globalAlpha = clamp(fade, 0, 1) * (0.55 + 0.45 * (1 - fall));
      c.fillStyle = "#c07a38";
      c.beginPath();
      c.arc(p.x, p.y, r, 0, TAU);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.beginPath();
      c.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  private drawRipples() {
    const c = this.ctx;
    for (const r of this.ripples) {
      const p = r.age / r.life;
      const e = 1 - Math.pow(1 - p, 3);
      const R = r.maxR * e;
      const a = Math.pow(1 - p, 1.5) * r.strength;
      for (let k = 0; k < 3; k++) {
        const rr = R - k * r.maxR * 0.13;
        if (rr <= 1) continue;
        const ak = a * (1 - k * 0.28);
        c.lineWidth = 1.6 - k * 0.3;
        c.strokeStyle = `rgba(12,56,60,${(ak * 0.22).toFixed(3)})`;
        c.beginPath();
        c.arc(r.x + 1.2, r.y + 1.8, rr, 0, TAU);
        c.stroke();
        c.strokeStyle = `rgba(255,255,255,${(ak * 0.95).toFixed(3)})`;
        c.beginPath();
        c.arc(r.x, r.y, rr, 0, TAU);
        c.stroke();
      }
    }
  }
}
