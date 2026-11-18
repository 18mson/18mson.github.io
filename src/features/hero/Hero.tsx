"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/content/profile";

interface HeroProps {
  koi?: ReactNode;
  children?: ReactNode;
}

export default function Hero({ koi, children }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const paperOverlay = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const role = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          })
          .to(paperOverlay.current, { opacity: 1, duration: 1 }, 0)
          .to(name.current, { scale: 0.88, duration: 1 }, 0)
          .fromTo(role.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.4);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[200vh] bg-water">
      <div className="absolute inset-x-0 top-0 h-svh overflow-hidden">
        {koi ?? children}
      </div>

      <div
        ref={paperOverlay}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-paper opacity-0"
      />

      <div className="pointer-events-none sticky top-0 flex h-svh w-full flex-col items-center justify-center px-4 text-center text-white mix-blend-difference">
        <h1
          ref={name}
          className="w-full text-center font-name text-[clamp(3.25rem,16vw,16rem)] leading-[1.05] font-extrabold tracking-tight"
        >
          {profile.name}
        </h1>
        <p
          ref={role}
          className="mt-4 text-center text-lg font-medium opacity-0 motion-reduce:opacity-100 md:text-2xl"
        >
          {profile.role}
        </p>
      </div>
    </section>
  );
}
