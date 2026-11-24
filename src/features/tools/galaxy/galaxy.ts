import { pack32, planetColor, rgba, type RGB } from "./colors";
import { makeCanvas } from "./canvas";
import { computeListLayout, type ListLayout } from "./layout";
import { TAU, clamp, easeInOutCubic, mulberry32, smoothstep } from "./math";
import { getTextSprite, type TextSprite } from "./pixelfont";
import { K_GLOW, K_NONE, makePixelStar, type PixelSprite } from "./pixelstar";
import { ALPHA_TIERS, BUCKETS, STAR_COLORS, buildStars, type StarField } from "./stars";
import type { GalaxyOptions, GalaxyTool, ToolTier } from "./types";

/**
 * Galaksi bergaya pixel-art. Seluruh adegan (bintang, planet, cincin orbit) digambar ke buffer piksel
 * kecil berpalet terbatas dengan dithering, lalu diperbesar tanpa smoothing. Teks memakai font piksel
 * yang sama, jadi semuanya berada di satu grid piksel yang menyatu.
 */

const CAM = 3.6; // jarak kamera (satuan jari-jari galaksi)
const SPIN = 0.045; // rad/detik
const TRANSITION_S = 0.9;
const BANDS: Record<ToolTier, [number, number]> = {
  current: [0.17, 0.4],
  learned: [0.45, 0.68],
  exploring: [0.74, 0.95],
};
const SIZE_U: Record<ToolTier, number> = { current: 0.036, learned: 0.028, exploring: 0.022 };

const STAR_GAIN = 1.3; // kecerahan tiap bintang sebelum tone-map
const GLOW_GAIN = 1.6;
const STEP = 28; // lebar tingkat warna palet
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DITHER = new Float32Array(16).map((_, i) => ((BAYER[i] + 0.5) / 16 - 0.5) * STEP * 0.9);

// kurva tone-map: akumulasi cahaya -> 0..255, supaya inti padat menyala tanpa gosong
const LUT = new Uint8Array(4096).map((_, a) => Math.round(255 * (1 - Math.exp(-a / 230))));

const quant = (v: number) => {
  if (v <= 0) return 0;
  const q = Math.round(v / STEP) * STEP;
  return q > 255 ? 255 : q;
};

interface Planet {
  tool: GalaxyTool;
  idx: number;
  rgb: RGB;
  orbitR: number;
  phase: number;
  omega: number;
  tilt: number;
  sizeU: number;
  ox: number;
  oy: number;
  orad: number;
  depth: number;
  dx: number;
  dy: number;
  dr: number;
  z: number;
  slotX: number;
  slotY: number;
  raw: number;
  e: number;
  dir: number;
  wait: number;
  order: number;
  hover: number;
}

interface Pointer {
  x: number;
  y: number;
  inside: boolean;
  type: string;
  down: boolean;
  dragging: boolean;
  downX: number;
  downY: number;
  downT: number;
  lastX: number;
  lastY: number;
  lastT: number;
}

export class ToolsGalaxy {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private cx = 0;
  private cy = 0;
  private R = 300;
  private boost = 1;

  // buffer piksel
  private unit = 3; // piksel layar (device) per piksel buffer
  private ps = 3; // piksel CSS per piksel buffer
  private bw = 1;
  private bh = 1;
  private low: HTMLCanvasElement | null = null;
  private lctx: CanvasRenderingContext2D | null = null;
  private img: ImageData | null = null;
  private out32 = new Uint32Array(0);
  private accR = new Uint16Array(0);
  private accG = new Uint16Array(0);
  private accB = new Uint16Array(0);
  private pcol = new Uint32Array(0);
  private zbuf = new Float32Array(0);
  private bgBuf = new Uint32Array(0);
  private sprites = new Map<number, PixelSprite>();

  private planets: Planet[] = [];
  private layout: ListLayout | null = null;
  private stars: StarField | null = null;

  yaw = 0;
  pitch = 1.05;
  private yawV = 0;
  private pitchV = 0;

  private t = 0;
  private spin = 0;
  private orbitT = 0;
  private timeScale = 1;
  private galaxyAlpha = 1;
  private listMode = false;
  private pinned = -1;
  private hoverIdx = -1;
  private labelIdx = -1;
  private labelA = 0;
  private cursor = "";
  private reduced: boolean;

