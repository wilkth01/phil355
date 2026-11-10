// Checks the content files against the tables in section 7 of the build
// brief, and checks that bad content is refused.

import { describe, expect, it } from "vitest";
import { assignmentSchema, labSchema, readingSchema, sessionSchema } from "../src/content/schemas";
import { weekday } from "../src/lib/dates";
import { buildSchedule, ContentError } from "../src/lib/schedule";
import { loadContract, loadPrompts, loadRawContent, parseFile } from "./helpers/content";

const raw = loadRawContent();
const schedule = buildSchedule(raw);

describe("sessions", () => {
  it("has thirty, from January 12 to April 29, 2027", () => {
    expect(schedule.sessions).toHaveLength(30);
    expect(schedule.firstSession).toBe("2027-01-12");
    expect(schedule.lastSession).toBe("2027-04-29");
  });

  it("meets only on Tuesdays and Thursdays", () => {
    for (const s of schedule.sessions) expect([2, 4], `session ${s.number}`).toContain(weekday(s.date));
  });

  it("has AI on at labs, studios, the Crit and the Exhibition, and off at seminars", () => {
    for (const s of schedule.sessions) {
      if (["lab", "studio", "crit", "exhibition", "opener"].includes(s.kind)) expect(s.ai, `session ${s.number}`).toBe("on");
      if (s.kind === "seminar") expect(s.ai, `session ${s.number}`).toBe("off");
    }
  });

  it("takes reading tickets at the nine seminars", () => {
    expect(schedule.sessions.filter((s) => s.ticket).map((s) => s.number)).toEqual([3, 5, 7, 9, 11, 13, 21, 23, 25]);
  });

  it("has 28 class meetings once the two conference days are set aside", () => {
    const meetings = schedule.sessions.filter((s) => s.kind !== "conference").length;
    expect(meetings).toBe(28);
    expect(loadContract().classMeetings).toBe(meetings);
  });

  it("assigns the readings in the sessions table", () => {
    const read = Object.fromEntries(schedule.sessions.filter((s) => s.readBefore.length).map((s) => [s.number, s.readBefore]));
    expect(read).toEqual({
      3: ["winner", "chiang-blurry-jpeg"],
      5: ["borgmann", "chiang-art"],
      7: ["sinnott-armstrong", "maitra"],
      9: ["hicks", "frankfurt"],
      11: ["vallor", "clark", "evidence-learning"],
      13: ["prvulovich"],
      21: ["dzieza"],
      23: ["machine-bias", "benjamin"],
      25: ["constitution", "pettit", "amodei"],
    });
  });
});

