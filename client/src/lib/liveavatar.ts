import type { VisaCategory } from "@/lib/questionBank";

export interface LiveAvatarEmbed {
  url: string;
  /** the provider conversation id, used afterwards to fetch the debrief report. */
  conversationId?: string;
  /** Visible interview length in seconds for the countdown timer. */
  maxSeconds?: number;
}

// Served by the FastAPI backend, which creates a provider conversation and returns
// its conversation_url as { url }. Same-origin in production (FastAPI serves the
// SPA); in dev the Vite server proxies /api to the backend.
const EMBED_ENDPOINT =
  (import.meta.env.VITE_LIVEAVATAR_EMBED_URL as string | undefined) ||
  "/api/liveavatar/embed";

export const createLiveAvatarEmbed = async (
  category: VisaCategory,
  applicantContext?: string | null,
): Promise<LiveAvatarEmbed> => {
  const res = await fetch(EMBED_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, applicant_context: applicantContext ?? undefined }),
  });

  let payload:
    | {
        url?: string;
        conversation_id?: string;
        max_seconds?: number;
        error?: string;
      }
    | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.error ?? `Embed request failed (${res.status})`);
  }
  if (!payload?.url) {
    throw new Error("LiveAvatar embed URL was not returned");
  }

  return {
    url: payload.url,
    conversationId: payload.conversation_id,
    maxSeconds: payload.max_seconds,
  };
};
