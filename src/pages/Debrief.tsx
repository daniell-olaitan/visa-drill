import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Check, Ear, RotateCcw } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import LiveDebrief from "@/components/interview/LiveDebrief";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildDebrief } from "@/lib/interviewEngine";
import { getStoredSession } from "@/lib/interviewStorage";
import { CATEGORY_LABELS, PHASE_LABELS } from "@/lib/questionBank";

const reflectionPrompts = [
  "Did your purpose come out in one clear sentence, or did it wander?",
  "Did you give names, numbers, and dates, or did you stay general?",
  "When the officer pushed back, did you stay in the facts or start pleading?",
  "Would a stranger, hearing only your answers, believe you’re coming back?",
];

const Debrief = () => {
  const session = useMemo(() => getStoredSession(), []);

  const debrief = useMemo(() => {
    if (!session || session.mode !== "simulator") return null;
    return buildDebrief(session.questions, session.records);
  }, [session]);

  if (!session) {
    return <Navigate to="/practice" replace />;
  }

  const categoryLabel =
    session.category === "any"
      ? "General practice"
      : CATEGORY_LABELS[session.category] ?? "Practice";

  return (
    <section className="container py-14 md:py-20">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Debrief · {categoryLabel}
          </p>
        </Reveal>

        {debrief ? (
          <>
            <Reveal delay={100}>
              <h1 className="font-display mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                {debrief.headline}
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto mt-5 max-w-xl text-balance text-center leading-relaxed text-muted-foreground">
                {debrief.summary}
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-8 rounded-3xl border border-accent/40 bg-accent/[0.06] p-6 text-center">
                <p className="text-sm font-medium leading-relaxed text-foreground">{debrief.focus}</p>
              </div>
            </Reveal>

            <div className="mt-12 space-y-5">
              {debrief.items.map((item, index) => (
                <Reveal key={item.question.id} delay={Math.min(index * 60, 300)}>
                  <article
                    className={cn(
                      "rounded-3xl border bg-card p-6 shadow-soft md:p-7",
                      item.question.id === debrief.strongestId && item.notes.strength >= 2
                        ? "border-success/40"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
                        “{item.question.text}”
                      </h2>
                      <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {PHASE_LABELS[item.question.phase]}
                      </span>
                    </div>

                    {item.question.id === debrief.strongestId && item.notes.strength >= 2 && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-success">
                        Your strongest answer
                      </p>
                    )}

                    <p className="mt-4 border-l-2 border-border pl-4 text-sm italic leading-relaxed text-muted-foreground">
                      {item.record.answer.trim() ? `“${item.record.answer.trim()}”` : "No answer recorded."}
                    </p>

                    {(item.notes.landed.length > 0 || item.notes.tighten.length > 0) && (
                      <ul className="mt-5 space-y-2.5">
                        {item.notes.landed.map((note) => (
                          <li key={note} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            {note}
                          </li>
                        ))}
                        {item.notes.tighten.map((note) => (
                          <li key={note} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5 flex gap-2.5 rounded-2xl bg-secondary/60 p-4">
                      <Ear className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">Coach’s note: </span>
                        {item.question.coachTip}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </>
        ) : session.mode === "liveavatar" && session.liveConversationId ? (
          <LiveDebrief conversationId={session.liveConversationId} />
        ) : (
          <>
            <Reveal delay={100}>
              <h1 className="font-display mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                You sat across from the officer. That already changed things.
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto mt-5 max-w-xl text-balance text-center leading-relaxed text-muted-foreground">
                Live avatar sessions stay between you and the officer, so there’s
                no transcript here. While it’s fresh, walk yourself through the
                honest version of a debrief.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <ul className="mt-10 space-y-3">
                {reflectionPrompts.map((prompt) => (
                  <li
                    key={prompt}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground shadow-soft"
                  >
                    <Ear className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                    {prompt}
                  </li>
                ))}
              </ul>
            </Reveal>
          </>
        )}

        <Reveal delay={200}>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link to="/interview">
                <RotateCcw />
                Run it again
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <a href="/#waitlist">Get early access</a>
            </Button>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Confidence is reps. Most people feel the difference by their third run.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Debrief;
