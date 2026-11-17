// A reading guide has five fixed sections. This checks a guide's headings
// against them, so a guide cannot go up with one missing.

export const GUIDE_SECTIONS = [
  "Why we are reading it",
  "Three things to find",
  "A hard passage",
  "The best reply",
  "Bring to class",
] as const;

/** Lower case, letters and digits only, with "we're" read as "we are". */
function normalize(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/we[’']re/g, "we are")
    .replace(/[^a-z0-9]+/g, "");
}

/** The "## " headings of a Markdown body, in order. */
export function sectionHeadings(markdown: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push(match[1]!);
  }
  return headings;
}

/** The fixed sections that none of these headings matches. */
export function missingGuideSections(headings: string[]): string[] {
  const have = new Set(headings.map(normalize));
  return GUIDE_SECTIONS.filter((section) => !have.has(normalize(section)));
}
