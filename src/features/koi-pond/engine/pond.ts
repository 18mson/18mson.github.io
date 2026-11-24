import { MAX_PELLETS, N, TAU } from "./constants";
import { drawFish, drawFishShadow, spawnFish, trace, updateFish } from "./fish";
import { clamp, rand } from "./math";
import { drawLotus, drawPad, layoutPads, updatePads } from "./pads";
import type { Fish, KoiOptions, Pad, Pellet, Ripple } from "./types";
import { addRipple, drawPellets, drawRipples, dropPellet, updatePellets, updateRipples } from "./water";

export class KoiPond {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private scale = 1;
  private t = 0;
  active = true;
  private nextDrop = 2;
  private lotusRippleTimer = 3.5;
  private lotusHoverBloom = 0;
  private lastHoverRipple = 0;
  private speed: number;
  private reduced: boolean;
  private opts: KoiOptions;

  private fish: Fish[] = [];
  private pellets: Pellet[] = [];
  private ripples: Ripple[] = [];
  private pads: Pad[] = [];

  private pointer = {
    x: 0,
    y: 0,
    inside: false,
    lastMove: -10,
    lastX: 0,
    lastY: 0,
    travel: 0,
    lastRipple: -10,
    lastRippleX: 0,
    lastRippleY: 0,
  };

  private _isDark = false;
  overrideDark: boolean | null = null;

  /** Status tema (selalu sinkron dengan document.documentElement kecuali dioverride saat transisi). */
  get isDark(): boolean {
    if (this.overrideDark !== null) return this.overrideDark;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return this._isDark;
  }

