// Turns the content files into one plain object, the Schedule, that every
// page and the browser-side date logic read from. It also cross-checks the
// content (a session that names a reading that does not exist, a Log due on
// a Thursday) and stops the build with a list of what is wrong.

import type {
  AssignmentData,
  CycleData,
  LabData,
  ReadingData,
  SessionData,
  TermData,
} from "../content/schemas";
import { addDays, mondayOf, weekday, weekdayName, type IsoDate } from "./dates";

export interface Session {
  number: number;
  date: IsoDate;
  kind: SessionData["kind"];
  title: string;
  cycle?: number;
  ai: "on" | "off";
  bring?: string;
  readBefore: string[];
  /** A reading ticket is taken at the start of this session. */
  ticket: boolean;
  /** Number of the lab that runs in this session, if any. */
  lab?: number;
  /** "What happens", rendered from the file's body. */
  html?: string;
}

export interface Reading extends ReadingData {
  slug: string;
  hasGuide: boolean;
}

export interface Cycle extends CycleData {
  optional: string[];
}

export type Lab = LabData;

export interface DueItem {
  date: IsoDate;
  assignment: string;
  assignmentTitle: string;
  label: string;
  note?: string;
  /** "21:00" when there is a set time. */
  time?: string;
}

export interface KeyDate {
  start: IsoDate;
  end: IsoDate;
  label: string;
  kind?: "break" | "finals";
}

export interface Week {
  kind: "teaching" | "break" | "finals" | "open";
  /** 1 to 15 for teaching weeks. */
  number?: number;
  /** Monday. */
  start: IsoDate;
  /** Sunday. */
  end: IsoDate;
  sessions: number[];
  due: DueItem[];
  keyDates: KeyDate[];
}

export interface Schedule {
  termName: string;
  timezone: string;
  sessions: Session[];
  readings: Record<string, Reading>;
  cycles: Cycle[];
  labs: Lab[];
  /** Everything handed in outside class, in date order. */
  due: DueItem[];
  keyDates: KeyDate[];
  weeks: Week[];
  firstSession: IsoDate;
  lastSession: IsoDate;
  /** The last day the site treats as part of the term: the end of the final block. */
  lastDay: IsoDate;
}

export interface RawContent {
  sessions: Array<SessionData & { html?: string }>;
  cycles: CycleData[];
  readings: Array<ReadingData & { slug: string; hasGuide: boolean }>;
  labs: LabData[];
  assignments: Array<AssignmentData & { slug: string }>;
  term: TermData;
  config: { term: string; timezone: string; logDue: { weekday: number; time: string } };
}

export class ContentError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Course content has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    this.name = "ContentError";
    this.problems = problems;
  }
}

/** The assignment whose due dates follow site.logDue. */
const LOG_SLUG = "log";
/** The assignment that seminars open with. */
const TICKET_SLUG = "reading-ticket";

