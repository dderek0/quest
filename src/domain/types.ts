// Core domain model. A Coach's docs become a CoursePack (the immutable "core"),
// which each Member learns via a personalized path.

export type Concept = {
  id: string; // c1, c2, …
  name: string;
  summary: string; // 1–2 sentences, grounded in the source
  keyFacts: string[]; // 2–4 facts pulled from the source
  prereqs: string[]; // concept ids that should come first
  difficulty: number; // 1 (easy) … 5 (hard)
  bloom?: string; // remember | understand | apply | analyze | evaluate | create
  citations?: string[]; // short quotes/refs from the source (grounding)
};

export type Question = {
  id: string; // c1-q1, …
  conceptId: string;
  type: 'mcq' | 'short';
  stem: string;
  options?: string[]; // mcq only
  answer: string; // correct option text, or the short-answer key
  rubric?: string; // short-answer grading guidance
  explanation: string; // 1-sentence why
  difficulty: number; // 1 … 5
};

// A CoursePack is also a "Quest": generated content (concepts + questions) built from
// one or more Materials. A Class can hold several; one is the active Quest served to members.
export type CoursePack = {
  id: string;
  title: string;
  summary: string;
  language: string; // 'vi'
  concepts: Concept[];
  questions: Question[];
  sourceChars: number;
  materialIds?: string[];
};
