import Reveal from "@/components/motion/Reveal";
import WaitlistForm from "@/components/landing/WaitlistForm";

const WaitlistSection = () => {
  return (
    <section id="waitlist" className="scroll-mt-20 border-t border-border/70">
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Early access
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Your interview date is coming
              <br className="hidden md:block" /> whether you practice or not.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 text-balance leading-relaxed text-muted-foreground">
              Join the waitlist and you’ll get your spot in line today, early
              access when we open, and free practice sessions as a founding user.
              Friends who join through your link move you up the queue.
            </p>
          </Reveal>
        </div>

        <Reveal delay={250} className="mx-auto mt-10 max-w-xl">
          <WaitlistForm variant="panel" />
        </Reveal>
      </div>
    </section>
  );
};

export default WaitlistSection;
