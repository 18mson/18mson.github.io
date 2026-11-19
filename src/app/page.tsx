import SmoothScroll from "@/components/layout/SmoothScroll";
import { Contact } from "@/features/contact";
import { Craft } from "@/features/craft";
import { Hero } from "@/features/hero";
import { KoiCanvas } from "@/features/koi-pond";
import { Projects } from "@/features/projects";
import { Timeline } from "@/features/timeline";
import { Tools } from "@/features/tools";

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Hero koi={<KoiCanvas />} />
        <Timeline />
        <Projects />
        <Tools />
        <Craft />
        <Contact koi={<KoiCanvas variant="footer" />} />
      </main>
    </SmoothScroll>
  );
}
