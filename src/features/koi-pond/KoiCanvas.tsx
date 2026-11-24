"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealisticPond, type RealisticPondHandle } from "./RealisticPond";
import KoiAscii, { type PondSnapshot } from "./KoiAscii";
import AsciiShockwave from "./AsciiShockwave";

export interface KoiCanvasProps {
  onFirstFeed?: () => void;
  variant?: "hero" | "footer";
}

// 5 ikan di mobile (< 640px) dan 7 ikan di windows / desktop, performa ringan & konsisten
const RESPONSIVE_KOI_COUNT = { narrow: 5, mid: 7, wide: 7 };

export default function KoiCanvas({ onFirstFeed, variant = "hero" }: KoiCanvasProps) {
  const isHero = variant === "hero";
  const wrapRef = useRef<HTMLDivElement>(null);
  const realisticLayerRef = useRef<HTMLDivElement>(null);
  const asciiLayerRef = useRef<HTMLDivElement>(null);
  const realisticPondRef = useRef<RealisticPondHandle>(null);

  const [isAscii, setIsAscii] = useState(false);
  const isAsciiRef = useRef(false);
  isAsciiRef.current = isAscii;

  // Snapshot posisi ikan & teratai dari kolam 2D
  const [snapshot, setSnapshot] = useState<PondSnapshot | null>(null);
  const latestSnapshotRef = useRef<PondSnapshot | null>(null);

  // Snapshot posisi ikan & teratai dari kolam ASCII saat aktif
  const latestAsciiSnapshotRef = useRef<PondSnapshot | null>(null);
  const [realisticSeedSnapshot, setRealisticSeedSnapshot] = useState<PondSnapshot | null>(null);
  const [realisticTargetDark, setRealisticTargetDark] = useState<boolean | null>(null);

  const [lotusHover, setLotusHover] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const handleLotusHover = useCallback((active: boolean, x = 0, y = 0) => {
    setLotusHover({ active, x, y });
  }, []);

  const [isDarkTheme, setIsDarkTheme] = useState(false);
  useEffect(() => {
    const updateDark = () => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    };
    updateDark();
    const mo = new MutationObserver(updateDark);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const prevDarkRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const transitionRef = useRef<{
    toAscii: boolean;
    origin: { x: number; y: number };
    targetDark?: boolean;
  } | null>(null);

  const [transition, setTransition] = useState<{
    toAscii: boolean;
    origin: { x: number; y: number };
    targetDark?: boolean;
  } | null>(null);

  // Simpan snapshot dari pond 2D
  const handleSnapshot = useCallback((s: PondSnapshot) => {
    latestSnapshotRef.current = s;
  }, []);

  // Simpan snapshot dari pond ASCII
  const handleAsciiSnapshot = useCallback((s: PondSnapshot) => {
    latestAsciiSnapshotRef.current = s;
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const active = document.documentElement.classList.contains("ascii-mode");
      setIsAscii(active);
      isAsciiRef.current = active;
      if (active) document.documentElement.classList.add("dark");
    }

    if (!isHero) {
      const onAsciiEnd = (e: Event) => {
        const detail = (e as CustomEvent<{ isAscii: boolean }>).detail;
        const target = detail?.isAscii ?? document.documentElement.classList.contains("ascii-mode");
        setIsAscii(target);
        isAsciiRef.current = target;
      };
      window.addEventListener("koi:ascii-toggle-end", onAsciiEnd);
      return () => window.removeEventListener("koi:ascii-toggle-end", onAsciiEnd);
    }

    const onAsciiToggle = (e: Event) => {
      if (isTransitioningRef.current) return;

      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      const wrap = wrapRef.current;
      const rect = wrap
        ? wrap.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

      const originX = (detail?.x ?? window.innerWidth / 2) - rect.left;
      const originY = (detail?.y ?? window.innerHeight / 2) - rect.top;
      const targetAscii = !isAsciiRef.current;

      isTransitioningRef.current = true;

      let targetDark = true;
      if (targetAscii) {
        // Simpan status dark mode sebelum masuk ASCII, ambil snapshot 2D terakhir
        prevDarkRef.current = document.documentElement.classList.contains("dark");
        setSnapshot(latestSnapshotRef.current);
      } else {
        // Kembali ke 2D via quote toggle: pulihkan tema sebelumnya
        targetDark = prevDarkRef.current;
        // Ambil snapshot ASCII untuk sinkronisasi posisi ikan & teratai ke 2D seketika
        if (latestAsciiSnapshotRef.current) {
          realisticPondRef.current?.applySnapshot(latestAsciiSnapshotRef.current);
          setRealisticSeedSnapshot(latestAsciiSnapshotRef.current);
        }
        setRealisticTargetDark(targetDark);
      }

      const nextTransition = {
        toAscii: targetAscii,
        origin: { x: originX, y: originY },
        targetDark,
      };
      transitionRef.current = nextTransition;

      window.dispatchEvent(
        new CustomEvent("koi:ascii-toggle-start", {
          detail: { targetAscii, x: originX, y: originY },
        }),
      );
      setTransition(nextTransition);
    };

    window.addEventListener("koi:ascii-toggle", onAsciiToggle);
    return () => window.removeEventListener("koi:ascii-toggle", onAsciiToggle);
  }, [isHero]);

  // Klik teratai besar di mode ASCII → balik ke 2D dark mode
  const handleLotusClick = useCallback((lx: number, ly: number) => {
    if (isTransitioningRef.current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // Konversi koordinat lokal ASCII ke koordinat window
    const rect = wrap.getBoundingClientRect();
    const wx = lx + rect.left;
    const wy = ly + rect.top;

    isTransitioningRef.current = true;
    prevDarkRef.current = true; // teratai besar selalu membawa kembali ke dark mode 2D

    // Sinkronkan posisi ikan & teratai dari ASCII ke 2D seketika
    if (latestAsciiSnapshotRef.current) {
      realisticPondRef.current?.applySnapshot(latestAsciiSnapshotRef.current);
      setRealisticSeedSnapshot(latestAsciiSnapshotRef.current);
    }
    setRealisticTargetDark(true);

    const nextTransition = {
      toAscii: false,
      origin: { x: lx, y: ly },
      targetDark: true,
    };
    transitionRef.current = nextTransition;

    window.dispatchEvent(
      new CustomEvent("koi:ascii-toggle-start", {
        detail: { targetAscii: false, x: wx, y: wy },
      }),
    );
    setTransition(nextTransition);
  }, []);

  const handleProgress = (_progress: number, r: number) => {
    const cur = transitionRef.current;
    if (!cur) return;
    const { toAscii, origin } = cur;
    const incomingLayer = toAscii ? asciiLayerRef.current : realisticLayerRef.current;
    if (incomingLayer) {
      incomingLayer.style.clipPath = `circle(${Math.round(r)}px at ${origin.x}px ${origin.y}px)`;
    }
  };

  const handleComplete = () => {
    try {
      const cur = transitionRef.current;
      const targetAscii = cur ? cur.toAscii : !isAsciiRef.current;

      const realisticLayer = realisticLayerRef.current;
      const asciiLayer = asciiLayerRef.current;
      if (realisticLayer) realisticLayer.style.clipPath = "";
      if (asciiLayer) asciiLayer.style.clipPath = "";

      setIsAscii(targetAscii);
      isAsciiRef.current = targetAscii;

      if (targetAscii) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.add("ascii-mode");
      } else {
        document.documentElement.classList.remove("ascii-mode");
        // Keluar dari ASCII: sinkronkan ke tema yang dipilih
        const targetDark = cur?.targetDark ?? prevDarkRef.current;
        if (targetDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      setRealisticTargetDark(null);
      setRealisticSeedSnapshot(null);

      window.dispatchEvent(
        new CustomEvent("koi:ascii-toggle-end", { detail: { isAscii: targetAscii } }),
      );
    } finally {
      isTransitioningRef.current = false;
      transitionRef.current = null;
      setTransition(null);
    }
  };

  if (!isHero) {
    return (
      <div className="absolute inset-0 size-full overflow-hidden">
        {isAscii ? (
          <KoiAscii
            className="size-full bg-[#071719]"
            koiCount={5}
            cell={11}
            showHud={false}
            active={true}
            onLotusClick={handleLotusClick}
          />
        ) : (
          <RealisticPond variant="footer" active={true} />
        )}
      </div>
    );
  }

  const isTransitioning = transition !== null;
  const toAscii = transition?.toAscii;

  const realisticStyle = isTransitioning
    ? toAscii ? "z-0 block" : "z-[1] block"
    : isAscii ? "hidden pointer-events-none" : "block";

  const asciiStyle = isTransitioning
    ? toAscii ? "z-[1] block bg-[#071719]" : "z-0 block bg-[#071719]"
    : isAscii ? "block bg-[#071719]" : "hidden pointer-events-none";

  return (
    <div ref={wrapRef} className="absolute inset-0 size-full overflow-hidden">
      {/* Kolam Realistis — selalu aktif agar snapshot tersedia */}
      <div ref={realisticLayerRef} className={`absolute inset-0 size-full ${realisticStyle}`}>
        <RealisticPond
          ref={realisticPondRef}
          variant="hero"
          onFirstFeed={onFirstFeed}
          active={true}
          fishCount={RESPONSIVE_KOI_COUNT}
          onSnapshot={handleSnapshot}
          isDark={realisticTargetDark}
          seedSnapshot={realisticSeedSnapshot}
          onLotusHover={handleLotusHover}
        />
      </div>

      {/* Kolam ASCII */}
      <div ref={asciiLayerRef} className={`absolute inset-0 size-full ${asciiStyle}`}>
        <KoiAscii
          className="size-full"
          koiCount={RESPONSIVE_KOI_COUNT}
          cell={10}
          showHud={true}
          active={isAscii || isTransitioning}
          snapshot={snapshot}
          onLotusClick={handleLotusClick}
          onSnapshot={handleAsciiSnapshot}
        />
      </div>

      {/* Tooltip Hover Teratai di Mode 2D */}
      {isHero && !isAscii && lotusHover.active && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-full border border-black/10 bg-white/85 px-3 py-1 font-mono text-xs text-neutral-800 shadow-lg backdrop-blur-md transition-opacity duration-150 dark:border-white/15 dark:bg-[#071719]/90 dark:text-[#e2eceb]"
          style={{
            left: `${lotusHover.x}px`,
            top: `${lotusHover.y - 14}px`,
          }}
        >
          {isDarkTheme ? "click lotus → light mode" : "click lotus → dark mode"}
        </div>
      )}

      {/* Petunjuk HUD di pojok kiri bawah mode 2D */}
      {isHero && !isAscii && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 select-none font-mono text-xs opacity-60 text-neutral-600 dark:text-[#e2eceb]">
          {lotusHover.active
            ? (isDarkTheme ? "click lotus → light mode" : "click lotus → dark mode")
            : "touch water to feed"}
        </div>
      )}

      {transition && (
        <AsciiShockwave
          origin={transition.origin}
          duration={1.15}
          toDark={transition.toAscii ? true : (transition.targetDark ?? prevDarkRef.current)}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
