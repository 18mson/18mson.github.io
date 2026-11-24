"use client";

import { useRef } from "react";

export default function Footer() {
  const lastToggleTimeRef = useRef(0);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuoteClick = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 400) return;
    lastToggleTimeRef.current = now;

    const target = e?.currentTarget as HTMLElement | undefined;
    const rect = target?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    window.dispatchEvent(
      new CustomEvent("koi:ascii-toggle", {
        detail: { x, y },
      }),
    );
  };

  return (
    <footer className="mt-auto border-t border-ink/15 pt-8 pb-10">
      <div className="flex flex-col items-center justify-between gap-6 text-xs sm:flex-row">
        <p className="text-white/85 mix-blend-difference select-none">
          © 2026 Muhamad Son
          <span
            data-no-feed="true"
            role="button"
            tabIndex={0}
            title="ASCII mode"
            aria-label="Toggle ASCII mode"
            onPointerDown={handleQuoteClick}
            onClick={handleQuoteClick}
            className="cursor-pointer transition-transform duration-200 hover:scale-125 inline-block"
          >
            &apos;
          </span>
          ani. Built with Next.js, Canvas 2D &amp; GSAP.
        </p>

        <button
          type="button"
          onClick={scrollToTop}
          className="inline-flex items-center gap-1.5 text-white/85 mix-blend-difference transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi"
          aria-label="Back to top"
        >
          <span>Back to top</span>
          <svg
            className="size-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      </div>
    </footer>
  );
}
