import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Settings2, X } from "lucide-react";
import SimulatedInterview from "@/components/interview/SimulatedInterview";
import LiveAvatarVideoInterview from "@/components/interview/LiveAvatarVideoInterview";
import PrepForm from "@/components/interview/PrepForm";
import { getStoredCategory, saveSession, type PrepAnswers } from "@/lib/interviewStorage";
import { unlockAudio } from "@/lib/audio";
import type { AnswerRecord } from "@/lib/interviewEngine";
import type { Question } from "@/lib/questionBank";

type Mode = "live" | "sim";

const Interview = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = getStoredCategory() ?? "any";

  const forcedSim = params.get("mode") === "sim";
  // Start with the live hyperreal avatar. If the embed can't be created (no
  // backend, network blocked), handleUnavailable flips us to the built-in
  // simulator so the session always works. Use ?mode=sim to force the simulator.
  const [mode, setMode] = useState<Mode>(forcedSim ? "sim" : "live");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const startedAt = useState(() => new Date().toISOString())[0];

  // Optional "DS-160-lite" pre-interview form (live mode only).
  const [prepDone, setPrepDone] = useState(false);
  const [prepContext, setPrepContext] = useState<string | null>(null);
  const [prepAnswers, setPrepAnswers] = useState<PrepAnswers | null>(null);

  const leave = useCallback(() => navigate("/practice"), [navigate]);

  const completeSimulated = useCallback(
    (questions: Question[], records: AnswerRecord[]) => {
      saveSession({
        category,
        mode: "simulator",
        startedAt,
        endedAt: new Date().toISOString(),
        questions,
        records,
      });
      navigate("/debrief");
    },
    [category, navigate, startedAt],
  );

  const completeLive = useCallback(
    (conversationId: string | null) => {
      saveSession({
        category,
        mode: "liveavatar",
        startedAt,
        endedAt: new Date().toISOString(),
        questions: [],
        records: [],
        liveConversationId: conversationId ?? undefined,
        prep: prepAnswers ?? undefined,
      });
      navigate("/debrief");
    },
    [category, navigate, startedAt, prepAnswers],
  );

  const handleUnavailable = useCallback((reason: string) => {
    setFallbackReason(reason);
    setMode("sim");
  }, []);

  const onPrepSubmit = useCallback((answers: PrepAnswers, ctx: string | null) => {
    unlockAudio(); // inside the user gesture, so iOS lets the officer's voice autoplay
    setPrepAnswers(answers);
    setPrepContext(ctx);
    setPrepDone(true);
  }, []);

  const onPrepSkip = useCallback(() => {
    unlockAudio();
    setPrepDone(true);
  }, []);

  const live = prepDone ? (
    <LiveAvatarVideoInterview
      category={category}
      context={prepContext}
      onComplete={completeLive}
      onLeave={leave}
      onUnavailable={handleUnavailable}
    />
  ) : (
    <PrepForm onSubmit={onPrepSubmit} onSkip={onPrepSkip} onLeave={leave} />
  );

  return (
    <>
      {mode === "live" ? (
        live
      ) : (
        <SimulatedInterview category={category} onComplete={completeSimulated} onLeave={leave} />
      )}

      {/* The hyperreal avatar couldn't start; the session continues on the
          built-in simulator either way. */}
      {fallbackReason && !noticeDismissed && (
        <aside className="fixed bottom-4 left-4 z-50 max-w-xs animate-fade-up rounded-2xl border border-border bg-card p-4 shadow-medium">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Live officer unavailable
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {fallbackReason}. Running the built-in simulator instead.
              </p>
            </div>
            <button
              onClick={() => setNoticeDismissed(true)}
              aria-label="Dismiss notice"
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export default Interview;
