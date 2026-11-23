import type { TimelineItem as TimelineItemData } from "@/content/timeline";

interface TimelineItemProps {
  item: TimelineItemData;
  index: number;
}

export default function TimelineItem({ item, index }: TimelineItemProps) {
  const isEven = index % 2 === 0;

  return (
    <li
      className={`tl-item relative md:grid md:grid-cols-2 ${
        index > 0 ? "md:-mt-28 lg:-mt-32" : ""
      }`}
    >
      <span
        className="tl-node absolute top-1/2 left-1 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full md:left-1/2"
        style={{
          backgroundColor: "var(--color-koi)",
          borderColor: "var(--color-koi)",
        }}
      />
      <div
        className={`tl-card ml-12 rounded-2xl border border-ink/10 bg-(--color-card) p-6 md:ml-0 ${
          isEven
            ? "md:col-start-1 md:mr-10 lg:mr-12"
            : "md:col-start-2 md:ml-10 lg:ml-12"
        }`}
      >
        <p className="font-medium text-koi tabular-nums">{item.period}</p>
        <h3 className="mt-2 font-display text-2xl font-bold">{item.title}</h3>
        <p className="text-ink/60">{item.org}</p>
        <p className="mt-4 leading-relaxed text-ink/80">{item.summary}</p>
        {item.tags.length > 0 && <p className="mt-4 text-sm text-ink/60">{item.tags.join(", ")}</p>}
      </div>
    </li>
  );
}
