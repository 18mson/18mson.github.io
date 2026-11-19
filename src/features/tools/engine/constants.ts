export const TILE_STYLE: "tier" | "brand" = "tier";

// Zona lingkaran (faktor dari R = min(w, h) / 2 * 0.95)
export const ZONE_CURRENT_MAX = 0.30;
export const ZONE_LEARNED_MIN = 0.38;
export const ZONE_LEARNED_MAX = 0.68;
export const ZONE_EXPLORING_MIN = 0.76;
export const ZONE_EXPLORING_MAX = 0.98;

// Slot konkuren (8 ikon di desktop, 4 di layar sempit)
export const SLOTS_DESKTOP = { current: 2, learned: 4, exploring: 2 };
export const SLOTS_NARROW = { current: 1, learned: 2, exploring: 1 };
export const NARROW_BREAKPOINT = 520;

// Waktu dan durasi
export const SLOT_STAGGER_DELAY = 0.28;
export const COOLDOWN_MIN = 0.25;
export const COOLDOWN_MAX = 0.65;
export const SHATTER_COOLDOWN_MIN = 0.3;
export const SHATTER_COOLDOWN_MAX = 0.6;

export const LIFESPAN_CURRENT = { min: 4.5, max: 7.0 };
export const LIFESPAN_LEARNED = { min: 3.5, max: 6.0 };
export const LIFESPAN_EXPLORING = { min: 3.0, max: 5.0 };

export const ENTER_DURATION = 0.5;
export const EXIT_FADE_DURATION = 0.4;
export const EXIT_DEFLATE_PHASE1 = 0.15;
export const EXIT_DEFLATE_PHASE2 = 0.35;
export const POP_LIFESPAN = 0.32; // Animasi pecah balon cepat (~320ms)

// Ukuran tile (sedikit disesuaikan agar 8 balon muat lega tanpa tabrakan)
export const SIZE_CURRENT = { factor: 0.30, min: 52 };
export const SIZE_LEARNED = { factor: 0.23, min: 42 };
export const SIZE_EXPLORING = { factor: 0.18, min: 34 };

// Partikel dan fisika balon pecah
export const MAX_SHARDS = 60;
export const SHARDS_PER_POP = 12;
export const AIR_DRAG = 0.91; // Hambatan udara karet balon
export const GRAVITY = 160; // Gravitasi ringan untuk karet ringan

// Interaksi
export const HIT_RADIUS_FACTOR = 0.52;
export const TOUCH_HIT_PADDING = 8;
export const RETICLE_RADIUS = 18;
export const RETICLE_ACTIVE_RADIUS = 14;

// Label zona
export const ZONE_LABELS = {
  current: "Using now",
  learned: "Learned",
  exploring: "Rarely or new",
};
