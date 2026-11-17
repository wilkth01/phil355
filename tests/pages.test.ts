// Phase 2: the pieces behind the content pages. The reading guide's fixed
// sections, the course bot block's text, the Charter comparison, the
// contract self-check, and the links content files may write.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_STARTERS,
  assignmentContext,
  assignmentRule,
  assignmentStarters,
  contextLine,
  courseCode,
  cycleContext,
  cycleStarters,
  endSentence,
  labContext,
  readingContext,
  readingName,
  readingStarters,
} from "../src/lib/bot";
import { cleanCounts, emptyCounts, highestOpen, standing } from "../src/lib/contract";
import { countChanges, diffText, diffWords, similarity, toBlocks } from "../src/lib/diff";
import { GUIDE_SECTIONS, missingGuideSections, sectionHeadings } from "../src/lib/guide";
import { aiRuleMarker, linkFromHome, readingTitle } from "../src/lib/html";
import { buildSchedule } from "../src/lib/schedule";
import { site } from "../src/site.config";
import { loadBot, loadContract, loadRawContent } from "./helpers/content";

const raw = loadRawContent();
const schedule = buildSchedule(raw);
const code = courseCode(site.title);
const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

describe("reading guides", () => {
  const guide = GUIDE_SECTIONS.map((h) => `## ${h}\n\nText.\n`).join("\n");

  it("finds the section headings of a guide", () => {
    expect(sectionHeadings(guide)).toEqual([...GUIDE_SECTIONS]);
    expect(sectionHeadings("# Title\n\n### Smaller\n\n```\n## not a heading\n```\n")).toEqual([]);
  });

  it("accepts the five fixed sections, however they are capitalized", () => {
    expect(missingGuideSections([...GUIDE_SECTIONS])).toEqual([]);
    expect(missingGuideSections(["Why we’re reading it", "THREE THINGS TO FIND", "A hard passage", "The best reply", "Bring to class"])).toEqual([]);
  });

  it("stops the build when a core reading's guide has no reply to the author", () => {
    const withGuide = (headings: string[]) =>
      raw.readings.map((r) =>
        r.slug === "winner"
          ? { ...r, hasGuide: true, pages: 16, minutes: 60, access: "library" as const, guideHeadings: headings }
          : r,
      );
    const short = GUIDE_SECTIONS.filter((h) => h !== "The best reply");
    expect(() => buildSchedule({ ...raw, readings: withGuide([...short]) })).toThrow(/Reading "winner": the guide is missing the section "The best reply"/);
    expect(() => buildSchedule({ ...raw, readings: withGuide([...GUIDE_SECTIONS]) })).not.toThrow();
  });

  it("says “Guide coming” for every reading until its guide is written", () => {
    for (const r of Object.values(schedule.readings)) {
      expect(r.hasGuide, r.slug).toBe(false);
    }
  });
});

describe("every seeded item can have a page", () => {
  it("gives every reading a name to put in the page title", () => {
    for (const r of Object.values(schedule.readings)) {
      expect(readingName(r), r.slug).not.toBe("");
      expect(readingTitle(r), r.slug).not.toBe("");
    }
    expect(readingTitle(schedule.readings["winner"]!)).toBe("“Do Artifacts Have Politics?”");
    expect(readingTitle(schedule.readings["borgmann"]!)).toBe("<cite>Technology and the Character of Contemporary Life</cite>");
    expect(readingTitle(schedule.readings["klingsheim"]!)).toBe("Klingsheim");
  });

  it("names real sessions on every assignment that lists them", () => {
    const tickets = schedule.assignments.find((a) => a.slug === "reading-ticket")!;
    expect(tickets.sessions).toEqual(schedule.sessions.filter((s) => s.ticket).map((s) => s.number));
    const assignments = raw.assignments.map((a) => (a.slug === "exhibition" ? { ...a, sessions: [99] } : a));
    expect(() => buildSchedule({ ...raw, assignments })).toThrow(/The Exhibition: sessions lists 99/);
  });

  it("prints the five prompts on the Position Paper and four-minute case pages", () => {
    expect(schedule.assignments.filter((a) => a.showPrompts).map((a) => a.slug).sort()).toEqual(["four-minute-case", "position-paper"]);
    expect(schedule.assignments.find((a) => a.slug === "position-paper")!.cases).toBe("bank");
  });

  it("has the AI and help pages, and no syllabus until one is supplied", () => {
    expect(existsSync(join(src, "content", "pages", "ai.md"))).toBe(true);
    expect(existsSync(join(src, "content", "pages", "help.md"))).toBe(true);
  });

  it("marks each assignment's AI rule in words", () => {
    expect(aiRuleMarker("closed")).toContain(">AI closed<");
    expect(aiRuleMarker("required")).toContain(">AI required<");
    expect(aiRuleMarker("mixed")).toContain(">AI open, then closed<");
    expect(aiRuleMarker("none")).toBe("");
  });
});

