import Reveal from "@/components/motion/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Will this tell me what to say?",
    a: "No, and be wary of anything that does. Officers are trained to spot rehearsed scripts and coached lies. FaceDrill helps you say your own true story clearly and confidently, which is what actually gets people approved.",
  },
  {
    q: "Do I need to upload any documents?",
    a: "No. You don’t need your DS-160, bank statements, or admission letters to practice. The interview is about how you speak, not what you carry. Everything you say in a session stays on your device.",
  },
  {
    q: "Which visa types does it cover?",
    a: "Visitor (B1/B2) and Student (F1) are the deepest right now, with Work (H-1B) and Exchange (J-1) question sets included. The core of every interview, purpose, finances, and ties, is shared across categories.",
  },
  {
    q: "Is this affiliated with the US government?",
    a: "No. FaceDrill is an independent practice tool. It is not connected to the U.S. Department of State, any embassy, or any consulate, and nothing here is legal advice. For official guidance, see travel.state.gov.",
  },
  {
    q: "How much does it cost?",
    a: "During the beta, practice is free. Waitlist members get founding-user pricing when we launch, and people at the front of the queue get in first.",
  },
  {
    q: "What if English isn’t my first language?",
    a: "Then practice matters even more, and you’re exactly who we built this for. Interviews are short and the questions are predictable; rehearsing them out loud a few times does more for clarity than years of general English study.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border/70 bg-card/50">
      <div className="container py-20 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <Reveal>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                FAQ
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Fair questions.
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                You’re preparing for an interview where details matter. Here are
                ours.
              </p>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q} className="border-border/70">
                  <AccordionTrigger className="py-5 text-left text-[15px] font-medium hover:no-underline md:text-base">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
