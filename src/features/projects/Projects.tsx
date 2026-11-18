"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { projects } from "@/content/projects";
import ProjectCard from "./ProjectCard";

export default function Projects() {
  const container = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Horizontal pin scroll hanya di layar desktop dengan motion normal
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const trackEl = track.current;
        const containerEl = container.current;
        if (!trackEl || !containerEl) return;

        const getScrollDistance = () => trackEl.scrollWidth - window.innerWidth + 140;

        // Pin baru aktif ketika section benar-benar berada di tengah layar (center center)
        // sehingga card tidak langsung bergulir sebelum posisinya pas di tengah
        gsap.to(trackEl, {
          x: () => -getScrollDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: containerEl,
            start: "center center",
            end: () => `+=${getScrollDistance() + 250}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="projects"
      className="relative z-10 flex min-h-svh flex-col justify-center bg-paper py-16 text-ink transition-colors duration-500 md:py-20"
    >
      <div className="mx-auto w-full max-w-5xl px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
          Selected Works
        </h2>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Production web platforms, design systems, and frontend architectures.
        </p>
      </div>

      {/* Horizontal showcase container */}
      <div className="mt-12 overflow-hidden md:mt-16">
        <div
          ref={track}
          className="flex gap-6 px-6 overflow-x-auto snap-x snap-mandatory scrollbar-none md:overflow-visible md:snap-none md:px-20"
        >
          {projects.map((item) => (
            <div key={item.id} className="snap-center shrink-0">
              <ProjectCard project={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
