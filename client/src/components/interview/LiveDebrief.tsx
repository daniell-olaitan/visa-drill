import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { fetchReport, type InterviewReport } from "@/lib/report";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 8;

interface LiveDebriefProps {
  conversationId: string;
}

/**
 * The debrief for a live (Tavus) interview: the officer's demeanor analysis and
 * the full transcript, fetched from the backend. The transcript and analysis
 * land a few seconds after the call ends, so we poll until the report is ready.
 */
const LiveDebrief = ({ conversationId }: LiveDebriefProps) => {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollsRef = useRef(0);
  const timerRef = useRef<number | null>(null);

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

  if (error) {
    return (
      <Reveal delay={100}>
        <p className="mx-auto mt-6 max-w-xl text-center leading-relaxed text-muted-foreground">
          {error} Your interview still happened — try running another rep.
        </p>
      </Reveal>
    );
  }

  const pending = !report || (!report.ready && pollsRef.current < MAX_POLLS);
  const hasTranscript = report?.transcript && report.transcript.length > 0;

  return (
    <>
      <Reveal delay={100}>
        <h1 className="font-display mt-4 text-balance text-center text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          Here’s how that landed.
        </h1>
      </Reveal>
      <Reveal delay={200}>
        <p className="mx-auto mt-5 max-w-xl text-balance text-center leading-relaxed text-muted-foreground">
          The officer was reading more than your words. Here’s what they saw and
          heard, straight from the session.
        </p>
      </Reveal>

      {pending && !hasTranscript && (
        <Reveal delay={300}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-10 shadow-soft">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Reviewing your interview… this takes a few seconds.
            </p>
          </div>
        </Reveal>
      )}

      {report?.perception_analysis && (
        <Reveal delay={300}>
          <article className="mt-8 rounded-3xl border border-accent/40 bg-accent/[0.06] p-6 md:p-7">
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Demeanor read
              </h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {report.perception_analysis}
            </p>
          </article>
        </Reveal>
      )}

      {hasTranscript && (
        <div className="mt-10">
          <h2 className="font-display text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Transcript
          </h2>
          <div className="mt-6 space-y-3">
            {report!.transcript.map((turn, index) => {
              const isUser = turn.role === "user";
              return (
                <Reveal key={index} delay={Math.min(index * 40, 240)}>
                  <div
                    className={
                      isUser
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-border bg-secondary/60 p-4"
                        : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card p-4 shadow-soft"
                    }
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {isUser ? "You" : "Officer"}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">{turn.content}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}

      {report?.recording_url && (
        <Reveal delay={200}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <a
              href={report.recording_url}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Watch the recording
            </a>
          </p>
        </Reveal>
      )}

      {!pending && !hasTranscript && !report?.perception_analysis && (
        <Reveal delay={300}>
          <p className="mx-auto mt-10 max-w-xl text-center leading-relaxed text-muted-foreground">
            No transcript came through for this session. Run another rep and the
            debrief will capture it.
          </p>
        </Reveal>
      )}
    </>
  );
};

export default LiveDebrief;
