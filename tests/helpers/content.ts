// Reads the content files straight from disk for tests, checking each one
// against the same schemas the site build uses.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { z } from "astro/zod";
import {
  assignmentSchema,
  contractSchema,
  cycleSchema,
  labSchema,
  promptsSchema,
  readingSchema,
  sessionSchema,
  termSchema,
} from "../../src/content/schemas";
import type { RawContent } from "../../src/lib/schedule";
import { site } from "../../src/site.config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

/** Splits a Markdown file into its front matter (parsed) and its body. */
export function parseFile(source: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) throw new Error("File has no front matter");
  return { data: parse(match[1]!), body: match[2]! };
}

function readCollection<S extends z.ZodType>(folder: string, schema: S) {
  const dir = join(root, "content", folder);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const { data, body } = parseFile(readFileSync(join(dir, name), "utf8"));
      const result = schema.safeParse(data);
      if (!result.success) throw new Error(`${folder}/${name}: ${result.error.message}`);
      return { id: name.replace(/\.md$/, ""), data: result.data as z.infer<S>, body };
    });
}

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(root, "data", name), "utf8"));
}

export function loadRawContent(): RawContent {
  return {
    sessions: readCollection("sessions", sessionSchema).map((e) => e.data),
    cycles: readCollection("cycles", cycleSchema).map((e) => e.data),
    readings: readCollection("readings", readingSchema).map((e) => ({
      ...e.data,
      slug: e.id,
      hasGuide: e.body.trim().length > 0,
    })),
    labs: readCollection("labs", labSchema).map((e) => e.data),
    assignments: readCollection("assignments", assignmentSchema).map((e) => ({ ...e.data, slug: e.id })),
    term: termSchema.parse(readJson("term.json")),
    config: { term: site.term, timezone: site.timezone, logDue: site.logDue },
  };
}

export const loadContract = () => contractSchema.parse(readJson("contract.json"));
export const loadPrompts = () => promptsSchema.parse(readJson("prompts.json"));
