import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
// Font nama: hanya subset latin, jadi ringan. Ganti ke bobot/font lain di sini dan di --font-name.
import "@fontsource/shippori-mincho/latin-800.css";
import "./fonts.css";
import "./globals.css";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: `${profile.name} · ${profile.role}`,
  description: profile.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/CsGuthen.otf" as="font" type="font/otf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/CsGuthenAscii.otf" as="font" type="font/otf" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
