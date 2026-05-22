import AgencyHeroSection from "@/components/shadcn-space/radix/blocks/hero-01";
import Feature01 from "@/components/shadcn-space/blocks/feature-01";
import Performance from "@/components/sections/performance";
import FAQ from "@/components/sections/faq";

export default function Page() {
  return (
    <>
      <AgencyHeroSection />
      <Feature01 />
      <Performance />
      <FAQ />
    </>
  );
}
