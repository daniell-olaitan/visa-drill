import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
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
  /** Called when the embed can't be created, so the caller can fall back. */
  onUnavailable: (reason: string) => void;
}

const formatTime = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const LiveAvatarVideoInterview = ({
  category,
  context,
  onComplete,
  onLeave,
  onUnavailable,
}: LiveAvatarVideoInterviewProps) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    createLiveAvatarEmbed(category, context)
      .then((embed) => {
        if (!cancelled) {
          conversationIdRef.current = embed.conversationId ?? null;
          setEmbedUrl(embed.url);
          setSecondsLeft(embed.maxSeconds ?? FALLBACK_SECONDS);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onUnavailable(err instanceof Error ? err.message : "Failed to start the avatar session");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category, context, onUnavailable]);

  // Countdown: ends the interview (and routes to the debrief) when it hits zero.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      onComplete(conversationIdRef.current);
      return;
    }
    const id = window.setTimeout(
      () => setSecondsLeft((s) => (s === null ? null : s - 1)),
      1000,
    );
    return () => window.clearTimeout(id);
  }, [secondsLeft, onComplete]);

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
          disabled={loading}
        >
          End interview
        </Button>
      </div>

      {/* The interview area fills the remaining viewport so Tavus's embedded call
          UI has room to lay out responsively (a fixed 16:9 box squashed it on
          phones). The user's own camera is shown by Tavus inside the iframe, so
          we no longer draw a separate self-view overlay. */}
      <div className="container flex flex-1 flex-col px-2 pb-2 sm:px-4 sm:pb-6">
        <div className="relative mx-auto flex w-full max-w-4xl flex-1">
          {loading ? (
            <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card shadow-soft sm:rounded-3xl">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">The officer is taking their seat…</p>
            </div>
          ) : (
            <div className="relative w-full flex-1 overflow-hidden rounded-2xl bg-primary shadow-strong sm:rounded-3xl">
              <iframe
                title="Visa interview with the AI consular officer"
                src={embedUrl ?? undefined}
                className="absolute inset-0 h-full w-full border-0 bg-black"
                allow="camera; microphone; fullscreen; autoplay"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAvatarVideoInterview;
