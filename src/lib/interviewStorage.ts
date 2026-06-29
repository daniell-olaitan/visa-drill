import type { Question, VisaCategory } from "@/lib/questionBank";
import type { AnswerRecord } from "@/lib/interviewEngine";

/**
 * A completed practice session, stored locally. Nothing leaves the browser:
 * users rehearse their real circumstances here, so transcripts stay on-device.
 */
/** Optional "DS-160-lite" details the applicant gives before a live interview. */
export interface PrepAnswers {
  purpose?: string;
  funding?: string;
  occupation?: string;
  ties?: string;
  priorTravel?: string;
}

export interface StoredSession {
  category: VisaCategory;
  mode: "simulator" | "liveavatar";
  startedAt: string;
  endedAt: string;
  questions: Question[];
  records: AnswerRecord[];
  /** the provider conversation id for live sessions, used to fetch the debrief report. */
  liveConversationId?: string;
  /** Pre-interview form answers, when the applicant filled them in. */
  prep?: PrepAnswers;
}

const SESSION_KEY = "visadrill.session";
const CATEGORY_KEY = "visadrill.category";
const LAST_SCORE_KEY = "visadrill.lastLiveScore";

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const saveSession = (session: StoredSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getStoredSession = (): StoredSession | null =>
  safeParse<StoredSession>(localStorage.getItem(SESSION_KEY));

export const saveCategory = (category: VisaCategory) => {
  localStorage.setItem(CATEGORY_KEY, category);
};

export const getStoredCategory = (): VisaCategory | null =>
  (localStorage.getItem(CATEGORY_KEY) as VisaCategory | null) ?? null;

/** Readiness score (0-100) from the previous live debrief, for progress tracking. */
export const getLastLiveScore = (): number | null => {
  const raw = localStorage.getItem(LAST_SCORE_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const setLastLiveScore = (score: number): void => {
  localStorage.setItem(LAST_SCORE_KEY, String(score));
};
