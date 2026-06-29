/*
 * Browser speech: the officer speaks via SpeechSynthesis, the applicant can
 * answer by voice via SpeechRecognition where available. Both degrade
 * silently: captions always show the question, and typing always works.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

const pickVoice = (): SpeechSynthesisVoice | null => {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length === 0) return null; // not cached: voices may load async

  const preferred = [
    /Google US English/i,
    /Microsoft (Guy|Andrew|Christopher|Eric)/i,
    /Samantha/i,
    /Alex/i,
  ];

  for (const pattern of preferred) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith("en"));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  cachedVoice = voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
  return cachedVoice;
};

export const canSpeak = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/** Speak a line as the officer. Resolves when finished (or immediately if unsupported). */
export const speak = (text: string, onBoundary?: () => void): Promise<void> =>
  new Promise((resolve) => {
    if (!canSpeak()) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.98;
    utterance.pitch = 0.92;

    let settled = false;
    const settle = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    utterance.onend = settle;
    utterance.onerror = settle;
    if (onBoundary) utterance.onboundary = onBoundary;

    window.speechSynthesis.speak(utterance);

    // If the engine never starts (no voices installed, headless browser),
    // don't hold the room: fall back to caption-only pacing.
    window.setTimeout(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        settle();
      }
    }, 1000);

    // Safety net: some browsers drop onend entirely.
    const estimatedMs = Math.max(2500, text.length * 90);
    window.setTimeout(settle, estimatedMs + 4000);
  });

export const stopSpeaking = () => {
  if (canSpeak()) window.speechSynthesis.cancel();
};

/* ── Recognition ───────────────────────────────────────────────────────── */

type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

const getRecognitionCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as RecognitionCtor | null;
};

export const canListen = (): boolean => getRecognitionCtor() !== null;

export interface Listener {
  stop: () => void;
  abort: () => void;
}

/**
 * Start listening; emits the running transcript (final + interim) on every
 * result. Auto-restarts on silence until stopped, so long answers survive
 * the engine's pauses.
 */
export const startListening = (
  onTranscript: (finalText: string, interimText: string) => void,
  onError?: (error: string) => void,
): Listener | null => {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = "";
  let active = true;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += `${result[0].transcript} `;
      } else {
        interim += result[0].transcript;
      }
    }
    onTranscript(finalText.trim(), interim.trim());
  };

  recognition.onend = () => {
    // Chrome ends recognition after pauses; restart while the mic is open.
    if (active) {
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      active = false;
      onError?.(event.error);
    }
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      active = false;
      recognition.stop();
    },
    abort: () => {
      active = false;
      recognition.abort();
    },
  };
};
