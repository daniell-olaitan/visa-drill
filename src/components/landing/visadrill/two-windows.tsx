import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from "motion/react";

/* The cold->warm payoff. As you scroll, the consular window (the one you fear)
   dissolves into the airplane window (the one you earn). */
const COLD = "/images/Photorealistic_shot_of_a_young_202606110016.jpeg";
const WARM = "/images/View_from_inside_a_dark_202606110013.jpeg";

const PHASES = {
  cold: {
    accent: "text-brand-500",
    word: "fear.",
    body: "Behind glass, judged in minutes. The consular window decides whether you go - and it does not give second chances.",
  },
  warm: {
    accent: "text-amber-400",
    word: "earn.",
    body: "The window seat at thirty-eight thousand feet. Clear the first and the second is yours - VisaDrill is how you get there.",
  },
} as const;

export function TwoWindows() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const coldScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.18]);
  const warmScale = useTransform(scrollYProgress, [0.4, 1], [1.14, 1]);

  const [phase, setPhase] = React.useState<"cold" | "warm">("cold");
  React.useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      setPhase((prev) => {
        const next = v >= 0.5 ? "warm" : "cold";
        return prev === next ? prev : next;
      });
    });
    return unsub;
  }, [scrollYProgress]);

  if (reduce) {
    return (
      <section className="relative overflow-hidden bg-[#0A0A0F] px-6 py-28 lg:px-10">
        <img src={WARM} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-right opacity-60" />
        <div aria-hidden className="absolute inset-0 bg-[#0A0A0F]/55" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Two windows</p>
          <h2 className="mb-6 max-w-xl text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
            One you fear. One you <span className="text-amber-400">earn.</span>
          </h2>
          <p className="max-w-md text-lg leading-[1.7] text-white/55">
            The window seat at thirty-eight thousand feet. Clear the consular window first and the second is yours -
            VisaDrill gets you there.
          </p>
        </div>
      </section>
    );
  }

  const current = PHASES[phase];

  return (
    <section ref={ref} className="relative h-[300vh] bg-[#0A0A0F]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Cold consular window */}
        <motion.div
          initial={false}
          animate={{ opacity: phase === "cold" ? 1 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.div style={{ scale: coldScale }} className="absolute inset-0">
            <img src={COLD} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-right grayscale-[0.6] contrast-[1.05]" />
          </motion.div>
          <div aria-hidden className="absolute inset-0 bg-[#0A0A0F]/60" />
        </motion.div>

        {/* Warm airplane window */}
        <motion.div
          initial={false}
          animate={{ opacity: phase === "warm" ? 1 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.div style={{ scale: warmScale }} className="absolute inset-0">
            <img src={WARM} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-right" />
          </motion.div>
          <div aria-hidden className="absolute inset-0 bg-[#0A0A0F]/45" />
        </motion.div>

        {/* Text - one phase at a time */}
        <div className="relative z-10 flex h-full items-center px-6 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Two windows</p>
            <div className="grid max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                  className="col-start-1 row-start-1"
                >
                  <h2 className="mb-6 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
                    One you <span className={current.accent}>{current.word}</span>
                  </h2>
                  <p className="max-w-md text-lg leading-[1.7] text-white/55">{current.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
