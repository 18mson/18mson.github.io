import { TAU, mulberry32 } from "./math";

/** Warna bintang: hangat (inti), putih-biru, biru, merah muda (gas di lengan), putih. */
export const STAR_COLORS: [number, number, number][] = [
  [255, 226, 184],
  [196, 216, 255],
  [150, 184, 255],
  [255, 176, 214],
  [244, 246, 255],
];
export const ALPHA_TIERS = [0.35, 0.6, 0.95];
export const BUCKETS = STAR_COLORS.length * ALPHA_TIERS.length;

/** Koordinat dalam satuan jari-jari galaksi (1 = tepi). Disimpan terurut per bucket warna/terang. */
export interface StarField {
  count: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  size: Float32Array;
  start: Int32Array; // BUCKETS + 1
}

const ARM_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
const ARM_WEIGHTS = [0.34, 0.16, 0.34, 0.16];
const PITCH_WIND = 2.9; // seberapa rapat lengan spiral melilit

export function buildStars(count: number, seed = 7): StarField {
  const rng = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rng());
  };

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const z = new Float32Array(count);
  const size = new Float32Array(count);
  const bucket = new Uint8Array(count);

  const pick = (...ids: number[]) => ids[Math.floor(rng() * ids.length)];
  const alphaTier = () => {
    const t = rng();
    return t < 0.5 ? 0 : t < 0.85 ? 1 : 2;
  };

  for (let i = 0; i < count; i++) {
    const t = rng();
    let ci: number;

    if (t < 0.16) {
      // tonjolan pusat
      x[i] = gauss() * 0.11;
      y[i] = gauss() * 0.075;
      z[i] = gauss() * 0.11;
      ci = pick(0, 0, 0, 4);
    } else if (t < 0.26) {
      // bar memanjang di inti, seperti Bimasakti
      const bx = gauss() * 0.2;
      const bz = gauss() * 0.045;
      const c = Math.cos(0.5);
      const s = Math.sin(0.5);
      x[i] = bx * c - bz * s;
      z[i] = bx * s + bz * c;
      y[i] = gauss() * 0.02;
      ci = pick(0, 0, 4);
    } else if (t < 0.88) {
      // lengan spiral logaritmik
      let a = rng();
      let arm = 0;
      for (; arm < ARM_WEIGHTS.length - 1; arm++) {
        if (a < ARM_WEIGHTS[arm]) break;
        a -= ARM_WEIGHTS[arm];
      }
      const r = 0.1 + 0.9 * Math.pow(rng(), 1.2);
      const theta = ARM_ANGLES[arm] + Math.log(r / 0.1) * PITCH_WIND + gauss() * (0.16 + 0.22 * r);
      x[i] = r * Math.cos(theta);
      z[i] = r * Math.sin(theta);
      y[i] = gauss() * (0.012 + 0.02 * (1 - r));
      ci = r < 0.3 ? pick(0, 4, 1) : rng() < 0.12 ? 3 : pick(1, 2, 2, 4);
    } else {
      // bintang cakram di antara lengan
      const r = 0.1 + 0.9 * Math.pow(rng(), 1.15);
      const theta = rng() * TAU;
      x[i] = r * Math.cos(theta);
      z[i] = r * Math.sin(theta);
      y[i] = gauss() * 0.018;
      ci = pick(1, 2, 4);
    }

    size[i] = 0.6 + Math.pow(rng(), 3) * 1.5;
    bucket[i] = ci * ALPHA_TIERS.length + alphaTier();
  }

  // urutkan per bucket supaya fillStyle/alpha cukup diset sekali per kelompok
  const start = new Int32Array(BUCKETS + 1);
  for (let i = 0; i < count; i++) start[bucket[i] + 1]++;
  for (let b = 0; b < BUCKETS; b++) start[b + 1] += start[b];
  const cursor = start.slice(0, BUCKETS);

  const sx = new Float32Array(count);
  const sy = new Float32Array(count);
  const sz = new Float32Array(count);
  const ss = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const j = cursor[bucket[i]]++;
    sx[j] = x[i];
    sy[j] = y[i];
    sz[j] = z[i];
    ss[j] = size[i];
  }
  return { count, x: sx, y: sy, z: sz, size: ss, start };
}
