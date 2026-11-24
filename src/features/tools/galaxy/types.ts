export type ToolTier = "current" | "learned" | "exploring";

export interface GalaxyTool {
  id: string;
  name: string;
  tier: ToolTier;
  /** Warna merek (#rrggbb). Kosong = warna bawaan sesuai tingkat. */
  hex?: string;
  /** Catatan singkat, tampil kecil di bawah nama saat planet di-hover. */
  note?: string;
}

export interface GalaxyOptions {
  tools: GalaxyTool[];
  fontFamily: string;
  reducedMotion: boolean;
}
