import { clamp } from "./math";
import type { ToolTier } from "./types";

export type RGB = [number, number, number];

export const TIER_FALLBACK: Record<ToolTier, string> = {
  current: "#ff7a45",
  learned: "#3fc1d1",
  exploring: "#a99bff",
};

export const pack32 = (r: number, g: number, b: number) => (255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r);

export const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

/** t > 0 mendekat ke putih, t < 0 mendekat ke hitam. */
export const shade = (c: RGB, t: number): RGB =>
  t >= 0
    ? [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t]
    : [c[0] * (1 + t), c[1] * (1 + t), c[2] * (1 + t)];

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/**
 * Warna planet dari warna merek, dijaga tetap terlihat di latar gelap.
 * Merek yang hampir hitam (Next.js, Git, ...) jadi abu terang; warna gelap lain diangkat terangnya.
 */
export function planetColor(hex: string | undefined, tier: ToolTier): RGB {
  const rgb = (hex ? parseHex(hex) : null) ?? parseHex(TIER_FALLBACK[tier])!;
  const [h, s, l] = rgbToHsl(rgb);
  if (s < 0.12) return hslToRgb(0, 0, 0.82);
  return hslToRgb(h, clamp(Math.max(s, 0.55), 0, 0.95), clamp(l, 0.52, 0.72));
}
