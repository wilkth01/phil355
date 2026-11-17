// Compares two versions of the Charter so the page can mark what changed.
//
// The text is compared a block at a time (a paragraph, a heading, a list
// item). A block that was reworded is shown before and after, with the
// words that were removed and added marked.

export interface Block {
  type: "heading" | "item" | "para";
  text: string;
}

export interface Piece {
  text: string;
  change: "same" | "removed" | "added";
}

export type Row =
  | { kind: "same"; block: Block }
  | { kind: "added"; block: Block }
  | { kind: "removed"; block: Block }
  | { kind: "changed"; type: Block["type"]; before: Piece[]; after: Piece[] };

/** Two blocks count as one reworded block when they share at least this much. */
const REWORDED = 0.4;

/** Markdown emphasis marks and links, reduced to their text. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_]+)[*_](?=$|[\s).,;:!?])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits Markdown into headings, list items and paragraphs. */
export function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let item: string[] | null = null;

  const flush = () => {
    if (item) blocks.push({ type: "item", text: plain(item.join(" ")) });
    else if (para.length > 0) blocks.push({ type: "para", text: plain(para.join(" ")) });
    para = [];
    item = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    const listItem = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (line.trim() === "") {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", text: plain(heading[1]!) });
    } else if (listItem) {
      flush();
      item = [listItem[1]!];
    } else if (item) {
      item.push(line.trim());
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks.filter((b) => b.text !== "");
}

/** The pairs (i, j) of a longest common subsequence of a and b. */
function lcs<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): Array<[number, number]> {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] = same(a[i]!, b[j]!)
        ? table[(i + 1) * cols + j + 1]! + 1
        : Math.max(table[(i + 1) * cols + j]!, table[i * cols + j + 1]!);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i]!, b[j]!)) pairs.push([i++, j++]);
    else if (table[(i + 1) * cols + j]! >= table[i * cols + j + 1]!) i++;
    else j++;
  }
  return pairs;
}

const words = (text: string) => text.split(" ").filter(Boolean);

/** How much two texts share, from 0 (nothing) to 1 (identical). */
export function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.length + y.length === 0) return 1;
  return (2 * lcs(x, y, (p, q) => p === q).length) / (x.length + y.length);
}

function push(pieces: Piece[], text: string, change: Piece["change"]) {
  const last = pieces[pieces.length - 1];
  if (last && last.change === change) last.text += ` ${text}`;
  else pieces.push({ text, change });
}

/** Word-by-word comparison of two texts. */
export function diffWords(before: string, after: string): { before: Piece[]; after: Piece[] } {
  const x = words(before);
  const y = words(after);
  const pairs = lcs(x, y, (p, q) => p === q);
  const out = { before: [] as Piece[], after: [] as Piece[] };
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...pairs, [x.length, y.length] as [number, number]]) {
    while (i < pi) push(out.before, x[i++]!, "removed");
    while (j < pj) push(out.after, y[j++]!, "added");
    if (pi < x.length) {
      push(out.before, x[i++]!, "same");
      push(out.after, y[j++]!, "same");
    }
  }
  return out;
}

/**
 * Lines up a run of removed blocks with a run of added blocks, keeping
 * their order, pairing the ones that are rewordings of each other.
 */
function pairReworded(removed: Block[], added: Block[]): Row[] {
  const rows = removed.length + 1;
  const cols = added.length + 1;
  const score = new Float64Array(rows * cols);
  const sim = (i: number, j: number) =>
    removed[i]!.type === added[j]!.type ? similarity(removed[i]!.text, added[j]!.text) : 0;

  for (let i = removed.length - 1; i >= 0; i--) {
    for (let j = added.length - 1; j >= 0; j--) {
      const s = sim(i, j);
      const paired = s >= REWORDED ? score[(i + 1) * cols + j + 1]! + s : -1;
      score[i * cols + j] = Math.max(paired, score[(i + 1) * cols + j]!, score[i * cols + j + 1]!);
    }
  }

  const out: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < removed.length && j < added.length) {
    const s = sim(i, j);
    const here = score[i * cols + j]!;
    if (s >= REWORDED && here === score[(i + 1) * cols + j + 1]! + s) {
      out.push({ kind: "changed", type: added[j]!.type, ...diffWords(removed[i]!.text, added[j]!.text) });
      i++;
      j++;
    } else if (here === score[(i + 1) * cols + j]!) {
      out.push({ kind: "removed", block: removed[i++]! });
    } else {
      out.push({ kind: "added", block: added[j++]! });
    }
  }
  while (i < removed.length) out.push({ kind: "removed", block: removed[i++]! });
  while (j < added.length) out.push({ kind: "added", block: added[j++]! });
  return out;
}

/** Compares two Markdown texts block by block. */
export function diffText(before: string, after: string): Row[] {
  const a = toBlocks(before);
  const b = toBlocks(after);
  const same = (x: Block, y: Block) => x.type === y.type && x.text === y.text;
  const out: Row[] = [];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...lcs(a, b, same), [a.length, b.length] as [number, number]]) {
    if (pi > i || pj > j) out.push(...pairReworded(a.slice(i, pi), b.slice(j, pj)));
    if (pi < a.length) out.push({ kind: "same", block: a[pi]! });
    i = pi + 1;
    j = pj + 1;
  }
  return out;
}

/** How many blocks were added, removed and reworded. */
export function countChanges(rows: Row[]): { added: number; removed: number; changed: number } {
  const count = { added: 0, removed: 0, changed: 0 };
  for (const row of rows) if (row.kind !== "same") count[row.kind]++;
  return count;
}