export function buildSchedule(raw: RawContent): Schedule {
  const problems: string[] = [];

  // ---- Sessions ----
  const sessions: Session[] = [...raw.sessions]
    .sort((a, b) => a.number - b.number)
    .map((s) => ({
      number: s.number,
      date: s.date,
      kind: s.kind,
      title: s.title,
      ...(s.cycle !== undefined && { cycle: s.cycle }),
      ai: s.ai,
      ...(s.bring !== undefined && { bring: s.bring }),
      readBefore: s.readBefore ?? [],
      ticket: false,
      ...(s.html && { html: s.html }),
    }));

  if (sessions.length === 0) throw new ContentError(["There are no sessions in src/content/sessions."]);

  sessions.forEach((s, i) => {
    if (s.number !== i + 1) problems.push(`Sessions must be numbered 1, 2, 3 with no gaps or repeats; found ${s.number} in position ${i + 1}.`);
    const prev = sessions[i - 1];
    if (prev && prev.date >= s.date) problems.push(`Session ${s.number} (${s.date}) is not after session ${prev.number} (${prev.date}).`);
  });
  const sessionByNumber = new Map(sessions.map((s) => [s.number, s]));

  // ---- Readings ----
  const readings: Record<string, Reading> = {};
  for (const r of raw.readings) readings[r.slug] = r;

  // ---- Cycles ----
  const cycleNumbers = new Set(raw.cycles.map((c) => c.number));
  if (cycleNumbers.size !== raw.cycles.length) problems.push("Two cycles have the same number.");

  const cycles: Cycle[] = [...raw.cycles]
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      ...c,
      optional: raw.readings.filter((r) => r.cycle === c.number && r.role === "optional").map((r) => r.slug),
    }));

  for (const c of cycles) {
    const lab = sessionByNumber.get(c.labSession);
    const seminar = sessionByNumber.get(c.seminarSession);
    if (!lab) problems.push(`Cycle ${c.number}: labSession ${c.labSession} is not a session.`);
    else if (lab.cycle !== c.number) problems.push(`Cycle ${c.number}: session ${lab.number} is its lab session but is not marked cycle ${c.number}.`);
    if (!seminar) problems.push(`Cycle ${c.number}: seminarSession ${c.seminarSession} is not a session.`);
    else if (seminar.cycle !== c.number) problems.push(`Cycle ${c.number}: session ${seminar.number} is its seminar session but is not marked cycle ${c.number}.`);
    if (lab && seminar && lab.date >= seminar.date) problems.push(`Cycle ${c.number}: the lab must come before the seminar.`);

    const core = readings[c.coreReading];
    if (!core) problems.push(`Cycle ${c.number}: coreReading "${c.coreReading}" has no file in src/content/readings.`);
    else if (core.role !== "core") problems.push(`Cycle ${c.number}: coreReading "${c.coreReading}" has role "${core.role}", not "core".`);
    for (const slug of c.alsoAssigned) {
      if (!readings[slug]) problems.push(`Cycle ${c.number}: alsoAssigned "${slug}" has no file in src/content/readings.`);
    }
  }

  for (const r of raw.readings) {
    if (!cycleNumbers.has(r.cycle)) problems.push(`Reading "${r.slug}": cycle ${r.cycle} does not exist.`);
    // pages, minutes and access may wait until the guide is written, and no longer.
    if (r.hasGuide) {
      const missing = (["pages", "minutes", "access"] as const).filter((field) => r[field] === null);
      if (missing.length > 0) {
        problems.push(`Reading "${r.slug}" has a guide but no ${missing.join(", ")}. Fill these in before the guide goes up.`);
      }
    }
  }

  for (const s of sessions) {
    if (s.cycle !== undefined && !cycleNumbers.has(s.cycle)) problems.push(`Session ${s.number}: cycle ${s.cycle} does not exist.`);
    for (const slug of s.readBefore) {
      if (!readings[slug]) problems.push(`Session ${s.number}: readBefore "${slug}" has no file in src/content/readings.`);
    }
  }

  // ---- Labs ----
  const labs: Lab[] = [...raw.labs].sort((a, b) => a.number - b.number);
  if (new Set(labs.map((l) => l.number)).size !== labs.length) problems.push("Two labs have the same number.");
  for (const lab of labs) {
    const session = sessionByNumber.get(lab.session);
    if (!session) problems.push(`Lab ${lab.number}: session ${lab.session} is not a session.`);
    else session.lab = lab.number;
  }

  // ---- Reading tickets ----
  if (raw.assignments.some((a) => a.slug === TICKET_SLUG)) {
    for (const s of sessions) s.ticket = s.kind === "seminar";
  }

  // ---- Key dates ----
  const keyDates: KeyDate[] = raw.term.keyDates
    .map((k) => ({ start: k.start, end: k.end ?? k.start, label: k.label, ...(k.kind && { kind: k.kind }) }))
    .sort((a, b) => a.start.localeCompare(b.start));
  for (const k of keyDates) {
    if (k.end < k.start) problems.push(`Key date "${k.label}" ends before it starts.`);
    if (k.kind === "break") {
      for (const s of sessions) {
        if (s.date >= k.start && s.date <= k.end) problems.push(`Session ${s.number} (${s.date}) falls inside "${k.label}".`);
      }
    }
  }

  // ---- Due dates ----
  const due: DueItem[] = [];
  for (const a of raw.assignments) {
    for (const d of a.dueDates ?? []) {
      if (a.slug === LOG_SLUG && weekday(d.date) !== raw.config.logDue.weekday) {
        problems.push(`${d.label} is due ${d.date}, a ${weekdayName(d.date)}; site.config.ts says Logs are due on day ${raw.config.logDue.weekday} of the week.`);
      }
      if (d.inClass) {
        if (!sessions.some((s) => s.date === d.date)) {
          problems.push(`${a.title}: "${d.label}" is marked inClass on ${d.date}, but no session meets that day.`);
        }
        continue;
      }
      due.push({
        date: d.date,
        assignment: a.slug,
        assignmentTitle: a.title,
        label: d.label,
        ...(d.note && { note: d.note }),
        ...(a.slug === LOG_SLUG && { time: raw.config.logDue.time }),
      });
    }
  }
  due.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));

  if (problems.length > 0) throw new ContentError(problems);

  // ---- Weeks ----
  const firstSession = sessions[0]!.date;
  const lastSession = sessions[sessions.length - 1]!.date;
  const finals = keyDates.filter((k) => k.kind === "finals" && k.end > lastSession);
  const lastDay = finals.reduce((latest, k) => (k.end > latest ? k.end : latest), lastSession);

  const weeks: Week[] = [];
  let teachingWeek = 0;
  for (let start = mondayOf(firstSession); start <= lastDay; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    const inWeek = (date: IsoDate) => date >= start && date <= end;
    const weekSessions = sessions.filter((s) => inWeek(s.date)).map((s) => s.number);
    const weekKeyDates = keyDates.filter((k) => k.start <= end && k.end >= start);
    let kind: Week["kind"] = "open";
    if (weekSessions.length > 0) kind = "teaching";
    else if (weekKeyDates.some((k) => k.kind === "break")) kind = "break";
    else if (weekKeyDates.some((k) => k.kind === "finals")) kind = "finals";
    weeks.push({
      kind,
      ...(kind === "teaching" && { number: ++teachingWeek }),
      start,
      end,
      sessions: weekSessions,
      due: due.filter((d) => inWeek(d.date)),
      keyDates: weekKeyDates,
    });
  }

  return {
    termName: raw.config.term,
    timezone: raw.config.timezone,
    sessions,
    readings,
    cycles,
    labs,
    due,
    keyDates,
    weeks,
    firstSession,
    lastSession,
    lastDay,
  };
}

export function weekOf(schedule: Schedule, date: IsoDate): Week | null {
  return schedule.weeks.find((w) => date >= w.start && date <= w.end) ?? null;
}
