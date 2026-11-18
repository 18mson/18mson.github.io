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
    pond.onFirstFeed = () => {
      feedRef.current?.();
      window.dispatchEvent(new CustomEvent("koi:first-feed"));
    };

    const measure = () => pond.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);

    // Hanya jalan saat kolam terlihat.
    const io = new IntersectionObserver(([entry]) => pond.setActive(entry.isIntersecting));
    io.observe(canvas);

    // Satu loop animasi bersama Lenis dan ScrollTrigger.
    const tick = (_time: number, deltaMs: number) => pond.frame(Math.min(deltaMs, 50) / 1000);
    gsap.ticker.add(tick);

    // Pointer di window, karena lapisan nama menutupi canvas (pointer-events: none).
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onMove = (e: PointerEvent) => pond.pointerMove(...local(e));
    const onDown = (e: PointerEvent) => pond.pointerDown(...local(e));
    const onLeave = () => pond.pointerLeave();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full touch-pan-y" />;
}
