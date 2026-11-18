"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import KoiCanvas from "@/components/koi/KoiCanvas";
import { profile } from "@/data/profile";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const [fed, setFed] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Kolam bergulir naik, nama tetap menempel, background perlahan berubah jadi putih.
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          })
          .to(root.current, { backgroundColor: "#f6f9f8", duration: 1 }, 0)
          .to(name.current, { scale: 0.88, duration: 1 }, 0)
          .fromTo(role.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.4);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[200vh] h-[200svh] bg-water">
      {/* Kolam: hanya setinggi layar pertama, jadi ikut bergulir ke atas. */}
      <div className="absolute inset-x-0 top-0 h-svh overflow-hidden">
        <KoiCanvas onFirstFeed={() => setFed(true)} />
      </div>

      {/* Lapisan nama: sticky + blend difference supaya warna huruf terbalik terhadap yang ada di belakangnya. */}
      <div className="pointer-events-none sticky top-0 flex h-svh flex-col items-center justify-center px-4 text-white mix-blend-difference">
        <h1
          ref={name}
          className="font-name text-[clamp(3.25rem,16vw,16rem)] leading-[1.05] font-extrabold tracking-tight"
        >
          {profile.name}
        </h1>
        <p
          ref={role}
          className="mt-4 text-lg font-medium opacity-0 motion-reduce:opacity-100 md:text-2xl"
        >
          {profile.role}
        </p>
        <p
          className={`absolute bottom-8 text-sm transition-opacity duration-700 ${fed ? "opacity-0" : "opacity-80"}`}
        >
          <span className="[@media(hover:none)]:hidden">Gerakkan kursor di atas kolam untuk memberi makan ikan.</span>
          <span className="hidden [@media(hover:none)]:inline">Sentuh kolam untuk memberi makan ikan.</span>
        </p>
      </div>
    </section>
  );
}
