export interface ProjectItem {
  id: string;
  num: string;
  title: string;
  category: string;
  client: string;
  summary: string;
  highlights: string[];
  // TODO: isi dampak nyata (LCP, coverage test, jumlah pengguna)
  impact?: string;
  tags: string[];
  accent: string;
}

export const projects: ProjectItem[] = [
  {
    id: "bri-universal-biller",
    num: "01",
    title: "BRI Universal Biller",
    category: "Financial Technology",
    client: "Bank Rakyat Indonesia",
    summary:
      "Engineered core billing and payment modules for BRI web banking. Built accessible, high-performance UI components with unit test coverage using Vitest and Testing Library.",
    highlights: [
      "Core billing and payment modules for BRI web banking",
      "Accessible and high-performance UI components",
      "Automated unit test coverage with Vitest and Testing Library",
    ],
    // TODO: isi dampak nyata (LCP, coverage test, jumlah pengguna)
    impact: undefined,
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Vitest", "Testing Library"],
    accent: "#00529C",
  },
  {
    id: "lovit-superapp",
    num: "02",
    title: "Lovit Superapp",
    category: "Healthcare & Telemedicine",
    client: "Telkom Indonesia",
    summary:
      "Shipped modular telemedicine flows and clinic appointment interfaces. Integrated responsive design tokens from Legion UI and ensured cross-device reliability.",
    highlights: [
      "Modular telemedicine flows and clinic appointment interfaces",
      "Design token integration with Legion UI",
      "Cross-device responsive reliability",
    ],
    // TODO: isi dampak nyata (LCP, coverage test, jumlah pengguna)
    impact: undefined,
    tags: ["React", "Next.js", "TypeScript", "Redux", "Legion UI"],
    accent: "#E53935",
  },
  {
    id: "pijar-sekolah",
    num: "03",
    title: "Pijar Sekolah",
    category: "Education Technology",
    client: "Telkom Indonesia",
    summary:
      "Maintained and enhanced an end-to-end learning management system for schools across Indonesia. Built interactive grading matrices, exam modules, and attendance trackers.",
    highlights: [
      "End-to-end learning management system for schools",
      "Interactive grading matrices and examination modules",
      "Daily student and teacher attendance trackers",
    ],
    // TODO: isi dampak nyata (LCP, coverage test, jumlah pengguna)
    impact: undefined,
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Jest", "Agile"],
    accent: "#00897B",
  },
  {
    id: "pijar-mahir",
    num: "04",
    title: "Pijar Mahir",
    category: "Course Marketplace & EdTech",
    client: "Telkom Indonesia",
    summary:
      "Architected SSR course catalog flows and digital certification portals. Integrated SWR and Redux for real-time caching, handling high-traffic registration waves.",
    highlights: [
      "SSR course catalog flows and digital certification portals",
      "Real-time state and caching architecture via SWR and Redux",
      "Engineered for high-traffic registration waves",
    ],
    // TODO: isi dampak nyata (LCP, coverage test, jumlah pengguna)
    impact: undefined,
    tags: ["Next.js", "React", "TypeScript", "SWR", "Redux", "GA4"],
    accent: "#FB8C00",
  },
];
