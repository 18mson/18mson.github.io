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

export function getZoneRadiusBounds(tier: ToolTier, R: number): { minR: number; maxR: number } {
  switch (tier) {
    case "current":
      return { minR: 0, maxR: R * ZONE_CURRENT_MAX };
    case "learned":
      return { minR: R * ZONE_LEARNED_MIN, maxR: R * ZONE_LEARNED_MAX };
    case "exploring":
      return { minR: R * ZONE_EXPLORING_MIN, maxR: R * ZONE_EXPLORING_MAX };
  }
}

export function sampleZonePosition(
  tier: ToolTier,
  R: number,
  cx: number,
  cy: number,
  activeTiles: Tile[],
  thisRadius: number
): { x: number; y: number } {
  const { minR, maxR } = getZoneRadiusBounds(tier, R);
  const minR2 = minR * minR;
  const maxR2 = maxR * maxR;

  let bestX = cx;
  let bestY = cy;
  let maxMinDist = -1;

  for (let attempt = 0; attempt < 30; attempt++) {
    const angle = randomRange(0, Math.PI * 2);
    const r = Math.sqrt(randomRange(minR2, maxR2));
    const candX = cx + r * Math.cos(angle);
    const candY = cy + r * Math.sin(angle);

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

    if (isClear) {
      return { x: candX, y: candY };
    }

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
  R: number,
  cx: number,
  cy: number,
  theme: ArenaTheme
): void {
  const boundaries = [
    { r: R * ZONE_CURRENT_MAX, label: ZONE_LABELS.current },
    { r: R * ZONE_LEARNED_MAX, label: ZONE_LABELS.learned },
    { r: R * ZONE_EXPLORING_MAX, label: ZONE_LABELS.exploring },
  ];

  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.isDark ? "rgba(226, 236, 235, 0.12)" : "rgba(15, 42, 44, 0.12)";

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    ctx.beginPath();
    ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
    ctx.stroke();

    // Label di sumbu kanan tiap cincin
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = "11px 'Instrument Sans Variable', sans-serif";
    ctx.fillStyle = theme.isDark ? "rgba(226, 236, 235, 0.45)" : "rgba(15, 42, 44, 0.45)";
    ctx.textBaseline = "middle";
    ctx.fillText(b.label, cx + b.r - 8, cy - 10);
    ctx.restore();
  }

  ctx.restore();
}
