// Assembles the post-interview report (transcript + perception) from the verbose
// provider conversation. Replaces the FastAPI GET /api/report/:id endpoint.
//
// Call as: GET <function-url>?conversation_id=<id>  (POST { conversation_id } also works)
// Secret: AVATAR_API_KEY

import { json, preflight } from "../_shared/cors.ts";

const PROVIDER_BASE = "https://tavusapi.com/v2";

// Only genuinely spoken turns belong in the transcript; the provider also emits
// the system prompt and internal context as non-spoken roles.
const SPOKEN_ROLES = new Set(["user", "assistant", "replica", "agent"]);
const MAX_TURN_CHARS = 2000;

interface Turn {
  role: string;
  content: string;
}

function cleanTurns(raw: unknown[]): Turn[] {
  const out: Turn[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const turn = item as Record<string, unknown>;
    const role = String(turn.role ?? "").toLowerCase();
    if (!SPOKEN_ROLES.has(role)) continue;
    const content = String(turn.content ?? turn.speech ?? "").trim();
    if (!content || content.length > MAX_TURN_CHARS) continue;
    const normalized = role === "user" ? "user" : "assistant";
    const last = out[out.length - 1];
    if (last && last.role === normalized && last.content === content) continue;
    out.push({ role: normalized, content });
  }
  return out;
}

function parseEvents(events: unknown[]): { transcript: Turn[]; perception: string | null } {
  let transcript: Turn[] = [];
  const utterances: Record<string, unknown>[] = [];
  let perception: string | null = null;

  for (const ev of events) {
    if (typeof ev !== "object" || ev === null) continue;
    const e = ev as Record<string, unknown>;
    const etype = String(e.event_type ?? e.type ?? "");
    const props = typeof e.properties === "object" && e.properties !== null
      ? (e.properties as Record<string, unknown>)
      : {};

    if (etype.endsWith("transcription_ready")) {
      const turns = props.transcript;
      if (Array.isArray(turns)) {
        const cleaned = cleanTurns(turns);
        if (cleaned.length) transcript = cleaned; // last/most-complete transcript wins
      }
    } else if (etype.endsWith("perception_analysis")) {
      if (typeof props.analysis === "string") perception = props.analysis;
    } else if (etype.endsWith("utterance")) {
      const speech = props.speech ?? props.text;
      if (typeof speech === "string" && speech) {
        utterances.push({ role: props.role ?? "", speech });
      }
    }
  }

  return { transcript: transcript.length ? transcript : cleanTurns(utterances), perception };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();

  const apiKey = Deno.env.get("AVATAR_API_KEY");
  if (!apiKey) return json({ error: "AVATAR_API_KEY is not configured" }, 500);

  let conversationId = new URL(req.url).searchParams.get("conversation_id");
  if (!conversationId && req.method === "POST") {
    const body = await req.json().catch(() => ({})) as { conversation_id?: string };
    conversationId = body.conversation_id ?? null;
  }
  if (!conversationId) return json({ error: "conversation_id is required" }, 400);

  let res: Response;
  try {
    res = await fetch(`${PROVIDER_BASE}/conversations/${conversationId}?verbose=true`, {
      headers: { "x-api-key": apiKey },
    });
  } catch (err) {
    return json({ error: `Provider request failed: ${String(err)}` }, 502);
  }

  const convo = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!res.ok) return json({ error: `Provider error (${res.status})` }, 502);

  const events = Array.isArray(convo?.events) ? (convo!.events as unknown[]) : [];
  const { transcript, perception } = parseEvents(events);

  return json({
    conversation_id: conversationId,
    status: String(convo?.status ?? "unknown"),
    transcript,
    perception_analysis: perception,
    ready: transcript.length > 0 || perception !== null,
  });
});
