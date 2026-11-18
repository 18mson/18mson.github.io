"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { timeline } from "@/content/timeline";
import TimelineItem from "./TimelineItem";

const PAPER = "#f6f9f8";

export default function Timeline() {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>(".tl-item");
        const tone = (color: string) =>
          gsap.to(section.current, { backgroundColor: color, duration: 0.9, ease: "power2.out", overwrite: true });

        items.forEach((item, i) => {
          const card = item.querySelector<HTMLElement>(".tl-card");
          const isLast = i === items.length - 1;

          // Kartu muncul dari bawah, lalu menghilang ke atas (kecuali yang terakhir).
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: item, start: "top 92%", end: "bottom 8%", scrub: true },
          });
          tl.fromTo(card, { autoAlpha: 0, y: 90, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 });
          if (!isLast) {
            tl.to(card, { duration: 0.4 }).to(card, { autoAlpha: 0, y: -90, scale: 0.94, duration: 0.3 });
          }

          // Penanda aktif saat bagian tengah layar (posisi titik) melewati item ini.
          ScrollTrigger.create({
            trigger: item,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => item.classList.toggle("is-active", self.isActive),
            onEnter: () => tone(timeline[i].tone),
            onEnterBack: () => tone(timeline[i].tone),
            onLeaveBack: () => tone(i === 0 ? PAPER : timeline[i - 1].tone),
          });
          ScrollTrigger.create({
            trigger: item,
            start: "center center",
            onEnter: () => item.classList.add("is-passed"),
            onLeaveBack: () => item.classList.remove("is-passed"),
          });
        });

        // Garis progres berhenti tepat di titik tengah.
        const wrap = list.current!;
        const bar = fill.current!;
        const setScale = gsap.quickSetter(bar, "scaleY");
        ScrollTrigger.create({
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          onUpdate: () => {
            const vh = window.innerHeight;
            const rect = wrap.getBoundingClientRect();
            const h = rect.height;
            const dot = Math.min(vh / 2 + Math.max(0, -rect.top), h - vh / 2);
            setScale(dot / h);
          },
        });
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section
      ref={section}
      id="experience"
      className="relative z-10 rounded-t-[2.5rem] bg-paper text-ink"
    >
      <div className="mx-auto max-w-5xl px-6 pt-28 md:pt-40">
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Experience</h2>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Selected work, engineering projects, and academic background.
        </p>
      </div>

      <div ref={list} className="relative mx-auto max-w-5xl">
        {/* Titik tengah: sticky di tengah layar, tidak memakan tinggi. */}
        <div aria-hidden className="pointer-events-none sticky top-0 z-20 -mb-[100svh] h-svh">
          <div className="absolute top-1/2 left-7 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-koi ring-8 ring-koi/20 md:left-1/2" />
        </div>

        {/* Garis dasar + garis progres */}
        <div aria-hidden className="absolute inset-y-0 left-7 w-px -translate-x-1/2 bg-ink/15 md:left-1/2" />
        <div
          ref={fill}
          aria-hidden
          className="absolute inset-y-0 left-7 w-px origin-top -translate-x-1/2 scale-y-0 bg-koi md:left-1/2"
        />

        <div className="h-[38svh]" />
        <ol className="space-y-[18svh] px-6">
          {timeline.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} />
          ))}
        </ol>
        <div className="h-[45svh]" />
      </div>
    </section>
  );
}
