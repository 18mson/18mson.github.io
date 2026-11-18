import { craftPillars } from "@/content/craft";

export default function CraftSection() {
  return (
    <div className="w-full">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-koi">
          Engineering Philosophy
        </span>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
          Craft & Technical Arsenal
        </h2>
        <p className="mt-4 text-base leading-relaxed text-ink/70 md:text-lg">
          Bridging system architecture and motion aesthetics. Every interface is built with predictable state, test-backed stability, and sub-second performance.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {craftPillars.map((pillar) => (
          <article
            key={pillar.id}
            className="group relative flex flex-col justify-between rounded-3xl border border-ink/10 bg-[var(--color-card)] p-7 transition-all duration-300 hover:border-koi/40"
          >
            <div>
              <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                <span className="font-display text-2xl font-black text-koi/90">
                  {pillar.num}
                </span>
                <span className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs font-medium text-ink/70 dark:bg-white/5 dark:text-ink/80">
                  {pillar.highlight}
                </span>
              </div>

              <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-ink">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/75 md:text-base">
                {pillar.description}
              </p>
            </div>

            <div className="mt-8 border-t border-ink/10 pt-5">
              <ul className="flex flex-wrap gap-1.5" aria-label="Core technologies">
                {pillar.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-lg bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/70 dark:bg-white/5 dark:text-ink/80"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
