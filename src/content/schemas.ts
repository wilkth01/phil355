// The shape of every kind of course content. The build stops with an error
// when a file is missing a required field, has a misspelled field name, or
// has a value of the wrong kind.
//
// "Required, may be null" means the line must be present in the file, but
// can be written as `pages: null` while the value is not yet known.

import { z } from "astro/zod";
import { isIsoDate } from "../lib/dates";

/** A real calendar date written as YYYY-MM-DD. */
export const isoDate = z.union([z.string(), z.date()]).transform((value, ctx) => {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (!isIsoDate(text)) {
    ctx.addIssue({ code: "custom", message: `Expected a real date written as YYYY-MM-DD, got "${text}"` });
    return z.NEVER;
  }
  return text;
});

/** "on" or "off". Also accepts YAML true and false, which some parsers produce for on and off. */
const onOff = z.preprocess(
  (value) => (value === true ? "on" : value === false ? "off" : value),
  z.enum(["on", "off"]),
);

const text = z.string().trim().min(1);

export const sessionKinds = [
  "opener", "lab", "seminar", "studio", "crit", "exhibition",
  "debrief", "convention", "conference", "synthesis", "paper",
] as const;

export const sessionSchema = z.strictObject({
  number: z.number().int().positive(),
  date: isoDate,
  kind: z.enum(sessionKinds),
  title: text,
  cycle: z.number().int().positive().optional(),
  ai: onOff,
  bring: text.optional(),
  readBefore: z.array(text).optional(), // reading file names, without ".md"
});

export const cycleSchema = z.strictObject({
  number: z.number().int().positive(),
  unit: text,
  question: text,
  labSession: z.number().int().positive(),
  seminarSession: z.number().int().positive(),
  coreReading: text, // reading file name, without ".md"
  alsoAssigned: z.array(text),
  botStarters: z.array(text),
});

// A reading's slug is its file name: readings/winner.md is "winner".
export const readingSchema = z
  .strictObject({
    author: text.nullable(), // null for a course packet
    title: text.nullable(), // null until Tom supplies it
    work: z.enum(["article", "book", "packet"]), // article titles get quotation marks, book titles italics
    source: text.optional(), // where it appeared, when the title is not known
    year: z.number().int().min(1000).max(2100).nullable(),
    role: z.enum(["core", "companion", "optional"]),
    cycle: z.number().int().positive(),
    pages: z.number().int().positive().nullable(),
    minutes: z.number().int().positive().nullable(),
    access: z.enum(["canvas", "library", "open"]).nullable(),
    url: z.url().optional(),
    excerpt: text.optional(), // what is assigned
  })
  .refine((r) => r.author !== null || r.title !== null, {
    message: "A reading needs an author or a title",
  });

export const labSchema = z.strictObject({
  number: z.number().int().min(0),
  title: text,
  session: z.number().int().positive(),
  interactive: z.enum(["next-word", "footprint", "calibration", "sample", "labeling", "fairness"]).optional(),
  platform: z.enum(["boodlebox"]).optional(), // for labs run in BoodleBox rather than on the site
  revealOn: isoDate,
});

export const assignmentKinds = ["in-class", "weekly", "team", "class", "paper", "tier"] as const;

// An assignment's slug is its file name: assignments/log.md is "log".
export const assignmentSchema = z
  .strictObject({
    title: text,
    kind: z.enum(assignmentKinds),
    summary: text, // "What it is", from the brief
    counts: z.number().int().positive().optional(),
    dueRule: text.optional(),
    dueDates: z
      .array(
        z.strictObject({
          date: isoDate,
          label: text,
          // true when this happens during a class meeting, so the schedule
          // shows it with the session instead of in the "due" list
          inClass: z.boolean().default(false),
          note: text.optional(),
        }),
      )
      .optional(),
    // "mixed" is for rules that differ by stage; "none" is for work with no AI rule.
    aiRule: z.enum(["open", "closed", "required", "mixed", "none"]),
    aiRuleText: text, // the rule in words
    canvasPath: text.optional(),
  })
  .refine((a) => a.dueRule !== undefined || (a.dueDates?.length ?? 0) > 0, {
    message: "An assignment needs a dueRule or at least one entry in dueDates",
  });

export const charterSchema = z.strictObject({
  version: z.number().int().positive(),
  date: isoDate,
  status: z.enum(["draft", "amended", "ratified"]),
});

// A case's slug is its file name.
export const caseSchema = z.strictObject({
  set: z.enum(["four-minute", "bank"]),
  publishOn: isoDate,
  title: text,
});

// A page's slug is its file name.
export const pageSchema = z.strictObject({
  title: text,
});

// ---- Single data files in src/data/ ----

export const termSchema = z.strictObject({
  keyDates: z.array(
    z.strictObject({
      start: isoDate,
      end: isoDate.optional(),
      label: text,
      // "break": no sessions. "finals": the final exam block.
      kind: z.enum(["break", "finals"]).optional(),
    }),
  ),
});

export const promptsSchema = z.array(text).length(5);

const tiers = <T extends z.ZodType>(value: T) => z.strictObject({ A: value, B: value, C: value });

export const contractSchema = z.strictObject({
  classMeetings: z.number().int().positive(),
  readingTickets: z.number().int().positive(),
  logs: z.number().int().positive(),
  absencesAllowed: tiers(z.number().int().min(0)),
  ticketsPassed: tiers(z.number().int().min(0)),
  logsCompleted: tiers(z.number().int().min(0)),
  requiredOfAll: z.array(text),
  tierOptions: z.strictObject({
    options: z.array(text), // assignment file names
    required: tiers(z.number().int().min(0)), // how many of the options each tier needs
    labels: tiers(text),
  }),
});

export type SessionData = z.infer<typeof sessionSchema>;
export type CycleData = z.infer<typeof cycleSchema>;
export type ReadingData = z.infer<typeof readingSchema>;
export type LabData = z.infer<typeof labSchema>;
export type AssignmentData = z.infer<typeof assignmentSchema>;
export type TermData = z.infer<typeof termSchema>;
export type ContractData = z.infer<typeof contractSchema>;
