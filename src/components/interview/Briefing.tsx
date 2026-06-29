interface BriefingProps {
  /** Start the interview. The tap also unlocks iOS audio. */
  onReady: () => void;
  onLeave: () => void;
}

/**
 * The pre-interview screen (visa-drill's briefing): no form, just a moment to
 * settle before the officer. Dark in either theme, like the interview itself.
 */
const Briefing = ({ onReady, onLeave }: BriefingProps) => {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0b0f17] text-white">
      <div className="container flex h-14 shrink-0 items-center sm:h-16">
        <button
          onClick={onLeave}
          className="text-sm text-white/60 transition-colors hover:text-white"
        >
          Leave
        </button>
      </div>

      <div className="container flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="max-w-md animate-fade-up">
          <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
            Pre-interview
          </p>
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-[2.5rem]">
            Real interviews are uncomfortable. This one should be too.
          </h2>
          <p className="mx-auto mt-6 max-w-sm text-base leading-relaxed text-white/55">
            Take a breath. The officer moves fast and won&apos;t coach you, exactly like the window.
            When you&apos;re ready, they&apos;re waiting.
          </p>
          <button
            onClick={onReady}
            className="mt-10 inline-flex h-12 items-center justify-center rounded-md bg-white px-9 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            I&apos;m ready
          </button>
        </div>
      </div>
    </div>
  );
};

export default Briefing;
