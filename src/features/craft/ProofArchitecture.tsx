import ProofPanel from "./ProofPanel";

/** Struktur folder asli project ini. Ubah di sini bila struktur berubah. */
const TREE = `src/
├─ app/             composition only
├─ features/        hero · timeline · projects
│  │                tools · craft · contact
│  └─ koi-pond/engine/   pure TS, no React
├─ content/         typed data, no logic
├─ components/      layout · ui
└─ lib/             gsap setup`;

export default function ProofArchitecture() {
  return (
    <ProofPanel label="this repo · folder structure">
      <pre
        aria-label="Project folder structure: app, features, content, components, lib"
        className="overflow-x-auto whitespace-pre text-ink/80"
      >
        {TREE}
      </pre>
      <p className="mt-4 border-t border-ink/10 pt-3 text-ink/60">
        rule: <span className="text-koi">app → features → (components, lib, content)</span>
        <br />
        features never import each other.
      </p>
    </ProofPanel>
  );
}
