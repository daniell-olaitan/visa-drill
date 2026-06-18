import { Anchor, Crosshair, GitCompare } from "lucide-react";
import Reveal from "@/components/motion/Reveal";

const signals = [
  {
    icon: Anchor,
    title: "Ties to home",
    body: "A job you’re returning to, family who depend on you, property, studies in progress. Officers look for the life that pulls you back.",
    listening: "“Why would this person leave the US?”",
  },
  {
    icon: Crosshair,
    title: "A clear purpose",
    body: "One specific reason for the trip, stated without hesitation. Vague answers about “tourism and maybe visiting family” read as unprepared.",
    listening: "“Does this person know exactly why they’re going?”",
  },
  {
    icon: GitCompare,
    title: "A consistent story",
    body: "What you say must match what you filed. The officer has your DS-160 on screen while you talk. Contradictions end interviews.",
    listening: "“Does what I’m hearing match what I’m reading?”",
  },
];

const StakesSection = () => {
  return (
    <section id="why" className="scroll-mt-20 border-t border-border/70 bg-card/50">
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Why people really get refused
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              It’s almost never the qualifications.
              <br className="hidden md:block" /> It’s the three minutes.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 text-balance leading-relaxed text-muted-foreground">
              Under Section 214(b) of US immigration law, every applicant is
              presumed to be an intending immigrant until they prove otherwise.
              That proof doesn’t come from your documents. It comes from how you
              answer a handful of predictable questions, out loud, under pressure.
              Officers are listening for three things.
            </p>
          </Reveal>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
          {signals.map((signal, index) => (
            <Reveal key={signal.title} delay={index * 120}>
              <article className="group h-full rounded-3xl border border-border bg-card p-7 shadow-soft transition-all duration-500 ease-out-soft hover:-translate-y-1 hover:shadow-medium">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground transition-colors duration-500 group-hover:bg-accent/15 group-hover:text-accent">
                  <signal.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="font-display mt-5 text-xl font-semibold tracking-tight text-foreground">
                  {signal.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{signal.body}</p>
                <p className="mt-5 border-t border-border/70 pt-4 text-sm italic leading-relaxed text-foreground/70">
                  The officer is asking themselves: {signal.listening}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mx-auto mt-14 max-w-xl text-center font-display text-xl font-medium leading-relaxed text-foreground md:text-2xl">
            All three are learnable. Most people who fail weren’t unqualified.
            <span className="text-muted-foreground"> They were unrehearsed.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default StakesSection;
