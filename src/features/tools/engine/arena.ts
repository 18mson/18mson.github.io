import {
  COOLDOWN_MAX,
  COOLDOWN_MIN,
  HIT_RADIUS_FACTOR,
  LIFESPAN_CURRENT,
  LIFESPAN_EXPLORING,
  LIFESPAN_LEARNED,
  NARROW_BREAKPOINT,
  SHATTER_COOLDOWN_MAX,
  SHATTER_COOLDOWN_MIN,
  SIZE_CURRENT,
  SIZE_EXPLORING,
  SIZE_LEARNED,
  SLOT_STAGGER_DELAY,
  SLOTS_DESKTOP,
  SLOTS_NARROW,
  TOUCH_HIT_PADDING,
} from "./constants";
import { distance, randomRange } from "./math";
import { drawReticle } from "./reticle";
import { ShatterSystem } from "./shatter";
import { createTile, drawTile, getTileBaseColor, updateTile } from "./tiles";
import type { ArenaTheme, Slot, Tile, ToolSpec, ToolTier } from "./types";
import { addNote, drawNotes, updateNotes, type ToolNote } from "./notes";
import { drawZoneGuides, getZoneFractions, sampleZonePosition } from "./zones";

export class ToolsArena {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private specs: ToolSpec[];
  private slots: Slot[] = [];
  private shatterSystem: ShatterSystem;
  private theme: ArenaTheme;

  private width = 0;
  private height = 0;
  private dpr = 1;
  private R = 0;
  private rx = 0;
  private ry = 0;
  private cx = 0;
  private cy = 0;

  private time = 0;
  private isPaused = false;
  private isReducedMotion = false;

  private pointerX = -999;
  private pointerY = -999;
  private hasPointer = false;
  private isFinePointer = true;
  private hoveredTile: Tile | null = null;

  private notes: ToolNote[] = [];
  private discovered = new Set<string>();

  /** Dipanggil tiap tool baru ditemukan (ditembak) atau saat reset. */
  public onDiscover?: (count: number, total: number) => void;

  constructor(canvas: HTMLCanvasElement, specs: ToolSpec[], initialTheme: ArenaTheme) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");
    this.ctx = ctx;
    this.specs = specs;
    this.theme = initialTheme;
    this.shatterSystem = new ShatterSystem();

