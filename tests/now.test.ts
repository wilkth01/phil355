// The Phase 1 acceptance test: the home page's "now" is right for one date
// in each of the fifteen weeks, in the break, and before and after term.

import { describe, expect, it } from "vitest";
import { computeNow, type Phase } from "../src/lib/now";
import { renderNow, type RenderContext } from "../src/lib/render-now";
import { buildSchedule } from "../src/lib/schedule";
import { loadRawContent } from "./helpers/content";

const schedule = buildSchedule(loadRawContent());
const ctx: RenderContext = { base: "/phil355/", canvasUrl: "", courseName: "PHIL 355", termName: "Spring 2027" };
const now = (date: string) => computeNow(schedule, date);
const page = (date: string) => renderNow(now(date), ctx);

describe("one date in every week", () => {
  //        date          phase         week  next session
  const cases: Array<[string, Phase, number | null, number | null]> = [
    ["2027-01-13", "term", 1, 2],
    ["2027-01-18", "term", 2, 3],
    ["2027-01-27", "term", 3, 6],
    ["2027-02-02", "term", 4, 7],
    ["2027-02-12", "term", 5, 11],
    ["2027-02-17", "term", 6, 12],
    ["2027-02-24", "term", 7, 14],
    ["2027-03-03", "term", 8, 16],
    ["2027-03-10", "break", null, 17],
    ["2027-03-17", "term", 9, 18],
    ["2027-03-24", "term", 10, 20],
    ["2027-03-31", "term", 11, 22],
    ["2027-04-07", "term", 12, 24],
    ["2027-04-14", "term", 13, 26],
    ["2027-04-21", "conference", 14, 28],
    ["2027-04-28", "term", 15, 30],
  ];

  it.each(cases)("%s is %s, week %s, next session %s", (date, phase, week, next) => {
    const m = now(date);
    expect(m.phase).toBe(phase);
    expect(m.week?.number ?? null).toBe(week);
    expect(m.next?.number ?? null).toBe(next);
    expect(() => page(date)).not.toThrow();
  });
});

describe("before and after term", () => {
  it("before January 12, says when the course starts and shows the first week", () => {
    for (const date of ["2026-11-10", "2027-01-05", "2027-01-11"]) {
      const m = now(date);
      expect(m.phase).toBe("before");
      expect(m.firstWeek.map((s) => s.number)).toEqual([1, 2]);
    }
    const html = page("2027-01-05");
    expect(html).toContain("<h1>Starts January 12</h1>");
    expect(html).toContain("The Sealed Position; Lab 0, Find the Script");
    expect(html).toContain("Lab 1, Be the Model; Charter, first draft");
    expect(html).not.toContain("Due");
  });

  it("on the first day, the course has started", () => {
    const m = now("2027-01-12");
    expect(m.phase).toBe("term");
    expect(m.next?.number).toBe(1);
    expect(page("2027-01-12")).toContain("Today’s session");
  });

  it("between the last session and the end of exam week, points to the final block", () => {
    for (const date of ["2027-04-30", "2027-05-04", "2027-05-07"]) expect(now(date).phase).toBe("finals");
    const html = page("2027-05-04");
    expect(html).toContain("May 3–7");
    expect(html).toContain("second paper sitting, exact slot to be supplied");
  });

  it("after the final block, shows a closing note", () => {
    for (const date of ["2027-05-08", "2027-05-10", "2027-08-01"]) expect(now(date).phase).toBe("after");
    expect(page("2027-05-10")).toContain("The course has ended");
  });
});

describe("the break and conference week are said plainly", () => {
  it("runs the break from its Monday through the weekend after", () => {
    expect(now("2027-03-07").phase).toBe("term");
    expect(now("2027-03-08").phase).toBe("break");
    expect(now("2027-03-14").phase).toBe("break");
    expect(now("2027-03-15").phase).toBe("term");
    const html = page("2027-03-10");
    expect(html).toContain("<h1>Mid-term break, no sessions</h1>");
    expect(html).toContain("March 8–12. Class meets again on Tuesday, March 16.");
  });

  it("warns of the break on the days after the last session before it", () => {
    const m = now("2027-03-06");
    expect(m.phase).toBe("term");
    expect(m.breakAhead?.start).toBe("2027-03-08");
    expect(m.next?.number).toBe(17);
    expect(page("2027-03-06")).toContain("Mid-term break, no sessions: March 8–12.");
  });

  it("says there is no class meeting in conference week", () => {
    expect(now("2027-04-15").phase).toBe("term"); // the Convention is that day
    expect(now("2027-04-16").phase).toBe("conference");
    expect(now("2027-04-22").phase).toBe("conference");
    expect(now("2027-04-23").phase).toBe("term");
    const html = page("2027-04-21");
    expect(html).toContain("<h1>Conference week</h1>");
    expect(html).toContain("No class meeting on Tuesday, April 20 or Thursday, April 22.");
  });
});

describe("the next session", () => {
  it("is today's session on a class day, with its AI marker", () => {
    const m = now("2027-02-09");
    expect(m.next?.number).toBe(9);
    const html = page("2027-02-09");
    expect(html).toContain("Today · Tuesday, February 9");
    expect(html).toContain("Knowing: bullshit and trust");
    expect(html).toContain('<span class="ai ai-off">AI off</span>');
    expect(html).toContain("A reading ticket is taken at the start.");
  });

  it("says AI is on for a lab, and that it needs no preparation until the day", () => {
    const before = page("2027-02-03");
    expect(before).toContain("Tomorrow · Thursday, February 4");
    expect(before).toContain('<span class="ai ai-on">AI on</span>');
    expect(before).toContain("No preparation needed.");
    expect(page("2027-02-04")).not.toContain("No preparation needed.");
  });
});

