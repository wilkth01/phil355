// Small pieces of HTML shared by the pages built ahead of time and the
// home page, which redraws itself in the browser for today's date.

import type { DueItem, Reading, Session } from "./schedule";
import { formatTime } from "./dates";

export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const KIND_LABELS: Record<Session["kind"], string> = {
  opener: "Opener",
  lab: "Lab",
  seminar: "Seminar",
  studio: "Studio",
  crit: "Crit",
  exhibition: "Exhibition",
  debrief: "Debrief",
  convention: "Convention",
  conference: "Conferences",
  synthesis: "Synthesis",
  paper: "Paper",
};

export function kindLabel(kind: Session["kind"]): string {
  return KIND_LABELS[kind];
}

const ROLE_LABELS: Record<Reading["role"], string> = {
  core: "Core",
  companion: "Also assigned",
  optional: "Optional",
};

export function roleLabel(role: Reading["role"]): string {
  return ROLE_LABELS[role];
}

/** The AI on / AI off marker. Always in words; color only reinforces it. */
export function aiMarker(ai: "on" | "off"): string {
  return `<span class="ai ai-${ai}">AI ${ai}</span>`;
}

/**
 * A reading as the course cites it:
 *   Winner, “Do Artifacts Have Politics?” (1980), whole
 *   Borgmann, <cite>Technology and the Character of Contemporary Life</cite>, ch. 9 …
 */
export function citation(r: Reading): string {
  const source = r.source ? esc(r.source) : "";
  const year = r.year !== null ? ` (${r.year})` : "";
  const excerpt = r.excerpt !== undefined ? esc(r.excerpt) : "";

  // Is the title followed directly by a comma (before a source, or before
  // the excerpt when there is no year)?
  const commaAfterTitle = source !== "" || (year === "" && excerpt !== "");

  let title = "";
  if (r.title !== null) {
    if (r.work === "book") {
      title = `<cite>${esc(r.title)}</cite>${commaAfterTitle ? "," : ""}`;
    } else if (r.work === "packet") {
      title = `${esc(r.title)}${commaAfterTitle ? "," : ""}`;
    } else {
      // American style: the comma goes inside the closing quotation mark,
      // and is dropped after a question mark or exclamation point.
      const comma = commaAfterTitle && !/[?!]$/.test(r.title) ? "," : "";
      title = `“${esc(r.title)}${comma}”`;
    }
  }

  let out = r.author ? esc(r.author) : "";
  if (title) out = out ? `${out}, ${title}` : title;
  if (source) out = title ? `${out} ${source}` : out ? `${out}, ${source}` : source;
  out += year;
  if (excerpt) out += year || !title || source ? `, ${excerpt}` : ` ${excerpt}`;
  return out;
}

/** "12 pages · about 40 minutes", or "" when neither is known. */
export function readingLength(r: Reading): string {
  const bits: string[] = [];
  if (r.pages !== null) bits.push(`${r.pages} ${r.pages === 1 ? "page" : "pages"}`);
  if (r.minutes !== null) bits.push(`about ${r.minutes} minutes`);
  return bits.join(" · ");
}

/** "Log 4" or "Position Paper: case chosen". */
export function dueLabel(d: DueItem): string {
  // Labels such as "Log 4" and "Public piece due" already name their assignment.
  const named = d.label.toLowerCase().includes(d.assignmentTitle.toLowerCase().replace(/s$/, ""));
  return named ? d.label : `${d.assignmentTitle}: ${d.label.charAt(0).toLowerCase()}${d.label.slice(1)}`;
}

/** " by 9 p.m." or "". */
export function dueTime(d: DueItem): string {
  return d.time ? ` by ${formatTime(d.time)}` : "";
}
