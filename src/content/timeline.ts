export interface TimelineItem {
  id: string;
  period: string;
  title: string;
  org: string;
  summary: string;
  tags: string[];
  /** Section background tone when this card is centered in viewport. */
  tone: string;
}

export const timeline: TimelineItem[] = [
  {
    id: "indocyber-bri",
    period: "Feb 2026 - Present",
    title: "Frontend Developer",
    org: "PT Indocyber Global Teknologi (Client: Bank Rakyat Indonesia)",
    summary:
      "Building web banking applications for BRI, focusing on the BRI Universal Biller platform. Wrote unit tests with Vitest and Testing Library, and optimized page rendering across desktop and mobile browsers.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "React Hooks", "Vitest", "Testing Library"],
    tone: "#f6f9f8",
  },
  {
    id: "infomedia-telkom",
    period: "Apr 2024 - Mar 2025",
    title: "Frontend Developer",
    org: "PT Infomedia Solusi Humanika (Client: Telkom Indonesia)",
    summary:
      "Maintained and shipped responsive web features for Telkom Indonesia education and health products, including Pijar Sekolah and Lovit Superapp. Maintained high test coverage with Jest and collaborated closely in Agile sprints.",
    tags: ["React", "Next.js", "TypeScript", "Redux", "Tailwind CSS", "Legion UI", "Jest"],
    tone: "#eef5f2",
  },
  {
    id: "solusi-konvergen-telkom",
    period: "Jan 2022 - Mar 2024",
    title: "Frontend Developer",
    org: "PT Solusi Konvergen Indonesia (Client: Telkom Indonesia)",
    summary:
      "Engineered SSR and CSR web applications for large-scale platforms including Pijar Mahir and Pijar Camp. Integrated REST APIs with Redux and SWR for real-time state caching and reliable data fetching.",
    tags: ["Next.js", "React", "TypeScript", "Redux", "SWR", "Tailwind CSS", "Material UI"],
    tone: "#f4f0f7",
  },
  {
    id: "cahaya-mitra-telkom",
    period: "Jun 2021 - Dec 2021",
    title: "Frontend Developer",
    org: "PT Cahaya Mitra Solusi (Client: Telkom Indonesia)",
    summary:
      "Built interactive course marketplace modules and bootcamp registration flows on Pijar Mahir. Added user event tracking with Google Analytics 4 and Tag Manager, translating Figma designs into modular React components.",
    tags: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Redux", "Google Analytics", "GTM"],
    tone: "#edf4f7",
  },
  {
    id: "bee-solution-partners",
    period: "Apr 2019 - Jun 2021",
    title: "Programmer / Frontend Developer",
    org: "PT Bee Solution Partners (Client: Telkom Indonesia)",
    summary:
      "Developed merchant account configuration dashboards and testing portals for INPOIN and DTP DSA. Led initial frontend implementation of the Pijar Mahir learning platform using React.",
    tags: ["React", "JavaScript", "Material UI", "Redux", "REST API", "Jest", "Java"],
    tone: "#f8f2ec",
  },
  {
    id: "inti-bumi-perkasa",
    period: "Aug 2014 - Mar 2019",
    title: "Electrical Technician & Software Support",
    org: "PT Inti Bumi Perkasa",
    summary:
      "Maintained electrical equipment and operational field reliability. Built an Android utility app to automate kWh meter deviation calculations for PLN Bandung Selatan, replacing error-prone manual calculations.",
    tags: ["Java", "Android Studio", "HTML", "Git"],
    tone: "#f7f0ee",
  },
  {
    id: "education-sttb",
    period: "2014 - 2018",
    title: "Bachelor of Information Technology",
    org: "Sekolah Tinggi Teknologi Bandung (STTB)",
    summary:
      "Graduated with a degree in Information Technology, building core foundations in software engineering, database design, algorithms, and web application development.",
    tags: ["Information Technology", "Computer Science", "Software Engineering"],
    tone: "#f4f6f0",
  },
];
