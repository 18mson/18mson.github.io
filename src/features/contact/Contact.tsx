import CraftSection from "./CraftSection";
import ContactCard from "./ContactCard";
import Footer from "./Footer";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative z-10 bg-paper text-ink transition-colors duration-500 pt-20 md:pt-32"
    >
      <div className="mx-auto w-full max-w-5xl px-6">
        <CraftSection />
        <ContactCard />
        <Footer />
      </div>
    </section>
  );
}
