export interface ProjectItem {
  id: string;
  num: string;
  title: string;
  category: string;
  client: string;
  description: string;
  tags: string[];
  metrics?: string;
  accent: string;
}

export const projects: ProjectItem[] = [
  {
    id: "bri-universal-biller",
    num: "01",
    title: "BRI Universal Biller",
    category: "Financial Technology",
    client: "Bank Rakyat Indonesia",
    description:
      "Engineered core billing and payment modules for BRI web banking. Built accessible, high-performance UI components with unit test coverage using Vitest and Testing Library.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Vitest", "Testing Library"],
    metrics: "Production Banking Suite",
    accent: "#00529C",
  },
  {
    id: "lovit-superapp",
    num: "02",
    title: "Lovit Superapp",
    category: "Healthcare & Telemedicine",
    client: "Telkom Indonesia",
    description:
      "Shipped modular telemedicine flows and clinic appointment interfaces. Integrated responsive design tokens from Legion UI and ensured cross-device reliability.",
    tags: ["React", "Next.js", "TypeScript", "Redux", "Legion UI"],
    metrics: "Multi-service Superapp",
    accent: "#E53935",
  },
  {
    id: "pijar-sekolah",
    num: "03",
    title: "Pijar Sekolah",
    category: "Education Technology",
    client: "Telkom Indonesia",
    description:
      "Maintained and enhanced an end-to-end learning management system for schools across Indonesia. Built interactive grading matrices, exam modules, and attendance trackers.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Jest", "Agile"],
    metrics: "Nationwide School LMS",
    accent: "#00897B",
  },
  {
    id: "pijar-mahir",
    num: "04",
    title: "Pijar Mahir",
    category: "Course Marketplace & EdTech",
    client: "Telkom Indonesia",
    description:
      "Architected SSR course catalog flows and digital certification portals. Integrated SWR and Redux for real-time caching, handling high-traffic registration waves.",
    tags: ["Next.js", "React", "TypeScript", "SWR", "Redux", "GA4"],
    metrics: "High-Volume Certification Portal",
    accent: "#FB8C00",
  },
];
