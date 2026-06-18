/*
 * The FaceDrill question bank.
 *
 * Built from the structure consular officers actually use. Under INA 214(b),
 * every nonimmigrant applicant is presumed to be an intending immigrant until
 * they prove otherwise, so the interview probes three things: ties to home,
 * a clear and specific purpose, and consistency with what was filed. Real
 * interviews run 3 to 5 minutes and follow a predictable arc: purpose,
 * specifics, finances, ties, history, then credibility follow-ups.
 */

export type VisaCategory = "b1b2" | "f1" | "h1b" | "j1" | "any";

export type InterviewPhase =
  | "purpose"
  | "specifics"
  | "finances"
  | "ties"
  | "history"
  | "credibility";

export interface Question {
  id: string;
  text: string;
  phase: InterviewPhase;
  categories: VisaCategory[];
  /** What the officer is actually evaluating with this question. */
  listensFor: string;
  /** Coach guidance shown in the debrief. */
  coachTip: string;
}

export const PHASE_LABELS: Record<InterviewPhase, string> = {
  purpose: "Purpose of visit",
  specifics: "Your plans",
  finances: "Finances",
  ties: "Ties to home",
  history: "Travel history",
  credibility: "Credibility check",
};

export const CATEGORY_LABELS: Record<Exclude<VisaCategory, "any">, string> = {
  b1b2: "Visitor (B1/B2)",
  f1: "Student (F1)",
  h1b: "Work (H-1B)",
  j1: "Exchange (J-1)",
};

