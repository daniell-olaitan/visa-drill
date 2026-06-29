import {
  PHASE_LABELS,
  QUESTION_BANK,
  type InterviewPhase,
  type Question,
  type VisaCategory,
} from "@/lib/questionBank";

/* ── Session construction ──────────────────────────────────────────────── */

const PHASE_ORDER: InterviewPhase[] = [
  "purpose",
  "specifics",
  "finances",
  "ties",
  "history",
  "credibility",
];

/** How many questions to draw per phase: mirrors the arc of a real interview. */
const PHASE_QUOTA: Record<InterviewPhase, number> = {
  purpose: 1,
  specifics: 2,
  finances: 2,
  ties: 2,
  history: 1,
  credibility: 2,
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const buildSession = (category: VisaCategory): Question[] => {
  const pool = QUESTION_BANK.filter(
    (q) => q.categories.includes(category) || q.categories.includes("any"),
  );

  const session: Question[] = [];
  for (const phase of PHASE_ORDER) {
    const phaseQuestions = shuffle(pool.filter((q) => q.phase === phase));
    // Category-specific questions take priority over generic ones.
    phaseQuestions.sort(
      (a, b) =>
        Number(b.categories.includes(category)) - Number(a.categories.includes(category)),
    );
    session.push(...phaseQuestions.slice(0, PHASE_QUOTA[phase]));
  }
  return session;
};

/* ── Answer analysis ───────────────────────────────────────────────────────
 * Honest heuristics, not magic. We look for the same surface signals a
 * listener picks up in the first seconds: specificity, length, hedging,
 * and whether the answer touches what the question is actually probing.
 */

export interface AnswerRecord {
  questionId: string;
  answer: string;
  /** Seconds the user took to answer. */
  durationSec: number;
  /** True when the answer came in by voice rather than typing. */
  spoken: boolean;
}

export interface AnswerNotes {
  landed: string[];
  tighten: string[];
  /** 0..3 rough strength used for the overall summary. */
  strength: number;
}

const HEDGES = [
  "maybe",
  "i think",
  "i guess",
  "probably",
  "not sure",
  "kind of",
  "sort of",
  "hopefully",
  "i'll try",
  "possibly",
];

const FILLERS = ["um", "uh", "erm", "uhh", "umm", "you know"];

const PHASE_EXPECTATIONS: Record<
  InterviewPhase,
  { pattern: RegExp; missing: string; present: string }
> = {
  purpose: {
    pattern:
      /\b(conference|graduation|wedding|university|program|degree|meeting|vacation|visit(ing)?|tour|treatment|training|project|semester|master|bachelor|phd|intern)\b/i,
    missing:
      "The purpose never got a concrete anchor. Name the specific event, program, or plan in your first sentence.",
    present: "You anchored the purpose to something concrete. That is exactly what officers listen for first.",
  },
  specifics: {
    pattern: /\b(week|month|day|hotel|airbnb|stay|booked|campus|city|january|february|march|april|may|june|july|august|september|october|november|december|\d)\b/i,
    missing:
      "Plans stayed abstract. Real trips have dates, places, and durations; work one in.",
    present: "You gave real logistics: dates, places, durations. That reads as a genuine plan.",
  },
  finances: {
    pattern: /\b(salary|savings|sponsor|scholarship|income|earn|company|employer|business|fund|paid|\$|₦|€|£|₹|\d)\b/i,
    missing:
      "No source or number came through. Money answers need a who and a how much.",
    present: "You named the source of funds and grounded it. Funding answers live or die on that.",
  },
  ties: {
    pattern:
      /\b(job|work|employ|family|wife|husband|children|kids|parents|son|daughter|property|house|apartment|business|company|degree|studies|return|back home|lease|farm)\b/i,
    missing:
      "No concrete anchor to home came through. Lead with your strongest tie: a job, family, property, or studies.",
    present: "You named real anchors at home. This is the heart of 214(b), and you addressed it head-on.",
  },
  history: {
    pattern: /\b(20\d\d|19\d\d|never|no previous|first time|returned|came back|visa)\b/i,
    missing:
      "Travel history wants years and outcomes: where, when, and that you came back.",
    present: "You gave a dated history with returns. Patterns of coming back build trust fast.",
  },
  credibility: {
    pattern: /\b(because|job|family|return|home|leave|plan|continue|reapply|business|studies)\b/i,
    missing:
      "Pressure questions need a reason, not a reaction. Give the one concrete fact that makes your story hold.",
    present: "You stayed in the facts under pressure instead of pleading. That composure is the whole test.",
  },
};

const countMatches = (text: string, terms: string[]): number =>
  terms.reduce((count, term) => {
    const pattern = new RegExp(`\\b${term.replace(/'/g, "'?")}\\b`, "gi");
    return count + (text.match(pattern)?.length ?? 0);
  }, 0);

const specificityScore = (text: string): number => {
  const digits = (text.match(/\d+/g) ?? []).length;
  const months =
    (text.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    ) ?? []).length;
  const currency = (text.match(/[$€£₦₹]|\b(dollars|naira|rupees|euros|pounds)\b/gi) ?? []).length;
  // Proper-noun-ish: capitalized words not at the start of a sentence.
  const properNouns = (text.match(/(?<![.!?]\s)(?<!^)\b[A-Z][a-z]{2,}/g) ?? []).length;
  return digits + months + currency + Math.min(properNouns, 4);
};

