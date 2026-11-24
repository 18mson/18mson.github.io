import { pack32, shade, type RGB } from "./colors";

export const K_NONE = 0;
export const K_BODY = 1;
export const K_GLOW = 4;

/** Sprite bintang pixel-art. px: warna ABGR (inti/kilau) atau RGB tambahan (glow). */
export interface PixelSprite {
  w: number;
  h: number;
  cx: number;
  cy: number;
  px: Uint32Array;
  kind: Uint8Array;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const col = (c: RGB) => pack32(c[0], c[1], c[2]);

/**
 * Bintang pixel-art: inti putih-panas bertinta warna merek, kilau empat arah yang menirus
 * (makin pendek makin redup), kilau diagonal untuk bintang besar, dan glow berpola titik.
 * r = ukuran logis dalam piksel buffer; panjang kilau = r + 2.
 */
export function makePixelStar(rgb: RGB, r: number): PixelSprite {
  const core = col(mix(rgb, [255, 255, 255], 0.88));
  const inner = col(shade(rgb, 0.5));
  const mid = col(rgb);
  const tail = col(mix(rgb, [20, 24, 60], 0.5));

  const L = r + 2;
  const diagL = r >= 4 ? Math.round(r * 0.55) : 0;
  const M = L + 3;
  const size = M * 2 + 1;
  const px = new Uint32Array(size * size);
  const kind = new Uint8Array(size * size);
  const set = (x: number, y: number, c: number) => {
    const i = (y + M) * size + (x + M);
    px[i] = c;
    kind[i] = K_BODY;
  };

  // kilau empat arah, menirus ke ujung; bintang besar punya pangkal kilau yang lebih tebal
  for (let d = 1; d <= L; d++) {
    const t = d / L;
    const c = t < 0.34 ? inner : t < 0.7 ? mid : tail;
    set(d, 0, c);
    set(-d, 0, c);
    set(0, d, c);
    set(0, -d, c);
    if (r >= 4 && d <= Math.ceil(L * 0.35)) {
      for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) set(ox * Math.min(d, 1), oy * Math.min(d, 1), mid);
    }
  }
  // kilau diagonal
  for (let d = 1; d <= diagL; d++) {
    const c = d <= diagL * 0.5 ? mid : tail;
    set(d, d, c);
    set(-d, d, c);
    set(d, -d, c);
    set(-d, -d, c);
  }
  // inti: berlian kecil, pusatnya putih-panas
  const cr = r >= 6 ? 2 : r >= 3 ? 1 : 0;
  for (let dy = -cr; dy <= cr; dy++) {
    for (let dx = -cr; dx <= cr; dx++) {
      const m = Math.abs(dx) + Math.abs(dy);
      if (m > cr) continue;
      set(dx, dy, m < cr || cr === 0 ? core : inner);
    }
  }
  set(0, 0, core);

  // glow berpola titik (ditambahkan ke latar saat digambar)
  const g1 = pack32(rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5);
  const g2 = pack32(rgb[0] * 0.24, rgb[1] * 0.24, rgb[2] * 0.24);
  const r1 = r * 0.7 + 1.4;
  const r2 = r * 1.15 + 2.6;
  for (let dy = -M; dy <= M; dy++) {
    for (let dx = -M; dx <= M; dx++) {
      const i = (dy + M) * size + (dx + M);
      if (kind[i] !== K_NONE) continue;
      const d = Math.hypot(dx, dy);
      if (d <= r1 && ((dx + dy) & 1) === 0) {
        px[i] = g1;
        kind[i] = K_GLOW;
      } else if (d <= r2 && (dx & 1) === 0 && (dy & 1) === 0) {
        px[i] = g2;
        kind[i] = K_GLOW;
      }
    }
  }
  return { w: size, h: size, cx: M, cy: M, px, kind };
}
