"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { KoiPond } from "./engine";

interface KoiCanvasProps {
  onFirstFeed?: () => void;
  /**
   * "hero": kolam utama, dengan easter egg teratai untuk ganti tema.
   * "footer": kolam penutup yang lebih kecil, tanpa easter egg, bisa diberi makan lewat event "koi:feed-burst".
   */
  variant?: "hero" | "footer";
}

export default function KoiCanvas({ onFirstFeed, variant = "hero" }: KoiCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const feedRef = useRef(onFirstFeed);
  feedRef.current = onFirstFeed;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const isHero = variant === "hero";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pond = new KoiPond(
      canvas,
      isHero
        ? { reducedMotion: reduced }
        : {
            reducedMotion: reduced,
            fishCount: { narrow: 3, mid: 4, wide: 5 },
            pads: { total: 4, flowers: 2 },
          },
    );
    pond.isDark = document.documentElement.classList.contains("dark");

    pond.onFirstFeed = () => {
      feedRef.current?.();
      if (isHero) window.dispatchEvent(new CustomEvent("koi:first-feed"));
    };

    if (isHero) {
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
    }

    const measure = () => pond.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);

    // Teratai Easter egg hanya aktif saat kolam tampil penuh di puncak viewport (belum digulir)
    const isAtHeroTop = () => isHero && window.scrollY < 60;

    // Jika pengguna mencoba scroll saat animasi riak transisi tema sedang berlangsung,
    // tuntaskan transisi tema secara instan agar tidak terjadi glitch warna atau state terpotong.
    const onScroll = () => {
      if (document.body.style.cursor === "pointer" && !isAtHeroTop()) {
        document.body.style.cursor = "";
      }
      if (pond.isTransitioning) {
        pond.completeThemeTransition();
      }
    };
    if (isHero) window.addEventListener("scroll", onScroll, { passive: true });

    // Hanya jalan saat kolam terlihat. Jika mulai tidak terlihat saat transisi aktif, selesaikan transisi lebih dulu.
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && pond.isTransitioning) {
        pond.completeThemeTransition();
      }
      pond.setActive(entry.isIntersecting);
    });
    io.observe(canvas);

    // Satu loop animasi bersama Lenis dan ScrollTrigger.
    const tick = (_time: number, deltaMs: number) => pond.frame(Math.min(deltaMs, 50) / 1000);
    gsap.ticker.add(tick);

    // Pointer di window, karena lapisan konten menutupi canvas.
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      pond.pointerMove(x, y);
      if (!isHero) return;
      if (isAtHeroTop() && pond.isOverLargestPad(x, y)) {
        document.body.style.cursor = "pointer";
      } else if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
    };
    const onDown = (e: PointerEvent) => {
      const [x, y] = local(e);
      pond.pointerDown(x, y, isAtHeroTop());
    };
    const onLeave = () => {
      if (isHero && document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
      pond.pointerLeave();
    };

    // Event dari luar (mis. tombol salin email) untuk melempar pakan ke kolam penutup.
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
      if (isHero && document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("koi:feed-burst", onFeedBurst);
    };
  }, [variant]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full touch-pan-y" />;
}
