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

// TODO: semua tanggal dan beberapa isi di bawah masih placeholder. Edit di sini saja.
export const timeline: TimelineItem[] = [
  {
    id: "bri",
    period: "20XX – sekarang",
    title: "Frontend Developer",
    org: "Bank Rakyat Indonesia (BRI)",
    summary: "Membangun dan merawat antarmuka web dengan Next.js, React, dan TypeScript.",
    tags: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
    tone: "#f6f9f8",
  },
  {
    id: "previous",
    period: "20XX – 20XX",
    title: "Posisi sebelumnya",
    org: "Nama perusahaan",
    summary: "Tulis peran, tanggung jawab utama, dan hasil yang paling kamu banggakan di sini.",
    tags: ["Vue 3", "Pinia"],
    tone: "#eef5f2",
  },
  {
    id: "lovely-ever",
    period: "Proyek pribadi",
    title: "Lovely Ever",
    org: "lovelyever.com",
    summary: "SaaS undangan pernikahan multi-tenant dengan banyak template, dibangun di atas Next.js dan Supabase.",
    tags: ["Next.js", "Supabase"],
    tone: "#f4f0f7",
  },
  {
    id: "education",
    period: "20XX – 20XX",
    title: "Pendidikan",
    org: "Nama kampus atau sekolah",
    summary: "Jurusan, pencapaian, atau kegiatan yang membentuk jalur karirmu.",
    tags: [],
    tone: "#f8f2ec",
  },
];
