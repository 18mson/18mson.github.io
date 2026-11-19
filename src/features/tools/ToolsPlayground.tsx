"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tools, toolNote } from "@/content/tools";
import { toolIcons } from "@/content/tool-icons";
import { gsap } from "@/lib/gsap";
import { ToolsArena } from "./engine";
import type { ArenaTheme, ToolSpec } from "./engine";

function getToolAbbreviation(id: string, name: string): string {
  if (id === "zustand") return "ZST";
  if (id === "legion-ui") return "LGN";
  if (id === "colyseus") return "COL";
  // Fallback: 2-3 huruf kapital pertama
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

function readThemeFromDOM(): ArenaTheme {
  const isDark = document.documentElement.classList.contains("dark");
  const computed = getComputedStyle(document.documentElement);

  const ink = computed.getPropertyValue("--color-ink").trim() || (isDark ? "#e2eceb" : "#0f2a2c");
  const koi = computed.getPropertyValue("--color-koi").trim() || (isDark ? "#ff6e3a" : "#ee5a24");
  const paper = computed.getPropertyValue("--color-paper").trim() || (isDark ? "#091314" : "#f6f9f8");
  const water = computed.getPropertyValue("--color-water").trim() || (isDark ? "#071719" : "#d2e8e4");

  return {
    ink,
    koi,
    learned: isDark ? "#289da8" : "#177e89",
    exploring: ink,
    paper,
    water,
    isDark,
  };
}

export default function ToolsPlayground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<ToolsArena | null>(null);

  const [isFinePointer, setIsFinePointer] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const [discovered, setDiscovered] = useState(0);

  const total = tools.length;
  const complete = discovered >= total;

  // Data sentuh untuk membedakan tap dengan scroll
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const specs: ToolSpec[] = useMemo(() => {
    return tools.map((t) => {
      const icon = toolIcons[t.id];
      return {
        id: t.id,
        name: t.name,
        tier: t.tier,
        path: icon?.path,
        hex: icon?.hex,
        label: getToolAbbreviation(t.id, t.name),
        note: toolNote(t),
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Deteksi pointer fine
    const pointerMq = window.matchMedia("(pointer: fine)");
    setIsFinePointer(pointerMq.matches);
    const onPointerChange = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    pointerMq.addEventListener("change", onPointerChange);

    // Deteksi reduced motion
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const initialTheme = readThemeFromDOM();
    const arena = new ToolsArena(canvas, specs, initialTheme);
    arenaRef.current = arena;
    arena.onDiscover = (count) => setDiscovered(count);

    setReducedMotion(motionMq.matches);
    arena.setReducedMotion(motionMq.matches);

    const onMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      arena.setReducedMotion(e.matches);
      arena.draw();
    };
    motionMq.addEventListener("change", onMotionChange);

    // ResizeObserver
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
      arena.resize(width, height, dpr);
      arena.draw();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    handleResize();

    // Loop ticker GSAP
    let isVisible = true;
    const onTick = (_time: number, deltaTime: number) => {
      if (!isVisible || document.hidden) return;
      const dt = Math.min(deltaTime / 1000, 0.05);
      arena.update(dt);
      arena.draw();
    };
    gsap.ticker.add(onTick);

    // IntersectionObserver untuk mematikan ticker saat offscreen
    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(container);

    // MutationObserver untuk memantau perubahan tema dark/light
    const mo = new MutationObserver(() => {
      const nextTheme = readThemeFromDOM();
      arena.setTheme(nextTheme);
      arena.draw();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      gsap.ticker.remove(onTick);
      pointerMq.removeEventListener("change", onPointerChange);
      motionMq.removeEventListener("change", onMotionChange);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      arena.destroy();
      arenaRef.current = null;
    };
  }, [specs]);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    arenaRef.current?.setPaused(next);
  };

  const handleReset = () => {
    arenaRef.current?.resetDiscovered();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!arenaRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    arenaRef.current.onPointerMove(x, y, isFinePointer);
  };

  const handlePointerLeave = () => {
    arenaRef.current?.onPointerLeave();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.pointerType === "mouse") {
      // Desktop: tembak langsung pada pointerdown
      arenaRef.current?.shoot(x, y, false);
    } else {
      // Sentuh: catat titik awal untuk validasi di pointerup
      touchStartRef.current = { x, y, time: performance.now() };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse") return;

    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dist = Math.hypot(x - start.x, y - start.y);
    const duration = performance.now() - start.time;

    // Hanya tembak jika pergeseran < 8px dan durasi < 300ms (bukan gestur scroll)
    if (dist < 8 && duration < 300) {
      arenaRef.current?.shoot(x, y, true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-[clamp(480px,82svh,780px)] w-full overflow-hidden select-none ${
        isFinePointer ? "cursor-none" : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="size-full touch-pan-y"
      />

      {!reducedMotion && (
        <>
          {/* Penghitung koleksi dan petunjuk */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 mx-auto flex max-w-5xl items-center justify-between gap-4 px-6">
            <p className="pointer-events-none text-xs font-medium text-ink/55">
              {complete ? (
                <span className="text-koi">All {total} tools discovered.</span>
              ) : (
                <>
                  <span className="tabular-nums text-ink/80">
                    {discovered} / {total}
                  </span>{" "}
                  discovered
                  <span className="hidden md:inline"> · click a balloon to pop it</span>
                  <span className="md:hidden"> · tap a balloon</span>
                </>
              )}
            </p>

            <div className="pointer-events-auto flex items-center gap-2">
              {discovered > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="cursor-pointer rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={togglePause}
                aria-pressed={paused}
                className="cursor-pointer rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi"
              >
                {paused ? "Play" : "Pause"}
              </button>
            </div>
          </div>

          <span className="sr-only" role="status" aria-live="polite">
            {discovered} of {total} tools discovered
          </span>
        </>
      )}
    </div>
  );
}
