import type { PatchDef, Variety } from "./types";
import { rand } from "./math";

const RED = "#e8501f";
const BLACK = "#1f2426";

export const kohakuPatches = (): PatchDef[] => {
  const n = 3 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, (_, i) => ({
    t: 0.06 + (i / n) * 0.72 + rand(-0.03, 0.05),
    off: rand(-0.35, 0.35),
    rx: rand(0.07, 0.14),
    ry: rand(0.06, 0.1),
    color: RED,
  }));
};

export const shiroUtsuriPatches = (): PatchDef[] => {
  const n = 3 + Math.floor(Math.random() * 2);
  return Array.from({ length: n }, (_, i) => ({
    t: 0.08 + (i / n) * 0.70 + rand(-0.03, 0.05),
    off: rand(-0.35, 0.35),
    rx: rand(0.08, 0.15),
    ry: rand(0.06, 0.11),
    color: BLACK,
  }));
};

export const karasugoiPatches = (): PatchDef[] => [
  { t: 0.28, off: -0.12, rx: 0.20, ry: 0.06, color: "#161b1d" },
  { t: 0.55, off: 0.15, rx: 0.22, ry: 0.055, color: "#161b1d" },
  { t: 0.75, off: -0.05, rx: 0.15, ry: 0.045, color: "#161b1d" },
  { t: 0.38, off: 0.05, rx: 0.16, ry: 0.04, color: "#3a4448" },
];

export const VARIETIES: Variety[] = [
  // Karasugoi: hitam arang sumi-e elegan (sesuai referensi 02 "Tenang & Mengalir")
  {
    base: "#283033",
    fin: "rgba(35, 42, 45, 0.75)",
    patches: karasugoiPatches,
    weight: 4,
  },
  // Shiro Utsuri: putih dengan sapuan kuas tinta hitam pekat (sesuai referensi 04 "Minimalis & Abstrak")
  {
    base: "#fbf9f4",
    fin: "rgba(255, 255, 255, 0.85)",
    patches: shiroUtsuriPatches,
    weight: 4,
  },
  // Kohaku: putih dengan aksen merah klasik (sentuhan merah berani)
  {
    base: "#fbf9f4",
    fin: "rgba(255, 255, 255, 0.85)",
    patches: kohakuPatches,
    weight: 3,
  },
  // Ogon: emas keberuntungan
  {
    base: "#f0be48",
    fin: "rgba(246, 206, 102, 0.8)",
    patches: () => [
      { t: 0.3, off: -0.2, rx: 0.2, ry: 0.05, color: "#f8d97e" },
      { t: 0.62, off: 0.25, rx: 0.14, ry: 0.04, color: "#f8d97e" },
    ],
    weight: 3,
  },
  // Sanke: putih dengan kombinasi merah dan bintik hitam
  {
    base: "#fbf9f4",
    fin: "rgba(255, 255, 255, 0.85)",
    patches: () => [
      ...kohakuPatches(),
      ...Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
        t: rand(0.2, 0.8),
        off: rand(-0.5, 0.5),
        rx: rand(0.03, 0.06),
        ry: rand(0.025, 0.05),
        color: BLACK,
      })),
    ],
    weight: 2,
  },
  // Tancho: putih dengan satu bulatan merah di dahi (hadir eksklusif / porsi kecil)
  {
    base: "#fbf9f4",
    fin: "rgba(255, 255, 255, 0.85)",
    patches: () => [{ t: 0.07, off: 0, rx: 0.055, ry: 0.055, color: RED }],
    weight: 1,
  },
  // Hi: oranye polos (hadir sebagai aksen langka agar tidak mendominasi)
  {
    base: "#f0642d",
    fin: "rgba(246, 140, 96, 0.8)",
    patches: () => [
      { t: 0.35, off: 0.1, rx: 0.18, ry: 0.05, color: "#f58a57" },
      { t: 0.7, off: -0.2, rx: 0.1, ry: 0.04, color: "#f58a57" },
    ],
    weight: 1,
  },
];

export const pickVariety = (): Variety => {
  const totalWeight = VARIETIES.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const v of VARIETIES) {
    const w = v.weight ?? 1;
    if (roll < w) return v;
    roll -= w;
  }
  return VARIETIES[0];
};
