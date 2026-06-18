import type { VisaCategory } from "@/lib/questionBank";

export interface LiveAvatarEmbed {
  url: string;
  /** Tavus conversation id, used afterwards to fetch the debrief report. */
  conversationId?: string;
}

// Served by the FastAPI backend, which creates a Tavus conversation and returns
// its conversation_url as { url }. Same-origin in production (FastAPI serves the
// SPA); in dev the Vite server proxies /api to the backend.
const EMBED_ENDPOINT =
  (import.meta.env.VITE_LIVEAVATAR_EMBED_URL as string | undefined) ||
  "/api/liveavatar/embed";

export const createLiveAvatarEmbed = async (
  category: VisaCategory,
): Promise<LiveAvatarEmbed> => {
  const res = await fetch(EMBED_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });

  let payload: { url?: string; conversation_id?: string; error?: string } | null = null;
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

  return { url: payload.url, conversationId: payload.conversation_id };
};
