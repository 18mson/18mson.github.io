import type { PointerEvent } from "react";
import type { ProjectItem } from "@/content/projects";

interface ProjectRowProps {
  project: ProjectItem;
  index: number;
  isActive: boolean;
  /** Perangkat dengan hover: panel non-aktif tertutup. Perangkat sentuh: semua panel terlihat. */
  canHover: boolean;
  /** Baris pertama langsung terisi penuh saat render awal (tanpa bergantung pada efek). */
  initiallyFilled: boolean;
  onSelect: (index: number, immediate?: boolean) => void;
  onPointerMoveRow: (index: number, e: PointerEvent<HTMLLIElement>) => void;
  onLeaveRow: () => void;
  rowRef: (el: HTMLLIElement | null) => void;
  fillRef: (el: HTMLDivElement | null) => void;
  hankoRef: (el: HTMLSpanElement | null) => void;
}

export default function ProjectRow({
  project,
  index,
  isActive,
  canHover,
  initiallyFilled,
  onSelect,
  onPointerMoveRow,
  onLeaveRow,
  rowRef,
  fillRef,
  hankoRef,
}: ProjectRowProps) {
  const triggerId = `project-trigger-${project.id}`;
  const panelId = `project-panel-${project.id}`;

  return (
    <li
      ref={rowRef}
      data-active={isActive}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") {
          onPointerMoveRow(index, e);
          onSelect(index, false);
        }
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") onPointerMoveRow(index, e);
      }}
      onPointerLeave={onLeaveRow}
      className="pr-row relative border-t border-ink/15 last:border-b"
    >
      {/* Lapisan fill ripple. Wajib elemen pertama; konten di bawahnya "relative" agar terlukis di atasnya. */}
      <div
        ref={fillRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-(--pr-fill)"
        style={{ clipPath: initiallyFilled ? "circle(150% at 50% 50%)" : "circle(0px at 0 0)" }}
      />

      <div className="relative px-2 py-6 md:px-6 md:py-8">
        {/* Pola akordeon: heading membungkus button, button hanya berisi phrasing content. */}
        <h3>
          <button
            id={triggerId}
            type="button"
            onClick={() => onSelect(index, true)}
            onFocus={() => onSelect(index, true)}
            aria-expanded={canHover ? isActive : undefined}
            aria-controls={panelId}
            className="flex w-full flex-col gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-koi md:flex-row md:items-center md:gap-8"
          >
            <span className="flex items-center gap-4 md:gap-6">
              <span
                ref={hankoRef}
                aria-hidden="true"
                className={`flex size-12 shrink-0 items-center justify-center rounded-md bg-koi font-name text-lg font-extrabold text-white ring-1 ring-white/50 ring-inset transition-transform duration-300 md:size-14 md:text-xl ${
                  isActive ? "rotate-0 scale-105" : "-rotate-3"
                }`}
              >
                {project.num}
              </span>
              <span className="font-name text-[clamp(2rem,7vw,5.5rem)] leading-[1.05] font-extrabold tracking-tight text-ink">
                {project.title}
              </span>
            </span>

            <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink/70 md:ml-auto md:text-right md:text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-ink/90">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.accent }}
                  aria-hidden="true"
                />
                {project.client}
              </span>
              <span className="text-ink/40" aria-hidden="true">
                ·
              </span>
              <span>{project.category}</span>
            </span>
          </button>
        </h3>

        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          inert={canHover && !isActive}
          className="pr-panel"
        >
          <div>
            <div className="grid grid-cols-1 gap-6 pt-6 pb-2 text-ink md:grid-cols-3 md:gap-8 md:pt-8 md:pb-4">
              <div>
                <span className="text-xs font-semibold tracking-wider text-ink/50 uppercase">Overview</span>
                <p className="mt-2 text-sm leading-relaxed text-ink/80 md:text-base">{project.summary}</p>
              </div>

              <div>
                <span className="text-xs font-semibold tracking-wider text-ink/50 uppercase">
                  Key Contributions
                </span>
                <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
                  {project.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span aria-hidden="true" className="font-bold text-koi select-none">
                        ›
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-semibold tracking-wider text-ink/50 uppercase">Technologies</span>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{project.tags.join(", ")}</p>

                {project.impact && (
                  <div className="mt-4 border-t border-ink/10 pt-3">
                    <span className="text-xs font-semibold tracking-wider text-koi uppercase">Impact</span>
                    <p className="mt-1 text-sm font-medium text-koi">{project.impact}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
