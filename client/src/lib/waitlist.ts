import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

/*
 * Waitlist with Robinhood-style momentum: position in line plus a referral
 * link that moves you up. Degrades honestly: when the backend isn't deployed
 * we confirm the signup locally and skip the number rather than invent one.
 */

export interface WaitlistResult {
  email: string;
  /** Position in line, when the backend can tell us. */
  position: number | null;
  /** Personal referral code, when the backend can tell us. */
  referralCode: string | null;
  /** True if this email was already on the list. */
  alreadyJoined: boolean;
}

const JOINED_KEY = "visadrill.waitlist";
const REF_KEY = "visadrill.ref";

export const getJoinedState = (): WaitlistResult | null => {
  try {
    return JSON.parse(localStorage.getItem(JOINED_KEY) ?? "null");
  } catch {
    return null;
  }
};

const persist = (result: WaitlistResult): WaitlistResult => {
  localStorage.setItem(JOINED_KEY, JSON.stringify(result));
  return result;
};

/** Capture ?ref=CODE from inbound referral links. */
export const captureReferral = () => {
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code) localStorage.setItem(REF_KEY, code.slice(0, 32));
};

export const getReferralLink = (code: string | null): string => {
  const base = `${window.location.origin}/`;
  return code ? `${base}?ref=${code}` : base;
};

interface JoinRpcResponse {
  position: number;
  referral_code: string;
  already_joined: boolean;
}

export const joinWaitlist = async (rawEmail: string): Promise<WaitlistResult> => {
  const email = rawEmail.trim().toLowerCase();
  const referredBy = localStorage.getItem(REF_KEY);

  if (!isSupabaseConfigured || !supabase) {
    // No backend configured: keep the experience intact, skip the number.
    return persist({ email, position: null, referralCode: null, alreadyJoined: false });
  }

  // Preferred path: RPC that returns position + referral code.
  const { data, error } = await supabase.rpc("join_waitlist", {
    p_email: email,
    p_referred_by: referredBy,
  });

  if (!error && data) {
    const row = data as unknown as JoinRpcResponse;
    return persist({
      email,
      position: row.position ?? null,
      referralCode: row.referral_code ?? null,
      alreadyJoined: Boolean(row.already_joined),
    });
  }

  // Fallback: plain insert for projects that haven't run the latest migration.
  const { error: insertError } = await supabase.from("waitlist").insert({ email });

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  return persist({
    email,
    position: null,
    referralCode: null,
    alreadyJoined: insertError?.code === "23505",
  });
};