describe("the course bot block", () => {
  it("opens every starter with a line that says where the student is", () => {
    expect(readingContext(code, schedule.readings["hicks"]!)).toBe(
      "I'm in PHIL 355, working on cycle 4: Hicks, Humphries and Slater, \"ChatGPT is bullshit.\"",
    );
    expect(readingContext(code, schedule.readings["winner"]!)).toBe(
      "I'm in PHIL 355, working on cycle 1: Winner, \"Do Artifacts Have Politics?\"",
    );
    expect(readingContext(code, schedule.readings["borgmann"]!)).toBe(
      "I'm in PHIL 355, working on cycle 2: Borgmann, Technology and the Character of Contemporary Life.",
    );
    const cycle4 = schedule.cycles.find((c) => c.number === 4)!;
    expect(cycleContext(code, cycle4, schedule.readings[cycle4.coreReading])).toBe(readingContext(code, schedule.readings["hicks"]!));
    expect(labContext(code, schedule.labs.find((l) => l.number === 4)!)).toBe("I'm in PHIL 355, working on Lab 4, The Calibration Game.");
    expect(assignmentContext(code, schedule.assignments.find((a) => a.slug === "log")!)).toBe(
      "I'm in PHIL 355, working on this assignment: Logs.",
    );
  });

  it("ends a sentence once", () => {
    expect(endSentence('He said "yes"')).toBe('He said "yes."');
    expect(endSentence("Done.")).toBe("Done.");
    expect(endSentence('Is it "so?"')).toBe('Is it "so?"');
    expect(contextLine("PHIL 355", "the Charter")).toBe("I'm in PHIL 355, working on the Charter.");
  });

  it("offers one to three starters on every page", () => {
    const sets = [
      ...Object.values(schedule.readings).map((r) => readingStarters(r, schedule.cycles.find((c) => c.number === r.cycle))),
      ...schedule.cycles.map(cycleStarters),
      ...schedule.assignments.map(assignmentStarters),
    ];
    for (const starters of sets) {
      expect(starters.length).toBeGreaterThanOrEqual(1);
      expect(starters.length).toBeLessThanOrEqual(3);
    }
  });

  it("uses the cycle's own starters on its core reading once they are written", () => {
    const cycle = { ...schedule.cycles[0]!, botStarters: ["Ask me what Winner means by politics."] };
    expect(readingStarters(schedule.readings[cycle.coreReading]!, cycle)).toEqual(cycle.botStarters);
    expect(readingStarters(schedule.readings["chiang-blurry-jpeg"]!, cycle)).toEqual(DEFAULT_STARTERS.reading);
    expect(cycleStarters(cycle)).toEqual(cycle.botStarters);
  });

  it("never offers a starter that asks the bot to write or summarize", () => {
    const all = [
      ...Object.values(DEFAULT_STARTERS).flat(),
      ...schedule.assignments.flatMap((a) => a.botStarters ?? []),
      ...schedule.cycles.flatMap((c) => c.botStarters),
    ];
    for (const starter of all) {
      expect(starter, starter).not.toMatch(/\b(summari[sz]e|write (it|this|my|a|the)|draft)\b(?! for me)/i);
    }
  });

  it("states the rule that applies to each assignment", () => {
    const rule = (slug: string) => assignmentRule(schedule.assignments.find((a) => a.slug === slug)!);
    expect(rule("log")).toBe("AI rule for this work: open, disclosed. Say what you used and what for.");
    expect(rule("reading-ticket")).toMatch(/^AI rule for this work: closed\. It is done without AI\./);
    expect(rule("exhibition")).toMatch(/^AI rule for this work: required\./);
    expect(rule("charter")).toBe("The Charter asks you to disclose AI use.");
  });

  it("lists what the bot will and won't do", () => {
    const bot = loadBot();
    expect(bot.does.length).toBeGreaterThan(0);
    expect(bot.doesNot.join(" ")).toMatch(/reading tickets/);
  });
});

