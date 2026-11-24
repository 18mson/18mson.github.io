"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toolIcons } from "@/content/tool-icons";
import { toolNote, tools } from "@/content/tools";
import { gsap } from "@/lib/gsap";
import { ToolsGalaxy as GalaxyEngine, type GalaxyTool } from "./galaxy";

const TIER_LABEL = { current: "Using now", learned: "Learned", exploring: "Rarely or new" } as const;

export default function ToolsGalaxy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GalaxyEngine | null>(null);
  const [listMode, setListMode] = useState(false);
  const [finePointer, setFinePointer] = useState(true);

  const galaxyTools = useMemo<GalaxyTool[]>(
    () =>
      tools.map((t) => ({
        id: t.id,
        name: t.name,
        tier: t.tier,
        hex: toolIcons[t.id]?.hex,
        note: toolNote(t),
      })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const readFont = () => getComputedStyle(container).fontFamily || "system-ui, sans-serif";
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerMq = window.matchMedia("(pointer: fine)");
    setFinePointer(pointerMq.matches);

    const engine = new GalaxyEngine(canvas, {
      tools: galaxyTools,
      fontFamily: readFont(),
      reducedMotion: motionMq.matches,
    });
    engineRef.current = engine;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
      engine.resize(w, h, dpr);
      engine.frame(0); // gambar satu frame langsung, supaya tidak ada kedipan kosong
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // pakai font yang sama dengan halaman setelah selesai dimuat
    document.fonts?.ready.then(() => engine.setFontFamily(readFont()));

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    io.observe(container);

    const tick = (_time: number, deltaMs: number) => {
      if (!visible || document.hidden) return;
      engine.frame(Math.min(deltaMs, 50) / 1000);
    };
    gsap.ticker.add(tick);

    const onMotion = (e: MediaQueryListEvent) => engine.setReducedMotion(e.matches);
    const onPointerType = (e: MediaQueryListEvent) => setFinePointer(e.matches);
    motionMq.addEventListener("change", onMotion);
    pointerMq.addEventListener("change", onPointerType);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      motionMq.removeEventListener("change", onMotion);
      pointerMq.removeEventListener("change", onPointerType);
      engineRef.current = null;
    };
  }, [galaxyTools]);

  const setMode = (list: boolean) => {
    setListMode(list);
    engineRef.current?.setListMode(list);
  };

  const local = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const segment = (active: boolean) =>
    `cursor-pointer rounded-full px-3.5 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi ${
      active ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
    }`;

  return (
    <div ref={containerRef} className="relative size-full select-none">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="size-full touch-pan-y"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const [x, y] = local(e);
          engineRef.current?.pointerDown(x, y, e.pointerType);
        }}
        onPointerMove={(e) => {
          const [x, y] = local(e);
          engineRef.current?.pointerMove(x, y, e.pointerType);
        }}
        onPointerUp={(e) => {
          const [x, y] = local(e);
          engineRef.current?.pointerUp(x, y);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => engineRef.current?.pointerLeave()}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") engineRef.current?.pointerLeave();
        }}
      />

      {/* Judul + toggle tampilan. Judul tidak menangkap pointer supaya galaksi di belakangnya tetap bisa diseret. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 pt-16 md:pt-24">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Toolbox</h2>
            <div
              role="group"
              aria-label="Toolbox view"
              className="pointer-events-auto flex shrink-0 rounded-full border border-white/15 bg-white/5 p-1 text-xs backdrop-blur"
            >
              <button type="button" aria-pressed={!listMode} onClick={() => setMode(false)} className={segment(!listMode)}>
                Galaxy
              </button>
              <button type="button" aria-pressed={listMode} onClick={() => setMode(true)} className={segment(listMode)}>
                List
              </button>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-base text-white/65 md:text-lg">
            The closer a star orbits to the core, the more I use it today.
          </p>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-500 ${
          listMode ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="mx-auto max-w-5xl px-6 pb-5 text-xs text-white/45">
          {finePointer ? "Drag to rotate · hover a star to stop it" : "Swipe sideways to rotate · tap a star"}
        </p>
      </div>

      {/* Teks untuk pembaca layar & mesin pencari; visual berada di canvas. */}
      <ul className="sr-only" aria-label="Tools">
        {tools.map((t) => (
          <li key={t.id}>
            {t.name} ({TIER_LABEL[t.tier]})
          </li>
        ))}
      </ul>
    </div>
  );
}
