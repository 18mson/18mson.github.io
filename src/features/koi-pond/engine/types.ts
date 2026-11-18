export interface Vec {
  x: number;
  y: number;
}

export interface PatchDef {
  t: number; // posisi sepanjang badan, 0 = kepala, 1 = ekor
  off: number; // geser menyamping, -1..1
  rx: number; // setengah panjang, relatif terhadap panjang ikan
  ry: number; // setengah lebar, relatif terhadap panjang ikan
  color: string;
}

/** Corak berupa poligon yang dibentuk ulang tiap frame mengikuti lengkung badan. */
export interface Patch extends PatchDef {
  pts: Vec[];
  wob: number[]; // sedikit ketidakteraturan supaya bentuknya organik
}

export interface Pad {
  fx: number; // posisi relatif terhadap kolam (0..1)
  fy: number;
  baseR: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  ph: number;
  gap: number; // lebar takik daun
  tone: number;
  flower: boolean;
  freezeTimer?: number;
}

export interface Variety {
  base: string;
  fin: string;
  patches: () => PatchDef[];
}

export interface Fish {
  pts: Vec[]; // posisi tulang sebenarnya
  draw: Vec[]; // posisi tulang setelah gelombang renang
  ang: number[]; // arah tiap ruas
  nx: number[]; // normal tiap ruas
  ny: number[];
  outline: Vec[]; // kontur badan (dihitung sekali per frame)
  heading: number;
  v: number;
  baseLen: number;
  len: number;
  spacing: number;
  phase: number;
  cruise: number;
  chase: number;
  boost: number;
  orbit: 1 | -1;
  wp: Vec | null;
  wpUntil: number;
  variety: Variety;
  patches: Patch[];
}

export interface Pellet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  landed: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
  maxR: number;
  strength: number;
}

export interface KoiOptions {
  reducedMotion?: boolean;
}
