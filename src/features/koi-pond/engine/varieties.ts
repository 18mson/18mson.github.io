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

export const VARIETIES: Variety[] = [
  // Kohaku: putih dengan bercak merah
  { base: "#fbf9f4", fin: "rgba(255,255,255,0.85)", patches: kohakuPatches },
  // Sanke: kohaku + bintik hitam
  {
    base: "#fbf9f4",
    fin: "rgba(255,255,255,0.85)",
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
  },
  // Tancho: putih dengan satu bulatan merah di kepala
  {
    base: "#fbf9f4",
    fin: "rgba(255,255,255,0.85)",
    patches: () => [{ t: 0.07, off: 0, rx: 0.055, ry: 0.055, color: RED }],
  },
  // Ogon: emas polos
  {
    base: "#f3b63a",
    fin: "rgba(249,205,98,0.8)",
    patches: () => [
      { t: 0.3, off: -0.2, rx: 0.2, ry: 0.05, color: "#f9d66f" },
      { t: 0.62, off: 0.25, rx: 0.14, ry: 0.04, color: "#f9d66f" },
    ],
  },
  // Hi: oranye polos
  {
    base: "#f0642d",
    fin: "rgba(246,140,96,0.8)",
    patches: () => [
      { t: 0.35, off: 0.1, rx: 0.18, ry: 0.05, color: "#f58a57" },
      { t: 0.7, off: -0.2, rx: 0.1, ry: 0.04, color: "#f58a57" },
    ],
  },
];
