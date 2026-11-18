"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { KoiPond } from "./engine";

export default function KoiCanvas({ onFirstFeed }: { onFirstFeed?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const feedRef = useRef(onFirstFeed);
  feedRef.current = onFirstFeed;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pond = new KoiPond(canvas, { reducedMotion: reduced });
    pond.isDark = document.documentElement.classList.contains("dark");

    pond.onFirstFeed = () => {
      feedRef.current?.();
      window.dispatchEvent(new CustomEvent("koi:first-feed"));
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

    // Teratai Easter egg hanya aktif saat kolam tampil penuh di puncak viewport (belum digulir)
    const isAtHeroTop = () => window.scrollY < 60;

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
    window.addEventListener("scroll", onScroll, { passive: true });

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

    // Pointer di window, karena lapisan nama menutupi canvas (pointer-events: none).
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      pond.pointerMove(x, y);
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
      if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
      pond.pointerLeave();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      if (document.body.style.cursor === "pointer") {
        document.body.style.cursor = "";
      }
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full touch-pan-y" />;
}
