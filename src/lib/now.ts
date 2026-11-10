// What the home page says on a given day. Pure: schedule and a date in,
// a plain description out. The page turns the description into HTML.

import { addDays, mondayOf, type IsoDate } from "./dates";
import { weekOf, type Cycle, type DueItem, type KeyDate, type Lab, type Reading, type Schedule, type Session, type Week } from "./schedule";

export type Phase = "before" | "term" | "break" | "conference" | "finals" | "after";

/** How far ahead the home page looks for a reading before saying there is none. */
const READING_WINDOW_DAYS = 14;
/** "Due this week" covers today and the six days after. */
const DUE_WINDOW_DAYS = 7;
/** The compact view at the bottom covers today and the thirteen days after. */
const AHEAD_DAYS = 14;

export interface AheadDay {
  date: IsoDate;
  sessions: Session[];
  due: DueItem[];
  keyDates: KeyDate[];
}

export interface NowModel {
  today: IsoDate;
  phase: Phase;
  /** The Monday-to-Sunday week containing today, when it is part of the calendar. */
  week: Week | null;
  /** The first session on or after today. */
  next: Session | null;
  /** The lab that runs in the next session, if any. */
  nextLab: Lab | null;
  /** Before term: the sessions of the first week. */
  firstWeek: Session[];
  /** The break in progress. */
  activeBreak: KeyDate | null;
  /** A break that falls between today and the next session. */
  breakAhead: KeyDate | null;
  /** In conference week: every conference session in the run. */
  conferences: Session[];
  /** The final block. */
  finals: KeyDate | null;
  /** The cycle whose lab has happened and whose seminar has not. */
  openQuestion: { cycle: Cycle; lab: Lab | null; labSession: Session; seminar: Session } | null;
  /** The next session with assigned reading, when it is within two weeks. */
  reading: { session: Session; cycle: Cycle | null; readings: Reading[] } | null;
  /** Work due in the next seven days; or, when there is none, the next thing due. */
  due: DueItem[];
  /** True when `due` holds the next thing due rather than this week's work. */
  dueIsLater: boolean;
  ahead: AheadDay[];
}

export function computeNow(schedule: Schedule, today: IsoDate): NowModel {
  const { sessions, keyDates } = schedule;
  const sessionByNumber = new Map(sessions.map((s) => [s.number, s]));
  const finals = keyDates.find((k) => k.kind === "finals") ?? null;

  const model: NowModel = {
    today,
    phase: "term",
    week: weekOf(schedule, today),
    next: null,
    nextLab: null,
    firstWeek: [],
    activeBreak: null,
    breakAhead: null,
    conferences: [],
    finals,
    openQuestion: null,
    reading: null,
    due: [],
    dueIsLater: false,
    ahead: [],
  };

  if (today > schedule.lastDay) {
    model.phase = "after";
    return model;
  }
  if (today > schedule.lastSession) {
    model.phase = "finals";
    return model;
  }

  const next = sessions.find((s) => s.date >= today)!;
  model.next = next;
  model.nextLab = schedule.labs.find((l) => l.number === next.lab) ?? null;

  if (today < schedule.firstSession) {
    model.phase = "before";
    const first = schedule.weeks.find((w) => w.kind === "teaching");
    model.firstWeek = (first?.sessions ?? []).map((n) => sessionByNumber.get(n)!);
    return model;
  }

  // A break lasts through the weekend that follows it.
  model.activeBreak =
    keyDates.find((k) => k.kind === "break" && today >= k.start && today <= addDays(mondayOf(k.end), 6)) ?? null;
  model.breakAhead =
    keyDates.find((k) => k.kind === "break" && k.start > today && k.start <= next.date) ?? null;

  if (model.activeBreak) {
    model.phase = "break";
  } else if (next.kind === "conference") {
    model.phase = "conference";
    // Every conference session in the unbroken run around the next one.
    let from = next.number;
    let to = next.number;
    while (sessionByNumber.get(from - 1)?.kind === "conference") from--;
    while (sessionByNumber.get(to + 1)?.kind === "conference") to++;
    for (let n = from; n <= to; n++) model.conferences.push(sessionByNumber.get(n)!);
  }

  // The question the last lab left open: from the day after the lab through the seminar.
  for (const cycle of schedule.cycles) {
    const labSession = sessionByNumber.get(cycle.labSession)!;
    const seminar = sessionByNumber.get(cycle.seminarSession)!;
    if (labSession.date < today && today <= seminar.date) {
      const lab = schedule.labs.find((l) => l.session === labSession.number) ?? null;
      model.openQuestion = { cycle, lab, labSession, seminar };
    }
  }

  // The next reading.
  const readingSession = sessions.find((s) => s.date >= today && s.readBefore.length > 0);
  if (readingSession && readingSession.date < addDays(today, READING_WINDOW_DAYS)) {
    model.reading = {
      session: readingSession,
      cycle: schedule.cycles.find((c) => c.number === readingSession.cycle) ?? null,
      readings: readingSession.readBefore.map((slug) => schedule.readings[slug]!),
    };
  }

  // What is due.
  const dueWindowEnd = addDays(today, DUE_WINDOW_DAYS - 1);
  model.due = schedule.due.filter((d) => d.date >= today && d.date <= dueWindowEnd);
  if (model.due.length === 0) {
    const nextDue = schedule.due.find((d) => d.date > dueWindowEnd);
    if (nextDue) {
      model.due = schedule.due.filter((d) => d.date === nextDue.date);
      model.dueIsLater = true;
    }
  }

  // The next two weeks, day by day.
  const aheadEnd = addDays(today, AHEAD_DAYS - 1);
  const days = new Map<IsoDate, AheadDay>();
  const day = (date: IsoDate) => {
    let entry = days.get(date);
    if (!entry) days.set(date, (entry = { date, sessions: [], due: [], keyDates: [] }));
    return entry;
  };
  const inWindow = (date: IsoDate) => date >= today && date <= aheadEnd;
  for (const s of sessions) if (inWindow(s.date)) day(s.date).sessions.push(s);
  for (const d of schedule.due) if (inWindow(d.date)) day(d.date).due.push(d);
  for (const k of keyDates) if (inWindow(k.start)) day(k.start).keyDates.push(k);
  model.ahead = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));

  return model;
}