  private ptr: Pointer = {
    x: 0,
    y: 0,
    inside: false,
    type: "mouse",
    down: false,
    dragging: false,
    downX: 0,
    downY: 0,
    downT: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
  };

  constructor(
    private canvas: HTMLCanvasElement,
    opts: GalaxyOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D tidak tersedia");
    this.ctx = ctx;
    this.reduced = opts.reducedMotion;
    this.buildPlanets(opts.tools);
  }

  /* ------------------------------------------------------------------ setup */

  private buildPlanets(tools: GalaxyTool[]) {
    const rng = mulberry32(2024);
    const counts: Record<ToolTier, number> = { current: 0, learned: 0, exploring: 0 };
    for (const t of tools) counts[t.tier]++;
    const seen: Record<ToolTier, number> = { current: 0, learned: 0, exploring: 0 };

    this.planets = tools.map((tool, i) => {
      const [lo, hi] = BANDS[tool.tier];
      const orbitR = lo + ((hi - lo) * (seen[tool.tier]++ + 0.5)) / counts[tool.tier];
      return {
        tool,
        idx: i,
        rgb: planetColor(tool.hex, tool.tier),
        orbitR,
        phase: (i * 2.399963) % TAU, // sudut emas: planet tersebar merata
        omega: 0.11 * Math.pow(0.25 / orbitR, 0.85),
        tilt: (rng() - 0.5) * 0.22,
        sizeU: SIZE_U[tool.tier] * (0.9 + rng() * 0.25),
        ox: 0,
        oy: 0,
        orad: 6,
        depth: 0,
        dx: 0,
        dy: 0,
        dr: 6,
        z: 0,
        slotX: 0,
        slotY: 0,
        raw: 0,
        e: 0,
        dir: 0,
        wait: 0,
        order: i,
        hover: 0,
      };
    });
  }

  /** Font diabaikan: seluruh teks memakai font piksel bawaan. Dibiarkan agar API wrapper tetap sama. */
  setFontFamily(_f: string) {}

  setReducedMotion(v: boolean) {
    this.reduced = v;
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    const wDev = Math.round(w * dpr);
    const hDev = Math.round(h * dpr);
    this.canvas.width = wDev;
    this.canvas.height = hDev;

    // ukuran piksel: lebih kecil dan rapat (high density) untuk tampilan retro yang tajam dan halus
    const basePs = w < 768 ? 1.25 : 1.5;
    this.unit = Math.max(1, Math.round(basePs * dpr));
    this.ps = this.unit / dpr;
    this.bw = Math.ceil(wDev / this.unit);
    this.bh = Math.ceil(hDev / this.unit);
    const n = this.bw * this.bh;

    this.low = makeCanvas(this.bw, this.bh);
    this.lctx = this.low.getContext("2d");
    this.img = this.lctx ? this.lctx.createImageData(this.bw, this.bh) : null;
    this.out32 = this.img ? new Uint32Array(this.img.data.buffer) : new Uint32Array(n);
    this.accR = new Uint16Array(n);
    this.accG = new Uint16Array(n);
    this.accB = new Uint16Array(n);
    this.pcol = new Uint32Array(n);
    this.zbuf = new Float32Array(n);
    this.sprites.clear();

    this.cx = w / 2;
    this.cy = h * (w < 768 ? 0.58 : 0.55);
    this.R = Math.min(w * 0.46, h * 0.62);
    this.boost = clamp(420 / this.R, 1, 1.6);

    const starN = clamp(Math.round(n * 0.12), 16000, 36000);
    if (!this.stars || this.stars.count !== starN) this.stars = buildStars(starN);

    this.buildBackground();

    this.layout = computeListLayout(
      w,
      h,
      this.planets.map((p) => p.tool.tier),
    );
    this.planets.forEach((p, i) => {
      p.slotX = this.layout!.slots[i].x;
      p.slotY = this.layout!.slots[i].y;
    });
  }

