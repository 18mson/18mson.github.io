"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { KoiPond } from "./engine";
import type { PondSnapshot } from "./KoiAscii";

export interface RealisticPondHandle {
  applySnapshot: (s: PondSnapshot) => void;
  getSnapshot: () => PondSnapshot;
}

export interface RealisticPondProps {
  onFirstFeed?: () => void;
  /**
   * "hero": kolam utama, dengan easter egg teratai untuk ganti tema.
   * "footer": kolam penutup yang lebih kecil, tanpa easter egg, bisa diberi makan lewat event "koi:feed-burst".
   */
  variant?: "hero" | "footer";
  active?: boolean;
  /** Jika diisi, snapshot posisi ikan & teratai saat ini dikirim ke callback ini tiap frame */
  onSnapshot?: (s: PondSnapshot) => void;
  /** Override jumlah ikan agar cocok dengan mode ASCII */
  fishCount?: number | { narrow: number; mid: number; wide: number };
  /** Override status dark mode secara eksplisit saat animasi transisi */
  isDark?: boolean | null;
  /** Snapshot posisi ikan & teratai untuk disinkronkan ke kolam 2D */
  seedSnapshot?: PondSnapshot | null;
}

export const RealisticPond = forwardRef<RealisticPondHandle, RealisticPondProps>(
  function RealisticPond(
    {
      onFirstFeed,
      variant = "hero",
      active = true,
      onSnapshot,
      fishCount,
      isDark,
      seedSnapshot,
    },
    forwardedRef,
  ) {
    const ref = useRef<HTMLCanvasElement>(null);
    const pondRef = useRef<KoiPond | null>(null);
    const feedRef = useRef(onFirstFeed);
    feedRef.current = onFirstFeed;
    const hasPointerRef = useRef(false);
    const onSnapshotRef = useRef(onSnapshot);
    onSnapshotRef.current = onSnapshot;
    const fishCountRef = useRef(fishCount);
    fishCountRef.current = fishCount;

    useImperativeHandle(forwardedRef, () => ({
      applySnapshot: (s: PondSnapshot) => {
        pondRef.current?.applySnapshot(s);
      },
      getSnapshot: () => {
        return pondRef.current?.getSnapshot() || { fish: [], pads: [], w: 0, h: 0 };
      },
    }));

    // Update override tema (misal saat animasi transisi ke 2D mode light atau dark)
    useEffect(() => {
      if (pondRef.current) {
        pondRef.current.overrideDark = isDark ?? null;
      }
    }, [isDark]);

    // Terapkan seed posisi ikan & teratai seketika
    useEffect(() => {
      if (seedSnapshot && pondRef.current) {
        pondRef.current.applySnapshot(seedSnapshot);
      }
    }, [seedSnapshot]);

    // Update status aktif tanpa mendestroy pond
    useEffect(() => {
      if (pondRef.current) {
        pondRef.current.setActive(active);
      }
    }, [active]);

    useEffect(() => {
      const canvas = ref.current;
      if (!canvas) return;

      const isHero = variant === "hero";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Gunakan jumlah ikan yang sama dengan mode ASCII
      const targetCount = fishCountRef.current;
      const pond = new KoiPond(
        canvas,
        isHero
          ? {
              reducedMotion: reduced,
              ...(targetCount != null
                ? {
                    fishCount:
                      typeof targetCount === "number"
                        ? { narrow: targetCount, mid: targetCount, wide: targetCount }
                        : targetCount,
                  }
                : {}),
            }
          : {
              reducedMotion: reduced,
              fishCount: { narrow: 3, mid: 4, wide: 5 },
              pads: { total: 4, flowers: 2 },
            },
      );
      pond.isDark = document.documentElement.classList.contains("dark");
      if (isDark !== undefined) {
        pond.overrideDark = isDark ?? null;
      }
      pond.setActive(active);
      pondRef.current = pond;

      if (seedSnapshot) {
        pond.applySnapshot(seedSnapshot);
      }

      pond.onFirstFeed = () => {
        feedRef.current?.();
        if (isHero) window.dispatchEvent(new CustomEvent("koi:first-feed"));
      };

      pond.onThemeToggleStart = (targetDark, x, y, duration) => {
        window.dispatchEvent(
          new CustomEvent("koi:theme-toggle-start", { detail: { targetDark, x, y, duration } }),
        );
      };

      pond.onThemeToggleEnd = (isDark) => {
        window.dispatchEvent(
          new CustomEvent("koi:theme-toggle-end", { detail: { isDark } }),
        );
      };

      const measure = () => pond.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(canvas);

      const isAtHeroTop = () => isHero && window.scrollY < 60;

      const onScroll = () => {
        if (hasPointerRef.current && isHero && !isAtHeroTop()) {
          document.body.style.cursor = "";
          hasPointerRef.current = false;
        }
        if (pond.isTransitioning) {
          pond.completeThemeTransition();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && pond.isTransitioning) {
          pond.completeThemeTransition();
        }
        pond.setActive(entry.isIntersecting && active);
      });
      io.observe(canvas);

      const tick = (_time: number, deltaMs: number) => {
        if (!pond.active) return;
        pond.frame(Math.min(deltaMs, 50) / 1000);
        // Kirim snapshot tiap frame ke callback saat aktif
        if (onSnapshotRef.current) {
          onSnapshotRef.current(pond.getSnapshot());
        }
      };
      gsap.ticker.add(tick);

      const local = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top] as const;
      };
      const onMove = (e: PointerEvent) => {
        if (!pond.active) return;
        const [x, y] = local(e);
        const insideCanvas = x >= 0 && y >= 0 && x <= canvas.clientWidth && y <= canvas.clientHeight;
        if (!insideCanvas) {
          if (hasPointerRef.current) {
            document.body.style.cursor = "";
            hasPointerRef.current = false;
          }
          return;
        }

        pond.pointerMove(x, y);

        const target = e.target as HTMLElement | null;
        const isClickableElement = !!target?.closest?.("a, button, input, textarea, select, [data-no-feed]");

        const canClick = isHero ? isAtHeroTop() : true;
        if (canClick && !isClickableElement && pond.isOverClickablePad(x, y)) {
          document.body.style.cursor = "pointer";
          hasPointerRef.current = true;
        } else if (hasPointerRef.current) {
          document.body.style.cursor = "";
          hasPointerRef.current = false;
        }
      };
      const onDown = (e: PointerEvent) => {
        if (!pond.active) return;
        const [x, y] = local(e);
        const insideCanvas = x >= 0 && y >= 0 && x <= canvas.clientWidth && y <= canvas.clientHeight;
        if (!insideCanvas) return;

        const target = e.target as HTMLElement | null;
        const isClickableElement = !!target?.closest?.("a, button, input, textarea, select, [data-no-feed]");
        if (isClickableElement) return;

        const allowEasterEgg = isHero ? isAtHeroTop() : true;
        pond.pointerDown(x, y, allowEasterEgg);
      };
      const onLeave = () => {
        if (hasPointerRef.current) {
          document.body.style.cursor = "";
          hasPointerRef.current = false;
        }
        pond.pointerLeave();
      };

      const onFeedBurst = (e: Event) => {
        const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
        const r = canvas.getBoundingClientRect();
        pond.pointerDown(x - r.left, y - r.top, false);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      if (!isHero) window.addEventListener("koi:feed-burst", onFeedBurst);

      return () => {
        if (hasPointerRef.current) {
          document.body.style.cursor = "";
          hasPointerRef.current = false;
        }
        gsap.ticker.remove(tick);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("koi:feed-burst", onFeedBurst);
        pondRef.current = null;
      };
    }, [variant, fishCount]);

    return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full touch-pan-y" />;
  },
);
