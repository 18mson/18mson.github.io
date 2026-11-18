"use client";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-20 border-t border-ink/10 pt-10 pb-16">
      <div className="flex flex-col items-center justify-between gap-6 text-xs text-ink/60 sm:flex-row">
        <p>
          © 2026 Muhamad Son&apos;ani. Built with Next.js, Canvas 2D &amp; GSAP.
        </p>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-koi focus-visible:outline-none"
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
      </div>
    </footer>
  );
}
