import SmoothScroll from "@/components/layout/SmoothScroll";
import { Contact } from "@/features/contact";
import { Hero } from "@/features/hero";
import { KoiCanvas } from "@/features/koi-pond";
import { Projects } from "@/features/projects";
import { Timeline } from "@/features/timeline";

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Hero koi={<KoiCanvas />} />
        <Timeline />
        <Projects />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