    this.initSlots(false);
  }

  private initSlots(isNarrow: boolean): void {
    const config = isNarrow ? SLOTS_NARROW : SLOTS_DESKTOP;
    const tiers: ToolTier[] = [];
    for (let i = 0; i < config.current; i++) tiers.push("current");
    for (let i = 0; i < config.learned; i++) tiers.push("learned");
    for (let i = 0; i < config.exploring; i++) tiers.push("exploring");

    this.slots = tiers.map((tier, idx) => ({
      tier,
      tile: null,
      cooldown: idx * SLOT_STAGGER_DELAY, // Aktif bertahap saat awal
      lastToolId: null,
    }));
  }

  public resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    this.cx = width * 0.5;
    this.cy = height * 0.5;
    this.R = (Math.min(width, height) * 0.5) * 0.95;
    this.rx = width * 0.5 * 0.95;
    this.ry = height * 0.5 * 0.95;

    const isNarrow = width < NARROW_BREAKPOINT;
    const targetSlotCount = isNarrow
      ? SLOTS_NARROW.current + SLOTS_NARROW.learned + SLOTS_NARROW.exploring
      : SLOTS_DESKTOP.current + SLOTS_DESKTOP.learned + SLOTS_DESKTOP.exploring;

    if (this.slots.length !== targetSlotCount) {
      this.initSlots(isNarrow);
    }
  }

  public setTheme(theme: ArenaTheme): void {
    this.theme = theme;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public setReducedMotion(reduced: boolean): void {
    this.isReducedMotion = reduced;
  }

  public onPointerMove(x: number, y: number, isFine: boolean): void {
    this.pointerX = x;
    this.pointerY = y;
    this.hasPointer = true;
    this.isFinePointer = isFine;
  }

  public onPointerLeave(): void {
    this.hasPointer = false;
    this.hoveredTile = null;
  }

  public shoot(x: number, y: number, isTouch = false): boolean {
    if (this.isPaused || this.isReducedMotion) return false;

    const hitPadding = isTouch ? TOUCH_HIT_PADDING : 0;
    const activeTiles = this.getActiveTiles();

    // Periksa dari tile teratas
    for (let i = activeTiles.length - 1; i >= 0; i--) {
      const tile = activeTiles[i];
      if (tile.state !== "alive" && tile.state !== "entering") continue;

      const d = distance(x, y, tile.x, tile.y);
      if (d <= tile.hitRadius + hitPadding) {
        // Tembakan kena: balon langsung pecah instan (pop!)
        const colors = getTileBaseColor(tile.tier, tile.spec, this.theme);
        this.shatterSystem.spawnPop(tile.x, tile.y, tile.size, colors.base, colors.light, x, y);
        tile.state = "dead";

        addNote(this.notes, tile.x, tile.y - tile.size * 0.55, tile.spec.name, tile.spec.note ?? "");
        if (!this.discovered.has(tile.spec.id)) {
          this.discovered.add(tile.spec.id);
          this.onDiscover?.(this.discovered.size, this.specs.length);
          if (this.discovered.size === this.specs.length) this.celebrate();
        }

        const slot = this.slots[tile.slotIndex];
        if (slot) {
          slot.tile = null;
          slot.cooldown = randomRange(SHATTER_COOLDOWN_MIN, SHATTER_COOLDOWN_MAX);
        }
        return true;
      }
    }

    return false;
  }

  private getActiveTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].tile) {
        tiles.push(this.slots[i].tile!);
      }
    }
    return tiles;
  }

  private getTileSizeForTier(tier: ToolTier): number {
    switch (tier) {
      case "current":
        return Math.max(SIZE_CURRENT.factor * this.R, SIZE_CURRENT.min);
      case "learned":
        return Math.max(SIZE_LEARNED.factor * this.R, SIZE_LEARNED.min);
      case "exploring":
        return Math.max(SIZE_EXPLORING.factor * this.R, SIZE_EXPLORING.min);
    }
  }

  private getLifespanForTier(tier: ToolTier): number {
    switch (tier) {
      case "current":
        return randomRange(LIFESPAN_CURRENT.min, LIFESPAN_CURRENT.max);
      case "learned":
        return randomRange(LIFESPAN_LEARNED.min, LIFESPAN_LEARNED.max);
      case "exploring":
        return randomRange(LIFESPAN_EXPLORING.min, LIFESPAN_EXPLORING.max);
    }
  }

  private spawnTileForSlot(slotIndex: number): void {
    const slot = this.slots[slotIndex];
    const tier = slot.tier;

    // Filter tools untuk tier ini
    const tierSpecs = this.specs.filter((s) => s.tier === tier);
    if (tierSpecs.length === 0) return;

    // Ambil ID tools yang sedang aktif
    const activeIds = new Set<string>();
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].tile) {
        activeIds.add(this.slots[i].tile!.spec.id);
      }
    }

    // Hindari tool yang sedang aktif dan hindari tool yang baru saja tampil
    let candidates = tierSpecs.filter((s) => !activeIds.has(s.id) && s.id !== slot.lastToolId);
    if (candidates.length === 0) {
      candidates = tierSpecs.filter((s) => !activeIds.has(s.id));
    }
    if (candidates.length === 0) {
      candidates = tierSpecs;
    }

    const chosenSpec = candidates[Math.floor(Math.random() * candidates.length)];
    const size = this.getTileSizeForTier(tier);
    const radius = size * HIT_RADIUS_FACTOR;

    const pos = sampleZonePosition(
      tier,
      this.cx,
      this.cy,
      this.rx,
      this.ry,
      this.width,
      this.height,
      this.getActiveTiles(),
      radius,
    );

    const lifespan = this.getLifespanForTier(tier);
    slot.tile = createTile(chosenSpec, slotIndex, pos.x, pos.y, size, lifespan);
    slot.lastToolId = chosenSpec.id;
  }

  public update(dt: number): void {
    if (this.isPaused || this.isReducedMotion) return;

    this.time += dt;

    // Update setiap slot
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];

      if (slot.tile) {
        updateTile(slot.tile, dt, this.time);

        // Jika tile selesai keluar secara normal
        if (slot.tile.state === "dead") {
          slot.tile = null;
          slot.cooldown = randomRange(COOLDOWN_MIN, COOLDOWN_MAX);
          continue;
        }
      } else {
        slot.cooldown -= dt;
        if (slot.cooldown <= 0) {
          this.spawnTileForSlot(i);
        }
      }
    }

    // Update pecahan & ripple
    this.shatterSystem.update(dt);
    updateNotes(this.notes, dt);

    // Update hover tile
    if (this.hasPointer) {
      this.hoveredTile = null;
      const active = this.getActiveTiles();
      for (let i = active.length - 1; i >= 0; i--) {
        const t = active[i];
        if (t.state === "alive" || t.state === "entering") {
          const d = distance(this.pointerX, this.pointerY, t.x, t.y);
          if (d <= t.hitRadius) {
            this.hoveredTile = t;
            break;
          }
        }
      }
    } else {
      this.hoveredTile = null;
    }
  }

  public draw(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.isReducedMotion) {
      this.drawStaticFrame();
      return;
    }

    // 1. Panduan lingkaran zona & label
    drawZoneGuides(this.ctx, this.cx, this.cy, this.rx, this.ry, this.theme);

    // 2. Tile aktif
    const active = this.getActiveTiles();
    for (let i = 0; i < active.length; i++) {
      drawTile(this.ctx, active[i], this.theme);
    }

    // 3. Pecahan dan ripple
    this.shatterSystem.draw(this.ctx);
    drawNotes(this.ctx, this.notes, this.theme, this.width);

    // 4. Reticle jika kursor di dalam canvas (desktop)
    if (this.hasPointer && this.isFinePointer) {
      drawReticle(this.ctx, this.pointerX, this.pointerY, this.hoveredTile, this.theme);
    }
  }

  private drawStaticFrame(): void {
    drawZoneGuides(this.ctx, this.cx, this.cy, this.rx, this.ry, this.theme);

    // Susun semua tool secara deterministik di masing-masing zona
    const place = (tier: ToolTier) => {
      const specs = this.specs.filter((s) => s.tier === tier);
      const n = specs.length;
      if (n === 0) return;
      const { min, max } = getZoneFractions(tier);
      const f = (min + max) * 0.5;
      const a = f * this.rx;
      const b = f * this.ry;
      // Keliling elips (aproksimasi) membatasi ukuran agar tile tidak saling menimpa
      const circumference = 2 * Math.PI * Math.sqrt((a * a + b * b) / 2);
      const size = Math.max(26, Math.min(this.getTileSizeForTier(tier) * 0.7, (circumference / n) * 0.92));
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const tile = createTile(specs[i], i, this.cx + a * Math.cos(angle), this.cy + b * Math.sin(angle), size, 9999);
        tile.state = "alive";
        tile.scale = 1;
        tile.alpha = 1;
        drawTile(this.ctx, tile, this.theme);
      }
    };

    place("current");
    place("learned");
    place("exploring");
  }

  /** Semua tool sudah ditemukan: beberapa balon besar meletus di seluruh arena. */
  private celebrate(): void {
    for (let i = 0; i < 4; i++) {
      const spec = this.specs[Math.floor(Math.random() * this.specs.length)];
      const colors = getTileBaseColor(spec.tier, spec, this.theme);
      this.shatterSystem.spawnPop(
        randomRange(0.15, 0.85) * this.width,
        randomRange(0.2, 0.8) * this.height,
        this.getTileSizeForTier("current"),
        colors.base,
        colors.light,
        this.cx,
        this.cy,
      );
    }
  }

  public resetDiscovered(): void {
    this.discovered.clear();
    this.onDiscover?.(0, this.specs.length);
  }

  public destroy(): void {
    this.shatterSystem.clear();
    this.slots = [];
  }
}
