import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Reveal, RevealGroup, RevealItem, ParallaxImage } from "@/components/landing/visadrill/reveal";
import { buttonVariants } from "@/components/landing/visadrill/button-variants";
import { Navbar } from "@/components/landing/visadrill/navbar";
import { Footer } from "@/components/landing/visadrill/footer";
import { PageCanvas } from "@/components/landing/visadrill/page-canvas";
import { JourneyTrail } from "@/components/landing/visadrill/journey-trail";
import { TwoWindows } from "@/components/landing/visadrill/two-windows";
import { WaitlistForm } from "@/components/landing/visadrill/waitlist-form";
import { Faq } from "@/components/landing/Faq";
import { cn } from "@/lib/utils";

const PROOF_POINTS = [
  {
    label: "Real pressure",
    desc: "An AI officer trained on your specific visa category - not a friendly Q&A bot. It doubts you, follows up, and waits for you to crack, the way a real window does.",
  },
  {
    label: "No scripts",
    desc: "Questions adapt to your answers. Hesitate on your finances and it digs into your finances. Contradict your own brief and it catches you - the way real scrutiny does.",
  },
  {
    label: "An honest verdict",
    desc: 'Scored across six criteria with a clear ruling and the specific lines to fix. Not "good job." The truth, while you still have time to act on it.',
  },
];

/* The window, made real - an applicant at the consular glass. */
function ConsularWindow() {
  return (
    <div className="relative mx-auto w-full max-w-[35rem]">
      <ParallaxImage
        src="/images/Photorealistic_shot_of_a_young_202606110015.jpeg"
        alt="A visa applicant slides his passport across the consular window"
        className="aspect-[16/11] rounded-[6px]"
        imgClassName="grayscale-[0.35] contrast-[1.05] mask-fade-lb"
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">Window 04</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">Nonimmigrant Visas</span>
        </div>
      </ParallaxImage>

      <div className="absolute -bottom-4 -right-3 flex items-center gap-2.5 rounded-[6px] border border-white/8 bg-[#06080F] px-3.5 py-2.5">
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
        <div>
          <p className="text-[11px] font-semibold leading-tight text-white/80">214(b) - refused</p>
          <p className="text-[10px] leading-tight text-white/30">No appeal · reapply only</p>
        </div>
      </div>
    </div>
  );
}

