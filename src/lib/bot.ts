// The text of the "ask the course bot" block: the context line that opens
// every starter, the starters used when a content file supplies none, and
// the one-line reminder of the AI rule that applies.
//
// The site only links to the bot. Nothing here calls it.

import type { Assignment, Cycle, Lab, Reading } from "./schedule";

/** "PHIL 355" from "PHIL 355 · Ethics of Artificial Intelligence". */
export function courseCode(siteTitle: string): string {
  return siteTitle.split("·")[0]!.trim();
}

/**
 * A reading named in plain text, for pasting into a chat:
 *   Hicks, Humphries and Slater, "ChatGPT is bullshit"
 *   Borgmann, Technology and the Character of Contemporary Life
 */
export function readingName(r: Reading): string {
  let title = "";
  if (r.title !== null) title = r.work === "article" ? `"${r.title}"` : r.title;
  if (r.author && title) return `${r.author}, ${title}`;
  return r.author ?? title;
}

/**
 * Ends a sentence the American way: the period goes inside a closing
 * quotation mark, and is dropped after a question mark or exclamation point.
 */
export function endSentence(text: string): string {
  if (/[.?!]"?$/.test(text)) return text;
  return text.endsWith('"') ? `${text.slice(0, -1)}."` : `${text}.`;
}

/** I'm in PHIL 355, working on cycle 4: Hicks, Humphries and Slater, "ChatGPT is bullshit." */
export function contextLine(code: string, workingOn: string): string {
  return endSentence(`I'm in ${code}, working on ${workingOn}`);
}

export const readingContext = (code: string, r: Reading) => contextLine(code, `cycle ${r.cycle}: ${readingName(r)}`);

export const cycleContext = (code: string, c: Cycle, core: Reading | undefined) =>
  contextLine(code, `cycle ${c.number}: ${core ? readingName(core) : c.question}`);

export const labContext = (code: string, lab: Lab) => contextLine(code, `Lab ${lab.number}, ${lab.title}`);

export const assignmentContext = (code: string, a: Assignment) => contextLine(code, `this assignment: ${a.title}`);

// Starters used when a content file has no botStarters of its own. Each
// asks the bot to question the student, not to explain.
export const DEFAULT_STARTERS = {
  reading: [
    "Ask me what I think this reading argues, then test my account. One question at a time.",
    "I'm stuck on a passage. Ask me to quote it, and work through it with me.",
  ],
  cycle: [
    "Ask me what I think the core reading argues, then test my account. One question at a time.",
    "I have a case in mind. Run the five prompts on it, one at a time.",
  ],
  lab: [
    "Ask me what happened in the lab and what surprised me, then press me on what it shows.",
    "Ask me what question the lab left open, and what I would need to read to answer it.",
  ],
  assignment: ["I have a question about how this assignment works."],
} as const;

export function readingStarters(r: Reading, cycle: Cycle | undefined): readonly string[] {
  if (r.botStarters?.length) return r.botStarters;
  // The week's starters are written for the core reading.
  if (cycle && cycle.coreReading === r.slug && cycle.botStarters.length) return cycle.botStarters;
  return DEFAULT_STARTERS.reading;
}

export const cycleStarters = (c: Cycle): readonly string[] => (c.botStarters.length ? c.botStarters : DEFAULT_STARTERS.cycle);

export const labStarters = (lab: Lab): readonly string[] => (lab.botStarters?.length ? lab.botStarters : DEFAULT_STARTERS.lab);

export const assignmentStarters = (a: Assignment): readonly string[] =>
  a.botStarters?.length ? a.botStarters : DEFAULT_STARTERS.assignment;

// ---- The rule that applies ----

export const READING_RULE =
  "Reading is open: you may use AI to help you read, and you say what you used. The reading ticket and Tuesday’s seminar are done without AI.";

export const LAB_RULE = "AI is on in labs. If you use it afterward in work you hand in, say what you used and what for.";

const RULE_ENDINGS: Record<Assignment["aiRule"], string> = {
  open: "Say what you used and what for.",
  closed: "It is done without AI. The bot can help you practice beforehand; it will not supply answers.",
  required: "Using AI is part of the task. Say what you did and what the tool did.",
  mixed: "Say what you used in preparation.",
  none: "The Charter asks you to disclose AI use.",
};

export function assignmentRule(a: Assignment): string {
  const ending = RULE_ENDINGS[a.aiRule];
  return a.aiRule === "none" ? ending : `AI rule for this work: ${a.aiRuleText}. ${ending}`;
}
