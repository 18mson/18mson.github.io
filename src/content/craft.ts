export type CraftProof = "architecture" | "motion" | "vitals";

export interface CraftPillar {
  id: string;
  num: string;
  title: string;
  highlight: string;
  description: string;
  /** Panel bukti yang dibaca langsung dari halaman ini. */
  proof: CraftProof;
}

export const craftPillars: CraftPillar[] = [
  {
    id: "architecture",
    num: "01",
    title: "Modular Architecture & Scale",
    highlight: "Enterprise Reliability",
    description:
      "Designing resilient frontend architectures with clean domain boundaries, shared design systems, and predictable state patterns built for long-term multi-team velocity.",
    proof: "architecture",
  },
  {
    id: "kinematics",
    num: "02",
    title: "Interaction & Fluid Kinematics",
    highlight: "60fps Motion Engineering",
    description:
      "Crafting immersive, physics-informed web experiences using custom Canvas 2D simulations and GSAP scroll choreographies without frame drops or layout thrashing.",
    proof: "motion",
  },
  {
    id: "performance",
    num: "03",
    title: "Performance & Engineering Rigor",
    highlight: "Production Stability",
    description:
      "Prioritizing fast Largest Contentful Paint, minimal bundle footprints, accessible interfaces, and automated unit and integration test coverage.",
    proof: "vitals",
  },
];
