export interface CraftPillar {
  id: string;
  num: string;
  title: string;
  highlight: string;
  description: string;
  tags: string[];
}

export const craftPillars: CraftPillar[] = [
  {
    id: "architecture",
    num: "01",
    title: "Modular Architecture & Scale",
    highlight: "Enterprise Reliability",
    description:
      "Designing resilient frontend architectures with clean domain boundaries, micro-frontends, shared design systems, and predictable state patterns built for long-term multi-team velocity.",
    tags: ["Next.js (App Router)", "TypeScript Strict", "Micro-frontends", "Zustand", "Design Systems"],
  },
  {
    id: "kinematics",
    num: "02",
    title: "Interaction & Fluid Kinematics",
    highlight: "60fps Motion Engineering",
    description:
      "Crafting immersive, physics-informed web experiences using custom Canvas 2D simulations and GSAP scroll choreographies without frame drops or layout thrashing.",
    tags: ["HTML5 Canvas 2D", "GSAP & ScrollTrigger", "Physics & Boids", "Lenis Smooth Scroll"],
  },
  {
    id: "performance",
    num: "03",
    title: "Performance & Engineering Rigor",
    highlight: "Production Stability",
    description:
      "Prioritizing sub-second Largest Contentful Paint, minimal bundle footprints, strict WCAG accessibility standards, and automated unit and integration test coverage.",
    tags: ["Core Web Vitals", "Vitest & Jest", "WCAG 2.1 AA", "Bundle Splitting", "Tailwind CSS v4"],
  },
];
