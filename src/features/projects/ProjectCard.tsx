import type { ProjectItem } from "@/content/projects";

interface ProjectCardProps {
  project: ProjectItem;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="group relative flex h-full w-[80vw] max-w-[360px] shrink-0 touch-pan-y flex-col justify-between rounded-3xl border border-ink/10 bg-[var(--color-card)] p-6 transition-all duration-300 hover:border-koi/40 md:w-[440px] md:max-w-[440px] md:p-8">
      <div>
        {/* Header: nomor dan kategori */}
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-3xl font-extrabold tracking-tight text-koi/90">
            {project.num}
          </span>
          <span className="rounded-full border border-ink/10 bg-ink/5 px-3 py-1 text-xs font-medium tracking-wide text-ink/70 dark:bg-white/5 dark:text-ink/80">
            {project.category}
          </span>
        </div>

        {/* UI Mockup Card Preview */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.02] p-5 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: project.accent }} />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/80">
                {project.client}
              </span>
            </div>
            {project.metrics && (
              <span className="text-[11px] font-medium text-koi tabular-nums">
                {project.metrics}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-ink/10 dark:bg-white/10" />
            <div className="h-2 w-1/2 rounded-full bg-ink/10 dark:bg-white/10" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-ink/5 bg-ink/[0.03] p-2.5 dark:bg-white/[0.03]">
              <span className="text-[10px] text-ink/50 uppercase">Architecture</span>
              <p className="mt-0.5 text-xs font-semibold text-ink">Modular / SSR</p>
            </div>
            <div className="rounded-xl border border-ink/5 bg-ink/[0.03] p-2.5 dark:bg-white/[0.03]">
              <span className="text-[10px] text-ink/50 uppercase">Verification</span>
              <p className="mt-0.5 text-xs font-semibold text-ink">Automated Tests</p>
            </div>
          </div>
        </div>

        {/* Info Proyek */}
        <div className="mt-6">
          <h3 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {project.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink/75 md:text-base">
            {project.description}
          </p>
        </div>
      </div>

      {/* Tags teknologi */}
      <div className="mt-6 border-t border-ink/10 pt-4">
        <ul className="flex flex-wrap gap-1.5" aria-label="Technologies used">
          {project.tags.map((tag) => (
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
  );
}
