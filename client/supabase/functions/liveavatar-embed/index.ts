import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LIVEAVATAR_API = "https://api.liveavatar.com";

// "Dexter Lawyer" present avatar — the default consular-officer face.
const DEFAULT_AVATAR_ID = "0930fd59-c8ad-434d-ad53-b391a1768720";
// Embed sandbox avatar: free, ~1 min sessions, no credits consumed.
const SANDBOX_AVATAR_ID = "65f9e3c9-d48b-4118-b73a-4ae2e3cbb8f0";

const OFFICER_PROMPT = [
  "You are a U.S. consular officer conducting a nonimmigrant visa interview at a",
  "U.S. embassy. Stay strictly in character as the officer for the entire",
  "conversation. Open by greeting the applicant briefly and asking the purpose of",
  "their trip to the United States. Ask ONE concise question at a time, then wait",
  "for the answer. Move, roughly in order, through: purpose of travel, the",
  "specifics of the trip, finances and who is paying, ties to the home country",
  "that will bring them back, and any prior travel history. When an answer is",
  "vague, press for specifics — names, numbers, dates. Keep a calm, professional,",
  "slightly clipped tone: courteous but not chatty. Do not give legal advice, do",
  "not coach the applicant, and do not state whether the visa is approved. After",
  "roughly 8 to 10 questions, thank them and say the decision will follow. Never",
  "break character.",
].join(" ");

// Created once per warm instance, then reused for every embed.
let cachedContextId: string | null = null;

const ensureContext = async (apiKey: string): Promise<string> => {
  const configured = Deno.env.get("LIVEAVATAR_CONTEXT_ID");
  if (configured) return configured;
  if (cachedContextId) return cachedContextId;

  const res = await fetch(`${LIVEAVATAR_API}/v1/contexts`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "US Consular Officer", prompt: OFFICER_PROMPT }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message ?? `Failed to create context (${res.status})`);
  }
  const id = payload?.data?.id ?? payload?.data?.context_id ?? payload?.data?.contextId;
  if (!id) throw new Error("LiveAvatar did not return a context id");
  cachedContextId = id;
  return id;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("LIVEAVATAR_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "LIVEAVATAR_API_KEY secret is not set." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const isSandbox = Deno.env.get("LIVEAVATAR_IS_SANDBOX") === "true";
    const avatarId =
      Deno.env.get("LIVEAVATAR_AVATAR_ID") ||
      (isSandbox ? SANDBOX_AVATAR_ID : DEFAULT_AVATAR_ID);
    const contextId = await ensureContext(apiKey);

    const embedRes = await fetch(`${LIVEAVATAR_API}/v2/embeddings`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        avatar_id: avatarId,
        context_id: contextId,
        is_sandbox: isSandbox,
        orientation: "horizontal",
      }),
    });
    const payload = await embedRes.json().catch(() => null);
    if (!embedRes.ok) {
      return new Response(
        JSON.stringify({
          error: payload?.message ?? "Failed to create LiveAvatar embed",
        }),
        {
          status: embedRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = payload?.data?.url;
    if (!url) {
      return new Response(
        JSON.stringify({ error: "LiveAvatar did not return an embed URL" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
