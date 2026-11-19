"use client";

import { useEffect, useRef, useState } from "react";
import { contactInfo } from "@/content/contact";
import { gsap } from "@/lib/gsap";

/**
 * Semua teks memakai text-white + mix-blend-difference (warna terbalik terhadap air dan koi di belakangnya).
 * Syarat: elemen induknya tidak boleh membuat stacking context (tanpa transform, opacity, atau isolation),
 * dan transform hover dipasang pada elemen teks itu sendiri.
 */
const BLEND = "text-white mix-blend-difference";

export default function ContactCard() {
  const [timeStr, setTimeStr] = useState("");
  const [isStamped, setIsStamped] = useState(false);

  const emailRef = useRef<HTMLSpanElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jam lokal Jakarta (Asia/Jakarta, UTC+7), diperbarui tiap detik tetapi hanya menampilkan menit
  useEffect(() => {
    const updateTime = () => {
      const formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());
      setTimeStr(formatted);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  // Klik email: salin, stempel hanko menghantam, dan pakan dilempar ke kolam di bawahnya
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactInfo.email);
    } catch {
      window.location.href = `mailto:${contactInfo.email}`;
      return;
    }

    setIsStamped(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Lempar pakan ke kolam tepat di tengah alamat email
    const emailEl = emailRef.current;
    if (emailEl) {
      const r = emailEl.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent("koi:feed-burst", { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }),
      );
    }

    const stampEl = stampRef.current;
    const rippleEl = rippleRef.current;
    if (!stampEl) return;

    gsap.killTweensOf(stampEl);
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReduced) {
      gsap.set(stampEl, { opacity: 1, scale: 1, y: 0, rotate: -4 });
    } else {
      // Turun cepat, memantul mikro, lalu ring tinta menyebar
      gsap
        .timeline()
        .fromTo(
          stampEl,
          { scale: 2.2, y: -38, opacity: 0, rotate: -16 },
          { scale: 1, y: 0, opacity: 1, rotate: -4, duration: 0.18, ease: "power3.in" },
        )
        .to(stampEl, { y: -5, scale: 1.04, rotate: -2, duration: 0.08, ease: "power1.out" })
        .to(stampEl, { y: 0, scale: 1, rotate: -4, duration: 0.14, ease: "bounce.out" });

      if (rippleEl) {
        gsap.fromTo(
          rippleEl,
          { scale: 0.3, opacity: 0.9 },
          { scale: 2.2, opacity: 0, duration: 0.45, ease: "power2.out", overwrite: true },
        );
      }
    }

    // Stempel bertahan ~3 detik sebelum memudar
    timeoutRef.current = setTimeout(() => {
      gsap.to(stampEl, { opacity: 0, duration: 0.5, onComplete: () => setIsStamped(false) });
    }, 3000);
  };

  return (
    <div className="relative w-full pb-16">
      {/* Status: titik koi + jam lokal live */}
      <div className="flex items-center gap-2.5 text-xs font-medium tracking-wide md:text-sm">
        <span className="size-2 shrink-0 rounded-full bg-koi" aria-hidden="true" />
        <span className={BLEND}>
          Jakarta{timeStr && ` · ${timeStr} WIB`} · {contactInfo.availability}
        </span>
      </div>

      <h2
        className={`mt-8 font-name text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.08] font-extrabold tracking-tight ${BLEND}`}
      >
        {contactInfo.headline}
      </h2>
      <p className={`mt-4 max-w-2xl text-base leading-relaxed text-white/85 mix-blend-difference md:text-lg`}>
        {contactInfo.subtitle}
      </p>

      <ul className="mt-14 w-full">
        {/* Email: tipografi raksasa, klik untuk menyalin */}
        <li className="group relative border-t border-ink/20 transition-colors hover:bg-white/25 dark:hover:bg-white/5">
          <div className="relative px-2 py-8 md:px-4 md:py-10">
            <button
              type="button"
              onClick={handleCopyEmail}
              aria-label={`Copy email address ${contactInfo.email}`}
              className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi"
            >
              <span className={`block text-xs font-semibold tracking-wider uppercase ${BLEND} opacity-100`}>
                Email · click to copy
              </span>
              <span
                ref={emailRef}
                className={`mt-2 block font-name text-[clamp(1.6rem,5vw,3.5rem)] leading-[1.1] font-extrabold tracking-tight transition-transform duration-300 group-hover:translate-x-2 ${BLEND}`}
              >
                {contactInfo.email}
              </span>
            </button>

            <a
              href={`mailto:${contactInfo.email}`}
              className="mt-3 inline-block text-xs font-medium text-white/85 mix-blend-difference underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi"
            >
              or open in your mail app ↗
            </a>

            {/* Stempel hanko, di luar lapisan blend supaya tetap merah */}
            <div className="pointer-events-none absolute top-6 right-3 md:top-1/2 md:right-6 md:-translate-y-1/2">
              <div className="relative">
                <span
                  ref={rippleRef}
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-lg border-2 border-red-600/70 opacity-0 dark:border-red-500/70"
                />
                <div
                  ref={stampRef}
                  style={{ opacity: isStamped ? 1 : 0 }}
                  className="relative inline-flex items-center justify-center rounded-md border-2 border-red-600 bg-red-600/10 p-1.5 select-none dark:border-red-500 dark:bg-red-500/15"
                >
                  <div className="flex items-center gap-1.5 border border-red-600/60 px-2.5 py-1 dark:border-red-500/60">
                    <span className="font-name text-sm leading-none font-black text-red-600 md:text-base dark:text-red-500">
                      済
                    </span>
                    <span className="font-mono text-[10px] font-bold tracking-widest text-red-600 uppercase md:text-xs dark:text-red-500">
                      COPIED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>

        {contactInfo.socials.map((social, i) => (
          <li
            key={social.label}
            className={`group relative border-t border-ink/20 transition-colors hover:bg-white/25 dark:hover:bg-white/5 ${
              i === contactInfo.socials.length - 1 ? "border-b" : ""
            }`}
          >
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex w-full items-center justify-between gap-4 px-2 py-7 md:px-4 md:py-8 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-koi"
            >
              <span>
                <span className={`block text-xs font-semibold tracking-wider uppercase ${BLEND}`}>
                  {social.kicker}
                </span>
                <span
                  className={`mt-1 block font-name text-[clamp(1.75rem,5.5vw,3.5rem)] leading-[1.1] font-extrabold tracking-tight transition-transform duration-300 group-hover:translate-x-2 ${BLEND}`}
                >
                  {social.label}
                </span>
              </span>

              <span className={`flex items-center gap-2 text-xs font-medium md:text-sm ${BLEND}`}>
                <span className="hidden sm:inline">{social.handle}</span>
                <span className="text-lg md:text-xl" aria-hidden="true">
                  ↗
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <span className="sr-only" role="status" aria-live="polite">
        {isStamped ? "Email address copied to clipboard" : ""}
      </span>
    </div>
  );
}
