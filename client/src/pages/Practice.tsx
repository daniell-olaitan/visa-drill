import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Compass, GraduationCap, Plane, Repeat } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { saveCategory } from "@/lib/interviewStorage";
import type { VisaCategory } from "@/lib/questionBank";

const options: {
  id: VisaCategory;
  label: string;
  sub: string;
  icon: typeof Plane;
}[] = [
  {
    id: "b1b2",
    label: "Visitor",
    sub: "B1/B2 - tourism, family, business trips",
    icon: Plane,
  },
  {
    id: "f1",
    label: "Student",
    sub: "F1 - degree programs and study",
    icon: GraduationCap,
  },
  {
    id: "h1b",
    label: "Work",
    sub: "H-1B - taking up a job offer",
    icon: Briefcase,
  },
  {
    id: "j1",
    label: "Exchange",
    sub: "J-1 - exchange and training programs",
    icon: Repeat,
  },
  {
    id: "any",
    label: "Not sure yet",
    sub: "Practice the questions every interview shares",
    icon: Compass,
  },
];

const Practice = () => {
  const navigate = useNavigate();

  const start = (category: VisaCategory) => {
    saveCategory(category);
    navigate("/interview");
  };

  return (
    <section className="container flex min-h-[calc(100vh-4rem)] flex-col justify-center py-14 md:py-20">
      <div className="mx-auto w-full max-w-2xl">
        <Reveal>
          <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Practice session
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="font-display mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            Which interview are you walking into?
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-4 max-w-md text-balance text-center text-sm leading-relaxed text-muted-foreground md:text-base">
            That’s the only question we’ll ask. About ten questions, a few
            minutes, and a straight debrief at the end. Answering out loud works
            best.
          </p>
        </Reveal>

        <div className="mt-10 space-y-3">
          {options.map((option, index) => (
            <Reveal key={option.id} delay={250 + index * 80}>
              <button
                onClick={() => start(option.id)}
                className="group flex w-full items-center gap-5 rounded-3xl border border-border bg-card p-5 text-left shadow-soft transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-medium md:p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground transition-colors duration-300 group-hover:bg-accent/15 group-hover:text-accent">
                  <option.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold tracking-tight text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{option.sub}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={650}>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Your answers never leave this device. Microphone is optional, you can
            type instead.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Practice;