export const QUESTION_BANK: Question[] = [
  // ── Purpose ──────────────────────────────────────────────────────────────
  {
    id: "purpose-visit",
    text: "What is the purpose of your visit to the United States?",
    phase: "purpose",
    categories: ["b1b2", "h1b", "j1", "any"],
    listensFor:
      "One clear purpose, stated without hesitation. Vague or stacked reasons read as an unprepared or evasive applicant.",
    coachTip:
      "Answer in one sentence with a specific anchor: an event, a place, a date. “I’m attending my sister’s graduation at Ohio State on May 9th” beats “tourism and visiting family.”",
  },
  {
    id: "purpose-study",
    text: "Why do you want to study in the United States?",
    phase: "purpose",
    categories: ["f1"],
    listensFor:
      "A reason tied to your specific program and goals, not generic praise of America or US universities.",
    coachTip:
      "Name what the program gives you that you can’t get at home: a lab, a faculty member, a curriculum. Connect it to a job you want back home.",
  },
  {
    id: "purpose-employer",
    text: "Who will you be working for, and what will you be doing?",
    phase: "purpose",
    categories: ["h1b"],
    listensFor:
      "Fluency about your own job: employer name, role, and what the work actually involves.",
    coachTip:
      "Say the company name, your title, and one plain-language line about the work. If you can’t describe your own job simply, the officer notices.",
  },
  {
    id: "purpose-program",
    text: "Tell me about the exchange program you were accepted into.",
    phase: "purpose",
    categories: ["j1"],
    listensFor:
      "That you understand your own program: the sponsor, the duration, and what you will be doing.",
    coachTip:
      "Name the sponsor organization, the program length, and your role in it. One sentence each.",
  },

  // ── Specifics ────────────────────────────────────────────────────────────
  {
    id: "spec-duration",
    text: "How long do you plan to stay?",
    phase: "specifics",
    categories: ["b1b2", "j1", "any"],
    listensFor:
      "A defined, bounded trip. Open-ended stays suggest you may not leave.",
    coachTip:
      "Give an exact length and tie it to something fixed: “Two weeks. I’m back on June 21st because my leave ends and I resume work on the 23rd.”",
  },
  {
    id: "spec-stay",
    text: "Where will you be staying?",
    phase: "specifics",
    categories: ["b1b2", "any"],
    listensFor:
      "That real plans exist. People with genuine short trips know where they are sleeping.",
    coachTip:
      "Name the city and the arrangement: a booked hotel, or a named relative and their relationship to you. Don’t recite a street address from memory unless asked.",
  },
  {
    id: "spec-know-us",
    text: "Who do you know in the United States?",
    phase: "specifics",
    categories: ["b1b2", "any"],
    listensFor:
      "Honesty and consistency with your DS-160. Hiding relatives is far worse than having them.",
    coachTip:
      "Answer exactly what you declared on your form. If you have family there, say so plainly and move on. Inconsistency is the killer, not the relatives.",
  },
  {
    id: "spec-university-why",
    text: "Why did you choose this particular university?",
    phase: "specifics",
    categories: ["f1"],
    listensFor:
      "Evidence you chose a school, not just an admission letter. Generic answers suggest an agent chose it for you.",
    coachTip:
      "Give two specific reasons: a course, a professor, a ranking in your field, a co-op program. Specifics signal it was your decision.",
  },
  {
    id: "spec-universities-applied",
    text: "How many universities did you apply to, and how many admitted you?",
    phase: "specifics",
    categories: ["f1"],
    listensFor:
      "A credible application story. Officers cross-check this against your profile.",
    coachTip:
      "State the numbers plainly, including rejections. “I applied to six, got into three, and chose this one because…” reads as honest and deliberate.",
  },
  {
    id: "spec-program-content",
    text: "What will you study, and what does the program involve?",
    phase: "specifics",
    categories: ["f1"],
    listensFor:
      "That you know your own course. Students who can’t describe their program raise immediate doubt.",
    coachTip:
      "Name the degree, one or two core areas, and the length. You don’t need the whole syllabus, you need to sound like you read it.",
  },
  {
    id: "spec-itinerary",
    text: "What places do you plan to visit while you’re there?",
    phase: "specifics",
    categories: ["b1b2"],
    listensFor:
      "A trip that matches your stated purpose and budget.",
    coachTip:
      "Two or three concrete stops are enough. A modest, specific itinerary beats an impressive vague one.",
  },

  // ── Finances ─────────────────────────────────────────────────────────────
  {
    id: "fin-sponsor",
    text: "Who is paying for your trip?",
    phase: "finances",
    categories: ["b1b2", "j1", "any"],
    listensFor:
      "A funding source that makes sense for the trip’s cost and your income.",
    coachTip:
      "Name the source and the rough amount: “I am. I’ve saved about $4,000 for this trip from my salary.” If someone sponsors you, say who and why that’s normal.",
  },
  {
    id: "fin-occupation",
    text: "What do you do for a living?",
    phase: "finances",
    categories: ["b1b2", "h1b", "j1", "any"],
    listensFor:
      "A stable economic life you would not abandon. This is a ties question wearing a finance hat.",
    coachTip:
      "Title, employer, and how long you’ve been there. “I’m a senior accountant at Zenith Bank, six years now” does more work than any document.",
  },
  {
    id: "fin-income",
    text: "What is your monthly income?",
    phase: "finances",
    categories: ["b1b2", "any"],
    listensFor:
      "A number, stated comfortably, that squares with your trip cost and bank statements.",
    coachTip:
      "Say the number without flinching, in your currency or dollars. Hesitating over your own salary reads worse than a modest figure.",
  },
  {
    id: "fin-edu-sponsor",
    text: "Who is sponsoring your education?",
    phase: "finances",
    categories: ["f1"],
    listensFor:
      "Funding that adds up across all years, not just the first one, and a sponsor whose finances make it plausible.",
    coachTip:
      "Name the sponsor, their relationship to you, what they do, and the coverage: “My father, who runs a construction firm. Tuition is $32,000 a year and his business covers it, plus a $10,000 scholarship.”",
  },
  {
    id: "fin-sponsor-work",
    text: "What does your sponsor do for a living?",
    phase: "finances",
    categories: ["f1"],
    listensFor:
      "That the sponsorship story holds together. Students who don’t know how their funding works raise doubt.",
    coachTip:
      "Be concrete about the work and comfortable with the income range. You should know your own funding cold.",
  },

  // ── Ties to home ─────────────────────────────────────────────────────────
  {
    id: "ties-return",
    text: "What ties do you have to your home country?",
    phase: "ties",
    categories: ["b1b2", "h1b", "j1", "any"],
    listensFor:
      "The core 214(b) question. Concrete anchors: a job, family who depend on you, property, a business, studies in progress.",
    coachTip:
      "Lead with your strongest anchor and make it specific: a named job you’re returning to, children in school, a business with employees, a lease in your name.",
  },
  {
    id: "ties-family",
    text: "Are you married? Do you have children?",
    phase: "ties",
    categories: ["b1b2", "any"],
    listensFor:
      "Family anchors at home, and consistency with your form. Family traveling with you changes the math.",
    coachTip:
      "Answer directly, and if your family stays behind, say so. “Yes, my wife and two children. They’re staying home; the kids are in school” is a strong tie in one breath.",
  },
  {
    id: "ties-property",
    text: "Do you own property or run a business back home?",
    phase: "ties",
    categories: ["b1b2", "any"],
    listensFor:
      "Economic roots that make leaving costly.",
    coachTip:
      "If yes, name it concretely. If no, don’t apologize; pivot to the ties you do have: your job, your family, your studies.",
  },
  {
    id: "ties-plans-after",
    text: "What are your plans after you graduate?",
    phase: "ties",
    categories: ["f1"],
    listensFor:
      "The single most important F1 question. Officers want a credible plan that ends with you leaving the US.",
    coachTip:
      "Describe a specific role or path back home: “I plan to return to Manila and join a data team. Companies like Globe and GCash hire heavily for what I’m studying.” Avoid any hint that staying is the plan.",
  },
  {
    id: "ties-job-waiting",
    text: "Will your job be waiting for you when you return?",
    phase: "ties",
    categories: ["b1b2", "j1"],
    listensFor:
      "Whether your employment survives the trip, which makes return rational.",
    coachTip:
      "If you have approved leave, say it: “Yes. I have 15 days of approved leave and I’m back at my desk on July 1st.”",
  },

  // ── Travel history ───────────────────────────────────────────────────────
  {
    id: "hist-travel",
    text: "Have you traveled outside your country before?",
    phase: "history",
    categories: ["b1b2", "f1", "h1b", "j1", "any"],
    listensFor:
      "A pattern of going abroad and coming back. No history isn’t fatal, but lying about it is.",
    coachTip:
      "List trips with years and the fact you returned: “Dubai in 2022, Kenya in 2024, back on time both trips.” If you haven’t traveled, say so plainly. First trips get approved every day.",
  },
  {
    id: "hist-refusal",
    text: "Have you ever been refused a visa to any country?",
    phase: "history",
    categories: ["b1b2", "f1", "h1b", "j1", "any"],
    listensFor:
      "Honesty above all. Refusals are on record; concealing one ends the conversation.",
    coachTip:
      "If yes: state it, the year, and what changed since. “Yes, a UK refusal in 2021 for insufficient funds. My situation is different now: I’ve been at my job four years.” Never hide it.",
  },

  // ── Credibility follow-ups ───────────────────────────────────────────────
  {
    id: "cred-why-not-home",
    text: "Why can’t you do this in your own country?",
    phase: "credibility",
    categories: ["b1b2", "f1", "any"],
    listensFor:
      "Whether your stated purpose survives pressure. A calm, specific answer here often decides borderline cases.",
    coachTip:
      "Don’t get defensive. Give the one concrete thing that exists only there: the event, the program, the person, the conference.",
  },
  {
    id: "cred-why-now",
    text: "Why are you traveling now, at this particular time?",
    phase: "credibility",
    categories: ["b1b2", "any"],
    listensFor:
      "A timing reason that fits your story: an event date, a school break, approved leave.",
    coachTip:
      "Anchor the timing to something external and verifiable: “The conference runs March 12 to 15” or “It’s my annual leave window.”",
  },
  {
    id: "cred-return-proof",
    text: "How do I know you’ll come back?",
    phase: "credibility",
    categories: ["b1b2", "f1", "j1", "any"],
    listensFor:
      "Composure. This question tests how you handle the presumption of 214(b) being said to your face.",
    coachTip:
      "Don’t plead. Stack your two strongest anchors in one calm sentence: “My job and my family are in Lagos. I have more to lose by staying than by coming home.”",
  },
  {
    id: "cred-relatives-us",
    text: "Do you have relatives or friends in the United States?",
    phase: "credibility",
    categories: ["f1", "b1b2", "any"],
    listensFor:
      "Consistency with your DS-160 and whether US connections outweigh home ties.",
    coachTip:
      "Match your form exactly. A cousin in Texas is not a problem. A cousin in Texas you didn’t declare is.",
  },
  {
    id: "cred-refused-plan",
    text: "What will you do if your visa is refused?",
    phase: "credibility",
    categories: ["b1b2", "f1", "any"],
    listensFor:
      "Whether your life continues at home without this visa. Desperation signals weak ties.",
    coachTip:
      "Show a full life either way: “I’d be disappointed, but I’d continue my job and reapply when my case is stronger.” Calm beats pleading.",
  },
];

/** Questions relevant to a category, including category-agnostic ones. */
export const questionsForCategory = (category: VisaCategory): Question[] =>
  QUESTION_BANK.filter(
    (q) => q.categories.includes(category) || (category === "any" && q.categories.includes("any")),
  );
