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
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Toolbox</h2>
          <p className="mt-4 max-w-xl text-lg text-ink/70">
            The closer to the center, the more I use it today. Pop a balloon to see where I have used it.
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
