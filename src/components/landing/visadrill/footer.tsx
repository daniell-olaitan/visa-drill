import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { VisaDrillLogo } from "./navbar";
import { buttonVariants } from "./button-variants";
import { cn } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/6 bg-ink-splash">
      {/* dot-grid texture + top sheen */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dot-grid-dark opacity-60" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16 lg:px-10">
        {/* BRAND + CTA */}
        <div className="flex flex-col justify-between gap-8 pb-12 lg:flex-row lg:items-end">
          <div className="max-w-md">
            <VisaDrillLogo light />
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">
              AI-powered visa interview practice. Stand at the window before it counts - and walk in
              confident, not hopeful.
            </p>
          </div>
          <a href="#waitlist" className={cn(buttonVariants({ variant: "white", size: "md" }), "group self-start lg:self-end")}>
            Get early access
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* LINKS */}
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/6 py-7">
          <Link to="/practice" className="text-sm text-white/45 transition-colors hover:text-white">
            Practice
          </Link>
          <a href="#waitlist" className="text-sm text-white/45 transition-colors hover:text-white">
            Waitlist
          </a>
        </nav>

        {/* LEGAL */}
        <div className="flex flex-col items-start justify-between gap-2 border-t border-white/6 py-7 sm:flex-row sm:items-center">
          <p className="text-[11px] text-white/35">© {new Date().getFullYear()} VisaDrill. All rights reserved.</p>
          <p className="text-[11px] text-white/35">Built for applicants who refuse to walk in cold.</p>
        </div>

        {/* GIANT WATERMARK */}
        <div aria-hidden className="relative overflow-hidden pt-4">
          <span className="block translate-y-[0.22em] whitespace-nowrap text-center font-display text-[clamp(3.5rem,20vw,15rem)] font-bold leading-none tracking-tight text-white/[0.035]">
            VisaDrill
          </span>
        </div>
      </div>
    </footer>
  );
}
