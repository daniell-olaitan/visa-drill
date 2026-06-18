import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

const FinalCTA = () => {
  return (
    <section className="border-t border-border/70">
      <div className="container py-20 md:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-16 text-center shadow-strong md:px-16 md:py-24">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-balance text-3xl font-semibold tracking-tight text-primary-foreground md:text-5xl">
                Walk in like you’ve
                <br />
                done it before.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-balance text-sm leading-relaxed text-primary-foreground/75 md:text-base">
                Because by the time it counts, you will have. Again and again,
                across from a face that doesn’t blink at your nerves.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-card text-foreground shadow-medium hover:bg-card/90 sm:w-auto"
                >
                  <a href="#waitlist">Join the waitlist</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="w-full text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
                >
                  <Link to="/practice">
                    Try a session first
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default FinalCTA;