  /** Latar: gradasi biru tua ber-dither + bintang latar tetap. Dibuat sekali, disalin tiap frame. */
  private buildBackground() {
    const { bw, bh, ps } = this;
    this.bgBuf = new Uint32Array(bw * bh);
    const maxD = Math.max(this.w, this.h) * 0.75;
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const d = clamp(Math.hypot(x * ps - this.cx, y * ps - this.cy) / maxD, 0, 1);
        const k = DITHER[(x & 3) | ((y & 3) << 2)] / 5;
        const r = 10 - 7 * d + k;
        const g = 17 - 12 * d + k;
        const b = 34 - 22 * d + k;
        this.bgBuf[y * bw + x] = pack32(Math.max(0, Math.round(r)), Math.max(0, Math.round(g)), Math.max(0, Math.round(b)));
      }
    }
    const rng = mulberry32(31);
    const count = Math.round((bw * bh) / 320);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * bw);
      const y = Math.floor(rng() * bh);
      const v = rng();
      const c = v < 0.7 ? [70, 84, 120] : v < 0.93 ? [120, 140, 190] : [200, 214, 245];
      this.bgBuf[y * bw + x] = pack32(c[0], c[1], c[2]);
    }
  }

  /* ----------------------------------------------------------------- control */

  setListMode(on: boolean) {
    if (on === this.listMode) return;
    this.listMode = on;
    this.pinned = -1;
    const n = this.planets.length;
    for (const p of this.planets) {
      p.dir = on ? 1 : -1;
      p.wait = on ? p.order * 0.03 : (n - 1 - p.order) * 0.022;
      if (this.reduced) {
        p.wait = 0;
        p.raw = on ? 1 : 0;
      }
    }
  }

  isListMode() {
    return this.listMode;
  }

  pointerDown(x: number, y: number, type: string) {
    const p = this.ptr;
    p.x = x;
    p.y = y;
    p.inside = true;
    p.type = type;
    p.down = true;
    p.dragging = false;
    p.downX = p.lastX = x;
    p.downY = p.lastY = y;
    p.downT = p.lastT = performance.now();
    this.yawV = 0;
    this.pitchV = 0;
  }

  pointerMove(x: number, y: number, type: string) {
    const p = this.ptr;
    p.x = x;
    p.y = y;
    p.inside = true;
    p.type = type;
    if (!p.down || this.listMode) return;

    if (!p.dragging && Math.hypot(x - p.downX, y - p.downY) > 5) p.dragging = true;
    if (!p.dragging) return;

    const now = performance.now();
    const dtE = Math.max(0.008, (now - p.lastT) / 1000);
    const dYaw = (x - p.lastX) * 0.0058;
    const dPitch = (y - p.lastY) * 0.0045;
    this.yaw += dYaw;
    this.pitch = clamp(this.pitch + dPitch, 0.15, 1.5);
    this.yawV = clamp(this.yawV * 0.6 + (dYaw / dtE) * 0.4, -6, 6);
    this.pitchV = clamp(this.pitchV * 0.6 + (dPitch / dtE) * 0.4, -4, 4);
    p.lastX = x;
    p.lastY = y;
    p.lastT = now;
  }

  pointerUp(x: number, y: number) {
    const p = this.ptr;
    const wasDragging = p.dragging;
    const quick = performance.now() - p.downT < 350;
    p.down = false;
    p.dragging = false;

    if (performance.now() - p.lastT > 90) {
      this.yawV = 0;
      this.pitchV = 0;
    }

    if (p.type !== "mouse") {
      p.inside = false;
      if (!wasDragging && quick && !this.listMode) {
        // ketuk: sematkan label planet (layar sentuh tidak punya hover)
        let best = -1;
        let bestD = 1e9;
        this.planets.forEach((pl, i) => {
          const d = Math.hypot(x - pl.ox, y - pl.oy);
          if (d < Math.max(pl.orad * 1.8, 20) && d < bestD) {
            bestD = d;
            best = i;
          }
        });
        this.pinned = best === this.pinned ? -1 : best;
      }
    }
  }

  pointerLeave() {
    this.ptr.inside = false;
    this.ptr.down = false;
    this.ptr.dragging = false;
  }

  /* ------------------------------------------------------------------ update */

  frame(dt: number) {
    this.update(dt);
    this.draw();
  }

  private update(dt: number) {
    this.t += dt;
    const ptr = this.ptr;

    if (!ptr.dragging) {
      this.yaw += this.yawV * dt;
      this.pitch = clamp(this.pitch + this.pitchV * dt, 0.15, 1.5);
      const f = Math.exp(-dt * 2.6);
      this.yawV *= f;
      this.pitchV *= f;
    }

    this.projectPlanets();

    // hover & jarak terdekat (untuk memperlambat)
    let hover = -1;
    let edgeMin = 1e9;
    if (ptr.inside && !ptr.dragging) {
      if (!this.listMode) {
        let best = 1e9;
        for (let i = 0; i < this.planets.length; i++) {
          const p = this.planets[i];
          const d = Math.hypot(ptr.x - p.ox, ptr.y - p.oy);
          const edge = d - p.orad;
          if (edge < edgeMin) edgeMin = edge;
          if (d <= Math.max(p.orad * 1.25, 12) && d < best) {
            best = d;
            hover = i;
          }
        }
      } else if (this.layout) {
        const L = this.layout;
        for (let i = 0; i < this.planets.length; i++) {
          const p = this.planets[i];
          if (p.raw < 0.95) continue;
          if (ptr.x >= p.slotX - 14 && ptr.x <= p.slotX - 14 + L.colW - 12 && Math.abs(ptr.y - p.slotY) <= L.rowH / 2) {
            hover = i;
            break;
          }
        }
      }
    }
    this.hoverIdx = hover;
    const active = this.pinned >= 0 ? this.pinned : hover;

    // laju waktu: melambat saat kursor mendekat, berhenti total saat tepat di planet
    let target = 1;
    if (this.listMode) target = 0.25;
    else if (ptr.dragging) target = 0.15;
    else if (active >= 0) target = 0;
    else if (ptr.inside && ptr.type === "mouse") {
      const slowR = 170 * clamp(this.R / 450, 0.6, 1);
      const s = smoothstep((edgeMin - 4) / (slowR - 4));
      target = 0.05 + 0.95 * s;
    }
    const rate = target < this.timeScale ? 7 : 3.5;
    this.timeScale += (target - this.timeScale) * (1 - Math.exp(-dt * rate));
    if (target === 0 && this.timeScale < 0.003) this.timeScale = 0;

    const sdt = this.reduced ? 0 : dt * this.timeScale;
    this.orbitT += sdt;
    this.spin += sdt * SPIN;

    this.galaxyAlpha += ((this.listMode ? 0 : 1) - this.galaxyAlpha) * (1 - Math.exp(-dt * 2.2));

    if (active >= 0) this.labelIdx = active;
    this.labelA += ((active >= 0 && !this.listMode ? 1 : 0) - this.labelA) * (1 - Math.exp(-dt * 12));

    const hk = 1 - Math.exp(-dt * 14);
    const listR = 2 * this.ps;
    for (const p of this.planets) {
      if (p.wait > 0) p.wait -= dt;
      else if (p.dir !== 0) p.raw = clamp(p.raw + (p.dir * dt) / TRANSITION_S, 0, 1);
      p.hover += ((p.idx === active && !this.listMode ? 1 : 0) - p.hover) * hk;

      const e = easeInOutCubic(p.raw);
      p.e = e;
      p.dx = p.ox + (p.slotX - p.ox) * e;
      p.dy = p.oy + (p.slotY - p.oy) * e;
      p.dr = p.orad * (1 + 0.3 * p.hover) * (1 - e) + listR * e;
      p.z = p.depth * (1 - e) - 1.5 * e; // planet yang pindah ke daftar selalu di depan
    }

    const cursor = this.listMode ? "default" : ptr.dragging ? "grabbing" : "grab";
    if (cursor !== this.cursor) {
      this.cursor = cursor;
      this.canvas.style.cursor = cursor;
    }
  }

  private projectPlanets() {
    const cY = Math.cos(this.yaw);
    const sY = Math.sin(this.yaw);
    const cP = Math.cos(this.pitch);
    const sP = Math.sin(this.pitch);
    const F = this.R * CAM;
    for (const p of this.planets) {
      // Putaran orbit disesuaikan searah dengan putaran piringan galaksi (ke kanan)
      const A = p.phase - p.omega * this.orbitT;
      const x = p.orbitR * Math.cos(A);
      const z0 = p.orbitR * Math.sin(A);
      const y0 = z0 * p.tilt;
      const x1 = x * cY + z0 * sY;
      const z1 = -x * sY + z0 * cY;
      const y2 = y0 * cP + z1 * sP;
      const z2 = -y0 * sP + z1 * cP;
      const k = F / (CAM + z2);
      p.ox = this.cx + x1 * k;
      p.oy = this.cy - y2 * k;
      p.depth = z2;
      p.orad = Math.max(2 * this.ps, p.sizeU * this.boost * k);
    }
  }

  /* -------------------------------------------------------------------- draw */

  private getSprite(p: Planet, r: number): PixelSprite {
    const key = p.idx * 64 + r;
    let s = this.sprites.get(key);
    if (!s) {
      s = makePixelStar(p.rgb, r);
      this.sprites.set(key, s);
    }
    return s;
  }

  private draw() {
    const { ctx, bw, bh, unit } = this;
    if (!this.lctx || !this.img || !this.low) return;

    this.accR.fill(0);
    this.accG.fill(0);
    this.accB.fill(0);
    this.pcol.fill(0);
    this.zbuf.fill(Infinity);

    // garis orbit planet yang disorot (titik-titik, di belakang planet)
    if (this.labelA > 0.05 && this.labelIdx >= 0 && !this.listMode) this.plotOrbit(this.planets[this.labelIdx]);

    for (const p of this.planets) {
      // bintang berkedip: ukurannya naik-turun tipis, makin hilang saat pindah ke daftar
      const tw = this.reduced ? 1 : 1 + 0.12 * (1 - p.e) * Math.sin(this.t * 1.7 + p.idx * 2.1);
      const rb = clamp(Math.round((p.dr * tw) / this.ps), 2, 16);
      this.blit(this.getSprite(p, rb), Math.floor(p.dx / this.ps), Math.floor(p.dy / this.ps), p.z);
    }

    // cincin sorot di planet yang di-hover
    for (const p of this.planets) {
      if (p.hover > 0.5 && !this.listMode) {
        const rb = clamp(Math.round(p.dr / this.ps), 2, 16);
        this.plotCircle(Math.floor(p.dx / this.ps), Math.floor(p.dy / this.ps), rb + 3, pack32(236, 246, 255));
      }
    }

    this.plotStars();
    this.compose();

    this.lctx.putImageData(this.img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.low, 0, 0, bw, bh, 0, 0, bw * unit, bh * unit);

    if (this.labelA > 0.02 && this.labelIdx >= 0) this.drawHoverLabel();
    if (this.layout && this.planets.some((p) => p.raw > 0.7)) this.drawList(this.layout);
    ctx.globalAlpha = 1;
  }

  /** Tempel sprite planet ke buffer dengan tes kedalaman (z-buffer), supaya planet bisa tertutup bintang di depannya. */
  private blit(s: PixelSprite, bx: number, by: number, z: number) {
    const { bw, bh } = this;
    for (let sy = 0; sy < s.h; sy++) {
      const y = by + sy - s.cy;
      if (y < 0 || y >= bh) continue;
      for (let sx = 0; sx < s.w; sx++) {
        const kind = s.kind[sy * s.w + sx];
        if (kind === K_NONE) continue;
        const x = bx + sx - s.cx;
        if (x < 0 || x >= bw) continue;
        const i = y * bw + x;
        const c = s.px[sy * s.w + sx];
        if (kind === K_GLOW) {
          this.accR[i] += (c & 255) * GLOW_GAIN;
          this.accG[i] += ((c >> 8) & 255) * GLOW_GAIN;
          this.accB[i] += ((c >> 16) & 255) * GLOW_GAIN;
          continue;
        }
        if (z < this.zbuf[i]) {
          this.zbuf[i] = z;
          this.pcol[i] = c;
        }
      }
    }
  }

  private plotCircle(cx: number, cy: number, r: number, color: number) {
    const { bw, bh } = this;
    const put = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= bw || y >= bh) return;
      const i = y * bw + x;
      this.pcol[i] = color;
      this.zbuf[i] = -10;
    };
    let x = r;
    let y = 0;
    let err = 1 - r;
    while (x >= y) {
      put(cx + x, cy + y);
      put(cx + y, cy + x);
      put(cx - y, cy + x);
      put(cx - x, cy + y);
      put(cx - x, cy - y);
      put(cx - y, cy - x);
      put(cx + y, cy - x);
      put(cx + x, cy - y);
      y++;
      if (err < 0) err += 2 * y + 1;
      else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
  }

  /** Garis orbit putus-putus (selang-seling piksel) untuk planet yang disorot. */
  private plotOrbit(p: Planet) {
    const cY = Math.cos(this.yaw);
    const sY = Math.sin(this.yaw);
    const cP = Math.cos(this.pitch);
    const sP = Math.sin(this.pitch);
    const F = this.R * CAM;
    const col = pack32(p.rgb[0] * 0.62, p.rgb[1] * 0.62, p.rgb[2] * 0.62);
    const { bw, bh, ps } = this;
    const SEG = 160;
    let px = 0;
    let py = 0;
    let n = 0;
    for (let i = 0; i <= SEG; i++) {
      const A = (i / SEG) * TAU;
      const x = p.orbitR * Math.cos(A);
      const z0 = p.orbitR * Math.sin(A);
      const y0 = z0 * p.tilt;
      const x1 = x * cY + z0 * sY;
      const z1 = -x * sY + z0 * cY;
      const y2 = y0 * cP + z1 * sP;
      const z2 = -y0 * sP + z1 * cP;
      const k = F / (CAM + z2);
      const sx = Math.floor((this.cx + x1 * k) / ps);
      const sy = Math.floor((this.cy - y2 * k) / ps);
      if (i > 0) {
        // Bresenham, hanya setiap piksel genap
        let x0 = px;
        let y0b = py;
        const dx = Math.abs(sx - x0);
        const dy = -Math.abs(sy - y0b);
        const stx = x0 < sx ? 1 : -1;
        const sty = y0b < sy ? 1 : -1;
        let err = dx + dy;
        for (let guard = 0; guard < 400; guard++) {
          if ((n++ & 1) === 0 && x0 >= 0 && y0b >= 0 && x0 < bw && y0b < bh) this.pcol[y0b * bw + x0] = col;
          if (x0 === sx && y0b === sy) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x0 += stx;
          }
          if (e2 <= dx) {
            err += dx;
            y0b += sty;
          }
        }
      }
      px = sx;
      py = sy;
    }
  }

  /** Bintang galaksi: tiap bintang satu piksel, cahaya dijumlah lalu di-tone-map. Bintang di belakang planet tersembunyi. */
  private plotStars() {
    const st = this.stars;
    if (!st) return;
    const th = this.spin + this.yaw;
    const cS = Math.cos(th);
    const sS = Math.sin(th);
    const cP = Math.cos(this.pitch);
    const sP = Math.sin(this.pitch);
    const F = this.R * CAM;
    const { bw, bh, ps, cx, cy } = this;
    const vis = 0.1 + 0.9 * this.galaxyAlpha;
    const tw = this.reduced ? 0 : 0.16;
    const accR = this.accR;
    const accG = this.accG;
    const accB = this.accB;
    const zbuf = this.zbuf;

    for (let b = 0; b < BUCKETS; b++) {
      const a = st.start[b];
      const z = st.start[b + 1];
      if (a === z) continue;
      const ci = Math.floor(b / ALPHA_TIERS.length);
      const ai = b % ALPHA_TIERS.length;
      const flicker = 1 - tw * (0.5 + 0.5 * Math.sin(this.t * 0.9 + b * 1.7));
      const k = ALPHA_TIERS[ai] * STAR_GAIN * vis * flicker;
      const col = STAR_COLORS[ci];
      const addR = Math.round(col[0] * k);
      const addG = Math.round(col[1] * k);
      const addB = Math.round(col[2] * k);
      const sparkle = ai === ALPHA_TIERS.length - 1;

      for (let i = a; i < z; i++) {
        const x = st.x[i];
        const y = st.y[i];
        const zz = st.z[i];
        const x1 = x * cS + zz * sS;
        const z1 = -x * sS + zz * cS;
        const y2 = y * cP + z1 * sP;
        const z2 = -y * sP + z1 * cP;
        const kk = F / (CAM + z2);
        const ix = Math.floor((cx + x1 * kk) / ps);
        const iy = Math.floor((cy - y2 * kk) / ps);
        if (ix < 0 || iy < 0 || ix >= bw || iy >= bh) continue;
        const idx = iy * bw + ix;
        if (z2 > zbuf[idx]) continue;
        accR[idx] += addR;
        accG[idx] += addG;
        accB[idx] += addB;

        // bintang terang: kilau bentuk plus
        if (sparkle && st.size[i] > 1.7 && ix > 0 && iy > 0 && ix < bw - 1 && iy < bh - 1) {
          const sr = addR >> 1;
          const sg = addG >> 1;
          const sb = addB >> 1;
          for (const o of [idx - 1, idx + 1, idx - bw, idx + bw]) {
            if (z2 > zbuf[o]) continue;
            accR[o] += sr;
            accG[o] += sg;
            accB[o] += sb;
          }
        }
      }
    }
  }

  /** Gabungkan latar, cahaya bintang (tone-map + palet ber-dither), dan piksel planet menjadi gambar akhir. */
  private compose() {
    const { bw, bh, accR, accG, accB, pcol, bgBuf, out32 } = this;
    for (let y = 0; y < bh; y++) {
      const yb = (y & 3) << 2;
      let i = y * bw;
      for (let x = 0; x < bw; x++, i++) {
        const ar = accR[i];
        const ag = accG[i];
        const ab = accB[i];
        const pc = pcol[i];
        const lit = (ar | ag | ab) !== 0;
        if (pc !== 0) {
          if (!lit) {
            out32[i] = pc;
          } else {
            // bintang di depan planet: menutupi sebagian
            const r = Math.min(255, (pc & 255) + (LUT[ar > 4095 ? 4095 : ar] >> 1));
            const g = Math.min(255, ((pc >> 8) & 255) + (LUT[ag > 4095 ? 4095 : ag] >> 1));
            const b = Math.min(255, ((pc >> 16) & 255) + (LUT[ab > 4095 ? 4095 : ab] >> 1));
            out32[i] = pack32(r, g, b);
          }
          continue;
        }
        if (!lit) {
          out32[i] = bgBuf[i];
          continue;
        }
        // tone-map mempertahankan warna: skala dari kanal terkuat, lalu campur putih tipis di area sangat terang
        const bg = bgBuf[i];
        const d = DITHER[(x & 3) | yb];
        let m = ar > ag ? ar : ag;
        if (ab > m) m = ab;
        if (m > 4095) m = 4095;
        const sc = LUT[m] / m;
        const white = m > 700 ? Math.min(0.55, (m - 700) / 2600) : 0;
        const cr = ar * sc;
        const cg = ag * sc;
        const cb = ab * sc;
        const r = quant((bg & 255) + cr + (255 - cr) * white + d);
        const g = quant(((bg >> 8) & 255) + cg + (255 - cg) * white + d);
        const b = quant(((bg >> 16) & 255) + cb + (255 - cb) * white + d);
        out32[i] = pack32(r, g, b);
      }
    }
  }

  /* -------------------------------------------------------------------- text */

  /** Gambar sprite teks pada grid piksel (posisi dibulatkan ke kelipatan ukuran piksel). */
  private text(
    spr: TextSprite,
    xCss: number,
    yCenterCss: number,
    pxUnit: number,
    alpha: number,
    align: "left" | "right" = "left",
  ) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const wDev = spr.w * pxUnit;
    const hDev = spr.h * pxUnit;
    let xd = Math.round((xCss * dpr) / this.unit) * this.unit;
    if (align === "right") xd -= wDev;
    const yd = Math.round((yCenterCss * dpr - hDev / 2) / this.unit) * this.unit;
    ctx.globalAlpha = alpha;
    ctx.drawImage(spr.canvas, xd, yd, wDev, hDev);
  }

  private drawHoverLabel() {
    const p = this.planets[this.labelIdx];
    const ctx = this.ctx;
    const a = this.labelA;
    const { unit, dpr, ps } = this;
    const nu = Math.max(1, Math.round(unit * 0.66));
    const name = getTextSprite(p.tool.name, "#f3f8fa");
    const note = p.tool.note ? getTextSprite(p.tool.note, "#a9bdc8") : null;

    const rb = clamp(Math.round(p.dr / ps), 2, 16);
    const edge = (rb + 4) * ps;
    const widthCss = Math.max(name.w * unit, note ? note.w * nu : 0) / dpr;
    let x = p.dx + edge + 4 * ps;
    let align: "left" | "right" = "left";
    if (x + widthCss > this.w - 12) {
      x = p.dx - edge - 4 * ps;
      align = "right";
    }

    const nameH = (7 * unit) / dpr;
    const noteH = (7 * nu) / dpr;
    const total = note ? nameH + ps + noteH : nameH;
    const nameC = note ? p.dy - total / 2 + nameH / 2 : p.dy;
    const noteC = p.dy + total / 2 - noteH / 2;

    // latar gelap di belakang teks supaya terbaca di atas bintang
    const snap = (v: number) => Math.round(v / unit) * unit;
    const wDev = Math.max(name.w * unit, note ? note.w * nu : 0);
    const xd = snap(x * dpr);
    const left = (align === "left" ? xd : xd - wDev) - 2 * unit;
    const top = snap(nameC * dpr - (7 * unit) / 2) - 2 * unit;
    const bottom = note ? snap(noteC * dpr - (7 * nu) / 2) + 7 * nu + 2 * unit : top + 11 * unit;
    ctx.globalAlpha = a * 0.82;
    ctx.fillStyle = "#03070f";
    ctx.fillRect(left, top, wDev + 4 * unit, bottom - top);

    // garis penghubung piksel dari planet ke teks
    const yd = snap(p.dy * dpr);
    const x0 = align === "left" ? p.dx + edge : x + 3 * ps;
    const x1 = align === "left" ? x - 3 * ps : p.dx - edge;
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = rgba(p.rgb, 1);
    ctx.fillRect(snap(Math.min(x0, x1) * dpr), yd, Math.max(unit, Math.abs(x1 - x0) * dpr), unit);

    this.text(name, x, nameC, unit, a, align);
    if (note) this.text(note, x, noteC, nu, a * 0.95, align);
  }

  private drawList(L: ListLayout) {
    const ctx = this.ctx;
    const { unit, dpr, ps } = this;
    // teks lebih kecil di layar sempit supaya nama terpanjang tetap muat di kolomnya
    let maxW = 1;
    for (const p of this.planets) maxW = Math.max(maxW, getTextSprite(p.tool.name, "#fff").w);
    const tu = clamp(Math.floor(((L.colW - 7 * ps - 18) * dpr) / maxW), 1, unit);
    const hu = Math.max(tu, Math.round(unit * 1.25));

    for (const hd of L.headers) {
      const first = this.planets.find((p) => p.tool.tier === hd.tier);
      if (!first) continue;
      const a = smoothstep((first.raw - 0.78) / 0.22);
      if (a < 0.01) continue;
      this.text(getTextSprite(hd.text, "#a8c0cc"), hd.x, hd.y, hu, a * 0.95);
    }

    for (const p of this.planets) {
      const a = smoothstep((p.raw - 0.78) / 0.22);
      if (a < 0.01) continue;
      const hot = this.hoverIdx === p.idx;
      if (hot) {
        ctx.globalAlpha = a * 0.08;
        ctx.fillStyle = "#ffffff";
        const gx = Math.round(((p.slotX - 14) * dpr) / unit) * unit;
        const gy = Math.round(((p.slotY - L.rowH / 2 + 1) * dpr) / unit) * unit;
        ctx.fillRect(gx, gy, Math.round(((L.colW - 12) * dpr) / unit) * unit, Math.round(((L.rowH - 2) * dpr) / unit) * unit);
      }
      this.text(getTextSprite(p.tool.name, hot ? "#ffffff" : "#c9d8de"), p.slotX + 7 * ps, p.slotY, tu, a * (hot ? 1 : 0.92));
    }
  }
}
