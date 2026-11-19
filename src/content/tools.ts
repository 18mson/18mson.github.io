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
