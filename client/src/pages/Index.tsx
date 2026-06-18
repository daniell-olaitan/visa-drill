import { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import StakesSection from "@/components/landing/StakesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import QuestionBankSection from "@/components/landing/QuestionBankSection";
import WaitlistSection from "@/components/landing/WaitlistSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import { captureReferral } from "@/lib/waitlist";

const Index = () => {
  useEffect(() => {
    captureReferral();
  }, []);

  return (
    <>
      <HeroSection />
      <StakesSection />
      <HowItWorks />
      <QuestionBankSection />
      <WaitlistSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
};

export default Index;
