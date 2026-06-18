// Fetches the Tavus-powered debrief for a live interview from the FastAPI backend
// (GET /api/report/:id). Mirrors the backend ReportResponse shape.

export interface TranscriptTurn {
  role: string;
  content: string;
}

export interface InterviewReport {
  conversation_id: string;
  status: string;
  transcript: TranscriptTurn[];
  perception_analysis: string | null;
  recording_url: string | null;
  ready: boolean;
}

export const fetchReport = async (
  conversationId: string,
): Promise<InterviewReport> => {
  const res = await fetch(`/api/report/${conversationId}`);
  if (!res.ok) {
    throw new Error(`Report request failed (${res.status})`);
  }
  return res.json();
};
