"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import ToolsGalaxy from "./ToolsGalaxy";

/**
 * Section Tools: galaksi interaktif layar penuh dengan auto-snap mulus saat masuk viewport.
 */
export default function Tools() {
  const sectionRef = useRef<HTMLElement>(null);
  const isSnappingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lenis = useLenis();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const performSnap = () => {
      if (isSnappingRef.current) return;
      isSnappingRef.current = true;

      if (lenis) {
        lenis.scrollTo(el, {
          duration: 0.7,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: () => {
            isSnappingRef.current = false;
          },
        });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          isSnappingRef.current = false;
        }, 750);
      }
    };

    const checkSnap = (velocity = 0) => {
      if (isSnappingRef.current) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Section #toolbox dianggap dominan ketika sebagian besar tingginya berada di viewport
      // (top antara -35% vh sampai +45% vh) dan belum pas di atas layar (abs(top) > 8px)
      const isDominant = rect.top <= vh * 0.45 && rect.bottom >= vh * 0.55;
      const needsSnap = Math.abs(rect.top) > 8;

      if (isDominant && needsSnap) {
        if (timerRef.current) clearTimeout(timerRef.current);

        // Debounce: eksekusi snap saat scroll melambat / berhenti agar tidak memotong scroll cepat user
        timerRef.current = setTimeout(() => {
          if (!sectionRef.current || isSnappingRef.current) return;
          const currentRect = sectionRef.current.getBoundingClientRect();
          const currentVh = window.innerHeight;

          if (
            currentRect.top <= currentVh * 0.45 &&
            currentRect.bottom >= currentVh * 0.55 &&
            Math.abs(currentRect.top) > 8 &&
            Math.abs(velocity) < 0.3
          ) {
            performSnap();
          }
        }, 120);
      }
    };

    if (lenis) {
      const onLenisScroll = (e: { velocity?: number }) => {
        checkSnap(e?.velocity ?? 0);
      };
      lenis.on("scroll", onLenisScroll);
      return () => {
        lenis.off("scroll", onLenisScroll);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      const onWindowScroll = () => {
        checkSnap(0);
      };
      window.addEventListener("scroll", onWindowScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onWindowScroll);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [lenis]);

  return (
    <section
      ref={sectionRef}
      id="toolbox"
      aria-label="Toolbox"
      className="relative z-10 w-full overflow-hidden bg-[#03060c] text-[#eaf2f4] scroll-mt-0 snap-start"
    >
      {/* Kanvas galaksi satu layar penuh */}
      <div className="relative h-svh min-h-155 w-full">
        <ToolsGalaxy />
      </div>
    </section>
  );
}
