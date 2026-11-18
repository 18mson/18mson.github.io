import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
// Font nama: hanya subset latin, jadi ringan. Ganti ke bobot/font lain di sini dan di --font-name.
import "@fontsource/shippori-mincho/latin-800.css";
import "./globals.css";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description: profile.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
