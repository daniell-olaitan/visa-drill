import { useState } from "react";
import { ChevronDown, Ear } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  PHASE_LABELS,
  questionsForCategory,
  type VisaCategory,
} from "@/lib/questionBank";

const tabs: { id: VisaCategory; label: string }[] = [
  { id: "b1b2", label: CATEGORY_LABELS.b1b2 },
  { id: "f1", label: CATEGORY_LABELS.f1 },
  { id: "h1b", label: CATEGORY_LABELS.h1b },
  { id: "j1", label: CATEGORY_LABELS.j1 },
];

const QuestionBankSection = () => {
  const [category, setCategory] = useState<VisaCategory>("b1b2");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const questions = questionsForCategory(category).slice(0, 8);

  return (
    <section id="questions" className="scroll-mt-20 border-t border-border/70 bg-card/50">
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              The question bank
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              The questions are not a secret.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 text-balance leading-relaxed text-muted-foreground">
              Officers draw from a short, predictable set. What separates approvals
              from refusals is how ready the answers are. Tap any question to see
              what the officer is really listening for.
            </p>
          </Reveal>
        </div>

        <Reveal delay={150} className="mx-auto mt-10 max-w-3xl">
          <div
            className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:justify-center"
            role="tablist"
            aria-label="Visa category"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={category === tab.id}
                onClick={() => {
                  setCategory(tab.id);
                  setExpandedId(null);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                  category === tab.id
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <ul className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            {questions.map((question, index) => {
              const expanded = expandedId === question.id;
              return (
                <li key={question.id} className={cn(index > 0 && "border-t border-border/70")}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : question.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/50 md:px-7 md:py-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium leading-snug text-foreground md:text-base">
                        “{question.text}”
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {PHASE_LABELS[question.phase]}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out-soft",
                      expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="flex gap-3 px-5 pb-5 md:px-7">
                        <Ear className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {question.listensFor}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Every one of these is in your practice session, with follow-ups that
            adapt to how you answer.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default QuestionBankSection;
