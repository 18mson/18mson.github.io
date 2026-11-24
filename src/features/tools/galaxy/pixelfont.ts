import { makeCanvas } from "./canvas";

/**
 * Font piksel 5x7 proporsional (huruf kapital, angka, tanda baca dasar). Sengaja dibuat sendiri
 * supaya teks memakai grid piksel yang sama dengan galaksi dan tidak butuh file font.
 * Tiap glyph: 7 baris dipisah "|", "#" = piksel menyala.
 */
const GLYPHS: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".####|#....|#....|#....|#....|#....|.####",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".####|#....|#....|#.###|#...#|#...#|.###.",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": ".###.|#...#|....#|..##.|....#|#...#|.###.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": ".###.|#....|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|....#|.###.",
  ".": ".|.|.|.|.|.|#",
  ",": "..|..|..|..|..|.#|#.",
  ":": ".|.|#|.|.|#|.",
  "-": "...|...|...|###|...|...|...",
  "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "/": "....#|...#.|...#.|..#..|.#...|.#...|#....",
  "(": ".#|#.|#.|#.|#.|#.|.#",
  ")": "#.|.#|.#|.#|.#|.#|#.",
  "'": "#|#|.|.|.|.|.",
  " ": "...|...|...|...|...|...|...",
  "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
};

const ROWS = 7;
const parsed = new Map<string, string[]>();
for (const [ch, g] of Object.entries(GLYPHS)) parsed.set(ch, g.split("|"));

export interface TextSprite {
  canvas: HTMLCanvasElement;
  /** Lebar & tinggi dalam piksel font (kalikan dengan ukuran piksel layar). */
  w: number;
  h: number;
}

const cache = new Map<string, TextSprite>();

/** Sprite teks 1:1 (1 piksel font = 1 piksel kanvas). Dibuat sekali per teks+warna, lalu dipakai ulang. */
export function getTextSprite(text: string, color: string): TextSprite {
  const key = `${color}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const chars = Array.from(text.toUpperCase()).map((c) => parsed.get(c) ?? parsed.get("?")!);
  const w = Math.max(1, chars.reduce((sum, g) => sum + g[0].length + 1, -1));
  const canvas = makeCanvas(w, ROWS);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  let x = 0;
  for (const g of chars) {
    for (let y = 0; y < ROWS; y++) {
      const row = g[y];
      for (let i = 0; i < row.length; i++) if (row[i] === "#") ctx.fillRect(x + i, y, 1, 1);
    }
    x += g[0].length + 1;
  }
  const sprite = { canvas, w, h: ROWS };
  cache.set(key, sprite);
  return sprite;
}
