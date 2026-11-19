import { craftPillars, type CraftProof } from "@/content/craft";
import ProofArchitecture from "./ProofArchitecture";
import ProofMotion from "./ProofMotion";
import ProofVitals from "./ProofVitals";

const PROOFS: Record<CraftProof, () => React.JSX.Element> = {
  architecture: ProofArchitecture,
  motion: ProofMotion,
  vitals: ProofVitals,
};

export default function Craft() {
  return (
    <section id="craft" className="relative z-10 bg-paper py-24 text-ink transition-colors duration-500 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Craft</h2>
        <p className="mt-4 max-w-xl text-lg text-ink/70">
          Three principles I work by. Each one comes with a reading taken from this very page, so you can check it
          instead of taking my word.
        </p>

        <ol className="mt-16 md:mt-20">
          {craftPillars.map((pillar, i) => {
            const Proof = PROOFS[pillar.proof];
            return (
              <li
                key={pillar.id}
                className="grid grid-cols-1 gap-8 border-t border-ink/15 py-10 last:border-b md:grid-cols-2 md:gap-14 md:py-14"
              >
                <div>
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
                  <h3 className="mt-5 font-display text-2xl font-bold tracking-tight md:text-3xl">{pillar.title}</h3>
                  <p className="mt-4 max-w-md leading-relaxed text-ink/75">{pillar.description}</p>
                </div>

                <Proof />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
