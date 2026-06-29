// Calls the Supabase Edge Functions that back the app. Both values are public
// (browser-safe) and come from the build env: VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Accept either name: Supabase/Lovable call this the "anon" or "publishable" key.
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

/** Absolute URL of an Edge Function, e.g. functionUrl("report"). */
export function functionUrl(name: string): string {
  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL is not set");
  }
  return `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/${name}`;
}

/** Headers for an Edge Function call (JSON + the public anon key). */
export function functionHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}
