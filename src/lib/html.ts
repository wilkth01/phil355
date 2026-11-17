// Small pieces of HTML shared by the pages built ahead of time and the
// home page, which redraws itself in the browser for today's date.

import type { Assignment, DueItem, Reading, Session } from "./schedule";
import { formatTime } from "./dates";
import { paths } from "./paths";

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

const RULE_WORDS: Record<Assignment["aiRule"], string> = {
  open: "AI open",
  closed: "AI closed",
  required: "AI required",
  mixed: "AI open, then closed",
  none: "",
};

/** The same marker for an assignment's rule: AI open, AI closed, AI required. */
export function aiRuleMarker(rule: Assignment["aiRule"]): string {
  const words = RULE_WORDS[rule];
  if (!words) return "";
  // Closed work is drawn like "AI off"; everything else like "AI on".
  return `<span class="ai ai-${rule === "closed" ? "off" : "on"} ai-rule-${rule}">${words}</span>`;
}

/**
 * In HTML made from a content file, turns a link written from the site's
 * home, such as href="/charter/", into one that includes the base path.
 */
export function linkFromHome(html: string, base: string): string {
  return html.replace(/href="\/(?!\/)([^"]*)"/g, (whole, rest: string) =>
    `/${rest}`.startsWith(base) ? whole : `href="${base}${rest}"`,
  );
}

export function link(href: string, html: string): string {
  return `<a href="${esc(href)}">${html}</a>`;
}

/** A reading's citation, linked to its page. */
export function citationLink(r: Reading, base: string): string {
  return link(paths.reading(base, r.slug), citation(r));
}

/** A reading's title alone, set as its kind of work asks: “Article,” <cite>Book</cite>, Packet. */
export function readingTitle(r: Reading): string {
  if (r.title === null) return r.author ? esc(r.author) : "";
  if (r.work === "book") return `<cite>${esc(r.title)}</cite>`;
  if (r.work === "packet") return esc(r.title);
  return `“${esc(r.title)}”`;
}

/** "Reading guide available", or what stands in for it. */
export function guideStatus(r: Reading): string {
  return r.hasGuide ? "Reading guide available" : "Guide coming";
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
