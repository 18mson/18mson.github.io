import { MAX_PELLETS, N, TAU } from "./constants";
import { drawFish, spawnFish, trace, updateFish } from "./fish";
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
    while (this.fish.length < target) this.fish.push(spawnFish(this.w, this.h, this.scale));
    if (this.fish.length > target) this.fish.length = target;
    this.pads = layoutPads(this.w, this.h, this.scale, this.pads);
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

    if (this.t - p.lastRipple > 0.18) {
      addRipple(this.ripples, x, y, 26, 0.35, 1.4, this.scale);
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

    // Bayangan di dasar kolam
    c.save();
    c.translate(6 * this.scale, 11 * this.scale);
    c.fillStyle = "rgba(8,48,52,0.10)";
    for (const f of this.fish) {
      trace(c, f.outline);
      c.fill();
    }
    c.restore();

    for (const f of this.fish) drawFish(c, f, this.scale, this.speed);
    for (const p of this.pads) drawPad(c, p, this.t, this.scale);
    for (const p of this.pads) if (p.flower) drawLotus(c, p, this.t);
    drawPellets(c, this.pellets, this.scale);
    drawRipples(c, this.ripples);
  }
}
