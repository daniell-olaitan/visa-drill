import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSession } from "@/lib/interviewEngine";
import type { AnswerRecord } from "@/lib/interviewEngine";
import { canListen, canSpeak, speak, startListening, stopSpeaking, type Listener } from "@/lib/speech";
import type { Question, VisaCategory } from "@/lib/questionBank";
import officerPortrait from "@/assets/officer-portrait.jpg";

interface SimulatedInterviewProps {
  category: VisaCategory;
  onComplete: (questions: Question[], records: AnswerRecord[]) => void;
  onLeave: () => void;
}

type Stage = "intro" | "asking" | "answering" | "closing";

const ACKS = ["Okay.", "I see.", "Alright.", "Mm-hm.", "Thank you."];
const PROBE = "Can you be more specific?";
const CLOSING = "Alright, that's everything I need today. One moment.";

const SpeakingBars = ({ active }: { active: boolean }) => (
  <span className="flex h-3.5 items-end gap-[3px]" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className={cn(
          "w-[3px] rounded-full bg-accent transition-all duration-300",
          active ? "animate-soundbar" : "h-[3px]",
        )}
        style={active ? { height: "100%", animationDelay: `${i * 0.15}s` } : undefined}
      />
    ))}
  </span>
);

const SimulatedInterview = ({ category, onComplete, onLeave }: SimulatedInterviewProps) => {
  const questions = useMemo(() => buildSession(category), [category]);

  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [officerSpeaking, setOfficerSpeaking] = useState(false);
  const [probed, setProbed] = useState(false);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(!canListen());
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);

  const recordsRef = useRef<AnswerRecord[]>([]);
  const listenerRef = useRef<Listener | null>(null);
  const turnStartRef = useRef<number>(0);
  const spokeRef = useRef(false);
  const probeAnswerRef = useRef<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);

  const question = questions[index];

  /* ── camera self-view ── */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraOn(false);
    }
  }, []);

  /* ── voice input ── */

  const stopMic = useCallback(() => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    setListening(false);
  }, []);

  const startMic = useCallback(() => {
    const listener = startListening(
      (finalText, interim) => {
        spokeRef.current = true;
        setDraft([finalText, interim].filter(Boolean).join(" "));
      },
      () => {
        setMicError(true);
        setTyping(true);
        setListening(false);
      },
    );
    if (listener) {
      listenerRef.current = listener;
      setListening(true);
    } else {
      setMicError(true);
      setTyping(true);
    }
  }, []);

  /* ── interview flow ── */

  const askCurrent = useCallback(
    async (text: string) => {
      setStage("asking");
      setOfficerSpeaking(true);
      await speak(text);
      setOfficerSpeaking(false);
      setStage("answering");
      turnStartRef.current = Date.now();
      spokeRef.current = false;
    },
    [],
  );

  const begin = useCallback(async () => {
    startCamera();
    await askCurrent(
      `Good morning. Pass me your passport, please. ${questions[0].text}`,
    );
  }, [askCurrent, questions, startCamera]);

  const finish = useCallback(
    async (records: AnswerRecord[]) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setStage("closing");
      setOfficerSpeaking(true);
      await speak(CLOSING);
      setOfficerSpeaking(false);
      stopCamera();
      onComplete(questions, records);
    },
    [onComplete, questions, stopCamera],
  );

  const submitAnswer = useCallback(async () => {
    stopMic();
    const answer = draft.trim();
    const durationSec = Math.round((Date.now() - turnStartRef.current) / 1000);
    const words = answer.split(/\s+/).filter(Boolean).length;

    // One probe per question: a thin answer gets pressed, like it would at the window.
    if (!probed && words > 0 && words < 8 && index < questions.length - 1) {
      probeAnswerRef.current = answer;
      setProbed(true);
      setDraft("");
      await askCurrent(PROBE);
      return;
    }

    const fullAnswer = probed ? `${probeAnswerRef.current} ${answer}`.trim() : answer;
    recordsRef.current = [
      ...recordsRef.current,
      {
        questionId: question.id,
        answer: fullAnswer,
        durationSec,
        spoken: spokeRef.current,
      },
    ];

    setProbed(false);
    probeAnswerRef.current = "";
    setDraft("");

    if (index >= questions.length - 1) {
      await finish(recordsRef.current);
      return;
    }

    const ack = ACKS[Math.floor(Math.random() * ACKS.length)];
    const next = questions[index + 1];
    setIndex(index + 1);
    await askCurrent(`${ack} ${next.text}`);
  }, [askCurrent, draft, finish, index, probed, question, questions, stopMic]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      stopSpeaking();
      listenerRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const answered = recordsRef.current.length;
  const displayText =
    stage === "closing" ? CLOSING : probed && stage !== "intro" ? PROBE : question?.text;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <div className="container flex h-16 items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onLeave} className="text-muted-foreground">
          Leave
        </Button>

        <div
          className="flex max-w-[12rem] flex-1 items-center gap-1 sm:max-w-xs"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answered}
          aria-label="Interview progress"
        >
          {questions.map((q, i) => (
            <span
              key={q.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                i < answered
                  ? "bg-accent"
                  : i === index && stage !== "intro"
                    ? "bg-foreground/40"
                    : "bg-border",
              )}
            />
          ))}
        </div>

        <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Simulation
        </span>
      </div>

      {/* The room */}
      <div className="container flex flex-1 flex-col items-center justify-center pb-8">
        <div className="relative w-full max-w-2xl">
          {/* Officer window */}
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl bg-primary shadow-strong transition-all duration-700 ease-out-soft",
              stage === "intro" && "scale-[0.99]",
            )}
          >
            <img
              src={officerPortrait}
              alt="The consular officer, looking at you"
              className={cn(
                "block w-full animate-breathe transition-all duration-700",
                stage === "intro" && "blur-md brightness-90",
              )}
            />

            {/* Lower-third gradient + nameplate */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
              <SpeakingBars active={officerSpeaking} />
              <p className="text-xs font-medium text-white/90">
                U.S. Consular Officer · Window 4
              </p>
            </div>

            {/* Self view */}
            <div
              className={cn(
                "absolute bottom-3 right-3 w-24 overflow-hidden rounded-xl border border-white/25 bg-black/70 shadow-medium transition-opacity sm:w-32",
                stage === "intro" && "opacity-0",
              )}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Your camera preview"
                className={cn("aspect-[4/3] w-full scale-x-[-1] object-cover", !cameraOn && "hidden")}
              />
              {!cameraOn && (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <VideoOff className="h-4 w-4 text-white/60" />
                </div>
              )}
              <button
                onClick={cameraOn ? stopCamera : startCamera}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/90 transition-colors hover:bg-black/80"
              >
                {cameraOn ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              </button>
            </div>

            {/* Intro overlay */}
            {stage === "intro" && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 p-6">
                <div className="w-full max-w-sm animate-fade-up rounded-3xl bg-card/95 p-7 text-center shadow-strong backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Now serving
                  </p>
                  <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground">
                    Window 4 is open.
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {questions.length} questions, a few minutes. Speak your answers
                    out loud if you can. Nerves are allowed; that’s the point.
                  </p>
                  <Button size="lg" className="mt-6 w-full" onClick={begin}>
                    Step up to the window
                  </Button>
                  {!canSpeak() && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Voice isn’t available in this browser, so you’ll read the
                      officer’s questions as captions.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Caption */}
          {stage !== "intro" && displayText && (
            <p
              key={`${index}-${probed}-${stage}`}
              className="font-display mt-7 animate-fade-up text-balance text-center text-xl font-medium leading-snug text-foreground md:text-2xl"
            >
              “{displayText}”
            </p>
          )}

          {/* Answer zone */}
          {stage === "answering" && (
            <div className="mt-6 animate-fade-in">
              {typing ? (
                <div className="mx-auto max-w-xl">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="Say it like you would at the window…"
                    className="w-full resize-none rounded-2xl border border-input bg-card p-4 text-base leading-relaxed text-foreground shadow-soft placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              ) : (
                <div className="flex min-h-[5.5rem] items-center justify-center px-4">
                  <p
                    className={cn(
                      "max-w-xl text-center text-base leading-relaxed",
                      draft ? "text-foreground" : "text-muted-foreground/70",
                    )}
                    aria-live="polite"
                  >
                    {draft ||
                      (listening ? "Listening… take your time." : "Tap the mic and answer out loud.")}
                  </p>
                </div>
              )}

              <div className="mt-5 flex items-center justify-center gap-3">
                {!typing && canListen() && !micError && (
                  <button
                    onClick={listening ? stopMic : startMic}
                    aria-label={listening ? "Stop microphone" : "Start microphone"}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border shadow-medium transition-all duration-300",
                      listening
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-border bg-card text-foreground hover:border-foreground/30",
                    )}
                  >
                    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}

                <Button size="lg" onClick={submitAnswer} disabled={listening && !draft}>
                  Done answering
                </Button>

                {canListen() && !micError && (
                  <button
                    onClick={() => {
                      stopMic();
                      setTyping(!typing);
                    }}
                    aria-label={typing ? "Answer by voice" : "Type your answer"}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {typing ? <Mic className="h-4 w-4" /> : <Keyboard className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === "asking" && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <SpeakingBars active />
              The officer is speaking…
            </p>
          )}

          {stage === "closing" && (
            <p className="mt-6 animate-fade-in text-center text-sm text-muted-foreground">
              Preparing your debrief…
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulatedInterview;
