import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLiveAvatarEmbed } from "@/lib/liveavatar";
import type { VisaCategory } from "@/lib/questionBank";

const FALLBACK_SECONDS = 240;

interface LiveAvatarVideoInterviewProps {
  category: VisaCategory;
  /** Optional applicant pre-form context, passed to the officer. */
  context?: string | null;
  /** Receives the provider conversation id so the debrief can fetch the report. */
  onComplete: (conversationId: string | null) => void;
  onLeave: () => void;
  /** Called when the call can't be created, so the caller can fall back. */
  onUnavailable: (reason: string) => void;
}

const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Renders the interview with the WebRTC SDK (not an iframe) so we control
 * the layout: the officer fills the card and the applicant's self-view is a small
 * PiP we size ourselves - fully responsive on mobile. We also manage audio, which
 * iOS may block until a tap, hence the "tap to hear the officer" fallback.
 */
const LiveAvatarVideoInterview = ({
  category,
  context,
  onComplete,
  onLeave,
  onUnavailable,
}: LiveAvatarVideoInterviewProps) => {
  const [status, setStatus] = useState<"connecting" | "live">("connecting");
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [caption, setCaption] = useState<{ role: "user" | "officer"; text: string } | null>(null);

  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const officerVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);
  const startedRef = useRef(false);
  const captionTimerRef = useRef<number | null>(null);

  const playAudio = useCallback(() => {
    let blocked = false;
    for (const el of audioElsRef.current) {
      el.play().catch(() => {
        blocked = true;
      });
    }
    setAudioBlocked(blocked);
  }, []);

  useEffect(() => {
    if (startedRef.current) return; // guard against StrictMode double-invoke in dev
    startedRef.current = true;
    let cancelled = false;

    const cleanup = async () => {
      if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current);
      for (const el of audioElsRef.current) {
        el.srcObject = null;
        el.remove();
      }
      audioElsRef.current = [];
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        try {
          await call.leave();
        } catch {}
        try {
          call.destroy();
        } catch {}
      }
    };

    const attach = (track: MediaStreamTrack, isLocal: boolean) => {
      if (track.kind === "video") {
        const el = isLocal ? localVideoRef.current : officerVideoRef.current;
        if (el) el.srcObject = new MediaStream([track]);
        if (!isLocal) setStatus("live");
      } else if (track.kind === "audio" && !isLocal) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.srcObject = new MediaStream([track]);
        document.body.appendChild(el);
        audioElsRef.current.push(el);
        el.play().catch(() => setAudioBlocked(true));
      }
    };

    (async () => {
      let embed: Awaited<ReturnType<typeof createLiveAvatarEmbed>>;
      try {
        embed = await createLiveAvatarEmbed(category, context);
      } catch (err) {
        if (!cancelled) {
          onUnavailable(err instanceof Error ? err.message : "Failed to start the avatar session");
        }
        return;
      }
      if (cancelled) return;
      conversationIdRef.current = embed.conversationId ?? null;
      setDurationSeconds(embed.maxSeconds ?? FALLBACK_SECONDS);

      let call: DailyCall;
      try {
        call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true });
      } catch {
        if (!cancelled) onUnavailable("Could not initialize the call.");
        return;
      }
      callRef.current = call;

      call.on("track-started", (ev) => {
        if (ev?.track) attach(ev.track, Boolean(ev.participant?.local));
      });

      // Live captions: the provider streams spoken text over the data channel.
      call.on("app-message", (ev) => {
        const msg = ev?.data as
          | { event_type?: string; properties?: { role?: string; speech?: string; text?: string } }
          | undefined;
        if (!msg || !String(msg.event_type ?? "").includes("utterance")) return;
        const props = msg.properties ?? {};
        const text =
          typeof props.speech === "string"
            ? props.speech
            : typeof props.text === "string"
              ? props.text
              : "";
        if (!text.trim()) return;
        setCaption({ role: props.role === "user" ? "user" : "officer", text });
        if (captionTimerRef.current !== null) window.clearTimeout(captionTimerRef.current);
        captionTimerRef.current = window.setTimeout(() => setCaption(null), 6000);
      });

      try {
        await call.join({ url: embed.url });
      } catch {
        await cleanup();
        if (!cancelled) onUnavailable("The connection dropped. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [category, context, onUnavailable]);

  // Start the countdown only once the officer is actually live, so the wait while
  // they "take their seat" does not eat into the interview (or your minutes).
  useEffect(() => {
    if (status === "live" && secondsLeft === null && durationSeconds !== null) {
      setSecondsLeft(durationSeconds);
    }
  }, [status, secondsLeft, durationSeconds]);

  // Countdown: ends the interview (routes to debrief) when it elapses.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      onComplete(conversationIdRef.current);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, onComplete]);

  const toggleMic = () => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalAudio(!micOn);
    setMicOn((m) => !m);
  };

  const toggleCam = () => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalVideo(!camOn);
    setCamOn((c) => !c);
  };

  const lowTime = secondsLeft !== null && secondsLeft <= 30;
  const displaySeconds = secondsLeft ?? durationSeconds;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="container flex h-14 shrink-0 items-center justify-between gap-2 sm:h-16">
        <Button variant="ghost" size="sm" onClick={onLeave} className="text-muted-foreground">
          Leave
        </Button>
        <span
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
            lowTime
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-destructive" />
          {displaySeconds !== null ? formatTime(displaySeconds) : "Live"}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onComplete(conversationIdRef.current)}
          disabled={status === "connecting"}
        >
          End interview
        </Button>
      </div>

      <div className="container flex flex-1 flex-col px-2 pb-2 sm:px-4 sm:pb-6">
        <div className="relative mx-auto flex w-full max-w-4xl flex-1">
          <div className="relative w-full flex-1 overflow-hidden rounded-2xl bg-black shadow-strong sm:rounded-3xl">
            {/* Officer */}
            <video
              ref={officerVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full bg-black object-cover"
            />

            {status === "connecting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">The officer is taking their seat…</p>
              </div>
            )}

            {/* iOS audio unlock */}
            {audioBlocked && (
              <button
                onClick={playAudio}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60 text-white"
              >
                <Volume2 className="h-7 w-7" />
                <span className="text-sm font-medium">Tap to hear the officer</span>
              </button>
            )}

            {/* Self-view PiP */}
            <div className="absolute bottom-3 right-3 w-24 overflow-hidden rounded-xl border border-white/25 bg-black/70 shadow-medium sm:w-32">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={cn("aspect-[3/4] w-full scale-x-[-1] object-cover sm:aspect-square", !camOn && "hidden")}
              />
              {!camOn && (
                <div className="flex aspect-[3/4] items-center justify-center sm:aspect-square">
                  <VideoOff className="h-4 w-4 text-white/60" />
                </div>
              )}
            </div>

            {/* Live captions */}
            {captionsOn && caption && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center pl-3 pr-28 sm:px-3">
                <p className="max-h-32 max-w-2xl overflow-y-auto rounded-lg bg-black/70 px-3 py-1.5 text-center text-sm leading-snug text-white">
                  <span className="font-semibold text-white/60">
                    {caption.role === "user" ? "You: " : "Officer: "}
                  </span>
                  {caption.text}
                </p>
              </div>
            )}

            {/* Controls */}
            {status === "live" && (
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                <button
                  onClick={toggleMic}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-destructive" />}
                </button>
                <button
                  onClick={toggleCam}
                  aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
                >
                  {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-destructive" />}
                </button>
                <button
                  onClick={() => setCaptionsOn((c) => !c)}
                  aria-label={captionsOn ? "Hide captions" : "Show captions"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-black/80"
                >
                  <span className={cn(!captionsOn && "opacity-40")}>CC</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAvatarVideoInterview;
