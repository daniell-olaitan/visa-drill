import { Reveal } from "@/components/landing/visadrill/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Will this tell me what to say?",
    a: "No, and be wary of anything that does. Officers are trained to spot rehearsed scripts and coached lies. VisaDrill helps you say your own true story clearly and confidently, which is what actually gets people approved.",
  },
  {
    q: "Do I need to upload any documents?",
    a: "No. You don't need your DS-160, bank statements, or admission letters to practice. The interview is about how you speak, not what you carry. Everything you say in a session stays on your device.",
  },
  {
    q: "Which visa types does it cover?",
    a: "Visitor (B1/B2) and Student (F1) are the deepest right now, with Work (H-1B) and Exchange (J-1) question sets included. The core of every interview - purpose, finances, and ties - is shared across categories.",
  },
  {
    q: "Is this affiliated with the US government?",
    a: "No. VisaDrill is an independent practice tool. It is not connected to the U.S. Department of State, any embassy, or any consulate, and nothing here is legal advice. For official guidance, see travel.state.gov.",
  },
  {
    q: "How much does it cost?",
    a: "During the beta, practice is free. Waitlist members get founding-user pricing when we launch, and people at the front of the queue get in first.",
  },
  {
    q: "What if English isn't my first language?",
    a: "Then practice matters even more, and you're exactly who we built this for. Interviews are short and the questions are predictable; rehearsing them out loud a few times does more for clarity than years of general English study.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-border px-6 py-24 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-tertiary">FAQ</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-ink sm:text-4xl">
              Fair questions.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 leading-relaxed text-ink-secondary">
              You&apos;re preparing for an interview where details matter. Here are ours.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.05}>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="border-border">
                <AccordionTrigger className="py-5 text-left text-[15px] font-medium text-ink hover:no-underline md:text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-ink-secondary md:text-[15px]">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
