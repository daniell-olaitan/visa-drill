// Creates a provider conversation for an interview and returns its room URL.
// Replaces the FastAPI POST /api/liveavatar/embed endpoint.
//
// Secrets (set with `supabase secrets set` or in the dashboard):
//   AVATAR_API_KEY, PERSONA_B1B2_ID, PERSONA_F1_ID, PERSONA_H1B_ID,
//   PERSONA_J1_ID, PERSONA_N400_ID, AVATAR_REPLICA_ID, INTERVIEW_DURATION_SECONDS

import { json, preflight } from "../_shared/cors.ts";

const PROVIDER_BASE = "https://tavusapi.com/v2";

type VisaType = "b1b2" | "f1" | "h1b" | "j1" | "n400";
const VISA_TYPES: VisaType[] = ["b1b2", "f1", "h1b", "j1", "n400"];

// Frontend category -> a dedicated officer persona ("any" uses the visitor officer).
const CATEGORY_TO_VISA: Record<string, VisaType> = {
  b1b2: "b1b2",
  f1: "f1",
  h1b: "h1b",
  j1: "j1",
  any: "b1b2",
};

// Per-conversation opening line (the officer does not ask for the applicant's name).
const GREETINGS: Record<VisaType, string> = {
  b1b2: "Good morning. Please state the purpose of your visit to the United States.",
  f1: "Good morning. Please state the university you will be attending.",
  h1b: "Good morning. Please state the name of your U.S. employer.",
  j1: "Good morning. Please state the exchange program you will be joining.",
  n400:
    "Good morning. Before we begin, please raise your right hand. Do you swear or affirm that the statements you will give today will be the truth, the whole truth, and nothing but the truth?",
};

const PERSONA_ENV: Record<VisaType, string> = {
  b1b2: "PERSONA_B1B2_ID",
  f1: "PERSONA_F1_ID",
  h1b: "PERSONA_H1B_ID",
  j1: "PERSONA_J1_ID",
  n400: "PERSONA_N400_ID",
};

const CALL_DURATION_BUFFER_S = 30;
const PARTICIPANT_LEFT_TIMEOUT_S = 10;
const PARTICIPANT_ABSENT_TIMEOUT_S = 60;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("AVATAR_API_KEY");
  if (!apiKey) return json({ error: "AVATAR_API_KEY is not configured" }, 500);

  let body: {
    category?: string;
    visa_type?: string;
    applicant_context?: string | null;
    applicant_id?: string;
    language?: string;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const category = (body.category ?? body.visa_type ?? "b1b2").toLowerCase();
  const visa: VisaType = CATEGORY_TO_VISA[category] ??
    (VISA_TYPES.includes(category as VisaType) ? (category as VisaType) : "b1b2");

  const personaId = Deno.env.get(PERSONA_ENV[visa]);
  if (!personaId) {
    return json({ error: `Persona id for ${visa} is not configured (${PERSONA_ENV[visa]})` }, 500);
  }

  const replicaId = Deno.env.get("AVATAR_REPLICA_ID") ?? "rfb0463909e3";
  const durationSeconds = Number(Deno.env.get("INTERVIEW_DURATION_SECONDS") ?? "240");

  const payload: Record<string, unknown> = {
    persona_id: personaId,
    replica_id: replicaId,
    conversation_name: `VisaDrill ${visa}`,
    custom_greeting: GREETINGS[visa],
    properties: {
      max_call_duration: durationSeconds + CALL_DURATION_BUFFER_S,
      participant_left_timeout: PARTICIPANT_LEFT_TIMEOUT_S,
      participant_absent_timeout: PARTICIPANT_ABSENT_TIMEOUT_S,
      enable_closed_captions: true,
      language: body.language ?? "english",
    },
  };
  if (body.applicant_context) payload.conversational_context = body.applicant_context;
  if (body.applicant_id) payload.memory_stores = [`${body.applicant_id}-${visa}`];

  let res: Response;
  try {
    res = await fetch(`${PROVIDER_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return json({ error: `Provider request failed: ${String(err)}` }, 502);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof data === "object" && data !== null ? JSON.stringify(data) : String(data);
    return json({ error: `Provider error (${res.status}): ${detail}` }, 502);
  }

  const url = (data as Record<string, unknown> | null)?.conversation_url;
  const conversationId = (data as Record<string, unknown> | null)?.conversation_id;
  if (typeof url !== "string" || typeof conversationId !== "string") {
    return json({ error: "Unexpected provider response" }, 502);
  }

  return json({ url, conversation_id: conversationId, max_seconds: durationSeconds });
});
