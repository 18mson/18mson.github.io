import SmoothScroll from "@/components/layout/SmoothScroll";
import { Hero } from "@/features/hero";
import { KoiCanvas } from "@/features/koi-pond";
import { Timeline } from "@/features/timeline";

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Hero koi={<KoiCanvas />} />
        <Timeline />
      </main>
    </SmoothScroll>
  );
}
