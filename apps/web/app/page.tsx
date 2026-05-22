import AgencyHeroSection from "@/components/shadcn-space/radix/blocks/hero-01";
import HowItWorks from "@/components/sections/how-it-works";
import Performance from "@/components/sections/performance";
import FAQ from "@/components/sections/faq";

export default function Page() {
  return (
    <>
      <AgencyHeroSection />
      <HowItWorks />
      <Performance />
      <FAQ />
    </>
  );
}
