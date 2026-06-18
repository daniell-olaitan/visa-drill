import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLiveAvatarEmbed } from "@/lib/liveavatar";
import type { VisaCategory } from "@/lib/questionBank";

interface LiveAvatarVideoInterviewProps {
  category: VisaCategory;
  /** Receives the Tavus conversation id so the debrief can fetch the report. */
  onComplete: (conversationId: string | null) => void;
  onLeave: () => void;
  /** Called when the embed can't be created, so the caller can fall back. */
  onUnavailable: (reason: string) => void;
}

const LiveAvatarVideoInterview = ({
  category,
  onComplete,
  onLeave,
  onUnavailable,
}: LiveAvatarVideoInterviewProps) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    createLiveAvatarEmbed(category)
      .then((embed) => {
        if (!cancelled) {
          conversationIdRef.current = embed.conversationId ?? null;
          setEmbedUrl(embed.url);
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
  }, [category, onUnavailable]);

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

  useEffect(() => {
    if (embedUrl) startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [embedUrl, startCamera]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onLeave} className="text-muted-foreground">
          Leave
        </Button>
        <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-destructive" />
          Live session
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            stopCamera();
            onComplete(conversationIdRef.current);
          }}
          disabled={loading}
        >
          End interview
        </Button>
      </div>

      <div className="container flex flex-1 flex-col items-center justify-center pb-8">
        <div className="relative w-full max-w-4xl">
          {loading ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card shadow-soft">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">The officer is taking their seat…</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-primary shadow-strong">
              <iframe
                title="Visa interview with the AI consular officer"
                src={embedUrl ?? undefined}
                className="aspect-video w-full border-0 bg-black"
                allow="camera; microphone; fullscreen; autoplay"
                allowFullScreen
              />
              <div
                className={cn(
                  "absolute bottom-3 right-3 w-24 overflow-hidden rounded-xl border border-white/25 bg-black/70 shadow-medium sm:w-32",
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAvatarVideoInterview;
