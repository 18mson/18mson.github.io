"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { projects } from "@/content/projects";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  const container = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cardEl = el.firstElementChild as HTMLElement | null;
    const cardWidth = cardEl ? cardEl.offsetWidth + 20 : 1;
    const nextIndex = Math.round(el.scrollLeft / cardWidth);
    if (nextIndex !== activeMobileIndex && nextIndex >= 0 && nextIndex < projects.length) {
      setActiveMobileIndex(nextIndex);
    }
  };

  const scrollToMobileCard = (index: number) => {
    if (!track.current) return;
    const target = track.current.children[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        inline: index === 0 ? "start" : "center",
        block: "nearest",
      });
      setActiveMobileIndex(index);
    }
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Horizontal pin scroll hanya di layar desktop dengan motion normal
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const trackEl = track.current;
        const containerEl = container.current;
        if (!trackEl || !containerEl) return;

        const getScrollDistance = () => trackEl.scrollWidth - window.innerWidth;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerEl,
            start: "top top",
            end: () => `+=${getScrollDistance() + window.innerHeight * 0.8}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // 1. Buffer jeda awal: pastikan section benar-benar berhenti di tengah layar
        // sebelum card mulai bergeser ke kiri. User punya waktu mencerna judul & card 01.
        tl.to({}, { duration: 0.4 });

        // 2. Animasi horizontal reel card
        tl.to(trackEl, {
          x: () => -getScrollDistance(),
          duration: 2.2,
          ease: "none",
        });

        // 3. Buffer jeda akhir: memberi jeda setelah card terakhir dan space kosong terlihat jelas
        tl.to({}, { duration: 0.6 });
      });

      return () => mm.revert();
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="projects"
      className="relative z-10 flex min-h-svh md:h-svh w-full flex-col justify-center overflow-hidden bg-paper text-ink transition-colors duration-500 py-16 md:py-0"
    >
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
              Selected Works
            </h2>
            <p className="mt-4 max-w-md text-lg text-ink/70">
              Production web platforms, design systems, and frontend architectures.
            </p>
          </div>

          {/* Penanda interaktif mobile (pagination pill & counter) */}
          <div className="flex items-center justify-between border-t border-ink/10 pt-4 md:hidden">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Projects pagination">
              {projects.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToMobileCard(idx)}
                  aria-label={`Go to project ${idx + 1}`}
                  aria-selected={activeMobileIndex === idx}
                  className={`h-2 rounded-full transition-all duration-300 ${activeMobileIndex === idx ? "w-8 bg-koi" : "w-2 bg-ink/20 hover:bg-ink/40"
                    }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-ink/70 tabular-nums">
              {String(activeMobileIndex + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")} · {activeMobileIndex === projects.length - 1 ? "Complete" : "Swipe →"}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal showcase container */}
      <div className="mt-8 overflow-hidden md:mt-12">
        <div
          ref={track}
          onScroll={handleMobileScroll}
          style={{
            paddingLeft: "max(1.5rem, calc((100vw - 64rem) / 2 + 1.5rem))",
            paddingRight: "max(1.5rem, calc((100vw - 64rem) / 2 + 1.5rem))",
          }}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none touch-pan-y md:overflow-visible md:snap-none md:gap-6"
        >
          {projects.map((item) => (
            <div key={item.id} className="snap-center shrink-0">
              <ProjectCard project={item} />
            </div>
          ))}

          {/* Physical trailing spacer to ensure card 04 scrolls well inward into view */}
          <div
            aria-hidden="true"
            className="w-[40vw] max-w-150 shrink-0 pointer-events-none md:w-[48vw]"
          />
        </div>
      </div>
    </section>
  );
}
