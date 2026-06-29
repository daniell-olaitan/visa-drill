import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/**
 * Reveals children with a soft fade-up the first time they enter the viewport.
 * Falls back to fully visible when IntersectionObserver is unavailable or the
 * user prefers reduced motion (handled in CSS).
 */
const Reveal = ({ children, delay = 0, className, as = "div" }: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: cn("reveal", visible && "is-visible", className),
      style: { "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
};

export default Reveal;
