// Fetches the debrief for a live interview from the Supabase Edge Function
// `report` (GET ?conversation_id=...). Mirrors the function's response shape.

import { functionHeaders, functionUrl } from "@/lib/supabaseApi";

export interface TranscriptTurn {
  role: string;
  content: string;
}

export interface InterviewReport {
  conversation_id: string;
  status: string;
  transcript: TranscriptTurn[];
  perception_analysis: string | null;
  ready: boolean;
}

export const fetchReport = async (
  conversationId: string,
): Promise<InterviewReport> => {
  const url = `${functionUrl("report")}?conversation_id=${encodeURIComponent(conversationId)}`;
  const res = await fetch(url, { headers: functionHeaders() });
  if (!res.ok) {
    throw new Error(`Report request failed (${res.status})`);
  }
  return res.json();
};
