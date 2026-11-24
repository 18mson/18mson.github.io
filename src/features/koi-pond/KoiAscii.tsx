"use client";

import { useEffect, useRef, useState } from "react";

export type PondSnapshot = {
  fish: Array<{ x: number; y: number; angle: number; size: number; speed: number; pal: number }>;
  pads: Array<{ x: number; y: number; r: number; rot: number; flower: boolean; tone: number }>;
  w: number;
  h: number;
};

export type KoiAsciiProps = {
  className?: string;
  koiCount?: number | { narrow: number; mid: number; wide: number };
  /** ukuran font/sel dalam px */
  cell?: number;
  showHud?: boolean;
  onFeed?: (total: number) => void;
  active?: boolean;
  /** Snapshot posisi ikan & teratai dari kolam 2D untuk sinkronisasi awal */
  snapshot?: PondSnapshot | null;
  /** Dipanggil saat teratai besar diklik (agar bisa kembali ke mode 2D) */
  onLotusClick?: (x: number, y: number) => void;
  /** Kirim snapshot posisi ikan & teratai saat mode ASCII aktif tiap frame */
  onSnapshot?: (s: PondSnapshot) => void;
};

type Food = { x: number; y: number; vx: number; vy: number; life: number; big: boolean };
type Pt = { x: number; y: number };
type AsciiKoi = {
  seg: Pt[];
  angle: number;
  speed: number;
  size: number;
  phase: number;
  pal: number[];
  wx: number;
  wy: number;
  retarget: number;
  cruise: number;
  chase: number;
  boost: number;
};
type AsciiPad = {
  x: number;
  y: number;
  r: number;
  rot: number;
  flower: boolean;
  hoverBloom: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
};

const N_SEG = 14;
const PROFILE = [0.72, 0.95, 1, 0.96, 0.86, 0.74, 0.62, 0.5, 0.4, 0.32, 0.26, 0.2, 0.16, 0.12];
const HEAD = "@Oo";
const BODY = "0o*";
const TAIL = "+:.";

// palet warna ASCII koi (selalu dark)
const KOI_COLORS = ["#ff922b", "#ff6b6b", "#ffd43b", "#f1f3f5", "#ffc078"];

function makePattern(): number[] {
  const bases = [0, 4, 2];
  const accents = [1, 3, 1];
  const b = bases[Math.floor(Math.random() * bases.length)];
  const a = accents[Math.floor(Math.random() * accents.length)];
  const out: number[] = [];
  let cur = b;
  while (out.length < N_SEG) {
    const run = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < run && out.length < N_SEG; k++) out.push(cur);
    cur = cur === b ? a : b;
  }
  out[0] = b;
  out[1] = b;
  return out;
}

// Karakter ASCII teratai berdasarkan sektor sudut
const PAD_CHARS = ["(", ")", "[", "]", "{", "}", "<", ">", "o", "O", "0", "~"];
const LOTUS_CHARS = ["*", "+", "x", "@", "#", "o"];

