import { tools, type ToolTier } from "@/content/tools";

const TIER_COLUMNS: { tier: ToolTier; title: string; subtitle: string }[] = [
  {
    tier: "current",
    title: "Using now",
    subtitle: "Core stack in active daily production",
  },
  {
    tier: "learned",
    title: "Learned",
    subtitle: "Proven experience across shipped projects",
  },
  {
    tier: "exploring",
    title: "Rarely or new",
    subtitle: "R&D, exploration, and secondary ecosystems",
  },
];

export default function ToolList() {
  return (
    <div className="mt-16 border-t border-ink/10 pt-12 md:mt-20">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
        {TIER_COLUMNS.map((col) => {
          const tierTools = tools.filter((t) => t.tier === col.tier);
          return (
            <div key={col.tier} className="space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight text-ink md:text-2xl">
                  {col.title}
                </h3>
                <p className="mt-1 text-xs text-ink/60">{col.subtitle}</p>
              </div>

              <ul className="space-y-2 border-t border-ink/10 pt-4" aria-label={col.title}>
                {tierTools.map((tool) => (
                  <li
                    key={tool.id}
                    className="flex items-center justify-between text-sm text-ink/80 transition-colors hover:text-ink"
                  >
                    <span>{tool.name}</span>
                    <span className="text-[11px] font-mono text-ink/40">#{tool.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
