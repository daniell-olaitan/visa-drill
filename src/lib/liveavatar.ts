import type { VisaCategory } from "@/lib/questionBank";
import { functionHeaders, functionUrl } from "@/lib/supabaseApi";

export interface LiveAvatarEmbed {
  url: string;
  /** the provider conversation id, used afterwards to fetch the debrief report. */
  conversationId?: string;
  /** Visible interview length in seconds for the countdown timer. */
  maxSeconds?: number;
}

// Calls the Supabase Edge Function `start-session`, which creates a provider
// conversation and returns its room URL as { url }.
export const createLiveAvatarEmbed = async (
  category: VisaCategory,
  applicantContext?: string | null,
): Promise<LiveAvatarEmbed> => {
  const res = await fetch(functionUrl("start-session"), {
    method: "POST",
    headers: functionHeaders(),
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
    throw new Error("Live interview URL was not returned");
  }

  return {
    url: payload.url,
    conversationId: payload.conversation_id,
    maxSeconds: payload.max_seconds,
  };
};
