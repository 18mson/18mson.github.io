export interface TimelineItem {
  id: string;
  period: string;
  title: string;
  org: string;
  summary: string;
  tags: string[];
  /** Warna background section saat item ini berada di tengah layar. */
  tone: string;
}

export const timeline: TimelineItem[] = [
  {
    id: "indocyber-bri",
    period: "Februari 2026 – Sekarang",
    title: "Frontend Developer (BRI)",
    org: "PT Indocyber Global Teknologi • BRI",
    summary:
      "Mengembangkan dan merawat aplikasi web perbankan untuk BRI, termasuk proyek BRI Universal Biller. Mengimplementasikan unit testing dengan Vitest dan Testing Library, serta mengoptimalkan performa aplikasi CSR & SSR lintas desktop dan mobile browser.",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "React Hooks", "Vitest", "Testing Library"],
    tone: "#f6f9f8",
  },
  {
    id: "infomedia-telkom",
    period: "April 2024 – Maret 2025",
    title: "Frontend Developer (Telkom Indonesia)",
    org: "PT Infomedia Solusi Humanika • PT Telkom Indonesia",
    summary:
      "Membangun dan merawat aplikasi web responsif untuk produk edukasi dan layanan digital Telkom Indonesia (Pijar Sekolah, Pijar Belajar, Lovit Superapp, Pijar Camp, dan Pijar Mahir). Menjamin kualitas kode dengan pengujian unit Jest & Testing Library dalam sprint Agile/Scrum.",
    tags: ["React.js", "Next.js", "TypeScript", "Redux", "Tailwind CSS", "Legion UI", "Jest"],
    tone: "#eef5f2",
  },
  {
    id: "solusi-konvergen-telkom",
    period: "Januari 2022 – Maret 2024",
    title: "Frontend Developer (Telkom Indonesia)",
    org: "PT Solusi Konvergen Indonesia • PT Telkom Indonesia",
    summary:
      "Mengembangkan aplikasi web skala besar dengan arsitektur SSR & CSR untuk platform Pijar Mahir, Pijar Camp, dan Lovit Superapp. Mengintegrasikan RESTful API dengan Redux dan SWR untuk manajemen state, caching, dan data fetching real-time.",
    tags: ["Next.js", "React.js", "TypeScript", "Redux", "SWR", "Tailwind CSS", "Material UI"],
    tone: "#f4f0f7",
  },
  {
    id: "cahaya-mitra-telkom",
    period: "Juni 2021 – Desember 2021",
    title: "Frontend Developer (Telkom Indonesia)",
    org: "PT Cahaya Mitra Solusi • PT Telkom Indonesia",
    summary:
      "Membangun modul marketplace interaktif dan fitur registrasi bootcamp pada platform Pijar Mahir & Pijar Camp. Mengimplementasikan tracking analitik dengan Google Analytics 4 dan Google Tag Manager, serta menerjemahkan mockup Figma menjadi komponen React modular.",
    tags: ["Next.js", "React.js", "TypeScript", "Tailwind CSS", "Redux", "Google Analytics", "GTM"],
    tone: "#edf4f7",
  },
  {
    id: "bee-solution-partners",
    period: "April 2019 – Juni 2021",
    title: "Programmer / Frontend Developer",
    org: "PT Bee Solution Partners • PT Telkom Indonesia",
    summary:
      "Mengembangkan aplikasi dashboard dan portal pengujian konfigurasi akun merchant (INPOIN & DTP DSA). Memulai fase awal arsitektur dan pengembangan platform marketplace dan LMS Pijar Mahir menggunakan React.js.",
    tags: ["React.js", "JavaScript", "Material UI", "Redux", "REST API", "Jest", "Java"],
    tone: "#f8f2ec",
  },
  {
    id: "inti-bumi-perkasa",
    period: "Agustus 2014 – Maret 2019",
    title: "Electric Technician & Software Support",
    org: "PT Inti Bumi Perkasa",
    summary:
      "Bertanggung jawab atas pemeliharaan kelistrikan dan keandalan operasional peralatan lapangan. Mengembangkan aplikasi Android (Deviasi kWh Meter) untuk mengotomasi kalkulasi nilai deviasi meteran pada proyek PT PLN (Persero) Rayon Bandung Selatan.",
    tags: ["Java", "Android Studio", "HTML", "Git"],
    tone: "#f7f0ee",
  },
  {
    id: "education-sttb",
    period: "2014 – 2018",
    title: "S1 Teknik Informatika (Bachelor of IT)",
    org: "Sekolah Tinggi Teknologi Bandung (STTB)",
    summary:
      "Lulusan Sarjana Komputer jurusan Teknik Informatika dengan fondasi mendalam di bidang Software Engineering, arsitektur web, algoritma, dan rekayasa basis data.",
    tags: ["Teknik Informatika", "Software Engineering", "Computer Science"],
    tone: "#f4f6f0",
  },
];
