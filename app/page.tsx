import SmoothScroll from "@/components/SmoothScroll";
import Hero from "@/components/Hero";
import Timeline from "@/components/Timeline";

export default function Home() {
  return (
    <SmoothScroll>
      <main>
        <Hero />
        <Timeline />
      </main>
    </SmoothScroll>
  );
}
