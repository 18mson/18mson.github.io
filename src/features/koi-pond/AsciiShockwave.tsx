"use client";

import { useEffect, useRef } from "react";

interface AsciiShockwaveProps {
  origin: { x: number; y: number };
  duration?: number;
  toDark?: boolean;
  onProgress: (progress: number, r: number) => void;
  onComplete: () => void;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
};

const GLYPHS = ["@", "%", "#", "*", "+", "=", "-", ":", "~", "0", "1", "o", "x", "/"];
const INNER_GLYPHS = [".", ":", "~", "-", "+", "*"];
const SPARK_CHARS = ["*", "+", "~", "o", "'", ".", "x", "#", "1", "0"];

export default function AsciiShockwave({
  origin,
  duration = 1.15,
  toDark,
  onProgress,
  onComplete,
}: AsciiShockwaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let start = performance.now();
    let last = start;
    let w = 1;
    let h = 1;
    let maxR = 1000;
    let dpr = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      // Max radius to reach furthest corner from origin
      const ox = origin.x;
      const oy = origin.y;
      maxR = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) * 1.05;
    };
    resize();

    const dark =
      toDark !== undefined
        ? toDark
        : document.documentElement.classList.contains("dark") ||
          document.documentElement.dataset.theme === "dark";

    const primaryColor = dark ? "#ff922b" : "#ee5a24";
    const secondaryColor = dark ? "#ffd43b" : "#f59f00";
    const waterColor = dark ? "#5eead4" : "#0d9488";
    const inkColor = dark ? "#e2eceb" : "#0f2a2c";

    // Spawn initial burst particles from origin
    const particles: Particle[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 320;
      const life = 0.6 + Math.random() * 0.45;
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        char: SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)],
        color: Math.random() > 0.45 ? primaryColor : secondaryColor,
        size: 11 + Math.floor(Math.random() * 5),
        life,
        maxLife: life,
      });
    }

    const finish = () => {
      cancelAnimationFrame(raf);
      onProgressRef.current(1, maxR);
      onCompleteRef.current();
    };

    const onScroll = () => {
      // Instant complete if user scrolls during transition
      finish();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic-out easing
      const ease = 1 - Math.pow(1 - progress, 2.5);
      const r = maxR * ease;

      onProgressRef.current(progress, r);

      // Update particles
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.life -= dt;
      }

      // Render shockwave canvas
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const fade = progress > 0.82 ? Math.max(0, (1 - progress) / 0.18) : 1;
      const ox = origin.x;
      const oy = origin.y;

      // 1. Concentric ripple lines (dashed ASCII terminal vibe)
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = primaryColor;
      ctx.globalAlpha = fade * 0.85;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      if (r > 16) {
        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(0, r - 14), 0, Math.PI * 2);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = waterColor;
        ctx.globalAlpha = fade * 0.55;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
      }

      if (r > 30) {
        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(0, r - 26), 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = secondaryColor;
        ctx.globalAlpha = fade * 0.4;
        ctx.setLineDash([1, 6]);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Main ASCII Character Ring at radius r
      const circ = 2 * Math.PI * r;
      const count = Math.max(8, Math.floor(circ / 14));
      ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.save();
      ctx.globalAlpha = fade * 0.95;
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2 + elapsed * 2.8;
        const gx = ox + Math.cos(theta) * r;
        const gy = oy + Math.sin(theta) * r;

        if (gx < -20 || gx > w + 20 || gy < -20 || gy > h + 20) continue;

        const gIdx = (i + Math.floor(elapsed * 14)) % GLYPHS.length;
        ctx.fillStyle = i % 3 === 0 ? secondaryColor : i % 3 === 1 ? primaryColor : inkColor;
        ctx.fillText(GLYPHS[gIdx], gx, gy);
      }
      ctx.restore();

      // 3. Inner echo ring of ASCII characters at r - 16
      if (r > 20) {
        const countInner = Math.max(6, Math.floor((2 * Math.PI * (r - 16)) / 18));
        ctx.save();
        ctx.globalAlpha = fade * 0.65;
        for (let i = 0; i < countInner; i++) {
          const theta = (i / countInner) * Math.PI * 2 - elapsed * 1.9;
          const gx = ox + Math.cos(theta) * (r - 16);
          const gy = oy + Math.sin(theta) * (r - 16);

          if (gx < -20 || gx > w + 20 || gy < -20 || gy > h + 20) continue;

          const gIdx = (i + Math.floor(elapsed * 9)) % INNER_GLYPHS.length;
          ctx.fillStyle = waterColor;
          ctx.fillText(INNER_GLYPHS[gIdx], gx, gy);
        }
        ctx.restore();
      }

      // 4. Spark particles
      ctx.save();
      for (const p of particles) {
        if (p.life <= 0) continue;
        const pAlpha = Math.min(1, p.life / 0.3) * fade;
        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px ui-monospace, monospace`;
        ctx.fillText(p.char, p.x, p.y);
      }
      ctx.restore();

      if (progress >= 1) {
        finish();
        return;
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [origin, duration]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full z-20" aria-hidden="true" />;
}
