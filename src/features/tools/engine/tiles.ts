import {
  ENTER_DURATION,
  EXIT_DEFLATE_PHASE1,
  EXIT_DEFLATE_PHASE2,
  EXIT_FADE_DURATION,
  TILE_STYLE,
} from "./constants";
import { easeInQuad, easeOutOvershoot, easeOutQuad, randomRange } from "./math";
import type { ArenaTheme, ExitMode, Tile, ToolSpec, ToolTier } from "./types";

export function createTile(
  spec: ToolSpec,
  slotIndex: number,
  x: number,
  y: number,
  size: number,
  lifespan: number
): Tile {
  const exitMode: ExitMode = Math.random() < 0.5 ? "fade" : "deflate";
  let path2d: Path2D | undefined;
  if (spec.path) {
    try {
      path2d = new Path2D(spec.path);
    } catch {
      path2d = undefined;
    }
  }

  return {
    id: `${spec.id}-${Date.now()}-${Math.random()}`,
    spec,
    tier: spec.tier,
    slotIndex,
    x,
    y,
    baseX: x,
    baseY: y,
    size,
    hitRadius: size * 0.52,
    age: 0,
    lifespan,
    state: "entering",
    scale: 0,
    alpha: 1,
    rotation: randomRange(-0.1, 0.1), // ~ -6 to 6 deg
    phase: randomRange(0, Math.PI * 2),
    exitMode,
    crackTime: 0,
    crackPoints: [],
    hitX: x,
    hitY: y,
    path2d,
  };
}

export function updateTile(tile: Tile, dt: number, time: number): void {
  tile.age += dt;

  // Breathing (vertikal bobbing & subtle squash/stretch)
  const breath = Math.sin(time * 2.2 + tile.phase);
  const bobY = breath * 3;
  const squashX = 1 + breath * 0.025;
  const squashY = 1 - breath * 0.025;

  tile.x = tile.baseX;
  tile.y = tile.baseY + bobY;

  switch (tile.state) {
    case "entering": {
      const p = Math.min(1, tile.age / ENTER_DURATION);
      const s = easeOutOvershoot(p);
      tile.scale = s;
      tile.rotation = (1 - easeOutQuad(p)) * tile.rotation;
      tile.alpha = Math.min(1, p * 2);

      if (tile.age >= ENTER_DURATION) {
        tile.state = "alive";
        tile.age = 0;
        tile.rotation = 0;
        tile.scale = 1;
      }
      break;
    }

    case "alive": {
      tile.scale = 1;
      tile.alpha = 1;
      if (tile.age >= tile.lifespan) {
        tile.state = "exiting";
        tile.age = 0;
      }
      break;
    }

    case "exiting": {
      if (tile.exitMode === "fade") {
        const p = Math.min(1, tile.age / EXIT_FADE_DURATION);
        tile.alpha = Math.max(0, 1 - p);
        tile.scale = 1 - 0.1 * p;
        if (tile.age >= EXIT_FADE_DURATION) {
          tile.state = "dead";
        }
      } else {
        // deflate
        if (tile.age <= EXIT_DEFLATE_PHASE1) {
          const p = tile.age / EXIT_DEFLATE_PHASE1;
          tile.scale = 1 + 0.15 * easeOutQuad(p);
        } else {
          const p = (tile.age - EXIT_DEFLATE_PHASE1) / EXIT_DEFLATE_PHASE2;
          tile.scale = Math.max(0, 1.15 * (1 - easeInQuad(p)));
          tile.alpha = Math.max(0, 1 - easeInQuad(p));
          if (p >= 1) {
            tile.state = "dead";
          }
        }
      }
      break;
    }

    case "dead":
      break;
  }

  // Modulasi squash pada skala
  if (tile.state === "alive") {
    tile.scale = squashX;
  }
}

export function getTileBaseColor(
  tier: ToolTier,
  spec: ToolSpec,
  theme: ArenaTheme
): { base: string; light: string; dark: string } {
  if (TILE_STYLE === "brand" && spec.hex) {
    return {
      base: spec.hex,
      light: spec.hex,
      dark: theme.isDark ? "#080e0f" : "#0f2a2c",
    };
  }

  switch (tier) {
    case "current":
      return {
        base: theme.koi,
        light: theme.isDark ? "#ff8659" : "#ff7442",
        dark: theme.isDark ? "#b3380e" : "#c44012",
      };
    case "learned":
      return {
        base: theme.learned,
        light: theme.isDark ? "#289da8" : "#22929c",
        dark: theme.isDark ? "#0f4f56" : "#135c63",
      };
    case "exploring":
      return {
        base: theme.exploring,
        light: theme.isDark ? "rgba(226, 236, 235, 0.45)" : "rgba(15, 42, 44, 0.55)",
        dark: theme.isDark ? "rgba(226, 236, 235, 0.18)" : "rgba(15, 42, 44, 0.35)",
      };
  }
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  theme: ArenaTheme
): void {
  if (tile.scale <= 0 || tile.alpha <= 0) return;

  const s = tile.size;
  const half = s * 0.5;
  const radius = s * 0.36; // squircle corner radius

  ctx.save();
  ctx.translate(tile.x, tile.y);
  ctx.rotate(tile.rotation);
  ctx.scale(tile.scale, tile.scale);
  ctx.globalAlpha = tile.alpha;

  // 1. Bayangan: rounded rect digeser (4px, 8px) alpha 0.12 (tanpa shadowBlur)
  ctx.save();
  ctx.fillStyle = theme.isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(10, 25, 27, 0.12)";
  ctx.beginPath();
  ctx.roundRect(-half + 4, -half + 8, s, s, radius);
  ctx.fill();
  ctx.restore();

  // 2. Badan: gradien linear atas-kiri terang ke bawah-kanan gelap
  const colors = getTileBaseColor(tile.tier, tile.spec, theme);
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  grad.addColorStop(0, colors.light);
  grad.addColorStop(0.5, colors.base);
  grad.addColorStop(1, colors.dark);

  ctx.beginPath();
  ctx.roundRect(-half, -half, s, s, radius);
  ctx.fillStyle = grad;
  ctx.fill();

  // 3. Highlight glossy: elips putih alpha 0.35 di kiri atas + titik specular kecil
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-half * 0.42, -half * 0.42, s * 0.28, s * 0.14, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();

  // Titik specular kecil
  ctx.beginPath();
  ctx.arc(-half * 0.58, -half * 0.58, 1.7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fill();
  ctx.restore();

  // 4. Glyph / Icon
  ctx.save();
  if (tile.path2d) {
    const iconTargetSize = s * 0.52;
    const scaleFactor = iconTargetSize / 24; // Simple-icons viewBox is 24x24
    ctx.translate(-12 * scaleFactor, -12 * scaleFactor);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.fillStyle = "#ffffff";
    ctx.fill(tile.path2d);
  } else {
    // Teks singkatan (1 sampai 3 huruf)
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(s * 0.32)}px 'Shippori Mincho', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tile.spec.label, 0, 1);
  }
  ctx.restore();

  ctx.restore();
}
