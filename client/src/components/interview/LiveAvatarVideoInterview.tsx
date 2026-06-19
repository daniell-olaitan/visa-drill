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
  /** Receives the Tavus conversation id so the debrief can fetch the report. */
  onComplete: (conversationId: string | null) => void;
  onLeave: () => void;
  /** Called when the call can't be created, so the caller can fall back. */
  onUnavailable: (reason: string) => void;
}

const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Renders the Tavus interview with the Daily SDK (not an iframe) so we control
 * the layout: the officer fills the card and the applicant's self-view is a small
 * PiP we size ourselves — fully responsive on mobile. We also manage audio, which
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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const officerVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);
  const startedRef = useRef(false);

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
      setSecondsLeft(embed.maxSeconds ?? FALLBACK_SECONDS);

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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
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
          {secondsLeft !== null ? formatTime(secondsLeft) : "Live"}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAvatarVideoInterview;
