"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/content/profile";

interface HeroProps {
  koi?: ReactNode;
  children?: ReactNode;
}

const FONT_2D = '"CS Guthen", "Shippori Mincho", "Hiragino Mincho ProN", serif';
const FONT_ASCII = '"CS Guthen ASCII", monospace';

export default function Hero({ koi, children }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const paperOverlay = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const quoteRef = useRef<HTMLSpanElement>(null);
  const lastToggleTimeRef = useRef(0);
  const [isAscii, setIsAscii] = useState(false);
  const [fontFamily, setFontFamily] = useState(FONT_2D);
  const [fontVisible, setFontVisible] = useState(true);

  /** Animasi fade mengikuti gelombang ripple saat berganti font 2D <-> ASCII */
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("ascii-mode")) {
      setIsAscii(true);
      setFontFamily(FONT_ASCII);
    }

    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    const onToggleStart = (e: Event) => {
      const detail = (e as CustomEvent<{ targetAscii: boolean }>).detail;
      const targetAscii = detail?.targetAscii ?? false;

      // 1. Teks memudar / menghilang perlahan mengikuti mulainya riak
      setFontVisible(false);

      // 2. Saat teks sudah hilang sepenuhnya (~300ms), langsung ubah ke font target
      t1 = setTimeout(() => {
        setFontFamily(targetAscii ? FONT_ASCII : FONT_2D);
        setIsAscii(targetAscii);

        // 3. Muncul kembali perlahan sudah dalam font baru saat riak merambat melewati tengah
        t2 = setTimeout(() => {
          setFontVisible(true);
        }, 100);
      }, 300);
    };

    const onToggleEnd = (e: Event) => {
      const detail = (e as CustomEvent<{ isAscii: boolean }>).detail;
      const isAsc = detail?.isAscii ?? false;
      setIsAscii(isAsc);
      setFontFamily(isAsc ? FONT_ASCII : FONT_2D);
      setFontVisible(true);
    };

    window.addEventListener("koi:ascii-toggle-start", onToggleStart);
    window.addEventListener("koi:ascii-toggle-end", onToggleEnd);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("koi:ascii-toggle-start", onToggleStart);
      window.removeEventListener("koi:ascii-toggle-end", onToggleEnd);
    };
  }, []);

  const handleToggle = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 400) return;
    lastToggleTimeRef.current = now;

    const rect = quoteRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    window.dispatchEvent(
      new CustomEvent("koi:ascii-toggle", {
        detail: { x, y },
      }),
    );
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
          .to(paperOverlay.current, { opacity: 1, duration: 1 }, 0)
          .to(name.current, { scale: 0.88, duration: 1 }, 0)
          .fromTo(role.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.4);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[200vh] bg-water">
      {/* Layer 0: Kolam Koi (Realistis & ASCII) */}
      <div className="absolute inset-x-0 top-0 z-0 h-svh overflow-hidden">
        {koi ?? children}
      </div>

      {/* Layer 10: Overlay kertas yang memudar saat digulir */}
      <div
        ref={paperOverlay}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-paper opacity-0"
      />

      {/* Layer 20: Teks nama di atas kolam dengan mix-blend-difference */}
      <div className="pointer-events-none sticky top-0 z-20 flex h-svh w-full flex-col items-center justify-center px-4 text-center text-white mix-blend-difference">
        {/* Teks Nama: Menggunakan CS Guthen (2D) dan CS Guthen ASCII (ASCII mode) dengan transisi fade mengikuti gelombang ripple */}
        <h1
          ref={name}
          style={{
            fontFamily,
          }}
          className={[
            "relative w-full text-center text-[clamp(3.25rem,16vw,16rem)] leading-[1.05] font-extrabold tracking-tight select-none",
            "transition-all duration-300 ease-out",
            fontVisible
              ? "opacity-100 scale-100 blur-0"
              : "opacity-0 scale-[0.96] blur-[3px]",
          ].join(" ")}
        >
          {"Muhamad Son"}
          <span
            ref={quoteRef}
            data-no-feed="true"
            role="button"
            tabIndex={0}
            aria-label="Toggle ASCII style mode"
            title="Mode ASCII"
            onPointerDown={handleToggle}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleToggle(e);
              }
            }}
            className="pointer-events-auto relative inline-block cursor-pointer select-none font-serif transition-transform duration-200 hover:scale-125 focus:outline-none before:absolute before:-inset-4 before:content-['']"
          >
            &apos;
          </span>
          {"ani"}
        </h1>

        <p
          ref={role}
          className="mt-4 text-center text-lg font-medium opacity-0 motion-reduce:opacity-100 md:text-2xl"
        >
          {profile.role}
        </p>
      </div>
    </section>
  );
}
