import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button-variants";
import { Menu, X, ArrowRight } from "lucide-react";

export function VisaDrillLogo({ size = "md", light = false }: { size?: "sm" | "md"; light?: boolean }) {
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-2">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[5px] bg-brand-600 transition-opacity group-hover:opacity-80",
          size === "sm" ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <svg width={size === "sm" ? "14" : "16"} height={size === "sm" ? "14" : "16"} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
          <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
        </svg>
      </div>
      <span
        className={cn(
          "font-display font-bold tracking-tight",
          size === "sm" ? "text-sm" : "text-[15px]",
          light ? "text-white" : "text-ink",
        )}
      >
        VisaDrill
      </span>
    </Link>
  );
}

const NAV_LINKS = [{ to: "/practice", label: "Practice" }];

export function Navbar({ floating = false }: { floating?: boolean }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [scrolled, setScrolled] = React.useState(false);

  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className={cn(
            "pointer-events-auto w-full transition-[max-width] duration-500 ease-out",
            scrolled ? "max-w-2xl" : "max-w-4xl",
          )}
        >
          <nav
            className={cn(
              "relative flex items-center justify-between gap-4 rounded-[18px] border border-white/8 backdrop-blur-2xl transition-all duration-500 ease-out",
              scrolled
                ? "bg-[#0a0a10]/95 px-4 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                : "bg-[#0a0a10]/80 px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
            )}
            aria-label="Main navigation"
          >
            <span aria-hidden className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/10" />

            <VisaDrillLogo light />

            <div className="hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
              {NAV_LINKS.map((link) => {
                const active = pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onMouseEnter={() => setHovered(link.to)}
                    className={cn(
                      "relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                      active ? "text-white" : "text-white/50 hover:text-white",
                    )}
                  >
                    {hovered === link.to && (
                      <motion.span
                        layoutId="nav-hover"
                        className="absolute inset-0 rounded-md bg-white/7"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <a
                href="#waitlist"
                className={cn(buttonVariants({ variant: "white", size: "sm" }), "group hidden sm:inline-flex")}
              >
                Get early access
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center text-white/60 transition-colors hover:text-white md:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mt-2 overflow-hidden rounded-[14px] border border-white/8 bg-[#0a0a10]/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:hidden"
              >
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center border-b border-white/5 px-5 py-4 text-sm font-medium text-white/55 transition-colors hover:bg-white/4 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="px-5 py-4">
                  <a
                    href="#waitlist"
                    onClick={() => setMenuOpen(false)}
                    className={cn(buttonVariants({ variant: "white", size: "lg" }), "w-full")}
                  >
                    Get early access
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {!floating && <div aria-hidden className="h-[4.5rem] shrink-0" />}
    </>
  );
}
