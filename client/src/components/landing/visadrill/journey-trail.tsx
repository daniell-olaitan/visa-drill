import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "motion/react";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    step: "01",
    tag: "DS-160",
    title: "Build your case",
    desc: "Fill the form, pay the fee, book the appointment. Every answer you'll give is already on file before you arrive.",
  },
  {
    step: "02",
    tag: "Arrival",
    title: "The embassy",
    desc: "Security, no phones, fingerprints, then the wait - dozens of applicants in one hall, queuing for a window.",
  },
  {
    step: "03",
    tag: "The window",
    title: "Step up to the glass",
    desc: "Two to five minutes at a counter, behind glass. The officer already has your file open. The clock is running.",
  },
  {
    step: "04",
    tag: "214(b)",
    title: "The real test",
    desc: "Ties, purpose, funds, credibility. Prove you'll come back - under pressure, no script, no second take.",
  },
  {
    step: "05",
    tag: "The ruling",
    title: "The verdict",
    desc: "Decided on the spot. Passport kept means approved. Handed back through the slot means refused.",
  },
];

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function JourneyTrail() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const planeLeft = useTransform(scrollYProgress, [0, 0.85], ["3%", "97%"], { clamp: true });
  const fillWidth = useTransform(scrollYProgress, [0, 0.85], ["3%", "97%"], { clamp: true });
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const p = Math.min(v / 0.85, 1);
      setActive(Math.max(0, Math.min(STAGES.length - 1, Math.floor(p * STAGES.length))));
    });
    return unsub;
  }, [scrollYProgress]);

  if (reduce) {
    return (
      <section className="border-t border-border px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-tertiary">The process</p>
          <h2 className="mb-10 text-4xl font-bold tracking-tight text-ink">The route to the window.</h2>
          <ol className="flex flex-col">
            {STAGES.map((s, i) => (
              <li key={s.step} className={cn("grid grid-cols-[auto_1fr] gap-5 py-6", i > 0 && "border-t border-border")}>
                <span className="text-sm font-bold tabular-nums text-ink-tertiary">{s.step}</span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-secondary">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[360vh] border-t border-border">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* Heading + progress counter */}
        <div className="mx-auto w-full max-w-7xl shrink-0 px-6 pt-28 lg:px-10 lg:pt-32">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-tertiary">The process</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              The route to<br className="hidden sm:block" /> the window.
            </h2>
            <span className="pb-1 font-mono text-[11px] tabular-nums text-ink-tertiary">
              {String(active + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* The flight route */}
        <div className="relative mx-auto w-full max-w-7xl flex-1">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 lg:inset-x-10">
            <div className="relative h-0 border-t-2 border-dashed border-border-strong">
              <motion.div
                className="absolute left-0 top-0 h-0.5 -translate-y-1/2 bg-brand-600"
                style={{ width: fillWidth }}
              />

              {STAGES.map((s, i) => {
                const pos = (i / (STAGES.length - 1)) * 100;
                const lit = i <= active;
                return (
                  <div key={s.step} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pos}%` }}>
                    <div
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border-2 transition-colors duration-300",
                        lit ? "border-brand-600 bg-brand-600" : "border-border-strong bg-surface",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-1/2 top-5 -translate-x-1/2 font-mono text-[10px] tabular-nums transition-colors duration-300",
                        lit ? "text-ink" : "text-ink-tertiary",
                      )}
                    >
                      {s.step}
                    </span>
                  </div>
                );
              })}

              <motion.div className="absolute top-0 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: planeLeft }}>
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"
                >
                  <img
                    src="/images/Top-down_view_of_a_small_202606110012-removebg-preview.png"
                    alt=""
                    aria-hidden
                    width={22}
                    height={22}
                    className="rotate-90 opacity-85 brightness-0"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Active stage */}
        <div className="mx-auto min-h-[11.875rem] w-full max-w-7xl shrink-0 px-6 pb-20 lg:px-10 lg:pb-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="max-w-xl"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold tabular-nums text-ink-tertiary">{STAGES[active].step}</span>
                <span className="rounded-[3px] border border-brand-600/30 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                  {STAGES[active].tag}
                </span>
              </div>
              <h3 className="mb-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{STAGES[active].title}</h3>
              <p className="text-base leading-relaxed text-ink-secondary">{STAGES[active].desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
