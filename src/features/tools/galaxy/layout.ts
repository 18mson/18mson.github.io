import { clamp } from "./math";
import type { ToolTier } from "./types";

export interface ListHeader {
  x: number;
  y: number;
  text: string;
  tier: ToolTier;
}

export interface ListLayout {
  /** Posisi pusat planet pada daftar, searah urutan tools. */
  slots: { x: number; y: number }[];
  headers: ListHeader[];
  rowH: number;
  colW: number;
  fontPx: number;
  planetR: number;
  /** true = dua kolom berurutan (layar sempit / teks piksel lebih kecil). */
  narrow: boolean;
}

const TIERS: { tier: ToolTier; title: string }[] = [
  { tier: "current", title: "Using now" },
  { tier: "learned", title: "Learned" },
  { tier: "exploring", title: "Rarely or new" },
];

/**
 * Susunan daftar. Layar lebar: tiga kolom menurut tingkat, lengkap dengan judul.
 * Layar sempit: dua kolom berurutan tanpa judul, supaya 27 baris tetap muat dalam satu layar.
 */
export function computeListLayout(w: number, h: number, tiers: ToolTier[]): ListLayout {
  const n = tiers.length;
  const slots = new Array<{ x: number; y: number }>(n);
  const headers: ListHeader[] = [];

  if (w >= 1000) {
    const top = 250;
    const bottom = 56;
    const headerH = 40;
    const colW = Math.min(330, (w - 80) / 3);
    const left = (w - colW * 3) / 2 + 14;
    const rows = Math.max(...TIERS.map((t) => tiers.filter((x) => x === t.tier).length), 1);
    const avail = h - top - bottom;
    const rowH = clamp((avail - headerH) / rows, 24, 36);
    const block = headerH + rows * rowH;
    const y0 = top + Math.max(0, (avail - block) / 2);

    TIERS.forEach((t, ci) => {
      const colX = left + ci * colW;
      headers.push({ x: colX - 6, y: y0 + 8, text: t.title, tier: t.tier });
      let r = 0;
      tiers.forEach((tier, i) => {
        if (tier !== t.tier) return;
        slots[i] = { x: colX + 6, y: y0 + headerH + r * rowH + rowH / 2 };
        r++;
      });
    });
    return { slots, headers, rowH, colW, fontPx: 14, planetR: 6, narrow: false };
  }

  const top = 220;
  const bottom = 40;
  const rows = Math.ceil(n / 2);
  const colW = (w - 48) / 2;
  const rowH = clamp((h - top - bottom) / rows, 22, 30);
  const block = rows * rowH;
  const y0 = top + Math.max(0, (h - top - bottom - block) / 2);
  for (let i = 0; i < n; i++) {
    const col = i < rows ? 0 : 1;
    const r = i < rows ? i : i - rows;
    slots[i] = { x: 24 + col * colW + 8, y: y0 + r * rowH + rowH / 2 };
  }
  return { slots, headers, rowH, colW, fontPx: 13, planetR: 5.5, narrow: true };
}
