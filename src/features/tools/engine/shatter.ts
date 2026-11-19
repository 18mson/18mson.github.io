import { AIR_DRAG, GRAVITY, MAX_SHARDS, POP_LIFESPAN, SHARDS_PER_POP } from "./constants";
import { randomRange } from "./math";
import type { Ripple, Shard } from "./types";

interface PopFlash {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export class ShatterSystem {
  private shards: Shard[];
  private waves: Ripple[];
  private flashes: PopFlash[];

  constructor() {
    this.shards = new Array(MAX_SHARDS);
    for (let i = 0; i < MAX_SHARDS; i++) {
      this.shards[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        vrot: 0,
        alpha: 1,
        age: 0,
        lifespan: POP_LIFESPAN,
        color: "",
        width: 0,
        height: 0,
        curve: 0,
      };
    }

    this.waves = new Array(8);
    for (let i = 0; i < 8; i++) {
      this.waves[i] = {
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 40,
        alpha: 1,
        color: "",
        lineWidth: 2.5,
      };
    }

    this.flashes = new Array(6);
    for (let i = 0; i < 6; i++) {
      this.flashes[i] = {
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 20,
        alpha: 1,
      };
    }
  }

  // Animasi pecah balon instan & cepat
  public spawnPop(
    x: number,
    y: number,
    size: number,
    color: string,
    lightColor: string,
    hitX: number,
    hitY: number
  ): void {
    const numShards = SHARDS_PER_POP;
    const r = size * 0.45;
    const angleOffset = Math.atan2(hitY - y, hitX - x);

    let spawned = 0;
    for (let i = 0; i < MAX_SHARDS && spawned < numShards; i++) {
      const shard = this.shards[i];
      if (shard.active) continue;

      // Sebaran radial dari pusat balon
      const baseAngle = (Math.PI * 2 * spawned) / numShards + randomRange(-0.25, 0.25);
      // Ledakan lebih kuat ke arah berlawanan dari tusukan tembakan
      const dirBias = Math.cos(baseAngle - angleOffset) * 60;
      const speed = randomRange(320, 580) + dirBias;

      shard.active = true;
      shard.x = x + r * 0.3 * Math.cos(baseAngle);
      shard.y = y + r * 0.3 * Math.sin(baseAngle);
      shard.vx = Math.cos(baseAngle) * speed;
      shard.vy = Math.sin(baseAngle) * speed;
      shard.rotation = randomRange(0, Math.PI * 2);
      shard.vrot = randomRange(-16, 16);
      shard.alpha = 1;
      shard.age = 0;
      shard.lifespan = randomRange(POP_LIFESPAN * 0.8, POP_LIFESPAN * 1.15);
      // Variasi warna: sebagian warna badan balon, sebagian highlight
      shard.color = Math.random() < 0.35 ? lightColor : color;

      // Bentuk sobekan karet balon (pipih melengkung / oval tirus)
      shard.width = randomRange(size * 0.12, size * 0.24);
      shard.height = randomRange(size * 0.05, size * 0.1);
      shard.curve = randomRange(-0.4, 0.4);

      spawned++;
    }

    // 1. Gelombang udara pop (shockwave ring)
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      if (!wave.active) {
        wave.active = true;
        wave.x = x;
        wave.y = y;
        wave.radius = size * 0.15;
        wave.maxRadius = size * 0.95;
        wave.alpha = 0.95;
        wave.color = lightColor;
        wave.lineWidth = 3;
        break;
      }
    }

    // 2. Kilatan putih instan di titik ledakan balon (~0.08s)
    for (let i = 0; i < this.flashes.length; i++) {
      const flash = this.flashes[i];
      if (!flash.active) {
        flash.active = true;
        flash.x = x;
        flash.y = y;
        flash.radius = size * 0.1;
        flash.maxRadius = size * 0.4;
        flash.alpha = 0.85;
        break;
      }
    }
  }

  // Kompatibilitas mundur
  public spawnShatter(
    x: number,
    y: number,
    size: number,
    color: string,
    hitX: number,
    hitY: number
  ): void {
    this.spawnPop(x, y, size, color, "#ffffff", hitX, hitY);
  }

  public update(dt: number): void {
    // Update kepingan karet
    for (let i = 0; i < this.shards.length; i++) {
      const s = this.shards[i];
      if (!s.active) continue;

      s.age += dt;
      if (s.age >= s.lifespan) {
        s.active = false;
        continue;
      }

      // Fisika karet balon: kecepatan awal tinggi lalu teredam cepat oleh hambatan udara
      s.vx *= AIR_DRAG;
      s.vy *= AIR_DRAG;
      s.vy += GRAVITY * dt;

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rotation += s.vrot * dt;

      // Pudar cepat di akhir durasi
      const progress = s.age / s.lifespan;
      s.alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
    }

    // Update shockwave ring
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (!w.active) continue;

      w.radius += (w.maxRadius - w.radius) * (dt * 18);
      w.alpha -= dt * 4.5;
      w.lineWidth = Math.max(0.5, w.lineWidth - dt * 6);
      if (w.alpha <= 0.02 || w.radius >= w.maxRadius - 2) {
        w.active = false;
      }
    }

    // Update kilatan pop
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;

      f.radius += (f.maxRadius - f.radius) * (dt * 26);
      f.alpha -= dt * 9;
      if (f.alpha <= 0.02) {
        f.active = false;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 1. Gambar kilatan pop instan
    ctx.save();
    for (let i = 0; i < this.flashes.length; i++) {
      const f = this.flashes[i];
      if (!f.active) continue;

      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Gambar shockwave ring
    ctx.save();
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i];
      if (!w.active) continue;

      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = w.lineWidth;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Gambar sobekan karet balon yang terpental
    for (let i = 0; i < this.shards.length; i++) {
      const s = this.shards[i];
      if (!s.active) continue;

      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);

      // Bentuk lengkung karet balon
      ctx.beginPath();
      ctx.ellipse(0, 0, s.width, s.height, s.curve, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  public clear(): void {
    for (let i = 0; i < this.shards.length; i++) {
      this.shards[i].active = false;
    }
    for (let i = 0; i < this.waves.length; i++) {
      this.waves[i].active = false;
    }
    for (let i = 0; i < this.flashes.length; i++) {
      this.flashes[i].active = false;
    }
  }
}
