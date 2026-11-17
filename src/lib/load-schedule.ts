// Build-time only: reads the content collections and returns the Schedule.

import { getCollection } from "astro:content";
import { botSchema, contractSchema, promptsSchema, termSchema } from "../content/schemas";
import botJson from "../data/bot.json";
import contractJson from "../data/contract.json";
import promptsJson from "../data/prompts.json";
import termJson from "../data/term.json";
import { site } from "../site.config";
import { isIsoDate, todayIn, type IsoDate } from "./dates";
import { sectionHeadings } from "./guide";
import { linkFromHome } from "./html";
import { buildSchedule, type Schedule } from "./schedule";

let cached: Schedule | undefined;

export async function loadSchedule(): Promise<Schedule> {
  if (cached) return cached;

  const [sessions, cycles, readings, labs, assignments] = await Promise.all([
    getCollection("sessions"),
    getCollection("cycles"),
    getCollection("readings"),
    getCollection("labs"),
    getCollection("assignments"),
  ]);

  cached = buildSchedule({
    sessions: sessions.map((e) => {
      const html = e.rendered?.html?.trim();
      return { ...e.data, ...(html && { html: linkFromHome(html, base) }) };
    }),
    cycles: cycles.map((e) => e.data),
    readings: readings.map((e) => ({
      ...e.data,
      slug: e.id,
      hasGuide: (e.body ?? "").trim().length > 0,
      guideHeadings: sectionHeadings(e.body ?? ""),
    })),
    labs: labs.map((e) => e.data),
    assignments: assignments.map((e) => ({ ...e.data, slug: e.id })),
    term: termSchema.parse(termJson),
    config: { term: site.term, timezone: site.timezone, logDue: site.logDue },
  });
  return cached;
}

/**
 * The date the pages are drawn for when the site is built. Visitors with
 * JavaScript see today's view instead. Set BUILD_DATE=YYYY-MM-DD to build
 * as if it were another day.
 */
export function buildDate(): IsoDate {
  const override = process.env.BUILD_DATE;
  return isIsoDate(override) ? override : todayIn(site.timezone);
}

/** The site's base path, always ending in a slash. */
export const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

// ---- The single data files in src/data/ ----

export const loadContract = () => contractSchema.parse(contractJson);
export const loadPrompts = () => promptsSchema.parse(promptsJson);
export const loadBot = () => botSchema.parse(botJson);

/** A link into the Canvas course, or "" until site.canvasUrl is set. */
export function canvasLink(path?: string): string {
  const home = site.canvasUrl.trim();
  if (home === "") return "";
  return path ? `${home.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : home;
}
