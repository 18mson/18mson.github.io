import {
  ZONE_CURRENT_MAX,
  ZONE_LEARNED_MIN,
  ZONE_LEARNED_MAX,
  ZONE_EXPLORING_MIN,
  ZONE_EXPLORING_MAX,
  ZONE_LABELS,
} from "./constants";
import { distance, randomRange } from "./math";
import type { ArenaTheme, Tile, ToolTier } from "./types";

/**
 * Zona berbentuk elips yang mengikuti lebar dan tinggi canvas (rx, ry),
 * jadi balon menyebar ke seluruh lebar layar. Urutan tingkat tetap: pusat, tengah, luar.
 * Posisi dinyatakan sebagai fraksi 0..1 dari sumbu elips.
 */
export function getZoneFractions(tier: ToolTier): { min: number; max: number } {
  switch (tier) {
    case "current":
      return { min: 0, max: ZONE_CURRENT_MAX };
    case "learned":
      return { min: ZONE_LEARNED_MIN, max: ZONE_LEARNED_MAX };
    case "exploring":
      return { min: ZONE_EXPLORING_MIN, max: ZONE_EXPLORING_MAX };
  }
}

export function sampleZonePosition(
  tier: ToolTier,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  width: number,
  height: number,
  activeTiles: Tile[],
  thisRadius: number,
): { x: number; y: number } {
  const { min, max } = getZoneFractions(tier);
  const min2 = min * min;
  const max2 = max * max;
  const margin = thisRadius * 1.15 + 6;

  let bestX = cx;
  let bestY = cy;
  let maxMinDist = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const angle = randomRange(0, Math.PI * 2);
    // sqrt supaya sebaran merata terhadap luas elips
    const f = Math.sqrt(randomRange(min2, max2));
    const candX = Math.min(Math.max(cx + f * rx * Math.cos(angle), margin), width - margin);
    const candY = Math.min(Math.max(cy + f * ry * Math.sin(angle), margin), height - margin);

    let isClear = true;
    let minDistToOthers = Infinity;

    for (let i = 0; i < activeTiles.length; i++) {
      const other = activeTiles[i];
      if (other.state === "dead") continue;
      const d = distance(candX, candY, other.baseX, other.baseY);
      minDistToOthers = Math.min(minDistToOthers, d);
      if (d < thisRadius + other.hitRadius + 4) {
        isClear = false;
        break;
      }
    }

    if (isClear) return { x: candX, y: candY };

    if (minDistToOthers > maxMinDist) {
      maxMinDist = minDistToOthers;
      bestX = candX;
      bestY = candY;
    }
  }

  return { x: bestX, y: bestY };
}

export function drawZoneGuides(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  theme: ArenaTheme,
): void {
  const boundaries = [
    { f: ZONE_CURRENT_MAX, label: ZONE_LABELS.current },
    { f: ZONE_LEARNED_MAX, label: ZONE_LABELS.learned },
    { f: ZONE_EXPLORING_MAX, label: ZONE_LABELS.exploring },
  ];

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.isDark ? "rgba(226, 236, 235, 0.16)" : "rgba(15, 42, 44, 0.16)";

  // Garis putus-putus tiap batas zona
  ctx.setLineDash([4, 6]);
  for (const b of boundaries) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * b.f, ry * b.f, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label di puncak tiap elips, dengan latar kertas supaya garis tidak menembus teks
  ctx.setLineDash([]);
  ctx.font = "500 12px 'Instrument Sans Variable', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const b of boundaries) {
    const y = cy - ry * b.f;
    const w = ctx.measureText(b.label).width;
    ctx.fillStyle = theme.paper;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2 - 9, y - 10, w + 18, 20, 10);
    ctx.fill();
    ctx.fillStyle = theme.isDark ? "rgba(226, 236, 235, 0.7)" : "rgba(15, 42, 44, 0.65)";
    ctx.fillText(b.label, cx, y + 0.5);
  }

  ctx.restore();
}
