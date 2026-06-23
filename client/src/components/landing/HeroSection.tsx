import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import WaitlistForm from "@/components/landing/WaitlistForm";
import heroImage from "@/assets/hero-image.png";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Warm light wash behind the headline */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-[-20rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
      </div>

      <div className="container pb-16 pt-14 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
              Private beta — the waitlist is open
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="font-display mt-7 text-balance text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Face the officer
              <br />
              <em className="font-[450] not-italic underline-gold">before it counts.</em>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
              Your US visa interview lasts about three minutes. VisaDrill puts you
              across from a hyperreal AI consular officer who asks what they
              actually ask, so the real thing feels like your second time.
            </p>
          </Reveal>

          <Reveal delay={300} className="mt-8">
            <WaitlistForm variant="hero" />
            <p className="mt-4 text-sm text-muted-foreground">
              Can’t wait?{" "}
              <Link
                to="/practice"
                className="group inline-flex items-center gap-1 font-medium text-brand transition-colors hover:text-foreground"
              >
                Walk into a practice session now
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </p>
          </Reveal>
        </div>

        {/* The product: the face gets the visual weight */}
        <Reveal delay={450} className="relative mx-auto mt-14 max-w-4xl md:mt-20">
          <div
            className="absolute -inset-x-8 -bottom-10 top-1/3 -z-10 rounded-[3rem] bg-gradient-to-t from-accent/10 via-accent/[0.04] to-transparent blur-2xl"
            aria-hidden="true"
          />
          <figure className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-strong md:rounded-3xl">
            <img
              src={heroImage}
              alt="A VisaDrill practice session: a hyperreal AI consular officer asking interview questions over video"
              className="block w-full"
              loading="eager"
            />
          </figure>

          {/* Live caption chip: connects the picture to the moment */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center md:-bottom-6">
            <div className="mx-4 rounded-full border border-border bg-card/95 px-5 py-2.5 shadow-medium backdrop-blur md:px-6 md:py-3">
              <p className="text-xs font-medium text-foreground md:text-sm">
                <span className="mr-2 text-muted-foreground">Officer:</span>
                “What is the purpose of your visit to the United States?”
              </p>
            </div>
          </div>
        </Reveal>

        {/* The stakes, in numbers */}
        <Reveal delay={150} className="mx-auto mt-16 max-w-3xl md:mt-24">
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {[
              {
                value: "3–5 min",
                label: "the length of a typical visa interview",
              },
              {
                value: "~60 sec",
                label: "how quickly many officers form a view",
              },
              {
                value: "214(b)",
                label: "the law that presumes you intend to stay",
              },
            ].map((stat) => (
              <div key={stat.value} className="bg-card px-6 py-5 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {stat.value}
                </dd>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
};

export default HeroSection;
