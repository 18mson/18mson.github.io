"use client";

import { useEffect, useRef, useState } from "react";
import { contactInfo } from "@/content/contact";
import { gsap } from "@/lib/gsap";

export default function ContactCard() {
  const [timeStr, setTimeStr] = useState("");
  const [isStamped, setIsStamped] = useState(false);

  const stampRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live Jakarta local time (Asia/Jakarta, UTC+7)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
      setTimeStr(formatted);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Animasi ripple air saat hover pada baris daftar
  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>, idx: number) => {
    const fill = fillRefs.current[idx];
    if (!fill) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const radius = Math.ceil(
      Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y))
    );

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      gsap.set(fill, { clipPath: `circle(${radius}px at ${x}px ${y}px)` });
    } else {
      gsap.fromTo(
        fill,
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        {
          clipPath: `circle(${radius}px at ${x}px ${y}px)`,
          duration: 0.5,
          ease: "power2.out",
          overwrite: true,
        }
      );
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>, idx: number) => {
    const fill = fillRefs.current[idx];
    if (!fill) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      gsap.set(fill, { clipPath: "circle(0px at 0 0)" });
    } else {
      gsap.to(fill, {
        clipPath: `circle(0px at ${x}px ${y}px)`,
        duration: 0.35,
        ease: "power2.in",
        overwrite: true,
      });
    }
  };

  // Klik email untuk menyalin dan menghantamkan stempel Hanko
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactInfo.email);
    } catch {
      window.location.href = `mailto:${contactInfo.email}`;
      return;
    }

    setIsStamped(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const stampEl = stampRef.current;
    const rippleEl = rippleRef.current;

    if (stampEl) {
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (isReduced) {
        gsap.set(stampEl, { opacity: 1, scale: 1, y: 0, rotate: -4 });
      } else {
        // Animasi hantaman stempel: turun cepat, memantul mikro, jejak tinta menyebar
        const tl = gsap.timeline();
        tl.fromTo(
          stampEl,
          { scale: 2.2, y: -38, opacity: 0, rotate: -16 },
          {
            scale: 1,
            y: 0,
            opacity: 1,
            rotate: -4,
            duration: 0.18,
            ease: "power3.in",
          }
        )
          .to(stampEl, {
            y: -5,
            scale: 1.04,
            rotate: -2,
            duration: 0.08,
            ease: "power1.out",
          })
          .to(stampEl, {
            y: 0,
            scale: 1,
            rotate: -4,
            duration: 0.14,
            ease: "bounce.out",
          });

        // Ring ripple tinta merah kecil di sekeliling stempel
        if (rippleEl) {
          gsap.fromTo(
            rippleEl,
            { scale: 0.3, opacity: 0.9 },
            {
              scale: 2.2,
              opacity: 0,
              duration: 0.45,
              ease: "power2.out",
            }
          );
        }
      }

      // Stempel bertahan ~3 detik sebelum memudar perlahan
      timeoutRef.current = setTimeout(() => {
        gsap.to(stampEl, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => setIsStamped(false),
        });
      }, 3000);
    }
  };

  return (
    <div className="relative mt-20 pt-8 pb-12 w-full">
      {/* 1. Status bar with live Jakarta local time */}
      <div className="flex items-center gap-2.5 text-xs md:text-sm text-ink/75 font-medium tracking-wide">
        <span className="size-2 rounded-full bg-koi shrink-0" aria-hidden="true" />
        <span>
          Jakarta{timeStr ? `, local time ${timeStr} WIB` : ""} · {contactInfo.availability}
        </span>
      </div>

      {/* 2. Headline besar dengan font Shippori Mincho */}
      <h2 className="mt-8 font-name font-extrabold text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.08] tracking-tight text-ink">
        {contactInfo.headline}
      </h2>
      <p className="mt-4 max-w-2xl text-base md:text-lg text-ink/75 leading-relaxed font-body">
        {contactInfo.subtitle}
      </p>

      {/* 3. Daftar interaktif bergaya Projects dengan ripple air saat di-hover */}
      <ul className="mt-14 w-full">
        {/* Baris 1: Email (Tipografi Raksasa + Stempel Hanko) */}
        <li
          onPointerEnter={(e) => handlePointerEnter(e, 0)}
          onPointerLeave={(e) => handlePointerLeave(e, 0)}
          className="relative border-t border-ink/15"
        >
          {/* Lapisan ripple air */}
          <div
            ref={(el) => {
              fillRefs.current[0] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-water transition-colors duration-500"
            style={{ clipPath: "circle(0px at 0 0)" }}
          />

          <div className="relative z-10 py-8 px-2 md:py-10 md:px-4">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="group flex w-full flex-col gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi md:flex-row md:items-center md:justify-between"
              aria-label={`Copy email: ${contactInfo.email}`}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Email / Direct Inquiry
                </span>
                {/* Alamat email tipografi raksasa */}
                <p className="mt-2 font-name text-[clamp(1.6rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-ink transition-colors group-hover:text-ink">
                  {contactInfo.email}
                </p>
              </div>

              {/* Area Stempel Hanko (muncul saat diklik) */}
              <div className="relative flex items-center shrink-0 self-start md:self-center">
                {/* Ring ripple tinta stempel */}
                <span
                  ref={rippleRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-2 rounded-lg border-2 border-red-600/70 opacity-0 dark:border-red-500/70"
                />

                {/* Stempel Hanko Merah */}
                <div
                  ref={stampRef}
                  style={{ opacity: isStamped ? 1 : 0 }}
                  className="relative inline-flex items-center justify-center rounded-md border-2 border-red-600 bg-red-600/10 p-1.5 shadow-sm select-none dark:border-red-500 dark:bg-red-500/15"
                >
                  <div className="flex items-center gap-1.5 border border-red-600/60 px-2.5 py-1 dark:border-red-500/60">
                    <span className="font-name text-sm font-black leading-none text-red-600 dark:text-red-500 md:text-base">
                      済
                    </span>
                    <span className="font-mono text-[10px] font-bold tracking-widest text-red-600 dark:text-red-500 uppercase md:text-xs">
                      COPIED
                    </span>
                  </div>
                </div>

                {!isStamped && (
                  <span className="text-xs font-medium text-ink/40 transition-colors group-hover:text-ink/70">
                    Click to copy ↵
                  </span>
                )}
              </div>
            </button>
          </div>
        </li>

        {/* Baris 2: LinkedIn */}
        <li
          onPointerEnter={(e) => handlePointerEnter(e, 1)}
          onPointerLeave={(e) => handlePointerLeave(e, 1)}
          className="relative border-t border-ink/15"
        >
          {/* Lapisan ripple air */}
          <div
            ref={(el) => {
              fillRefs.current[1] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-water transition-colors duration-500"
            style={{ clipPath: "circle(0px at 0 0)" }}
          />

          <div className="relative z-10 py-7 px-2 md:py-8 md:px-4">
            <a
              href="https://linkedin.com/in/muhamad-son-ani"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Network
                </span>
                <p className="mt-1 font-name text-[clamp(1.75rem,5.5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-ink transition-colors">
                  LinkedIn
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-ink/60 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink md:text-sm">
                <span className="hidden sm:inline">linkedin.com/in/muhamad-son-ani</span>
                <span className="text-lg md:text-xl" aria-hidden="true">
                  ↗
                </span>
              </div>
            </a>
          </div>
        </li>

        {/* Baris 3: GitHub */}
        <li
          onPointerEnter={(e) => handlePointerEnter(e, 2)}
          onPointerLeave={(e) => handlePointerLeave(e, 2)}
          className="relative border-t border-b border-ink/15"
        >
          {/* Lapisan ripple air */}
          <div
            ref={(el) => {
              fillRefs.current[2] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-water transition-colors duration-500"
            style={{ clipPath: "circle(0px at 0 0)" }}
          />

          <div className="relative z-10 py-7 px-2 md:py-8 md:px-4">
            <a
              href="https://github.com/18mson"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Code &amp; Repositories
                </span>
                <p className="mt-1 font-name text-[clamp(1.75rem,5.5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-ink transition-colors">
                  GitHub
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-ink/60 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink md:text-sm">
                <span className="hidden sm:inline">github.com/18mson</span>
                <span className="text-lg md:text-xl" aria-hidden="true">
                  ↗
                </span>
              </div>
            </a>
          </div>
        </li>
      </ul>
    </div>
  );
}
