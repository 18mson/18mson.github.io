"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import ProofPanel from "./ProofPanel";

const BARS = 36;
const TARGET_MS = 1000 / 60;

export default function ProofMotion() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let visible = false;
    let acc = 0;
    let frames = 0;
    let sinceFlush = 0;
    const history: number[] = [];

    // Mengukur ticker GSAP yang sama dengan yang menggerakkan Lenis, kolam, dan arena.
    const tick = (_t: number, deltaMs: number) => {
      if (!visible || document.hidden) return;
      acc += deltaMs;
      frames += 1;
      sinceFlush += deltaMs;
      history.push(deltaMs);
      if (history.length > BARS) history.shift();

      if (sinceFlush >= 400) {
        const avg = acc / frames;
        setMs(avg);
        setFps(1000 / avg);
        setBars([...history]);
        acc = 0;
        frames = 0;
        sinceFlush = 0;
      }
    };
    gsap.ticker.add(tick);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        acc = 0;
        frames = 0;
        sinceFlush = 0;
      }
    });
    io.observe(root);

    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef}>
      <ProofPanel label="this page · ticker, live">
        <div className="flex items-baseline gap-6">
          <p>
            <span className="text-3xl font-semibold text-ink tabular-nums">{fps === null ? "--" : Math.round(fps)}</span>
            <span className="ml-1 text-ink/55">fps</span>
          </p>
          <p>
            <span className="text-xl text-ink tabular-nums">{ms === null ? "--" : ms.toFixed(1)}</span>
            <span className="ml-1 text-ink/55">ms / frame</span>
          </p>
        </div>

        {/* Riwayat waktu frame: batang koi bila melewati batas 20 ms */}
        <div
          role="img"
          aria-label="Recent frame times"
          className="mt-4 flex h-10 items-end gap-[3px]"
        >
          {Array.from({ length: BARS }, (_, i) => {
            const v = bars[bars.length - BARS + i];
            const h = v === undefined ? 4 : Math.min(40, Math.max(4, (v / (TARGET_MS * 2)) * 40));
            const slow = v !== undefined && v > 20;
            return (
              <span
                key={i}
                className={`w-full rounded-sm ${slow ? "bg-koi" : "bg-ink/30"}`}
                style={{ height: h }}
              />
            );
          })}
        </div>

        <p className="mt-4 border-t border-ink/10 pt-3 text-ink/60">
          one shared GSAP ticker drives Lenis, the koi ponds, and the toolbox arena. Canvases pause when off-screen.
        </p>
      </ProofPanel>
    </div>
  );
}
