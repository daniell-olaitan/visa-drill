import type { Question, VisaCategory } from "@/lib/questionBank";
import type { AnswerRecord } from "@/lib/interviewEngine";

/**
 * A completed practice session, stored locally. Nothing leaves the browser:
 * users rehearse their real circumstances here, so transcripts stay on-device.
 */
export interface StoredSession {
  category: VisaCategory;
  mode: "simulator" | "liveavatar";
  startedAt: string;
  endedAt: string;
  questions: Question[];
  records: AnswerRecord[];
  /** Tavus conversation id for live sessions, used to fetch the debrief report. */
  liveConversationId?: string;
}

const SESSION_KEY = "facedrill.session";
const CATEGORY_KEY = "facedrill.category";

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
