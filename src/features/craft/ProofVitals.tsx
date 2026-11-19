"use client";

import { useEffect, useState } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import ProofPanel from "./ProofPanel";

type Reading = { value: number; rating: Metric["rating"] };
type Readings = Partial<Record<Metric["name"], Reading>>;

const ROWS: { name: "LCP" | "CLS" | "INP" | "FCP" | "TTFB"; label: string; hint?: string }[] = [
  { name: "LCP", label: "Largest Contentful Paint" },
  { name: "CLS", label: "Layout shift" },
  { name: "INP", label: "Interaction delay", hint: "click or tap something to measure" },
  { name: "FCP", label: "First Contentful Paint" },
  { name: "TTFB", label: "Time to first byte" },
];

const RATING_STYLE: Record<Metric["rating"], string> = {
  good: "text-emerald-700 dark:text-emerald-400",
  "needs-improvement": "text-amber-700 dark:text-amber-400",
  poor: "text-red-700 dark:text-red-400",
};

const RATING_LABEL: Record<Metric["rating"], string> = {
  good: "good",
  "needs-improvement": "needs work",
  poor: "poor",
};

function format(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

export default function ProofVitals() {
  const [readings, setReadings] = useState<Readings>({});
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    const record = (m: Metric) =>
      setReadings((prev) => ({ ...prev, [m.name]: { value: m.value, rating: m.rating } }));
    // reportAllChanges: tampilkan nilai awal tanpa menunggu halaman ditutup
    onLCP(record, { reportAllChanges: true });
    onCLS(record, { reportAllChanges: true });
    onINP(record, { reportAllChanges: true });
    onFCP(record);
    onTTFB(record);
  }, []);

  return (
    <ProofPanel label="this page · web vitals, measured in your browser">
      <ul className="space-y-2.5">
        {ROWS.map((row) => {
          const r = readings[row.name];
          return (
            <li key={row.name} className="flex items-baseline justify-between gap-4">
              <span className="text-ink/65">
                <span className="mr-2 text-ink">{row.name}</span>
                <span className="hidden sm:inline">{row.label}</span>
              </span>
              {r ? (
                <span className="tabular-nums">
                  <span className="text-ink">{format(row.name, r.value)}</span>{" "}
                  <span className={RATING_STYLE[r.rating]}>{RATING_LABEL[r.rating]}</span>
                </span>
              ) : (
                <span className="text-ink/40">{row.hint ?? "measuring…"}</span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-ink/10 pt-3 text-ink/60">
        {isDev
          ? "dev build: numbers here are not representative. Run a production build to measure."
          : "real readings from this visit, not a lab score. Other devices will differ."}
      </p>
    </ProofPanel>
  );
}