function SessionPreviewCard() {
  return (
    <div className="relative">
      <div className="ml-auto w-full max-w-[30rem] overflow-hidden rounded-[8px] border border-[#182840] bg-[#080F1C]">
        <div className="flex items-center gap-2 border-b border-[#182840] bg-[#060C17] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#1A2E47]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#1A2E47]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#1A2E47]" />
          </div>
          <div className="flex flex-1 justify-center">
            <div className="flex items-center gap-1.5 rounded-[3px] bg-[#0D1A2E] px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-[#3E6B9A]">visadrill.com · US B-1/B-2 Session</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-5 flex items-center gap-3 border-b border-[#182840] pb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border border-[#1A3060] bg-[#0D2040]">
              <span className="text-[11px] font-bold text-[#6A9AD0]">US</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white">Consular Officer</p>
              <p className="text-[11px] text-[#3E6B9A]">US Embassy, Lagos · Nonimmigrant Visas</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-[#3E6B9A]">Window</p>
              <p className="font-mono text-[13px] text-white">02:48</p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3">
            <div className="max-w-[85%]">
              <p className="mb-1.5 text-[11px] text-[#3E6B9A]">Officer</p>
              <div className="rounded-xs bg-[#0D1A2E] px-3.5 py-2.5">
                <p className="text-[13px] leading-relaxed text-[#B8CDE0]">
                  &ldquo;What ties you to your home country - what makes you come back?&rdquo;
                </p>
              </div>
            </div>
            <div className="ml-auto max-w-[85%]">
              <p className="mb-1.5 text-right text-[11px] text-[#2E5A8A]">You</p>
              <div className="rounded-xs border border-[#1A3060] bg-[#0D2040] px-3.5 py-2.5">
                <p className="text-[13px] leading-relaxed text-[#B8CDE0]">
                  &ldquo;A permanent job I return to, my family, and a mortgage in Lagos. This is a two-week trip.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-[#182840] pt-4">
            <div>
              <p className="mb-0.5 text-[11px] text-[#3E6B9A]">Score</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[22px] font-bold leading-none text-white">84</span>
                <span className="text-[12px] text-[#3E6B9A]">/100</span>
              </div>
            </div>
            <div className="h-7 w-px bg-[#182840]" />
            <div>
              <p className="mb-0.5 text-[11px] text-[#3E6B9A]">Verdict</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[13px] font-semibold text-emerald-400">Likely Approved</p>
              </div>
            </div>
            <div className="h-7 w-px bg-[#182840]" />
            <div>
              <p className="mb-0.5 text-[11px] text-[#3E6B9A]">Probe</p>
              <p className="text-[13px] font-semibold text-white">Return intent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-4 flex items-center gap-2.5 rounded-[6px] border border-[#182840] bg-[#080F1C] px-3.5 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <p className="text-[12px] font-semibold leading-tight text-white">Strong home ties</p>
          <p className="text-[11px] leading-tight text-[#3E6B9A]">Job + family + property cited</p>
        </div>
      </div>

      <div className="absolute -top-4 -right-3 flex items-center gap-2 rounded-[6px] border border-[#182840] bg-[#080F1C] px-3 py-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] bg-brand-600/20">
          <span className="text-[9px] font-bold text-brand-400">AI</span>
        </div>
        <div>
          <p className="mb-0.5 text-[11px] leading-none text-[#3E6B9A]">Intent read</p>
          <p className="text-[12px] font-bold leading-none text-white">Genuine</p>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-canvas-base">
      <PageCanvas />
      <Navbar />

      {/* HERO */}
      <section className="flex flex-1 items-center px-6 pb-24 pt-6 lg:px-10 xl:px-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[54%_46%] xl:gap-28">
          <Reveal>
            <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-tertiary">
              AI Visa Interview Practice
            </p>
            <h1 className="mb-7 text-5xl font-bold leading-[1.03] tracking-tight text-ink sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
              The three<br />
              minutes that<br />
              decide <span className="text-brand-600">everything.</span>
            </h1>
            <p className="mb-10 max-w-[32.5rem] text-lg leading-[1.7] text-ink-secondary sm:text-xl">
              A US visa interview lasts two to five minutes, at a window, behind glass. The officer is
              testing one thing - whether you&apos;ll come back. VisaDrill is that window. Rehearse it
              until you walk in calm.
            </p>
            <div className="mb-10 flex flex-wrap items-center gap-6">
              <a href="#waitlist" className={buttonVariants({ variant: "dark", size: "xl" })}>
                Get early access
              </a>
              <Link
                to="/practice"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                Step up to the window
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {["US B-1/B-2", "US F-1", "UK Student"].map((v, i, arr) => (
                <span key={v} className="flex items-center gap-3">
                  <span className="text-sm text-ink-tertiary">{v}</span>
                  {i < arr.length - 1 && <span className="select-none text-xs text-ink-tertiary/40">·</span>}
                </span>
              ))}
              <span className="select-none text-xs text-ink-tertiary/40">·</span>
              <span className="text-sm text-ink-tertiary">More soon</span>
            </div>
          </Reveal>

          <div className="hidden items-center justify-end lg:flex">
            <Reveal className="w-full pr-4 xl:pr-8" delay={0.15}>
              <SessionPreviewCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="border-b border-t border-border">
        <RevealGroup className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border px-6 sm:grid-cols-4 lg:px-10">
          {[
            { n: "2-5 min", label: "How short a real interview is" },
            { n: "214(b)", label: "Why most applicants are refused" },
            { n: "6", label: "Criteria we score you on" },
            { n: "Free", label: "To run your first session" },
          ].map(({ n, label }) => (
            <RevealItem key={label} className="flex flex-col items-center justify-center gap-1.5 px-4 py-9 text-center">
              <span className="text-2xl font-bold text-ink">{n}</span>
              <span className="text-[11px] leading-tight text-ink-tertiary">{label}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      {/* THE PROCESS */}
      <JourneyTrail />

      {/* THE WINDOW (cinematic beat) */}
      <section className="bg-dot-grid-dark bg-[#0A0A0F] px-6 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[48%_52%] xl:gap-24">
          <Reveal>
            <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/25">The window</p>
            <h2 className="mb-7 text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              You get one<br />
              shot at the<br />
              <span className="text-brand-500">glass.</span>
            </h2>
            <p className="max-w-[28.75rem] text-lg leading-[1.75] text-white/45">
              In a real interview there are no retries. The officer decides in minutes, hands your passport
              back through the slot, and that&apos;s the slip. VisaDrill is the one place you can step up to
              the window again - and again - until it stops shaking you.
            </p>
          </Reveal>
          <Reveal delay={0.12} className="flex justify-center lg:justify-end">
            <ConsularWindow />
          </Reveal>
        </div>
      </section>

      {/* THE REAL TEST (§214b) */}
      <section className="border-t border-border px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="mb-12 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-tertiary">The real test</p>
          <div className="grid items-start gap-12 lg:grid-cols-[48%_52%] xl:gap-20">
            <Reveal>
              <h2 className="text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
                You walk in<br />
                presumed an<br />
                <span className="text-brand-600">immigrant.</span>
              </h2>
            </Reveal>
            <div>
              <p className="mb-8 text-lg leading-[1.75] text-ink-secondary">
                Under US law, every visa applicant is presumed to intend to stay. The burden is entirely on
                you to prove otherwise - and you get a few minutes at a window to do it. Most refusals
                aren&apos;t about your paperwork. They&apos;re about the answers you gave under pressure.
              </p>

              <div className="mb-10 border-l-2 border-ink pl-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink">214(b)</p>
                <p className="text-sm leading-relaxed text-ink-secondary">
                  The clause that refuses more applicants than any other. It assumes immigrant intent. You
                  overcome it by proving real, specific ties that pull you home.
                </p>
              </div>

              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
                The four things being weighed
              </p>
              <RevealGroup className="flex flex-col">
                {[
                  { pillar: "Ties", q: "What pulls you back home - job, family, property?" },
                  { pillar: "Purpose", q: "Is your reason specific, credible, consistent?" },
                  { pillar: "Funds", q: "Can you afford this without working illegally?" },
                  { pillar: "Credibility", q: "Does your story hold - and match what you filed?" },
                ].map(({ pillar, q }, i) => (
                  <RevealItem
                    key={pillar}
                    className={cn("grid grid-cols-[7.5rem_1fr] items-baseline gap-4 py-4", i > 0 && "border-t border-border")}
                  >
                    <span className="text-sm font-bold text-ink">{pillar}</span>
                    <p className="text-[15px] leading-snug text-ink-secondary">{q}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
              <p className="mt-6 text-[13px] leading-relaxed text-ink-tertiary">
                These are the four pillars of 214(b) - and the exact four VisaDrill scores you on.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-t border-border px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl items-start gap-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold leading-[1.2] tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              Qualified isn&apos;t the same as prepared.
            </h2>
            <ParallaxImage
              src="/images/Editorial_documentary_photography_of_a_202606110014.jpeg"
              alt="A visa applicant waiting with her documents in the embassy hall"
              className="mt-9 aspect-[4/3] rounded-[6px] border border-border"
              imgClassName="grayscale-[0.5] contrast-[1.03]"
            >
              <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-black/5" />
              <div className="absolute bottom-3 left-3 rounded-[6px] border border-border bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
                  The wait before the window
                </span>
              </div>
            </ParallaxImage>
          </div>
          <RevealGroup className="flex flex-col">
            {PROOF_POINTS.map(({ label, desc }) => (
              <RevealItem key={label} className="grid gap-4 border-t border-border py-6 sm:grid-cols-[9rem_1fr]">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <p className="text-sm leading-relaxed text-ink-secondary">{desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* THE PAYOFF - two windows */}
      <TwoWindows />

      {/* FAQ */}
      <Faq />

      {/* WAITLIST */}
      <section id="waitlist" className="relative overflow-hidden border-t border-border px-6 py-32 lg:py-40">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[28vw] font-bold leading-none tracking-tighter text-ink/3"
        >
          READY.
        </span>

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="mb-7 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-tertiary">
              Early access · Free to start
            </p>
            <h2 className="mb-7 text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Don&apos;t walk in<br />
              <span className="text-brand-600">cold.</span>
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-ink-secondary">
              The window doesn&apos;t give second chances. VisaDrill gives you as many as you need - rehearse
              until the real thing feels like the second time.
            </p>
          </Reveal>

          <Reveal delay={0.12} className="mx-auto max-w-md">
            <WaitlistForm />
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
              <span>Free to start</span>
              <span className="h-1 w-1 rounded-full bg-ink-tertiary/40" />
              <span>No card required</span>
              <span className="h-1 w-1 rounded-full bg-ink-tertiary/40" />
              <span>Verdict in minutes</span>
              <span className="h-1 w-1 rounded-full bg-ink-tertiary/40" />
              <span>US &amp; UK visas</span>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
