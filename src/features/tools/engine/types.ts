export type ToolTier = "current" | "learned" | "exploring";

export interface ToolSpec {
  id: string;
  name: string;
  tier: ToolTier;
  path?: string;
  hex?: string;
  label: string;
  /** Satu kalimat yang ditampilkan saat balon ditembak. */
  note?: string;
}

export type TileState = "entering" | "alive" | "exiting" | "cracking" | "dead";
export type ExitMode = "fade" | "deflate";

export interface Tile {
  id: string;
  spec: ToolSpec;
  tier: ToolTier;
  slotIndex: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  hitRadius: number;
  age: number;
  lifespan: number;
  state: TileState;
  scale: number;
  alpha: number;
  rotation: number;
  phase: number;
  exitMode: ExitMode;
  crackTime: number;
  crackPoints: { x: number; y: number }[][];
  hitX: number;
  hitY: number;
  path2d?: Path2D;
}

export interface Slot {
  tier: ToolTier;
  tile: Tile | null;
  cooldown: number;
  lastToolId: string | null;
}

export interface Shard {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vrot: number;
  alpha: number;
  age: number;
  lifespan: number;
  color: string;
  width: number;
  height: number;
  curve: number;
}

export interface Ripple {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

export interface ArenaTheme {
  ink: string;
  koi: string;
  learned: string;
  exploring: string;
  paper: string;
  water: string;
  isDark: boolean;
}
