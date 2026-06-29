import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 0.61, 0.36, 1] as const; // smooth ease-out

/* Single element - fades + rises into view once. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* Container that staggers its <RevealItem> children into view. */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants = (y: number): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
});

const reducedVariants: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

/* Child of <RevealGroup>. Renders the grid/list cell directly (pass className). */
export function RevealItem({
  children,
  className,
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? reducedVariants : itemVariants(y)}>
      {children}
    </motion.div>
  );
}

/* Image with a subtle scroll parallax inside a fixed-ratio frame. */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y }} className="absolute inset-x-0 top-[-12%] h-[124%]">
        <img src={src} alt={alt} className={cn("h-full w-full object-cover", imgClassName)} />
      </motion.div>
      {children}
    </div>
  );
}
