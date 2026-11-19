import type { ReactNode } from "react";

/** Bingkai bersama untuk panel bukti. */
export default function ProofPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-(--color-card) p-5 font-mono text-[12px] leading-relaxed text-ink/80 md:p-6">
      <p className="mb-4 flex items-center gap-2 text-[11px] tracking-wider text-ink/45 uppercase">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-koi" />
        {label}
      </p>
      {children}
    </div>
  );
}
