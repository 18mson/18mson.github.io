import { craftPillars } from "@/content/craft";

export default function CraftSection() {
  return (
    <div className="w-full">
      <h2 className="font-display text-4xl font-bold tracking-tight text-ink md:text-6xl">
        Craft &amp; Technical Arsenal
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
        Bridging system architecture and motion aesthetics. Every interface is built with predictable state,
        test-backed stability, and sub-second performance.
      </p>

      {/* Gaya yang sama dengan daftar proyek: garis tipis, hanko, teks biasa. Tanpa kartu dan pill. */}
      <ol className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
        {craftPillars.map((pillar, i) => (
          <li key={pillar.id} className="border-t border-ink/15 pt-6">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-koi font-name text-base font-extrabold text-white ring-1 ring-white/50 ring-inset ${
                  i % 2 === 0 ? "-rotate-3" : "rotate-2"
                }`}
              >
                {pillar.num}
              </span>
              <p className="text-sm font-medium text-koi">{pillar.highlight}</p>
            </div>

            <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/75 md:text-base">{pillar.description}</p>
            <p className="mt-5 text-sm leading-relaxed text-ink/60">{pillar.tags.join(", ")}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