export const analyzeAnswer = (question: Question, record: AnswerRecord): AnswerNotes => {
  const text = record.answer.trim();
  const words = text.length === 0 ? 0 : text.split(/\s+/).length;
  const landed: string[] = [];
  const tighten: string[] = [];
  let strength = 0;

  if (words === 0) {
    return {
      landed: [],
      tighten: [
        "No answer was recorded. In the booth, silence is read as unpreparedness. Even a simple, direct sentence is better than freezing.",
      ],
      strength: 0,
    };
  }

  // Length: real consular answers are 1-3 tight sentences.
  if (words < 6) {
    tighten.push(
      "This was too thin. One-word and fragment answers force the officer to dig, and digging rarely helps you. Aim for one or two complete sentences.",
    );
  } else if (words > 90) {
    tighten.push(
      "This ran long. Officers decide in minutes and long answers bury your strongest fact. Lead with it, then stop.",
    );
  } else {
    landed.push("Good length. You answered in the short, complete way the format demands.");
    strength += 1;
  }

  // Specificity.
  const specificity = specificityScore(text);
  if (specificity >= 3) {
    landed.push(
      "Strong specifics: names, numbers, and dates. Concrete details are what separate a story from a claim.",
    );
    strength += 1;
  } else if (specificity === 0 && words >= 6) {
    tighten.push(
      "No names, numbers, or dates came through. Add one verifiable detail; specificity is the cheapest credibility you can buy.",
    );
  }

  // Phase expectation.
  const expectation = PHASE_EXPECTATIONS[question.phase];
  if (expectation.pattern.test(text)) {
    landed.push(expectation.present);
    strength += 1;
  } else {
    tighten.push(expectation.missing);
  }

  // Hedging.
  const hedges = countMatches(text, HEDGES);
  if (hedges >= 2) {
    tighten.push(
      `Hedging language appeared ${hedges} times (“maybe”, “I think”, “probably”). Soft language reads as an unsettled plan. State it as fact or restructure the sentence.`,
    );
  }

  // Fillers, only meaningful for spoken answers.
  if (record.spoken) {
    const fillers = countMatches(text, FILLERS);
    if (fillers >= 3) {
      tighten.push(
        "Several filler sounds came through. A short pause beats a filled one; silence reads as thought, “um” reads as doubt.",
      );
    }
  }

  // Pacing.
  if (record.durationSec > 60) {
    tighten.push(
      "You took over a minute on this one. The whole real interview is often three minutes; practice landing each answer in 20 to 30 seconds.",
    );
  }

  return { landed, tighten, strength: Math.min(strength, 3) };
};

/* ── Session debrief ───────────────────────────────────────────────────── */

export interface QuestionDebrief {
  question: Question;
  record: AnswerRecord;
  notes: AnswerNotes;
}

export interface SessionDebrief {
  items: QuestionDebrief[];
  strongestId: string | null;
  headline: string;
  summary: string;
  focus: string;
}

export const buildDebrief = (
  questions: Question[],
  records: AnswerRecord[],
): SessionDebrief => {
  const items = questions
    .map((question) => {
      const record = records.find((r) => r.questionId === question.id);
      if (!record) return null;
      return { question, record, notes: analyzeAnswer(question, record) };
    })
    .filter((item): item is QuestionDebrief => item !== null);

  const answered = items.filter((i) => i.record.answer.trim().length > 0);
  const strong = answered.filter((i) => i.notes.strength >= 2);
  const strongest =
    [...answered].sort((a, b) => b.notes.strength - a.notes.strength)[0] ?? null;

  // Find the most common phase with weak answers to set a focus.
  const weakByPhase = new Map<InterviewPhase, number>();
  for (const item of items) {
    if (item.notes.strength <= 1) {
      weakByPhase.set(
        item.question.phase,
        (weakByPhase.get(item.question.phase) ?? 0) + 1,
      );
    }
  }
  const weakestPhase = [...weakByPhase.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  let headline: string;
  let summary: string;

  if (answered.length === 0) {
    headline = "You showed up. Now let’s hear you.";
    summary =
      "No answers were recorded this session. That’s fine for a first look around, but the gains come from hearing yourself respond out loud. Run it again and answer every question, even imperfectly.";
  } else if (strong.length >= Math.ceil(answered.length * 0.7)) {
    headline = "You’d walk out of that booth feeling good.";
    summary = `You answered ${answered.length} questions and most of them landed: specific, right-sized, and on point. The remaining notes below are polish, not surgery.`;
  } else if (strong.length >= Math.ceil(answered.length * 0.4)) {
    headline = "The story is there. The delivery needs reps.";
    summary = `${strong.length} of your ${answered.length} answers landed cleanly. The pattern in the rest is fixable with practice, and none of it means your case is weak. It means your phrasing hasn’t caught up to your facts yet.`;
  } else {
    headline = "Rough rep. Exactly why you practice here, not there.";
    summary = `Most answers this round stayed vague or thin. That’s the most common reason real applicants get refused, and it is also the most learnable thing in this entire process. Read the notes, then run it again.`;
  }

  const focus = weakestPhase
    ? `Focus for your next rep: ${PHASE_LABELS[weakestPhase].toLowerCase()}. That’s where your answers most often lost their footing.`
    : "Next rep: same questions, tighter answers. Lead with your strongest fact and stop talking sooner.";

  return {
    items,
    strongestId: strongest?.question.id ?? null,
    headline,
    summary,
    focus,
  };
};
