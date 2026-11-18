"use client";

import { useState } from "react";
import { contactInfo } from "@/content/contact";

export default function ContactCard() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactInfo.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: buka mailto jika clipboard API tidak diizinkan browser
      window.location.href = `mailto:${contactInfo.email}`;
    }
  };

  return (
    <div className="relative mt-20 overflow-hidden rounded-[2.5rem] border border-ink/10 bg-[var(--color-card)] p-8 md:p-14">
      {/* Decorative subtle ambient gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-koi/10 blur-3xl"
      />

      <div className="relative z-10 max-w-3xl">
        {/* Availability Badge */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {contactInfo.availability}
        </div>

        {/* Heading & Subtitle */}
        <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink md:text-5xl lg:text-6xl">
          {contactInfo.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/75 md:text-lg">
          {contactInfo.subtitle}
        </p>

        {/* Action Controls */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          {/* 1-Click Copy Email Button */}
          <button
            type="button"
            onClick={handleCopyEmail}
            className="group inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper shadow-md transition-all duration-300 hover:bg-koi hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koi active:scale-95"
            aria-label="Copy email address to clipboard"
          >
            {copied ? (
              <>
                <svg
                  className="size-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <svg
                  className="size-4 text-paper/70 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                  />
                </svg>
                <span>{contactInfo.email}</span>
                <span className="rounded-full bg-paper/15 px-2 py-0.5 text-[11px] font-normal text-paper/80">
                  Copy
                </span>
              </>
            )}
          </button>

          {/* Direct Send Mail Link */}
          <a
            href={`mailto:${contactInfo.email}`}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/5 px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <span>Send Email</span>
            <svg
              className="size-3.5 opacity-70"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>

          {/* Social Profiles */}
          <div className="flex items-center gap-2">
            {contactInfo.socials.map((social) => (
              <a
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-ink/5 px-4 py-3 text-xs font-semibold text-ink transition-colors hover:border-koi/40 hover:text-koi dark:bg-white/5"
              >
                <span>{social.label}</span>
                <svg
                  className="size-3 opacity-60"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Location & Timezone info */}
        <div className="mt-12 flex items-center gap-2 text-xs text-ink/60">
          <svg
            className="size-3.5 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <span>Based in {contactInfo.location}</span>
        </div>
      </div>
    </div>
  );
}