  set isDark(val: boolean) {
    this._isDark = val;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", val);
    }
  }

  get isTransitioning(): boolean {
    return this.themeTransition !== null;
  }

  /** Callback saat transisi ripple dimulai dan selesai. */
  onThemeToggleStart?: (targetDark: boolean, x: number, y: number, duration: number) => void;
  onThemeToggleEnd?: (isDark: boolean) => void;

  private themeTransition: {
    x: number;
    y: number;
    r: number;
    startR: number;
    maxR: number;
    duration: number;
    elapsed: number;
    fromDark: boolean;
    targetDark: boolean;
  } | null = null;

  /** Dipanggil sekali, saat pengguna pertama kali menyentuh/menggerakkan kursor di kolam. */
  onFirstFeed?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    opts: KoiOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D tidak tersedia");
    this.ctx = ctx;
    this.opts = opts;
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

    const fc = this.opts.fishCount;
    const target = fc ? (w < 640 ? fc.narrow : w < 1024 ? fc.mid : fc.wide) : w < 640 ? 5 : w < 1024 ? 8 : 10;
    while (this.fish.length < target) this.fish.push(spawnFish(this.w, this.h, this.scale));
    while (this.fish.length > target) {
      let maxIdx = 0;
      for (let i = 1; i < this.fish.length; i++) {
        if (this.fish[i].baseLen > this.fish[maxIdx].baseLen) maxIdx = i;
      }
      this.fish.splice(maxIdx, 1);
    }
    this.pads = layoutPads(this.w, this.h, this.scale, this.pads, this.opts.pads);
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
      if (this.pellets.length < MAX_PELLETS) dropPellet(this.pellets, x + rand(-14, 14), y + rand(-14, 14));
    }

    // Riak air halus beruntun (wake trail) mengikuti geseran kursor secara mulus
    const dtRipple = this.t - p.lastRipple;
    if (dtRipple > 0.35 || (p.lastRippleX === 0 && p.lastRippleY === 0)) {
      p.lastRippleX = x;
      p.lastRippleY = y;
      p.lastRipple = this.t;
      addRipple(this.ripples, x, y, 22, 0.24, 1.05, this.scale);
    } else {
      const dx = x - p.lastRippleX;
      const dy = y - p.lastRippleY;
      const dist = Math.hypot(dx, dy);
      const step = 18 * Math.max(0.7, this.scale);

      if (dist >= step) {
        // Interpolasi riak di sepanjang jalur gerakan agar jejak air mulus mengalir tanpa jeda
        const steps = Math.min(6, Math.floor(dist / step));
        const actualStep = dist / steps;
        for (let i = 1; i <= steps; i++) {
          const frac = (i * actualStep) / dist;
          const rx = p.lastRippleX + dx * frac;
          const ry = p.lastRippleY + dy * frac;
          const radius = rand(20, 26);
          const strength = rand(0.2, 0.28);
          addRipple(this.ripples, rx, ry, radius, strength, 1.1, this.scale);
        }
        p.lastRippleX = x;
        p.lastRippleY = y;
        p.lastRipple = this.t;
      } else if (dtRipple > 0.07 && dist >= 7 * this.scale) {
        addRipple(this.ripples, x, y, 22, 0.22, 1.0, this.scale);
        p.lastRippleX = x;
        p.lastRippleY = y;
        p.lastRipple = this.t;
      }
    }
    this.firstFeed();
  }

  getLargestPad(): Pad | null {
    if (this.pads.length === 0) return null;
    return this.pads.reduce((max, p) => (p.r > max.r ? p : max), this.pads[0]);
  }

  getPadAt(x: number, y: number): Pad | null {
    const hits = this.pads.filter((p) => p.flower && Math.hypot(x - p.x, y - p.y) <= p.r);
    return hits[0] ?? null;
  }

  isOverLargestPad(x: number, y: number): boolean {
    const largest = this.getLargestPad();
    if (!largest) return false;
    return Math.hypot(x - largest.x, y - largest.y) <= largest.r;
  }

  isOverClickablePad(x: number, y: number): boolean {
    return this.getPadAt(x, y) !== null;
  }

  triggerThemeTransition(pad?: Pad) {
    if (this.themeTransition) return;
    const targetPad = pad ?? this.getLargestPad();
    if (!targetPad) return;

    const targetDark = !this.isDark;
    const duration = 1.1;

    // Hentikan teratai seketika dan bekukan selama durasi transisi
    targetPad.vx = 0;
    targetPad.vy = 0;
    targetPad.freezeTimer = duration;

    // Tambahkan riak air ganda di posisi teratai
    addRipple(this.ripples, targetPad.x, targetPad.y, targetPad.r * 2.4, 0.95, 2.6, this.scale);
    addRipple(this.ripples, targetPad.x, targetPad.y, targetPad.r * 1.6, 0.75, 1.8, this.scale);

    const maxR = Math.hypot(
      Math.max(targetPad.x, this.w - targetPad.x),
      Math.max(targetPad.y, this.h - targetPad.y)
    ) * 1.1;

    this.themeTransition = {
      x: targetPad.x,
      y: targetPad.y,
      r: targetPad.r,
      startR: targetPad.r,
      maxR,
      duration,
      elapsed: 0,
      fromDark: this.isDark,
      targetDark,
    };

    this.onThemeToggleStart?.(targetDark, targetPad.x, targetPad.y, duration);
  }

  /** Menyelesaikan transisi tema seketika (dipanggil di akhir animasi atau saat user men-scroll). */
  completeThemeTransition() {
    if (!this.themeTransition) return;
    const targetDark = this.themeTransition.targetDark;
    this.themeTransition = null;
    this.isDark = targetDark;

    for (const p of this.pads) {
      if (p.freezeTimer) p.freezeTimer = 0;
    }

    this.onThemeToggleEnd?.(targetDark);
  }

  /** Ambil snapshot posisi ikan dan teratai untuk disinkronkan ke mode ASCII. */
  getSnapshot(): {
    fish: Array<{ x: number; y: number; angle: number; size: number; speed: number; pal: number }>;
    pads: Array<{ x: number; y: number; r: number; rot: number; flower: boolean; tone: number }>;
    w: number;
    h: number;
  } {
    return {
      fish: this.fish.map((f) => ({
        x: f.pts[0].x,
        y: f.pts[0].y,
        angle: f.heading,
        size: f.baseLen,
        speed: f.cruise,
        pal: Math.floor(Math.random() * 5),
      })),
      pads: this.pads.map((p) => ({
        x: p.x,
        y: p.y,
        r: p.r,
        rot: p.rot,
        flower: p.flower,
        tone: p.tone,
      })),
      w: this.w,
      h: this.h,
    };
  }

  /** Terapkan snapshot posisi ikan dan teratai (misal dari mode ASCII saat kembali ke 2D). */
  applySnapshot(snap: {
    fish: Array<{ x: number; y: number; angle: number; size?: number; speed?: number; pal?: number }>;
    pads: Array<{ x: number; y: number; r: number; rot: number; flower?: boolean; tone?: number }>;
    w: number;
    h: number;
  }) {
    if (!snap || !this.w || !this.h) return;

    // 1. Sinkronkan posisi teratai
    if (snap.pads && snap.pads.length) {
      const count = Math.min(this.pads.length, snap.pads.length);
      for (let i = 0; i < count; i++) {
        const sp = snap.pads[i];
        const p = this.pads[i];
        p.x = snap.w > 0 ? (sp.x / snap.w) * this.w : sp.x;
        p.y = snap.h > 0 ? (sp.y / snap.h) * this.h : sp.y;
        p.fx = p.x / this.w;
        p.fy = p.y / this.h;
        p.rot = sp.rot;
        p.vx = 0;
        p.vy = 0;
      }
    }

    // 2. Sinkronkan posisi & orientasi ikan
    if (snap.fish && snap.fish.length) {
      const count = Math.min(this.fish.length, snap.fish.length);
      for (let i = 0; i < count; i++) {
        const sf = snap.fish[i];
        const f = this.fish[i];
        const hx = snap.w > 0 ? (sf.x / snap.w) * this.w : sf.x;
        const hy = snap.h > 0 ? (sf.y / snap.h) * this.h : sf.y;
        f.heading = sf.angle;
        f.pts[0].x = hx;
        f.pts[0].y = hy;
        f.draw[0].x = hx;
        f.draw[0].y = hy;
        for (let j = 1; j < f.pts.length; j++) {
          const px = hx - Math.cos(f.heading) * j * f.spacing;
          const py = hy - Math.sin(f.heading) * j * f.spacing;
          f.pts[j].x = px;
          f.pts[j].y = py;
          f.draw[j].x = px;
          f.draw[j].y = py;
          f.ang[j] = f.heading;
        }
      }
    }
  }

  pointerDown(x: number, y: number, allowEasterEgg = true) {
    if (x < 0 || y < 0 || x > this.w || y > this.h) return;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.inside = true;
    this.pointer.lastMove = this.t;

    // Periksa apakah klik tepat pada teratai (bisa memicu transisi ganti tema)
    const clickedPad = this.getPadAt(x, y);
    if (allowEasterEgg && clickedPad && !this.themeTransition) {
      this.triggerThemeTransition(clickedPad);
      this.firstFeed();
      return;
    }

    addRipple(this.ripples, x, y, 150, 0.6, 2.4, this.scale);
    for (let i = 0; i < 5 && this.pellets.length < MAX_PELLETS; i++) {
      const a = rand(0, TAU);
      const r = rand(10, 46);
      dropPellet(this.pellets, x + Math.cos(a) * r, y + Math.sin(a) * r);
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

  /* -------------------------------------------------------------- update */

  private update(dt: number) {
    if (this.themeTransition) {
      this.themeTransition.elapsed += dt;
      const progress = Math.min(1, this.themeTransition.elapsed / this.themeTransition.duration);
      const ease = 1 - Math.pow(1 - progress, 2.5);
      this.themeTransition.r =
        this.themeTransition.startR + (this.themeTransition.maxR - this.themeTransition.startR) * ease;

      if (progress >= 1) {
        this.completeThemeTransition();
      }
    }

    updatePellets(this.pellets, dt, (x, y) => {
      addRipple(this.ripples, x, y, 34, 0.4, 1.6, this.scale);
    });

    updateRipples(this.ripples, dt);

    if (!this.reduced) {
      this.nextDrop -= dt;
      if (this.nextDrop <= 0) {
        addRipple(this.ripples, rand(0.1, 0.9) * this.w, rand(0.1, 0.9) * this.h, 52, 0.3, 2.2, this.scale);
        this.nextDrop = rand(2.5, 5);
      }
    }

    // Riak air halus periodik dari teratai besar (isyarat visual alami)
    if (!this.reduced && !this.themeTransition) {
      this.lotusRippleTimer -= dt;
      if (this.lotusRippleTimer <= 0) {
        const largest = this.getLargestPad();
        if (largest) {
          addRipple(this.ripples, largest.x, largest.y, largest.r * 1.5, 0.28, 2.6, this.scale);
        }
        this.lotusRippleTimer = rand(4.5, 6.0);
      }
    }

    // Interaksi kedekatan kursor (proximity bloom & micro-ripple saat disentuh)
    const largest = this.getLargestPad();
    let targetLargestBloom = 0;
    for (const p of this.pads) {
      if (!p.flower) continue;
      let targetBloom = 0;
      if (this.pointer.inside && !this.themeTransition) {
        const dist = Math.hypot(this.pointer.x - p.x, this.pointer.y - p.y);
        if (dist <= p.r) {
          targetBloom = 1.0;
          if (this.t - this.lastHoverRipple > 1.8) {
            addRipple(this.ripples, p.x, p.y, p.r * 0.9, 0.22, 1.8, this.scale);
            this.lastHoverRipple = this.t;
          }
        } else if (dist <= p.r * 2.2) {
          targetBloom = Math.pow(1 - (dist - p.r) / (p.r * 1.2), 1.4);
        }
      }
      p.hoverBloom = (p.hoverBloom ?? 0) + (targetBloom - (p.hoverBloom ?? 0)) * Math.min(1, dt * 5.5);
      if (p === largest) targetLargestBloom = p.hoverBloom;
    }
    this.lotusHoverBloom = targetLargestBloom;

    for (const f of this.fish) {
      updateFish({
        f,
        dt,
        w: this.w,
        h: this.h,
        scale: this.scale,
        speed: this.speed,
        t: this.t,
        pointer: this.pointer,
        pellets: this.pellets,
        allFish: this.fish,
        onEatPellet: (x, y) => {
          addRipple(this.ripples, x, y, 64, 0.55, 2, this.scale);
        },
      });
    }
    updatePads(this.pads, this.fish, dt, this.t, this.w, this.h);
  }

  /* -------------------------------------------------------------- render */

  private render() {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);

    // Dasar air saat mode gelap atau transisi gelombang riak air
    if (this.themeTransition) {
      const tr = this.themeTransition;
      c.save();
      // Warna dasar kolam sebelum lingkaran ripple menyebar
      c.fillStyle = tr.fromDark ? "#071719" : "#d2e8e4";
      c.fillRect(0, 0, this.w, this.h);

      // Lingkaran air yang mengembang dari posisi teratai
      c.beginPath();
      c.arc(tr.x, tr.y, tr.r, 0, TAU);
      c.fillStyle = tr.targetDark ? "#071719" : "#d2e8e4";
      c.fill();

      // Gelombang riak air (shockwave ripple crests) di bibir lingkaran yang merambat
      const strokeBase = tr.targetDark ? "rgba(120, 240, 230," : "rgba(12, 56, 60,";
      c.beginPath();
      c.arc(tr.x, tr.y, tr.r, 0, TAU);
      c.lineWidth = 3.5 * this.scale;
      c.strokeStyle = `${strokeBase} 0.75)`;
      c.stroke();

      if (tr.r > 20 * this.scale) {
        c.beginPath();
        c.arc(tr.x, tr.y, tr.r - 14 * this.scale, 0, TAU);
        c.lineWidth = 2 * this.scale;
        c.strokeStyle = `${strokeBase} 0.4)`;
        c.stroke();
      }

      c.beginPath();
      c.arc(tr.x, tr.y, tr.r + 10 * this.scale, 0, TAU);
      c.lineWidth = 1.2 * this.scale;
      c.strokeStyle = `${strokeBase} 0.25)`;
      c.stroke();
      c.restore();
    } else {
      c.save();
      c.fillStyle = this.isDark ? "#071719" : "#d2e8e4";
      c.fillRect(0, 0, this.w, this.h);
      c.restore();
    }

    // Bayangan di dasar kolam (berubah berbarengan mengikuti lingkaran gelombang riak air)
    if (this.themeTransition) {
      const tr = this.themeTransition;

      // 1. Bayangan di LUAR gelombang riak air (tema asal)
      c.save();
      c.beginPath();
      c.rect(0, 0, this.w, this.h);
      c.arc(tr.x, tr.y, tr.r, 0, TAU, true);
      c.clip();
      c.translate(6 * this.scale, 11 * this.scale);
      c.fillStyle = tr.fromDark ? "rgba(0,0,0,0.45)" : "rgba(8,48,52,0.10)";
      for (const f of this.fish) {
        drawFishShadow(c, f, this.scale, this.speed);
      }
      c.restore();

      // 2. Bayangan di DALAM gelombang riak air (tema baru yang sedang menyebar)
      c.save();
      c.beginPath();
      c.arc(tr.x, tr.y, tr.r, 0, TAU);
      c.clip();
      c.translate(6 * this.scale, 11 * this.scale);
      c.fillStyle = tr.targetDark ? "rgba(0,0,0,0.45)" : "rgba(8,48,52,0.10)";
      for (const f of this.fish) {
        drawFishShadow(c, f, this.scale, this.speed);
      }
      c.restore();
    } else {
      c.save();
      c.translate(6 * this.scale, 11 * this.scale);
      c.fillStyle = this.isDark ? "rgba(0,0,0,0.45)" : "rgba(8,48,52,0.10)";
      for (const f of this.fish) {
        drawFishShadow(c, f, this.scale, this.speed);
      }
      c.restore();
    }

    for (const f of this.fish) drawFish(c, f, this.scale, this.speed);

    // Render tiap teratai beserta bunganya sebagai satu kesatuan utuh
    const largest = this.getLargestPad();
    for (const p of this.pads) {
      const inNewTheme = this.themeTransition
        ? Math.hypot(p.x - this.themeTransition.x, p.y - this.themeTransition.y) <= this.themeTransition.r
        : this.isDark;
      const padDark = this.themeTransition
        ? inNewTheme
          ? this.themeTransition.targetDark
          : this.themeTransition.fromDark
        : this.isDark;

      drawPad(c, p, this.t, this.scale, padDark);
      if (p.flower) {
        const isKing = p === largest;
        const bloom = p.hoverBloom ?? (isKing ? this.lotusHoverBloom : 0);
        drawLotus(c, p, this.t, bloom, padDark);
      }
    }

    drawPellets(c, this.pellets, this.scale);
    drawRipples(c, this.ripples, this.isDark);
  }
}