describe("the Charter comparison", () => {
  const v1 = `# Class Charter

## Disclosure

Every assignment carries a note saying what was used.

- A teammate can expect an honest account.
- Breaking the Charter means a conversation with the class.

## Closed work

The closed list is reserved by the instructor.
`;
  const v2 = `# Class Charter

## Disclosure

Every assignment carries a one-line note saying what was used and what for.

- A teammate can expect an honest account.
- A teammate can expect a reply within a day.

## Closed work

The closed list is reserved by the instructor.

## Exhibits

Every placard names the tools the team used.
`;

  it("splits a text into headings, list items and paragraphs", () => {
    expect(toBlocks(v1).map((b) => b.type)).toEqual(["heading", "heading", "para", "item", "item", "heading", "para"]);
    expect(toBlocks("A **bold** word and a [link](/charter/).")[0]!.text).toBe("A bold word and a link.");
  });

  it("finds nothing changed between a text and itself", () => {
    const rows = diffText(v1, v1);
    expect(rows.every((r) => r.kind === "same")).toBe(true);
    expect(countChanges(rows)).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("marks what was reworded, added and removed", () => {
    const rows = diffText(v1, v2);
    expect(countChanges(rows)).toEqual({ added: 3, removed: 1, changed: 1 });

    const changed = rows.find((r) => r.kind === "changed");
    if (changed?.kind !== "changed") throw new Error("expected a reworded paragraph");
    expect(changed.after.filter((p) => p.change === "added").map((p) => p.text)).toEqual(["one-line", "used and what for."]);
    expect(changed.before.filter((p) => p.change === "removed").map((p) => p.text)).toEqual(["used."]);

    const removed = rows.filter((r) => r.kind === "removed").map((r) => (r.kind === "removed" ? r.block.text : ""));
    expect(removed).toEqual(["Breaking the Charter means a conversation with the class."]);
    const added = rows.filter((r) => r.kind === "added").map((r) => (r.kind === "added" ? r.block.text : ""));
    expect(added).toEqual(["A teammate can expect a reply within a day.", "Exhibits", "Every placard names the tools the team used."]);
  });

  it("keeps the unchanged text in order around the changes", () => {
    const rows = diffText(v1, v2);
    const after = rows.flatMap((r) => {
      if (r.kind === "same" || r.kind === "added") return [r.block.text];
      if (r.kind === "changed") return [r.after.map((p) => p.text).join(" ")];
      return [];
    });
    expect(after).toEqual(toBlocks(v2).map((b) => b.text));
  });

  it("compares words", () => {
    expect(similarity("a b c d", "a b c d")).toBe(1);
    expect(similarity("a b", "c d")).toBe(0);
    const { before, after } = diffWords("the class votes", "the whole class votes twice");
    expect(before).toEqual([{ text: "the class votes", change: "same" }]);
    expect(after).toEqual([
      { text: "the", change: "same" },
      { text: "whole", change: "added" },
      { text: "class votes", change: "same" },
      { text: "twice", change: "added" },
    ]);
  });
});

describe("the contract self-check", () => {
  const contract = loadContract();
  const check = (counts: Partial<ReturnType<typeof emptyCounts>>) => standing(contract, { ...emptyCounts(contract), ...counts });
  const status = (counts: Partial<ReturnType<typeof emptyCounts>>) => Object.fromEntries(check(counts).map((t) => [t.tier, t.status]));

  it("leaves every tier open on the first day", () => {
    expect(status({})).toEqual({ A: "todo", B: "todo", C: "todo" });
    expect(highestOpen(check({}))).toBe("A");
  });

  it("closes a tier when its absences are used up", () => {
    expect(status({ absences: 2 })).toEqual({ A: "todo", B: "todo", C: "todo" });
    expect(status({ absences: 3 })).toEqual({ A: "out", B: "todo", C: "todo" });
    expect(status({ absences: 5 })).toEqual({ A: "out", B: "out", C: "out" });
    expect(highestOpen(check({ absences: 5 }))).toBeNull();
  });

  it("closes a tier when too many tickets or Logs have been missed to reach its count", () => {
    // Nine tickets; A needs 8, B needs 7, C needs 6.
    expect(status({ ticketsMissed: 1 })).toEqual({ A: "todo", B: "todo", C: "todo" });
    expect(status({ ticketsMissed: 2 })).toEqual({ A: "out", B: "todo", C: "todo" });
    expect(status({ ticketsMissed: 4 })).toEqual({ A: "out", B: "out", C: "out" });
    // Twelve Logs; A needs 10, B needs 9, C needs 8.
    expect(status({ logsMissed: 3 })).toEqual({ A: "out", B: "todo", C: "todo" });
    expect(highestOpen(check({ logsMissed: 3 }))).toBe("B");
  });

  it("says how many more are needed and how many are still to come", () => {
    const tickets = check({ ticketsPassed: 5, ticketsMissed: 1 })[0]!.lines.find((l) => l.label === "Reading tickets passed")!;
    expect(tickets.status).toBe("todo");
    expect(tickets.detail).toBe("5 so far. 3 more needed; 3 still to come");
  });

  it("counts a tier as met only when everything it asks for is done", () => {
    const done = {
      ticketsPassed: 8,
      logsDone: 10,
      requiredDone: contract.requiredOfAll.map(() => true),
    };
    expect(status({ ...done, optionsDone: [false, false] })).toEqual({ A: "todo", B: "todo", C: "ok" });
    expect(status({ ...done, optionsDone: [true, false] })).toEqual({ A: "todo", B: "ok", C: "ok" });
    expect(status({ ...done, optionsDone: [true, true] })).toEqual({ A: "ok", B: "ok", C: "ok" });
  });

  it("tidies whatever is typed or found in storage", () => {
    expect(cleanCounts(contract, null)).toEqual(emptyCounts(contract));
    expect(cleanCounts(contract, { absences: "-3", ticketsPassed: "7.9", ticketsMissed: 40, logsDone: "abc", requiredDone: "yes" })).toEqual({
      ...emptyCounts(contract),
      ticketsPassed: 7,
      ticketsMissed: 2,
    });
    expect(cleanCounts(contract, { optionsDone: [true] }).optionsDone).toEqual([true, false]);
  });
});

describe("links written in content files", () => {
  it("adds the site's base path to a link written from the home page", () => {
    expect(linkFromHome('<a href="/charter/">x</a>', "/phil355/")).toBe('<a href="/phil355/charter/">x</a>');
    expect(linkFromHome('<a href="/phil355/charter/">x</a>', "/phil355/")).toBe('<a href="/phil355/charter/">x</a>');
    expect(linkFromHome('<a href="/charter/">x</a>', "/")).toBe('<a href="/charter/">x</a>');
  });

  it("leaves links to other sites alone", () => {
    const html = '<a href="https://www.widener.edu/">w</a> <a href="//example.org/">e</a> <a href="#top">t</a>';
    expect(linkFromHome(html, "/phil355/")).toBe(html);
  });
});
