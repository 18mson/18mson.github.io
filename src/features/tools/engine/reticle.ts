import { RETICLE_ACTIVE_RADIUS, RETICLE_RADIUS } from "./constants";
import type { ArenaTheme, Tile } from "./types";

export function drawReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hoveredTile: Tile | null,
  theme: ArenaTheme
): void {
  const isHover = hoveredTile !== null;
  const radius = isHover ? RETICLE_ACTIVE_RADIUS : RETICLE_RADIUS;
  const color = isHover ? theme.koi : (theme.isDark ? "rgba(226, 236, 235, 0.75)" : "rgba(15, 42, 44, 0.75)");

  ctx.save();
  ctx.translate(x, y);

  // 1. Cincin reticle
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Empat garis pendek di luar cincin
  const lineStart = radius + 3;
  const lineEnd = radius + 8;
  ctx.beginPath();
  // Kanan
  ctx.moveTo(lineStart, 0);
  ctx.lineTo(lineEnd, 0);
  // Bawah
  ctx.moveTo(0, lineStart);
  ctx.lineTo(0, lineEnd);
  // Kiri
  ctx.moveTo(-lineStart, 0);
  ctx.lineTo(-lineEnd, 0);
  // Atas
  ctx.moveTo(0, -lineStart);
  ctx.lineTo(0, -lineEnd);
  ctx.stroke();

  // 3. Titik tengah
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 4. Nama tool sebagai badge kecil di dekat tile jika hover
  if (hoveredTile) {
    drawHoverBadge(ctx, hoveredTile, theme);
  }
}

function drawHoverBadge(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  theme: ArenaTheme
): void {
  const text = tile.spec.name;
  ctx.save();
  ctx.font = "600 12px 'Instrument Sans Variable', sans-serif";
  const metrics = ctx.measureText(text);
  const paddingX = 9;
  const paddingY = 5;
  const badgeW = metrics.width + paddingX * 2;
  const badgeH = 22;

  // Letakkan badge sedikit di atas tile
  const badgeX = tile.x - badgeW / 2;
  const badgeY = tile.y - tile.size * 0.5 - badgeH - 8;

  // Background pill
  ctx.fillStyle = theme.paper;
  ctx.strokeStyle = theme.isDark ? "rgba(226, 236, 235, 0.2)" : "rgba(15, 42, 44, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 11);
  ctx.fill();
  ctx.stroke();

  // Teks
  ctx.fillStyle = theme.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, tile.x, badgeY + badgeH / 2 + 0.5);

  ctx.restore();
}
