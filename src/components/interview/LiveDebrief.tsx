import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Ear, Loader2 } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";
import { fetchReport, type InterviewReport } from "@/lib/report";
import {
  buildLiveDebrief,
  dimensionScores,
  readinessScore,
  verdictFor,
} from "@/lib/liveScore";
import { getLastLiveScore, setLastLiveScore } from "@/lib/interviewStorage";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 8;

const toneClasses = {
  success: "border-success/40 bg-success/[0.06] text-success",
  warning: "border-accent/40 bg-accent/[0.06] text-accent",
  destructive: "border-destructive/40 bg-destructive/[0.06] text-destructive",
} as const;

const barColor = (score: number): string =>
  score >= 70 ? "bg-success" : score >= 50 ? "bg-accent" : "bg-destructive";

interface LiveDebriefProps {
  conversationId: string;
}

const LiveDebrief = ({ conversationId }: LiveDebriefProps) => {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const pollsRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchReport(conversationId);
      setReport(data);
      if (!data.ready && pollsRef.current < MAX_POLLS) {
        pollsRef.current += 1;
        timerRef.current = window.setTimeout(load, POLL_INTERVAL_MS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your debrief.");
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [load]);

  const debrief = useMemo(
    () => (report?.transcript ? buildLiveDebrief(report.transcript) : null),
    [report],
  );
  const readiness = useMemo(() => (debrief ? readinessScore(debrief) : 0), [debrief]);
  const dimensions = useMemo(() => (debrief ? dimensionScores(debrief) : []), [debrief]);

  // Capture the previous score for the progress delta, then save this one (once).
  useEffect(() => {
    if (debrief && !savedRef.current) {
      savedRef.current = true;
      setPrevScore(getLastLiveScore());
      setLastLiveScore(readiness);
    }
  }, [debrief, readiness]);

  if (error) {
    return (
      <Reveal delay={100}>
        <p className="mx-auto mt-6 max-w-xl text-center leading-relaxed text-muted-foreground">
          {error} Your interview still happened - try another rep.
        </p>
      </Reveal>
    );
  }

  const pending = !report || (!report.ready && pollsRef.current < MAX_POLLS);

  if (pending && !debrief) {
    return (
      <Reveal delay={100}>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-10 shadow-soft">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Scoring your interview… a few seconds.</p>
        </div>
      </Reveal>
    );
  }

  const verdict = verdictFor(readiness);
  const delta = prevScore !== null ? readiness - prevScore : null;

  return (
    <>
      {/* Verdict + readiness score */}
      <Reveal delay={100}>
        <div className={cn("mt-6 rounded-3xl border p-6 text-center md:p-8", debrief ? toneClasses[verdict.tone] : "border-border bg-card text-foreground")}>
          {debrief ? (
            <>
              <p className="font-display text-2xl font-semibold tracking-tight md:text-4xl">{verdict.label}</p>
              <p className="mt-3 text-sm font-medium text-foreground/80">
                Approval readiness: <span className="font-semibold">{readiness}/100</span>
                {delta !== null && delta !== 0 && (
                  <span className="ml-2 text-xs">
                    ({delta > 0 ? "+" : ""}{delta} since last time)
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No answers were captured to score. Run another rep and answer the questions out loud.
            </p>
          )}
        </div>
      </Reveal>

      {/* Per-area scores */}
      {dimensions.length > 0 && (
        <Reveal delay={250}>
          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft md:p-7">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">By area</h2>
            <div className="mt-4 flex flex-col gap-3">
              {dimensions.map((d) => (
                <div key={d.phase}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/90">{d.label}</span>
                    <span className="font-medium text-muted-foreground">{d.score}/100</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full", barColor(d.score))} style={{ width: `${d.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Per-question feedback */}
      {debrief && debrief.items.length > 0 && (
        <div className="mt-8 space-y-4">
          {debrief.items.map((item, index) => (
            <Reveal key={item.question.id} delay={Math.min(index * 50, 250)}>
              <article className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-7">
                <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground">
                  “{item.question.text}”
                </h3>
                <p className="mt-3 border-l-2 border-border pl-4 text-sm italic leading-relaxed text-muted-foreground">
                  {item.record.answer.trim() ? `“${item.record.answer.trim()}”` : "No answer recorded."}
                </p>
                {(item.notes.landed.length > 0 || item.notes.tighten.length > 0) && (
                  <ul className="mt-4 space-y-2.5">
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
                <div className="mt-4 flex gap-2.5 rounded-2xl bg-secondary/60 p-4">
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
      )}
    </>
  );
};

export default LiveDebrief;