describe("what Thursday's lab left open", () => {
  it("shows the cycle's question from the day after the lab through the seminar", () => {
    expect(now("2027-02-04").openQuestion).toBeNull(); // lab day
    expect(now("2027-02-05").openQuestion?.cycle.number).toBe(4);
    expect(now("2027-02-09").openQuestion?.cycle.number).toBe(4); // seminar day
    expect(now("2027-02-10").openQuestion).toBeNull();
    const html = page("2027-02-06");
    expect(html).toContain("Left open by Thursday’s lab");
    expect(html).toContain("Can you rely on something indifferent to truth?");
    expect(html).toContain("Lab 4, The Calibration Game");
  });

  it("is absent in the studio weeks", () => {
    expect(now("2027-03-01").openQuestion).toBeNull();
  });
});

describe("what to read", () => {
  it("names the reading for the coming seminar, with roles and 'guide coming'", () => {
    const m = now("2027-02-06");
    expect(m.reading?.session.number).toBe(9);
    expect(m.reading?.readings.map((r) => r.slug)).toEqual(["hicks", "frankfurt"]);
    const html = page("2027-02-06");
    expect(html).toContain("Read before Tuesday, February 9");
    expect(html).toContain("Hicks, Humphries and Slater, “ChatGPT is bullshit” (2024), whole");
    expect(html).toContain("Frankfurt, “On Bullshit,” excerpt");
    expect(html).toContain("Guide coming");
  });

  it("cites books in italics and readings whose title is still to come", () => {
    expect(page("2027-01-25")).toContain("Borgmann, <cite>Technology and the Character of Contemporary Life</cite>, ch. 9 with an excerpt of ch. 23");
    expect(page("2027-02-01")).toContain("Maitra, Lang and Hernández Jurado, “How Shifting Responsibility for AI Harms Undermines Democratic Accountability,” Tech Policy Press (2025)");
    expect(page("2027-02-01")).toContain("Sinnott-Armstrong, “It's Not My Fault” (2005), excerpt");
    expect(page("2027-02-15")).toContain("Evidence packet on AI and learning");
  });

  it("says so when nothing is due to be read for two weeks", () => {
    expect(now("2027-02-24").reading).toBeNull();
    expect(page("2027-02-24")).toContain("No reading is due in the next two weeks.");
    expect(now("2027-03-17").reading?.session.number).toBe(21);
  });
});

describe("what is due", () => {
  it("shows Wednesday's Log from the Thursday before", () => {
    const m = now("2027-02-04");
    expect(m.due.map((d) => d.label)).toEqual(["Log 4"]);
    expect(m.dueIsLater).toBe(false);
    expect(page("2027-02-04")).toContain("Due Wednesday, February 10 by 9 p.m.");
    expect(page("2027-02-10")).toContain("Due today by 9 p.m.");
    expect(page("2027-02-09")).toContain("Due tomorrow, Wednesday, February 10 by 9 p.m.");
  });

  it("shows every deadline in the week when there are several", () => {
    const m = now("2027-03-29");
    expect(m.due.map((d) => [d.date, d.label])).toEqual([
      ["2027-03-30", "Case chosen"],
      ["2027-03-30", "Own case approved"],
      ["2027-03-31", "Log 10"],
    ]);
    const html = page("2027-03-29");
    expect(html).toContain("Due in the next seven days");
    expect(html).toContain("Position Paper: case chosen");
  });

  it("looks ahead to the next deadline when the week has none", () => {
    const m = now("2027-03-08"); // the break: Log 8 is not due until March 17
    expect(m.dueIsLater).toBe(true);
    expect(m.due.map((d) => d.label)).toEqual(["Log 8"]);
    expect(page("2027-03-08")).toContain("About the Exhibition build");
  });

  it("says nothing more is due once the last deadline has passed", () => {
    expect(now("2027-04-28").due).toEqual([]);
    expect(page("2027-04-28")).toContain("Nothing more is due outside class.");
  });

  it("shows 'link coming' until the Canvas link is set, then links to it", () => {
    expect(page("2027-02-04")).toContain("Hand it in on Canvas. Link coming.");
    const linked = renderNow(now("2027-02-04"), { ...ctx, canvasUrl: "https://canvas.example/courses/1" });
    expect(linked).toContain('<a href="https://canvas.example/courses/1">Hand it in on Canvas</a>');
  });
});

describe("the next two weeks", () => {
  it("lists sessions, deadlines and key dates day by day for fourteen days", () => {
    const m = now("2027-01-18");
    expect(m.ahead.map((d) => d.date)).toEqual([
      "2027-01-19", "2027-01-20", "2027-01-21", "2027-01-26", "2027-01-27", "2027-01-28",
    ]);
    expect(m.ahead[0]!.keyDates.map((k) => k.label)).toEqual(["Drop/add closes"]);
    expect(m.ahead[1]!.due.map((d) => d.label)).toEqual(["Log 1"]);
  });
});

describe("rendering is safe", () => {
  it("escapes text from content files", () => {
    const m = now("2027-02-09");
    const html = renderNow({ ...m, next: { ...m.next!, title: "<script>alert(1)</script>" } }, ctx);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
