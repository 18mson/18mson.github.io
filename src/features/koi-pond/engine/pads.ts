import { PAD_COLORS, TAU } from "./constants";
import { rand } from "./math";
import type { Fish, Pad } from "./types";

/** Letakkan daun di pinggir kolam, menjauhi pita tengah tempat nama berada. */
export const layoutPads = (w: number, h: number, scale: number, existingPads: Pad[]): Pad[] => {
  const target = w < 640 ? 3 : w < 1024 ? 5 : 7;
  let pads = existingPads;
  if (pads.length !== target) {
    const flowers = w < 640 ? 1 : 2;
    const newPads: Pad[] = [];
    let guard = 0;
    while (newPads.length < target && guard++ < 300) {
      const flower = newPads.length < flowers;
      const baseR = flower ? rand(46, 58) : rand(30, 46);
      const fx = rand(0.04, 0.96);
      const fy = rand(0.06, 0.94);
      if (Math.abs(fy - 0.5) < 0.16) continue;
      if (newPads.some((q) => Math.hypot((fx - q.fx) * 1300, (fy - q.fy) * 800) < (baseR + q.baseR) * 1.5)) continue;
      newPads.push({
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
    pads = newPads;
    for (const p of pads) {
      p.x = p.fx * w;
      p.y = p.fy * h;
    }
  }
  for (const p of pads) p.r = p.baseR * scale;
  return pads;
};

export const updatePads = (pads: Pad[], fish: Fish[], dt: number, _t: number, w: number, h: number) => {
  for (const p of pads) {
    // 1) Terdorong oleh ikan (kepala dan bagian depan tubuh)
    for (const f of fish) {
      for (let s = 0; s < Math.min(3, f.pts.length); s++) {
        const pt = f.pts[s];
        const dx = p.x - pt.x;
        const dy = p.y - pt.y;
        const d = Math.hypot(dx, dy);
        const reach = p.r + f.len * (0.13 - s * 0.02);
        if (d < reach && d > 0.001) {
          const overlap = 1 - d / reach;
          // Dorongan bertambah jika ikan sedang melaju cepat
          const pushForce = overlap * (140 + f.v * (1.0 - s * 0.2)) * dt;
          p.vx += (dx / d) * pushForce;
          p.vy += (dy / d) * pushForce;
        }
      }
    }

    // 2) Tolakan halus antar-teratai agar tidak saling menumpuk rapat
    for (const other of pads) {
      if (other === p) continue;
      const ox = p.x - other.x;
      const oy = p.y - other.y;
      const dist = Math.hypot(ox, oy);
      const minDist = (p.r + other.r) * 0.9;
      if (dist < minDist && dist > 0.001) {
        const overlap = (minDist - dist) / minDist;
        const push = overlap * 60 * dt;
        p.vx += (ox / dist) * push;
        p.vy += (oy / dist) * push;
      }
    }

    // 3) Gesekan/hambatan air (drag): melamban secara bertahap lalu berhenti di mana pun
    const drag = Math.max(0, 1 - 1.6 * dt);
    p.vx *= drag;
    p.vy *= drag;

    // Hentikan sepenuhnya jika laju sudah sangat kecil
    if (Math.hypot(p.vx, p.vy) < 0.2) {
      p.vx = 0;
      p.vy = 0;
    }

    // 4) Tolakan lembut dari tepi kolam agar tetap terlihat di dalam layar
    const margin = p.r * 1.1;
    if (p.x < margin) {
      p.vx += ((margin - p.x) / margin) * 100 * dt;
      if (p.x < p.r * 0.6) {
        p.x = p.r * 0.6;
        p.vx = Math.max(0, p.vx * 0.2);
      }
    } else if (p.x > w - margin) {
      p.vx -= ((p.x - (w - margin)) / margin) * 100 * dt;
      if (p.x > w - p.r * 0.6) {
        p.x = w - p.r * 0.6;
        p.vx = -Math.max(0, -p.vx * 0.2);
      }
    }

    if (p.y < margin) {
      p.vy += ((margin - p.y) / margin) * 100 * dt;
      if (p.y < p.r * 0.6) {
        p.y = p.r * 0.6;
        p.vy = Math.max(0, p.vy * 0.2);
      }
    } else if (p.y > h - margin) {
      p.vy -= ((p.y - (h - margin)) / margin) * 100 * dt;
      if (p.y > h - p.r * 0.6) {
        p.y = h - p.r * 0.6;
        p.vy = -Math.max(0, -p.vy * 0.2);
      }
    }

    // 5) Integrasi pergerakan posisi dan rotasi
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += (p.vx * 0.008 - p.vy * 0.008) * dt;

    // Simpan rasio posisi (fx, fy) agar saat resize layar tetap proporsional
    if (w > 0 && h > 0) {
      p.fx = p.x / w;
      p.fy = p.y / h;
    }
  }
};

export const drawPad = (ctx: CanvasRenderingContext2D, p: Pad, t: number, scale: number) => {
  const r = p.r;
  const rot = p.rot + Math.sin(t * 0.12 + p.ph) * 0.06;
  const a0 = rot + p.gap / 2;
  const a1 = rot + TAU - p.gap / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, r, a0, a1);
    ctx.closePath();
  };

  ctx.save();
  ctx.translate(5 * scale, 9 * scale);
  path();
  ctx.fillStyle = "rgba(8,48,52,0.12)";
  ctx.fill();
  ctx.restore();

  path();
  ctx.fillStyle = PAD_COLORS[p.tone];
  ctx.fill();

  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.arc(p.x - r * 0.18, p.y - r * 0.2, r * 0.7, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    const a = a0 + ((k + 0.5) / 9) * (TAU - p.gap);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();

  path();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(20,80,55,0.35)";
  ctx.stroke();
};

export const drawLotus = (ctx: CanvasRenderingContext2D, p: Pad, t: number) => {
  const R = p.r * 0.82;
  const breathe = 1 + Math.sin(t * 0.8 + p.ph) * 0.015;
  const layers = [
    { n: 9, r0: R * 0.25, r1: R, w: R * 0.34, fill: "#f9dbe3", off: 0 },
    { n: 8, r0: R * 0.18, r1: R * 0.78, w: R * 0.32, fill: "#f4b3c6", off: Math.PI / 8 },
    { n: 6, r0: R * 0.1, r1: R * 0.5, w: R * 0.28, fill: "#ec86a5", off: 0.3 },
  ];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot * 0.5 + p.ph);
  ctx.scale(breathe, breathe);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(180,70,105,0.35)";
  for (const L of layers) {
    ctx.fillStyle = L.fill;
    for (let i = 0; i < L.n; i++) {
      ctx.save();
      ctx.rotate(L.off + (i * TAU) / L.n);
      const mid = (L.r0 + L.r1) / 2;
      ctx.beginPath();
      ctx.moveTo(L.r0, 0);
      ctx.quadraticCurveTo(mid, L.w, L.r1, 0);
      ctx.quadraticCurveTo(mid, -L.w, L.r0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.fillStyle = "#f4d35e";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e8a93a";
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 0.21, Math.sin(a) * R * 0.21, Math.max(1, R * 0.03), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};
