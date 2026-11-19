import type { ArenaTheme } from "./types";

/** Catatan singkat yang muncul di titik balon pecah (imbalan menembak). */
export interface ToolNote {
  x: number;
  y: number;
  age: number;
  life: number;
  name: string;
  text: string;
}

export const NOTE_LIFE = 2.8;
const FADE_IN = 0.15;
const FADE_OUT = 0.5;
const MAX_NOTES = 4;

export function addNote(notes: ToolNote[], x: number, y: number, name: string, text: string): void {
  if (notes.length >= MAX_NOTES) notes.shift();
  notes.push({ x, y, age: 0, life: NOTE_LIFE, name, text });
}

export function updateNotes(notes: ToolNote[], dt: number): void {
  for (let i = notes.length - 1; i >= 0; i--) {
    notes[i].age += dt;
    if (notes[i].age >= notes[i].life) notes.splice(i, 1);
  }
}

export function drawNotes(ctx: CanvasRenderingContext2D, notes: ToolNote[], theme: ArenaTheme, width: number): void {
  for (const n of notes) {
    const alpha = Math.min(1, n.age / FADE_IN) * Math.min(1, (n.life - n.age) / FADE_OUT);
    if (alpha <= 0) continue;
    const rise = (1 - Math.pow(1 - Math.min(1, n.age / 0.4), 3)) * 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = "700 13px 'Instrument Sans Variable', sans-serif";
    const nameW = ctx.measureText(n.name).width;
    ctx.font = "500 12px 'Instrument Sans Variable', sans-serif";
    const textW = ctx.measureText(n.text).width;

    const w = Math.max(nameW, textW) + 28;
    const h = 46;
    const x = Math.min(Math.max(n.x, w / 2 + 8), width - w / 2 - 8);
    let y = n.y - rise - h;
    if (y < 8) y = n.y + 28 + rise;

    // Pil gelap di mode terang, pil terang di mode gelap (ink dan paper saling bertukar)
    ctx.fillStyle = theme.ink;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, h, 14);
    ctx.fill();

    ctx.fillStyle = theme.paper;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 13px 'Instrument Sans Variable', sans-serif";
    ctx.fillText(n.name, x, y + 16);
    ctx.globalAlpha = alpha * 0.75;
    ctx.font = "500 12px 'Instrument Sans Variable', sans-serif";
    ctx.fillText(n.text, x, y + 32);

    ctx.restore();
  }
}