export default function KoiAscii({
  className = "",
  koiCount = 6,
  cell = 12,
  showHud = true,
  onFeed,
  active = true,
  snapshot,
  onLotusClick,
  onSnapshot,
}: KoiAsciiProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFeedRef = useRef(onFeed);
  onFeedRef.current = onFeed;
  const onLotusClickRef = useRef(onLotusClick);
  onLotusClickRef.current = onLotusClick;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const applySnapshotRef = useRef<((s: PondSnapshot) => void) | null>(null);

  const [fed, setFed] = useState(0);
  const [hint, setHint] = useState(true);
  const [hoverLotus, setHoverLotus] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  // Terapkan snapshot posisi saat snapshot baru tiba
  useEffect(() => {
    if (snapshot && applySnapshotRef.current) {
      applySnapshotRef.current(snapshot);
    }
  }, [snapshot]);

  useEffect(() => {
    if (!active) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = reduce ? 0.4 : 1;

    let W = 1, H = 1;
    let cw = cell * 0.6;
    const ch = cell;
    let cols = 0, rows = 0;
    let a = new Float32Array(0);
    let b = new Float32Array(0);
    let koiChar = new Int16Array(0);
    let koiCol = new Uint8Array(0);

    const food: Food[] = [];
    const kois: AsciiKoi[] = [];
    const pads: AsciiPad[] = [];
    const ptr = { x: 0, y: 0, inside: false, last: -1e9, cx: -999, cy: -999 };

    let visible = true;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let t = 0;
    let fedCount = 0;

    const getLargestPad = (): AsciiPad | null => {
      if (!pads.length) return null;
      return pads.reduce((m, p) => (p.r > m.r ? p : m), pads[0]);
    };

    const pickWander = (k: AsciiKoi) => {
      const m = 60;
      k.wx = m + Math.random() * Math.max(1, W - m * 2);
      k.wy = m + Math.random() * Math.max(1, H - m * 2);
      k.retarget = 4 + Math.random() * 5;
    };

    const getTargetFishCount = () => {
      if (typeof koiCount === "number") return koiCount;
      if (typeof koiCount === "object" && koiCount !== null) {
        return W < 640 ? koiCount.narrow : W < 1024 ? koiCount.mid : koiCount.wide;
      }
      return W < 640 ? 5 : 7;
    };

    /** Inisialisasi ikan dari snapshot 2D atau acak */
    const initKois = (snap: PondSnapshot | null | undefined, sw: number, sh: number) => {
      kois.length = 0;
      const count = getTargetFishCount();
      for (let n = 0; n < count; n++) {
        const size = cell * (0.9 + Math.random() * 0.3);
        let angle: number, hx: number, hy: number;
        if (snap && snap.fish[n]) {
          const sf = snap.fish[n];
          hx = sw > 0 ? (sf.x / snap.w) * W : sf.x;
          hy = sh > 0 ? (sf.y / snap.h) * H : sf.y;
          angle = sf.angle;
        } else {
          angle = Math.random() * Math.PI * 2;
          hx = 80 + Math.random() * Math.max(1, W - 160);
          hy = 80 + Math.random() * Math.max(1, H - 160);
        }
        const spacing = size * 0.8;
        const seg: Pt[] = [];
        for (let i = 0; i < N_SEG; i++) {
          seg.push({ x: hx - Math.cos(angle) * i * spacing, y: hy - Math.sin(angle) * i * spacing });
        }
        const cruise = snap && snap.fish[n]?.speed ? snap.fish[n].speed : 46 + Math.random() * 32;
        const chase = 150 + Math.random() * 60;
        const k: AsciiKoi = {
          seg,
          angle,
          speed: cruise,
          cruise,
          chase,
          boost: 0,
          size,
          phase: Math.random() * 10,
          pal: makePattern(),
          wx: 0,
          wy: 0,
          retarget: 0,
        };
        pickWander(k);
        kois.push(k);
      }
    };

    /** Inisialisasi teratai dari snapshot 2D atau acak */
    const initPads = (snap: PondSnapshot | null | undefined) => {
      pads.length = 0;
      if (snap && snap.pads.length) {
        for (const sp of snap.pads) {
          const px = W > 0 && snap.w > 0 ? (sp.x / snap.w) * W : sp.x;
          const py = H > 0 && snap.h > 0 ? (sp.y / snap.h) * H : sp.y;
          pads.push({
            x: px,
            y: py,
            r: sp.r,
            rot: sp.rot,
            flower: sp.flower ?? false,
            hoverBloom: 0,
            vx: 0,
            vy: 0,
            fx: W > 0 ? px / W : 0.5,
            fy: H > 0 ? py / H : 0.5,
          });
        }
      } else {
        // Fallback: buat beberapa teratai acak
        const count = W < 640 ? 3 : W < 1024 ? 5 : 7;
        const flowerCount = W < 640 ? 1 : 2;
        let guard = 0;
        while (pads.length < count && guard++ < 300) {
          const isFirst = pads.length === 0;
          const isFlower = pads.length < flowerCount;
          const r = isFirst ? 55 + Math.random() * 7 : isFlower ? 44 + Math.random() * 6 : 30 + Math.random() * 14;
          const px = (0.04 + Math.random() * 0.92) * W;
          const py = (0.06 + Math.random() * 0.88) * H;
          if (Math.abs(py / H - 0.5) < 0.16) continue;
          if (pads.some((q) => Math.hypot(px - q.x, py - q.y) < (r + q.r) * 1.5)) continue;
          pads.push({
            x: px,
            y: py,
            r,
            rot: Math.random() * Math.PI * 2,
            flower: isFlower,
            hoverBloom: 0,
            vx: 0,
            vy: 0,
            fx: W > 0 ? px / W : 0.5,
            fy: H > 0 ? py / H : 0.5,
          });
        }
      }
    };

    const drop = (x: number, y: number, s: number) => {
      const gx = Math.floor(x / cw);
      const gy = Math.floor(y / ch);
      if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) return;
      const i = gy * cols + gx;
      a[i] = Math.max(-14, Math.min(14, a[i] + s));
      a[i - 1] = Math.max(-14, Math.min(14, a[i - 1] + s * 0.5));
      a[i + 1] = Math.max(-14, Math.min(14, a[i + 1] + s * 0.5));
      a[i - cols] = Math.max(-14, Math.min(14, a[i - cols] + s * 0.5));
      a[i + cols] = Math.max(-14, Math.min(14, a[i + cols] + s * 0.5));
    };

    const stepWave = () => {
      const ratio = ch / cw;
      const q = ratio * ratio;
      const ry = 0.8 / (1 + q);
      const rx = ry * q;
      for (let y = 1; y < rows - 1; y++) {
        let i = y * cols + 1;
        for (let x = 1; x < cols - 1; x++, i++) {
          const c = a[i];
          b[i] = (2 * c - b[i] + rx * (a[i - 1] + a[i + 1] - 2 * c) + ry * (a[i - cols] + a[i + cols] - 2 * c)) * 0.975;
        }
      }
      const tmp = a; a = b; b = tmp;
    };

    const updateKoi = (dt: number) => {
      for (const k of kois) {
        const head = k.seg[0];
        let tx = k.wx, ty = k.wy, chase = 0;

        // Kejar pakan terdekat
        let best: Food | null = null, bd = 1e9;
        for (const f of food) {
          const d = Math.hypot(f.x - head.x, f.y - head.y);
          if (d < bd) { bd = d; best = f; }
        }
        if (best && bd < 380) { tx = best.x; ty = best.y; chase = 1; }
        else if (ptr.inside && t - ptr.last < 3) {
          const d = Math.hypot(ptr.x - head.x, ptr.y - head.y);
          if (d < 320) { tx = ptr.x; ty = ptr.y; chase = d < 50 ? 0.2 : 0.6; }
        }

        if (!chase) {
          k.retarget -= dt;
          if (k.retarget <= 0 || Math.hypot(k.wx - head.x, k.wy - head.y) < 40) pickWander(k);
          tx = k.wx; ty = k.wy;
        }

        const want = Math.atan2(ty - head.y, tx - head.x);
        let diff = want - k.angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const turn = (chase === 1 ? 3.0 : 2.4) * dt * motion;
        k.angle += Math.max(-turn, Math.min(turn, diff));

        // Kecepatan berenang selaras persis dengan mode 2D
        const base = k.cruise;
        const target =
          chase === 1
            ? k.chase
            : chase === 0.6
              ? k.cruise + (k.chase - k.cruise) * 0.6
              : chase === 0.2
                ? k.cruise * 0.7
                : base;
        k.speed += (target * (1 + (k.boost || 0) * 0.35) - k.speed) * Math.min(1, dt * 2.2);
        if (k.boost) k.boost = Math.max(0, k.boost - dt * 1.2);

        head.x += Math.cos(k.angle) * k.speed * dt * motion;
        head.y += Math.sin(k.angle) * k.speed * dt * motion;
        head.x = Math.min(W, Math.max(0, head.x));
        head.y = Math.min(H, Math.max(0, head.y));

        const spacing = k.size * 0.8;
        for (let i = 1; i < N_SEG; i++) {
          const p = k.seg[i - 1], s = k.seg[i];
          let dx = s.x - p.x, dy = s.y - p.y;
          const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
          s.x = p.x + dx * spacing; s.y = p.y + dy * spacing;
        }
        k.phase += dt * (2.5 + k.speed * 0.06) * motion;
        drop(head.x, head.y, -Math.min(1.6, k.speed * 0.012));
        drop(k.seg[N_SEG - 1].x, k.seg[N_SEG - 1].y, -Math.min(0.8, k.speed * 0.006));

        // Makan pakan
        for (let fi = food.length - 1; fi >= 0; fi--) {
          const f = food[fi];
          if (Math.hypot(f.x - head.x, f.y - head.y) < k.size * 1.3) {
            food.splice(fi, 1);
            drop(f.x, f.y, f.big ? 5 : 1.5);
            k.boost = 1; // Dorongan akselerasi saat melahap pakan (seperti di mode 2D)
            if (f.big) {
              fedCount++; setFed(fedCount);
              onFeedRef.current?.(fedCount);
            }
          }
        }
      }

      for (let fi = food.length - 1; fi >= 0; fi--) {
        const f = food[fi];
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.vx *= 0.94; f.vy *= 0.94; f.life -= dt;
        if (f.life <= 0) { drop(f.x, f.y, 0.6); food.splice(fi, 1); }
      }

      // Update pergerakan fisik teratai & interaksi dorongan ikan (sama persis seperti mode 2D)
      for (const pad of pads) {
        // Terdorong oleh ikan (kepala dan 3 segmen terdepan)
        for (const k of kois) {
          for (let s = 0; s < Math.min(3, k.seg.length); s++) {
            const seg = k.seg[s];
            const dx = pad.x - seg.x;
            const dy = pad.y - seg.y;
            const dist = Math.hypot(dx, dy);
            const reach = pad.r + k.size * (1.1 - s * 0.18);
            if (dist < reach && dist > 0.001) {
              const overlap = (reach - dist) / reach;
              const nx = dx / dist;
              const ny = dy / dist;
              const pushForce = overlap * (140 + k.speed * 1.8) * dt;
              pad.vx += nx * pushForce;
              pad.vy += ny * pushForce;

              // Riak air ASCII saat teratai tersenggol ikan
              if (s === 0 && Math.random() < 0.3) {
                drop(pad.x, pad.y, -0.7 * overlap);
              }
            }
          }
        }

        // Hambatan air (drag) seperti di mode 2D
        const drag = Math.max(0, 1 - 1.6 * dt);
        pad.vx *= drag;
        pad.vy *= drag;
        if (Math.hypot(pad.vx, pad.vy) < 0.2) {
          pad.vx = 0;
          pad.vy = 0;
        }

        // Tolakan dari tepi batas kolam (cushion bounce seperti 2D)
        const margin = pad.r * 1.1;
        if (pad.x < margin) {
          pad.vx += ((margin - pad.x) / margin) * 100 * dt;
          if (pad.x < pad.r * 0.6) {
            pad.x = pad.r * 0.6;
            pad.vx = Math.max(0, pad.vx * 0.2);
          }
        } else if (pad.x > W - margin) {
          pad.vx -= ((pad.x - (W - margin)) / margin) * 100 * dt;
          if (pad.x > W - pad.r * 0.6) {
            pad.x = W - pad.r * 0.6;
            pad.vx = -Math.max(0, -pad.vx * 0.2);
          }
        }

        if (pad.y < margin) {
          pad.vy += ((margin - pad.y) / margin) * 100 * dt;
          if (pad.y < pad.r * 0.6) {
            pad.y = pad.r * 0.6;
            pad.vy = Math.max(0, pad.vy * 0.2);
          }
        } else if (pad.y > H - margin) {
          pad.vy -= ((pad.y - (H - margin)) / margin) * 100 * dt;
          if (pad.y > H - pad.r * 0.6) {
            pad.y = H - pad.r * 0.6;
            pad.vy = -Math.max(0, -pad.vy * 0.2);
          }
        }

        // Integrasi posisi dan rotasi teratai saat hanyut (posisi berpindah secara dinamis)
        pad.x += pad.vx * dt;
        pad.y += pad.vy * dt;
        pad.rot += (pad.vx * 0.008 - pad.vy * 0.008) * dt;
        pad.fx = W > 0 ? pad.x / W : 0.5;
        pad.fy = H > 0 ? pad.y / H : 0.5;
      }

      // Deteksi & Pemisahan Tabrakan Fisik Antar-Teratai (2 iterasi momentum seperti 2D)
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < pads.length; i++) {
          for (let j = i + 1; j < pads.length; j++) {
            const p1 = pads[i];
            const p2 = pads[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p1.r + p2.r;
            if (dist < minDist && dist > 0.0001) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              p1.x -= nx * (overlap * 0.5);
              p1.y -= ny * (overlap * 0.5);
              p2.x += nx * (overlap * 0.5);
              p2.y += ny * (overlap * 0.5);

              // Pantulan elastis momentum
              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const vn = kx * nx + ky * ny;
              if (vn > 0) {
                const impulse = 1.2 * vn;
                p1.vx -= impulse * 0.5 * nx;
                p1.vy -= impulse * 0.5 * ny;
                p2.vx += impulse * 0.5 * nx;
                p2.vy += impulse * 0.5 * ny;
              }
            }
          }
        }
      }

      // Update hover bloom teratai bunga
      for (const pad of pads) {
        let targetBloom = 0;
        if (pad.flower && ptr.inside) {
          const dist = Math.hypot(ptr.x - pad.x, ptr.y - pad.y);
          if (dist <= pad.r) targetBloom = 1;
          else if (dist <= pad.r * 2.2) targetBloom = Math.pow(1 - (dist - pad.r) / (pad.r * 1.2), 1.4);
        }
        pad.hoverBloom += (targetBloom - pad.hoverBloom) * Math.min(1, dt * 5.5);
        // Riak dari teratai bunga
        if (pad.flower && t % 5 < dt) drop(pad.x, pad.y, -0.6);
      }
    };

    const SHIMMER = "~";

    /** Render teratai dalam karakter ASCII */
    const drawPadAscii = (pad: AsciiPad) => {
      const r = pad.r;
      const isKing = pad === getLargestPad();
      const bloom = pad.hoverBloom;

      // Render lingkaran karakter untuk badan teratai
      const outerRing = Math.round(r / (cw * 0.5)) + 2;
      for (let dy = -outerRing; dy <= outerRing; dy++) {
        for (let dx = -outerRing; dx <= outerRing; dx++) {
          const px = pad.x + dx * cw * 0.5;
          const py = pad.y + dy * ch * 0.5;
          const dist = Math.hypot(px - pad.x, py - pad.y);
          if (dist > r) continue;

          const gx = Math.floor(px / cw);
          const gy = Math.floor(py / ch);
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;

          // Jangan timpa badan ikan
          const ci = gy * cols + gx;
          if (koiChar[ci] >= 0) continue;

          const angle = Math.atan2(py - pad.y, px - pad.x) - pad.rot;
          const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const sector = Math.floor((normalizedAngle / (Math.PI * 2)) * PAD_CHARS.length);
          const edgeDist = dist / r;

          let char: string;
          let alpha: number;
          let colorStr: string;

          if (edgeDist < 0.3) {
            // Inti teratai
            if (pad.flower && edgeDist < 0.15) {
              const lotusIdx = Math.floor(t * 3 + normalizedAngle * 2) % LOTUS_CHARS.length;
              char = LOTUS_CHARS[lotusIdx];
              const lotusR = bloom > 0.3 ? Math.round(255 * Math.min(1, bloom)) : 244;
              const lotusG = bloom > 0.3 ? Math.round(140 * (1 - bloom)) : 200;
              colorStr = `rgb(${lotusR}, ${lotusG}, 100)`;
              alpha = 0.9 + bloom * 0.1;
            } else {
              char = pad.flower ? "*" : "o";
              colorStr = bloom > 0.3 ? "#ffd43b" : "#a3cfb5";
              alpha = 0.85;
            }
          } else {
            // Daun teratai
            char = PAD_CHARS[sector % PAD_CHARS.length];
            const isEdge = edgeDist > 0.82;
            colorStr = isEdge ? "#4a9070" : "#6fae8a";
            alpha = isEdge ? 0.6 : 0.75;
          }

          if (isKing && edgeDist < 0.3 && bloom > 0.1) {
            alpha = Math.min(1, alpha + bloom * 0.2);
          }

          ctx.globalAlpha = alpha;
          ctx.fillStyle = colorStr;
          ctx.fillText(char, (gx + 0.5) * cw, (gy + 0.5) * ch + 1);
        }
      }

      // Dot kursor hover pada teratai bunga
      if (pad.flower && bloom > 0.05) {
        ctx.globalAlpha = bloom * 0.9;
        ctx.fillStyle = "#ffd43b";
        ctx.font = `bold ${cell + 2}px ui-monospace, monospace`;
        ctx.fillText("@", pad.x, pad.y);
        ctx.font = `${cell}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      }
    };

    const draw = () => {
      // Background gelap solid
      ctx.fillStyle = "#071719";
      ctx.fillRect(0, 0, W, H);

      ctx.font = `${cell}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const ink = "#e9ecef";

      // Stamp badan ikan ke grid karakter
      koiChar.fill(-1);
      const koiCells: number[] = [];
      for (const k of kois) {
        const pos: Pt[] = [];
        for (let i = 0; i < N_SEG; i++) {
          const prev = k.seg[Math.max(i - 1, 0)];
          const next = k.seg[Math.min(i + 1, N_SEG - 1)];
          let tx = prev.x - next.x, ty = prev.y - next.y;
          const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
          const amp = k.size * 0.45 * Math.pow(i / (N_SEG - 1), 1.1) * motion;
          const off = Math.sin(k.phase - i * 0.55) * amp;
          pos.push({ x: k.seg[i].x - ty * off, y: k.seg[i].y + tx * off });
        }
        for (let i = N_SEG - 1; i >= 0; i--) {
          const r = PROFILE[i] * k.size;
          const f = i / (N_SEG - 1);
          const set = f < 0.12 ? HEAD : f < 0.7 ? BODY : TAIL;
          const p = pos[i];
          const x0 = Math.max(0, Math.floor((p.x - r) / cw));
          const x1 = Math.min(cols - 1, Math.floor((p.x + r) / cw));
          const y0 = Math.max(0, Math.floor((p.y - r) / ch));
          const y1 = Math.min(rows - 1, Math.floor((p.y + r) / ch));
          for (let gy = y0; gy <= y1; gy++) {
            for (let gx = x0; gx <= x1; gx++) {
              const dist = Math.hypot((gx + 0.5) * cw - p.x, (gy + 0.5) * ch - p.y);
              if (dist > r) continue;
              const tt = dist / r;
              const idx = tt < 0.45 ? 0 : tt < 0.8 ? 1 : 2;
              const ci = gy * cols + gx;
              if (koiChar[ci] < 0) koiCells.push(ci);
              koiChar[ci] = set.charCodeAt(idx);
              koiCol[ci] = k.pal[i];
            }
          }
        }
      }

      // Air: riak + kilau
      ctx.fillStyle = ink;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const i = gy * cols + gx;
          if (koiChar[i] >= 0) continue;
          const m = Math.abs(a[i]);
          let glyph = "", alpha = 0;
          if (m > 0.05) {
            glyph = m < 0.12 ? "." : m < 0.3 ? "-" : m < 0.6 ? "~" : m < 1.2 ? "=" : "o";
            alpha = Math.min(0.5, 0.12 + m * 0.35);
          } else {
            const v = Math.sin(gx * 0.35 + t * 0.9) + Math.sin(gy * 0.55 - t * 0.6) + Math.sin((gx + gy) * 0.2 + t * 0.4);
            if (v > 2.1) { glyph = SHIMMER; alpha = 0.16; }
            else if (v > 1.85) { glyph = "."; alpha = 0.12; }
          }
          if (glyph) {
            ctx.globalAlpha = alpha;
            ctx.fillText(glyph, (gx + 0.5) * cw, (gy + 0.5) * ch + 1);
          }
        }
      }

      // Render teratai ASCII (di bawah ikan)
      for (const pad of pads) drawPadAscii(pad);

      // Pakan
      for (const f of food) {
        if (f.big) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#ffd43b";
          ctx.fillText("o", f.x, f.y + Math.sin(t * 3 + f.x) * 1.2);
        } else {
          ctx.globalAlpha = Math.min(1, f.life / 1.2) * 0.7;
          ctx.fillStyle = ink;
          ctx.fillText(".", f.x, f.y);
        }
      }

      // Render ikan
      ctx.globalAlpha = 0.96;
      for (const ci of koiCells) {
        ctx.fillStyle = KOI_COLORS[koiCol[ci]];
        const gx = ci % cols;
        const gy = (ci - gx) / cols;
        ctx.fillText(String.fromCharCode(koiChar[ci]), (gx + 0.5) * cw, (gy + 0.5) * ch + 1);
      }

      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      acc += dt;
      let n = 0;
      const STEP = 1 / 60;
      while (acc >= STEP && n < 3) { stepWave(); updateKoi(STEP); acc -= STEP; n++; }
      if (acc > STEP) acc = 0;
      draw();

      if (onSnapshotRef.current && kois.length > 0) {
        onSnapshotRef.current({
          fish: kois.map((k) => ({
            x: k.seg[0].x,
            y: k.seg[0].y,
            angle: k.angle,
            size: k.size,
            speed: k.speed,
            pal: 0,
          })),
          pads: pads.map((p) => ({
            x: p.x,
            y: p.y,
            r: p.r,
            rot: p.rot,
            flower: p.flower,
            tone: 0,
          })),
          w: W,
          h: H,
        });
      }
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, Math.floor(r.width));
      H = Math.max(1, Math.floor(r.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${cell}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      cw = ctx.measureText("M").width || cell * 0.6;
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      a = new Float32Array(cols * rows);
      b = new Float32Array(cols * rows);
      koiChar = new Int16Array(cols * rows);
      koiCol = new Uint8Array(cols * rows);

      if (!kois.length) {
        initKois(snapshotRef.current, W, H);
        initPads(snapshotRef.current);
      } else {
        const targetCount = getTargetFishCount();
        while (kois.length < targetCount) {
          const size = cell * (0.9 + Math.random() * 0.3);
          const angle = Math.random() * Math.PI * 2;
          const hx = 80 + Math.random() * Math.max(1, W - 160);
          const hy = 80 + Math.random() * Math.max(1, H - 160);
          const spacing = size * 0.8;
          const seg: Pt[] = [];
          for (let i = 0; i < N_SEG; i++) {
            seg.push({ x: hx - Math.cos(angle) * i * spacing, y: hy - Math.sin(angle) * i * spacing });
          }
          const cruise = 46 + Math.random() * 32;
          const chase = 150 + Math.random() * 60;
          const k: AsciiKoi = {
            seg,
            angle,
            speed: cruise,
            cruise,
            chase,
            boost: 0,
            size,
            phase: Math.random() * 10,
            pal: makePattern(),
            wx: 0,
            wy: 0,
            retarget: 0,
          };
          pickWander(k);
          kois.push(k);
        }
        while (kois.length > targetCount) {
          kois.pop();
        }

        for (const k of kois) {
          for (const p of k.seg) {
            p.x = Math.min(W, Math.max(0, p.x));
            p.y = Math.min(H, Math.max(0, p.y));
          }
          pickWander(k);
        }
        // Re-scale pad positions
        for (const pad of pads) {
          if (pad.fx !== undefined && pad.fy !== undefined) {
            pad.x = pad.fx * W;
            pad.y = pad.fy * H;
          }
          pad.x = Math.min(W, Math.max(0, pad.x));
          pad.y = Math.min(H, Math.max(0, pad.y));
        }
      }
    };

    applySnapshotRef.current = (snap: PondSnapshot) => {
      initKois(snap, W, H);
      initPads(snap);
    };

    // Input: listen di window agar teks/overlay tidak memblokir
    const local = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      return { x, y, inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height };
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      ptr.inside = p.inside;
      if (!p.inside) return;
      ptr.x = p.x; ptr.y = p.y; ptr.last = t;
      drop(p.x, p.y, 1.2);

      // Sentuhan halus kursor pada teratai saat melintas di dekatnya
      for (const pad of pads) {
        const d = Math.hypot(p.x - pad.x, p.y - pad.y);
        if (d < pad.r && d > 0.001) {
          const push = (1 - d / pad.r) * 16;
          pad.vx += ((pad.x - p.x) / d) * push;
          pad.vy += ((pad.y - p.y) / d) * push;
        }
      }

      // Deteksi kursor hover teratai untuk tooltip & pointer (hanya teratai berbunga)
      const hoveredPad = pads.find((pad) => pad.flower && Math.hypot(p.x - pad.x, p.y - pad.y) <= pad.r);
      if (hoveredPad) {
        document.body.style.cursor = "pointer";
        setHoverLotus({ active: true, x: hoveredPad.x, y: hoveredPad.y });
      } else {
        if (document.body.style.cursor === "pointer") {
          document.body.style.cursor = "";
        }
        setHoverLotus((prev) => (prev.active ? { active: false, x: 0, y: 0 } : prev));
      }

      if (Math.hypot(p.x - ptr.cx, p.y - ptr.cy) > 36 && food.length < 60) {
        ptr.cx = p.x; ptr.cy = p.y;
        food.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 2.4, big: false });
      }
    };

    const onDown = (e: PointerEvent) => {
      const p = local(e);
      if (!p.inside) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("a,button,input,textarea,select,[data-no-feed]")) return;

      // Cek klik teratai (hanya teratai berbunga) → trigger balik ke 2D
      const clickedPad = pads.find((pad) => pad.flower && Math.hypot(p.x - pad.x, p.y - pad.y) <= pad.r);
      if (clickedPad) {
        if (document.body.style.cursor === "pointer") {
          document.body.style.cursor = "";
        }
        setHoverLotus({ active: false, x: 0, y: 0 });
        onLotusClickRef.current?.(clickedPad.x, clickedPad.y);
        // Riak besar
        drop(clickedPad.x, clickedPad.y, 8);
        return;
      }

      drop(p.x, p.y, 8);
      for (let n = 0; n < 5; n++) {
        food.push({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 14, big: true,
        });
      }
      setHint(false);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(wrap);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
      applySnapshotRef.current = null;
    };
  }, [koiCount, cell, active]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden bg-[#071719] ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {showHud && (
        <div className="pointer-events-none absolute bottom-4 left-4 select-none font-mono text-xs opacity-60 text-[#e2eceb]">
          <div>fed {fed}</div>
          {hint && <div>Dark mode 2D</div>}
        </div>
      )}
      {hoverLotus.active && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-full border border-[#e2eceb]/20 bg-[#071719]/90 px-3 py-1 font-mono text-xs text-[#e2eceb] shadow-lg backdrop-blur-md transition-opacity duration-150"
          style={{
            left: `${hoverLotus.x}px`,
            top: `${hoverLotus.y - 14}px`,
          }}
        >
          Dark mode 2D
        </div>
      )}
    </div>
  );
}
