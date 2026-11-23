"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { timeline } from "@/content/timeline";
import TimelineItem from "./TimelineItem";

const PAPER = "#f6f9f8";

export default function Timeline() {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onThemeEnd = (e: Event) => {
      const isDark = (e as CustomEvent).detail?.isDark;
      if (section.current) {
        if (isDark) {
          section.current.style.backgroundColor = "";
        } else {
          gsap.to(section.current, {
            backgroundColor: PAPER,
            duration: 0.4,
            overwrite: true,
          });
        }
      }
    };
    window.addEventListener("koi:theme-toggle-end", onThemeEnd);
    return () => window.removeEventListener("koi:theme-toggle-end", onThemeEnd);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = gsap.utils.toArray<HTMLElement>(".tl-item");
        const tone = (color: string) => {
          const isDark = document.documentElement.classList.contains("dark");
          if (isDark) {
            if (section.current) section.current.style.backgroundColor = "";
            return;
          }
          gsap.to(section.current, { backgroundColor: color, duration: 0.9, ease: "power2.out", overwrite: true });
        };

        items.forEach((item) => {
          const card = item.querySelector<HTMLElement>(".tl-card");
          if (!card) return;

          // Kartu muncul halus segera saat mulai memasuki layar dari bawah, tanpa delay
          gsap.fromTo(
            card,
            { autoAlpha: 0, y: 24, scale: 0.98 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.35,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "top 96%",
                toggleActions: "play none none none",
                once: true,
              },
            }
          );
        });

        const trackEl = track.current;
        const fillEl = fill.current;
        const indicatorEl = indicator.current;
        const wrap = list.current;

        let startY = 0;
        let endY = 0;
        let currentActiveIdx = -1;

        const updateLineBounds = () => {
          if (!trackEl || !fillEl || !wrap || items.length === 0) return;
          const firstNode = items[0].querySelector<HTMLElement>(".tl-node");
          const lastNode = items[items.length - 1].querySelector<HTMLElement>(".tl-node");
          if (!firstNode || !lastNode) return;

          const listRect = wrap.getBoundingClientRect();
          const firstRect = firstNode.getBoundingClientRect();
          const lastRect = lastNode.getBoundingClientRect();

          startY = firstRect.top - listRect.top + firstRect.height / 2;
          endY = lastRect.top - listRect.top + lastRect.height / 2;
          const totalLineHeight = Math.max(0, endY - startY);

          trackEl.style.top = `${startY}px`;
          trackEl.style.height = `${totalLineHeight}px`;
          trackEl.style.opacity = "1";

          if (indicatorEl) indicatorEl.style.opacity = "1";

          updateProgress();
        };

        const updateProgress = () => {
          if (!wrap || !fillEl || !indicatorEl || items.length === 0) return;
          const listRect = wrap.getBoundingClientRect();
          const vh = window.innerHeight;
          const vhCenterInWrap = vh / 2 - listRect.top;

          // Titik aktif mulai tepat dari titik teratas (startY) dan berhenti di titik terbawah (endY)
          const dotY = Math.min(endY, Math.max(startY, vhCenterInWrap));
          indicatorEl.style.top = `${dotY}px`;

          // Garis oranye membentang dari titik aktif ke bawah (ke masa lalu), sedangkan yang di atas gelap
          fillEl.style.top = `${dotY}px`;
          const coloredHeight = Math.max(0, endY - dotY);
          fillEl.style.height = `${coloredHeight}px`;
          fillEl.style.opacity = coloredHeight > 0 ? "1" : "0";

          // Sinkronisasi status titik-titik timeline:
          // - Di atas titik aktif (dotY): garis gelap -> titik GELAP (is-dark)
          // - Di bawah titik aktif (dotY): garis oranye -> titik MENYALA (is-lit)
          // - Tepat di posisi titik aktif: is-active
          let closestIdx = 0;
          let minDiff = Infinity;

          items.forEach((item, i) => {
            const node = item.querySelector<HTMLElement>(".tl-node");
            if (!node) return;
            const nodeRect = node.getBoundingClientRect();
            const nodeY = nodeRect.top - listRect.top + nodeRect.height / 2;
            const diff = Math.abs(nodeY - dotY);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }

            const isPassed = nodeY < dotY - 4;
            if (isPassed) {
              item.classList.add("is-dark");
              item.classList.remove("is-lit");
              node.style.backgroundColor = "var(--color-paper)";
              node.style.borderColor = "color-mix(in oklab, var(--color-ink) 25%, transparent)";
            } else {
              item.classList.add("is-lit");
              item.classList.remove("is-dark");
              node.style.backgroundColor = "var(--color-koi)";
              node.style.borderColor = "var(--color-koi)";
            }
          });

          items.forEach((item, i) => {
            item.classList.toggle("is-active", i === closestIdx);
          });

          if (closestIdx !== currentActiveIdx) {
            currentActiveIdx = closestIdx;
            tone(timeline[closestIdx].tone);
          }
        };

        updateLineBounds();

        // Update saat font selesai loading agar kalkulasi tinggi kartu dan titik presisi
        if (typeof document !== "undefined" && document.fonts) {
          document.fonts.ready.then(() => {
            updateLineBounds();
            ScrollTrigger.refresh();
          });
        }

        // ResizeObserver agar selalu akurat saat reflow
        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined" && wrap) {
          ro = new ResizeObserver(() => {
            updateLineBounds();
            ScrollTrigger.refresh();
          });
          ro.observe(wrap);
        }

        ScrollTrigger.addEventListener("refresh", updateLineBounds);

        // Scroll update untuk posisi titik tengah dan pengisian garis progres
        ScrollTrigger.create({
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          onUpdate: updateProgress,
        });

        // Transisi tone kembali ke warna paper saat scroll melewati akhir timeline
        ScrollTrigger.create({
          trigger: wrap,
          start: "bottom center",
          onEnter: () => {
            const isDark = document.documentElement.classList.contains("dark");
            if (!isDark) tone(PAPER);
          },
          onLeaveBack: () => {
            if (currentActiveIdx >= 0) tone(timeline[currentActiveIdx].tone);
          },
        });

        return () => {
          if (ro) ro.disconnect();
          ScrollTrigger.removeEventListener("refresh", updateLineBounds);
        };
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
      <div className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Experience</h2>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Selected work, engineering projects, and academic background.
        </p>
      </div>

      <div ref={list} className="relative mx-auto max-w-5xl">
        {/* Garis dasar (abu-abu) mulai dari titik pertama sampai titik terakhir */}
        <div
          ref={track}
          aria-hidden
          style={{ opacity: 0 }}
          className="absolute left-7 w-px -translate-x-1/2 bg-ink/15 transition-opacity duration-300 md:left-1/2"
        />

        {/* Garis progres (oranye) mulai dari titik pertama mengikuti titik aktif */}
        <div
          ref={fill}
          aria-hidden
          style={{ opacity: 0 }}
          className="absolute left-7 w-px -translate-x-1/2 bg-koi transition-opacity duration-300 md:left-1/2"
        />

        {/* Titik indikator aktif: mulai dari titik teratas, lalu mengikuti posisi scroll di tengah */}
        <div
          ref={indicator}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute left-7 z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-koi ring-8 ring-koi/20 transition-opacity duration-300 md:left-1/2"
        />

        <div className="h-6 md:h-8" />
        <ol className="space-y-6 md:space-y-0 px-6">
          {timeline.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} />
          ))}
        </ol>
        <div className="h-10 md:h-14" />
      </div>
    </section>
  );
}
