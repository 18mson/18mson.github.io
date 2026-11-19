"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { projects } from "@/content/projects";
import ProjectRow from "./ProjectRow";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

export default function Projects() {
  const container = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canHover, setCanHover] = useState(true);

  const prevActive = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rowEls = useRef<(HTMLLIElement | null)[]>([]);
  const fillEls = useRef<(HTMLDivElement | null)[]>([]);
  const hankoEls = useRef<(HTMLSpanElement | null)[]>([]);
  // Titik asal ripple per baris (relatif terhadap <li>); null = pakai tengah hanko.
  const origins = useRef<({ x: number; y: number } | null)[]>(projects.map(() => null));

  useEffect(() => {
    const mq = window.matchMedia(HOVER_QUERY);
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const handlePointerMoveRow = (index: number, e: PointerEvent<HTMLLIElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    origins.current[index] = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleSelect = (index: number, immediate = false) => {
    clearHoverTimer();
    if (immediate || !canHover) {
      setActiveIndex(index);
      return;
    }
    // Jeda singkat: kursor yang hanya melintas tidak mengganti baris.
    hoverTimer.current = setTimeout(() => setActiveIndex(index), 80);
  };

  /** Titik asal ripple baris i: posisi kursor terakhir, atau tengah hanko. */
  const originOf = (i: number) => {
    const saved = origins.current[i];
    if (saved) return saved;
    const row = rowEls.current[i];
    const hanko = hankoEls.current[i];
    if (!row || !hanko) return { x: 0, y: 0 };
    const r = row.getBoundingClientRect();
    const h = hanko.getBoundingClientRect();
    return { x: h.left + h.width / 2 - r.left, y: h.top + h.height / 2 - r.top };
  };

  /** Radius yang menutup seluruh baris, termasuk tinggi panel yang sedang akan terbuka. */
  const radiusFor = (i: number, x: number, y: number) => {
    const row = rowEls.current[i];
    if (!row) return 0;
    const panel = row.querySelector<HTMLElement>(".pr-panel");
    const inner = panel?.firstElementChild as HTMLElement | null;
    const extra = panel && inner ? Math.max(0, inner.scrollHeight - panel.offsetHeight) : 0;
    const w = row.offsetWidth;
    const h = row.offsetHeight + extra;
    return Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));
  };

  // Ripple saat baris aktif berganti
  useGSAP(
    () => {
      const prev = prevActive.current;
      const next = activeIndex;
      if (prev === next) return;
      prevActive.current = next;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const prevFill = fillEls.current[prev];
      const nextFill = fillEls.current[next];

      if (prevFill) {
        const { x, y } = originOf(prev);
        const to = `circle(0px at ${x}px ${y}px)`;
        if (reduced) gsap.set(prevFill, { clipPath: to });
        else gsap.to(prevFill, { clipPath: to, duration: 0.45, ease: "power2.in", overwrite: true });
      }

      if (nextFill) {
        const { x, y } = originOf(next);
        const to = `circle(${radiusFor(next, x, y)}px at ${x}px ${y}px)`;
        if (reduced) gsap.set(nextFill, { clipPath: to });
        else {
          gsap.fromTo(
            nextFill,
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: to, duration: 0.7, ease: "power3.out", overwrite: true },
          );
        }
      }
    },
    { dependencies: [activeIndex], scope: container },
  );

  // Entrance sekali + aktivasi berdasarkan scroll di perangkat sentuh
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = rowEls.current.filter((el): el is HTMLLIElement => !!el);
        const fill0 = fillEls.current[0];
        if (!rows.length || !list.current) return;

        // Sembunyikan sebelum masuk viewport supaya tidak ada kedipan.
        gsap.set(rows, { autoAlpha: 0, y: 24 });
        if (fill0) {
          const { x, y } = originOf(0);
          gsap.set(fill0, { clipPath: `circle(0px at ${x}px ${y}px)` });
        }

        ScrollTrigger.create({
          trigger: list.current,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(rows, {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              stagger: 0.08,
              ease: "power2.out",
              clearProps: "transform,opacity,visibility",
            });
            if (fill0) {
              const { x, y } = originOf(0);
              gsap.to(fill0, {
                clipPath: `circle(${radiusFor(0, x, y)}px at ${x}px ${y}px)`,
                duration: 0.8,
                delay: 0.15,
                ease: "power3.out",
                overwrite: true,
              });
            }
          },
        });
      });

      // Sentuh: baris yang melintasi 60% tinggi viewport menjadi aktif (tanpa mengubah tinggi baris).
      mm.add("(hover: none), (pointer: coarse)", () => {
        rowEls.current.forEach((row, i) => {
          if (!row) return;
          ScrollTrigger.create({
            trigger: row,
            start: "top 60%",
            end: "bottom 60%",
            onToggle: (self) => {
              if (self.isActive) setActiveIndex(i);
            },
          });
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
      className="relative z-10 bg-paper py-24 text-ink transition-colors duration-500 md:py-32"
    >
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Selected Works</h2>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Production web platforms, design systems, and frontend architectures.
        </p>

        <ul ref={list} className="mt-16 md:mt-20">
          {projects.map((item, idx) => (
            <ProjectRow
              key={item.id}
              project={item}
              index={idx}
              isActive={activeIndex === idx}
              canHover={canHover}
              initiallyFilled={idx === 0}
              onSelect={handleSelect}
              onPointerMoveRow={handlePointerMoveRow}
              onLeaveRow={clearHoverTimer}
              rowRef={(el) => {
                rowEls.current[idx] = el;
              }}
              fillRef={(el) => {
                fillEls.current[idx] = el;
              }}
              hankoRef={(el) => {
                hankoEls.current[idx] = el;
              }}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
