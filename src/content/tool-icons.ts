import {
  siReact,
  siNextdotjs,
  siTypescript,
  siTailwindcss,
  siVitest,
  siTestinglibrary,
  siFramer,
  siRedux,
  siSwr,
  siJest,
  siMui,
  siVuedotjs,
  siPinia,
  siSupabase,
  siGreensock,
  siGit,
  siFigma,
  siGoogleanalytics,
  siThreedotjs,
  siNodedotjs,
  siOpenjdk,
  siAndroidstudio,
} from "simple-icons";

export interface ToolIconData {
  path: string;
  hex: string;
}

export const toolIcons: Record<string, ToolIconData | undefined> = {
  // current
  react: { path: siReact.path, hex: `#${siReact.hex}` },
  nextjs: { path: siNextdotjs.path, hex: `#${siNextdotjs.hex}` },
  typescript: { path: siTypescript.path, hex: `#${siTypescript.hex}` },
  tailwindcss: { path: siTailwindcss.path, hex: `#${siTailwindcss.hex}` },
  vitest: { path: siVitest.path, hex: `#${siVitest.hex}` },
  "testing-library": { path: siTestinglibrary.path, hex: `#${siTestinglibrary.hex}` },
  zustand: undefined, // Singkatan "ZST"
  "framer-motion": { path: siFramer.path, hex: `#${siFramer.hex}` },

  // learned
  redux: { path: siRedux.path, hex: `#${siRedux.hex}` },
  swr: { path: siSwr.path, hex: `#${siSwr.hex}` },
  jest: { path: siJest.path, hex: `#${siJest.hex}` },
  "material-ui": { path: siMui.path, hex: `#${siMui.hex}` },
  vue: { path: siVuedotjs.path, hex: `#${siVuedotjs.hex}` },
  pinia: { path: siPinia.path, hex: `#${siPinia.hex}` },
  supabase: { path: siSupabase.path, hex: `#${siSupabase.hex}` },
  gsap: { path: siGreensock.path, hex: `#${siGreensock.hex}` },
  git: { path: siGit.path, hex: `#${siGit.hex}` },
  figma: { path: siFigma.path, hex: `#${siFigma.hex}` },
  "google-analytics": { path: siGoogleanalytics.path, hex: `#${siGoogleanalytics.hex}` },
  "legion-ui": undefined, // Singkatan "LGN"

  // exploring
  threejs: { path: siThreedotjs.path, hex: `#${siThreedotjs.hex}` },
  nodejs: { path: siNodedotjs.path, hex: `#${siNodedotjs.hex}` },
  colyseus: undefined, // Singkatan "COL"
  java: { path: siOpenjdk.path, hex: `#${siOpenjdk.hex}` },
  "android-studio": { path: siAndroidstudio.path, hex: `#${siAndroidstudio.hex}` },
};
