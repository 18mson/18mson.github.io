import type { ReactNode } from "react";
import ContactCard from "./ContactCard";
import Footer from "./Footer";

/**
 * Penutup halaman: kolam koi sebagai latar, teks di atasnya memakai blend difference
 * seperti nama di Hero. Kolam dipasang dari page.tsx lewat prop `koi` (feature tidak saling impor).
 */
export default function Contact({ koi }: { koi?: ReactNode }) {
  return (
    <section
      id="contact"
      className="relative z-10 overflow-hidden rounded-t-[2.5rem] bg-water text-white transition-colors duration-500"
    >
      <div className="absolute inset-0">{koi}</div>

      <div className="relative mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 pt-24 md:pt-32">
        <ContactCard />
        <Footer />
      </div>
    </section>
  );
}
