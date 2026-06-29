// iOS Safari blocks audio playback until the user interacts with the page. We
// call this inside a real user gesture (the pre-interview button tap) to "unlock"
// audio, so the officer's voice can autoplay afterwards - the same approach the
// the avatar "join" tap used. Safe to call multiple times; it no-ops after the
// first success.

// A tiny, valid, silent WAV (zero samples) used only to satisfy the gesture.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

let unlocked = false;

export const unlockAudio = (): void => {
  if (unlocked) return;
  try {
    const audio = new Audio(SILENT_WAV);
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        unlocked = true;
      })
      .catch(() => {
        /* still blocked; the in-call fallback button will handle it */
      });

    // Also resume a Web Audio context, which some browsers gate separately.
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      void ctx.resume().catch(() => undefined);
    }
  } catch {
    /* ignore: the in-call "tap to hear" fallback remains */
  }
};
