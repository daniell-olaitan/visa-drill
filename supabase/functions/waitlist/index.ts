// Stores a waitlist signup in the `waitlist` table. Replaces FastAPI POST /api/waitlist.
// Uses the auto-injected SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (the service role
// bypasses RLS), so no extra secrets are needed.

import { json, preflight } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return json({ data: null, error: { code: "METHOD", message: "Method not allowed" } }, 405);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@").pop() ?? "" : "";
  if (!email.includes("@") || !domain.includes(".")) {
    return json(
      { data: null, error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(
      { data: null, error: { code: "STORE_FAILED", message: "Storage is not configured." } },
      500,
    );
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    return json(
      { data: null, error: { code: "STORE_FAILED", message: `Could not save your signup: ${String(err)}` } },
      500,
    );
  }

  // 2xx = inserted; 409 = the email is already on the list. Both are fine.
  if (res.ok || res.status === 409) {
    return json({ data: { email }, error: null });
  }
  return json(
    { data: null, error: { code: "STORE_FAILED", message: "Could not save your signup. Please try again." } },
    500,
  );
});
