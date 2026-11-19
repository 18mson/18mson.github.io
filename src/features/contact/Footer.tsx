"use client";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto border-t border-ink/15 pt-8 pb-10">
      <div className="flex flex-col items-center justify-between gap-6 text-xs sm:flex-row">
        <p className="text-white/85 mix-blend-difference">
          © 2026 Muhamad Son&apos;ani. Built with Next.js, Canvas 2D &amp; GSAP.
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