describe("weeks", () => {
  it("has fifteen teaching weeks, the break, and the final block", () => {
    expect(schedule.weeks.filter((w) => w.kind === "teaching").map((w) => w.number)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
    expect(schedule.weeks.filter((w) => w.kind === "break").map((w) => w.start)).toEqual(["2027-03-08"]);
    expect(schedule.weeks.filter((w) => w.kind === "finals").map((w) => w.start)).toEqual(["2027-05-03"]);
    expect(schedule.weeks.filter((w) => w.kind === "open")).toEqual([]);
    expect(schedule.lastDay).toBe("2027-05-07");
  });

  it("has two sessions in every teaching week", () => {
    for (const w of schedule.weeks) if (w.kind === "teaching") expect(w.sessions, `week ${w.number}`).toHaveLength(2);
  });
});

describe("cycles, readings and labs", () => {
  it("has nine cycles, each a Thursday lab then a Tuesday seminar", () => {
    expect(schedule.cycles.map((c) => [c.number, c.labSession, c.seminarSession])).toEqual([
      [1, 2, 3], [2, 4, 5], [3, 6, 7], [4, 8, 9], [5, 10, 11], [6, 12, 13], [7, 20, 21], [8, 22, 23], [9, 24, 25],
    ]);
  });

  it("gives every cycle one core reading, and it is read before the seminar", () => {
    for (const c of schedule.cycles) {
      expect(schedule.readings[c.coreReading]?.role).toBe("core");
      const seminar = schedule.sessions.find((s) => s.number === c.seminarSession)!;
      expect(seminar.readBefore, `cycle ${c.number}`).toContain(c.coreReading);
    }
  });

  it("files the optional readings under their cycles", () => {
    expect(Object.fromEntries(schedule.cycles.map((c) => [c.number, c.optional.sort()]))).toEqual({
      1: ["postman"], 2: [], 3: ["crawford-ch1"], 4: ["nguyen"], 5: [], 6: ["klingsheim"], 7: ["crawford-ch2"], 8: ["hofmann"], 9: [],
    });
  });

  it("has ten labs in the sessions the labs table names", () => {
    expect(schedule.labs.map((l) => [l.number, l.session, l.interactive ?? null])).toEqual([
      [0, 1, null], [1, 2, "next-word"], [2, 4, null], [3, 6, "footprint"], [4, 8, "calibration"],
      [5, 10, "sample"], [6, 12, null], [7, 20, "labeling"], [8, 22, "fairness"], [9, 24, null],
    ]);
  });
});

describe("what is due", () => {
  const logs = schedule.due.filter((d) => d.assignment === "log");

  it("has twelve Logs on Wednesdays at 9 p.m., skipping the break", () => {
    expect(logs.map((d) => d.date)).toEqual([
      "2027-01-20", "2027-01-27", "2027-02-03", "2027-02-10", "2027-02-17", "2027-02-24",
      "2027-03-03", "2027-03-17", "2027-03-24", "2027-03-31", "2027-04-07", "2027-04-14",
    ]);
    for (const d of logs) {
      expect(weekday(d.date)).toBe(3);
      expect(d.time).toBe("21:00");
    }
    expect(loadContract().logs).toBe(logs.length);
  });

  it("marks Logs 7 and 8 as about the Exhibition build", () => {
    expect(logs.filter((d) => d.note).map((d) => [d.label, d.date])).toEqual([
      ["Log 7", "2027-03-03"],
      ["Log 8", "2027-03-17"],
    ]);
  });

  it("lists the other deadlines that fall outside class", () => {
    expect(schedule.due.filter((d) => d.assignment !== "log").map((d) => [d.date, d.assignment])).toEqual([
      ["2027-03-30", "position-paper"],
      ["2027-03-30", "own-case"],
      ["2027-04-08", "public-piece"],
    ]);
  });
});

describe("contract and prompts", () => {
  it("matches the contract table", () => {
    const c = loadContract();
    expect(c.absencesAllowed).toEqual({ A: 2, B: 3, C: 4 });
    expect(c.ticketsPassed).toEqual({ A: 8, B: 7, C: 6 });
    expect(c.logsCompleted).toEqual({ A: 10, B: 9, C: 8 });
    expect(c.tierOptions.required).toEqual({ A: 2, B: 1, C: 0 });
    expect(c.readingTickets).toBe(9);
  });

  it("has the five prompts", () => {
    expect(loadPrompts()).toHaveLength(5);
  });
});

describe("bad content is refused", () => {
  const session = { number: 1, date: "2027-01-12", kind: "opener", title: "x", ai: "on" };

  it("rejects a session with a required field missing", () => {
    for (const field of ["number", "date", "kind", "title", "ai"]) {
      const broken: Record<string, unknown> = { ...session };
      delete broken[field];
      expect(sessionSchema.safeParse(broken).success, field).toBe(false);
    }
    expect(sessionSchema.safeParse(session).success).toBe(true);
  });

  it("rejects a misspelled field name, an unknown kind, and an impossible date", () => {
    expect(sessionSchema.safeParse({ ...session, readbefore: ["winner"] }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...session, kind: "lecture" }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...session, date: "2027-02-30" }).success).toBe(false);
  });

  it("accepts a date and an on/off value however YAML hands them over", () => {
    const fromYaml = parseFile("---\nnumber: 1\ndate: 2027-01-12\nkind: opener\ntitle: x\nai: on\n---\n").data;
    expect(sessionSchema.parse(fromYaml)).toMatchObject({ date: "2027-01-12", ai: "on" });
    expect(sessionSchema.parse({ ...session, date: new Date("2027-01-12"), ai: false })).toMatchObject({ date: "2027-01-12", ai: "off" });
  });

  it("requires a reading to state pages, minutes and access, even as null", () => {
    const reading = { author: "Winner", title: "T", work: "article", year: 1980, role: "core", cycle: 1, pages: null, minutes: null, access: null };
    expect(readingSchema.safeParse(reading).success).toBe(true);
    for (const field of ["pages", "minutes", "access", "role", "year"]) {
      const broken: Record<string, unknown> = { ...reading };
      delete broken[field];
      expect(readingSchema.safeParse(broken).success, field).toBe(false);
    }
    expect(readingSchema.safeParse({ ...reading, author: null, title: null }).success).toBe(false);
  });

  it("requires a lab to say when it is revealed", () => {
    expect(labSchema.safeParse({ number: 1, title: "Be the Model", session: 2 }).success).toBe(false);
  });

  it("requires an assignment to have a due rule or due dates", () => {
    const a = { title: "T", kind: "weekly", summary: "s", aiRule: "open", aiRuleText: "open" };
    expect(assignmentSchema.safeParse(a).success).toBe(false);
    expect(assignmentSchema.safeParse({ ...a, dueRule: "Wednesdays" }).success).toBe(true);
  });

  it("stops when a session names a reading that does not exist", () => {
    const sessions = raw.sessions.map((s) => (s.number === 3 ? { ...s, readBefore: ["winer"] } : s));
    expect(() => buildSchedule({ ...raw, sessions })).toThrow(ContentError);
    expect(() => buildSchedule({ ...raw, sessions })).toThrow(/Session 3: readBefore "winer"/);
  });

  it("lets a reading wait for its page count only until its guide is written", () => {
    const readings = raw.readings.map((r) => (r.slug === "winner" ? { ...r, hasGuide: true } : r));
    expect(() => buildSchedule({ ...raw, readings })).toThrow(/Reading "winner" has a guide but no pages, minutes, access/);
    const filled = raw.readings.map((r) =>
      r.slug === "winner" ? { ...r, hasGuide: true, pages: 16, minutes: 60, access: "library" as const } : r,
    );
    expect(() => buildSchedule({ ...raw, readings: filled })).not.toThrow();
  });

  it("stops when a Log is due on the wrong day or a session falls in the break", () => {
    const assignments = raw.assignments.map((a) =>
      a.slug === "log" ? { ...a, dueDates: [{ date: "2027-01-21", label: "Log 1", inClass: false }] } : a,
    );
    expect(() => buildSchedule({ ...raw, assignments })).toThrow(/Log 1 is due 2027-01-21, a Thursday/);

    const sessions = raw.sessions.map((s) => (s.number === 17 ? { ...s, date: "2027-03-09" } : s));
    expect(() => buildSchedule({ ...raw, sessions })).toThrow(/falls inside "Mid-term break/);
  });
});
