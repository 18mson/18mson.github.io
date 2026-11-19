import { projects } from "./projects";

export type ToolTier = "current" | "learned" | "exploring";

export interface Tool {
  id: string;
  name: string;
  tier: ToolTier;
}

// TODO: sesuaikan, ini draf
export const tools: Tool[] = [
  // current (Using now)
  { id: "react", name: "React", tier: "current" },
  { id: "nextjs", name: "Next.js", tier: "current" },
  { id: "typescript", name: "TypeScript", tier: "current" },
  { id: "tailwindcss", name: "Tailwind CSS", tier: "current" },
  { id: "vitest", name: "Vitest", tier: "current" },
  { id: "testing-library", name: "Testing Library", tier: "current" },
  { id: "jest", name: "Jest", tier: "current" },
  { id: "git", name: "Git", tier: "current" },
  { id: "figma", name: "Figma", tier: "current" },
  { id: "zustand", name: "Zustand", tier: "current" },
  { id: "framer-motion", name: "Framer Motion", tier: "current" },

  // learned
  { id: "redux", name: "Redux", tier: "learned" },
  { id: "swr", name: "SWR", tier: "learned" },
  { id: "material-ui", name: "Material UI", tier: "learned" },
  { id: "vue", name: "Vue 3", tier: "learned" },
  { id: "pinia", name: "Pinia", tier: "learned" },
  { id: "supabase", name: "Supabase", tier: "learned" },
  { id: "gsap", name: "GSAP", tier: "learned" },
  { id: "google-analytics", name: "Google Analytics", tier: "learned" },
  { id: "legion-ui", name: "Legion UI", tier: "learned" },

  // exploring (Rarely or new)
  { id: "threejs", name: "Three.js", tier: "exploring" },
  { id: "nodejs", name: "Node.js", tier: "exploring" },
  { id: "colyseus", name: "Colyseus", tier: "exploring" },
  { id: "java", name: "Java", tier: "exploring" },
  { id: "android-studio", name: "Android Studio", tier: "exploring" },
];

const TIER_NOTE: Record<ToolTier, string> = {
  current: "In my daily stack",
  learned: "Used before, comfortable with it",
  exploring: "Exploring or rarely used",
};

/** Proyek di Selected Works yang memakai tool ini (cocok berdasarkan nama tag). */
export function toolUsage(tool: Tool): string[] {
  const name = tool.name.toLowerCase();
  return projects.filter((p) => p.tags.some((t) => t.toLowerCase() === name)).map((p) => p.title);
}

/** Satu kalimat untuk catatan saat balon ditembak. */
export function toolNote(tool: Tool): string {
  const used = toolUsage(tool);
  return used.length > 0 ? `Used in ${used.slice(0, 2).join(", ")}` : TIER_NOTE[tool.tier];
}
