export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Overshoot elastis 0 -> 1.12 -> 1
export function easeOutOvershoot(t: number): number {
  const clamped = clamp(t, 0, 1);
  const s = 0.65;
  const p = clamped - 1;
  return 1 + (s + 1) * Math.pow(p, 3) + s * Math.pow(p, 2);
}

export function easeInQuad(t: number): number {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped;
}

export function easeOutQuad(t: number): number {
  const clamped = clamp(t, 0, 1);
  return clamped * (2 - clamped);
}
