import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";

/* A single soft colour bloom. Movement is a GPU transform (translate), so it
   composites cheaply and stays smooth on mobile - no layout/paint per frame. */
function Bloom({
  className,
  color,
  x,
  y,
}: {
  className: string;
  color: string;
  x?: MotionValue<string>;
  y?: MotionValue<string>;
}) {
  return (
    <motion.div
      style={{
        x,
        y,
        background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
        willChange: "transform",
      }}
      className={`absolute rounded-full ${className}`}
    />
  );
}

/**
 * The page-wide gradient canvas. Soft "ink-splash" colour blooms drift at
 * different rates as you scroll, with a fine grain over the top. Sits fixed
 * behind all content; transparent sections show it through.
 */
export function PageCanvas() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const up = useTransform(scrollYProgress, [0, 1], ["0vh", "-60vh"]);
  const down = useTransform(scrollYProgress, [0, 1], ["0vh", "78vh"]);
  const up2 = useTransform(scrollYProgress, [0, 1], ["0vh", "-46vh"]);
  const down2 = useTransform(scrollYProgress, [0, 1], ["0vh", "44vh"]);
  const drift = useTransform(scrollYProgress, [0, 1], ["0vw", "20vw"]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Bloom
        className="-top-[22%] -left-[16%] h-[72vw] w-[72vw]"
        color="rgba(37, 99, 235, 0.34)"
        y={reduce ? undefined : up}
      />
      <Bloom
        className="top-[10%] -right-[18%] h-[64vw] w-[64vw]"
        color="rgba(139, 92, 246, 0.26)"
        y={reduce ? undefined : down}
      />
      <Bloom
        className="top-[56%] -left-[14%] h-[60vw] w-[60vw]"
        color="rgba(236, 72, 153, 0.20)"
        x={reduce ? undefined : drift}
        y={reduce ? undefined : up2}
      />
      <Bloom
        className="-bottom-[20%] right-[2%] h-[66vw] w-[66vw]"
        color="rgba(56, 189, 248, 0.22)"
        y={reduce ? undefined : down2}
      />
      {/* fine grain */}
      <div className="noise absolute inset-0" />
    </div>
  );
}
