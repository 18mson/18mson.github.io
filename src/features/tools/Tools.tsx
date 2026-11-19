import ToolList from "./ToolList";
import ToolsPlayground from "./ToolsPlayground";

export default function Tools() {
  return (
    <section
      id="toolbox"
      className="relative z-10 bg-paper py-24 text-ink transition-colors duration-500 md:py-32"
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-koi">
            Arsenal &amp; Stack
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-6xl">
            Toolbox
          </h2>
          <p className="mt-4 max-w-md text-lg text-ink/70">
            A dynamic radar of technologies, frameworks, and tools mapped by hands-on mastery.
          </p>
        </div>
      </div>

      {/* Arena Toolbox: Tanpa card, menyatu penuh (full-width) seperti koi pond */}
      <div className="relative mt-6 w-full md:mt-10">
        <ToolsPlayground />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <ToolList />
      </div>
    </section>
  );
}
