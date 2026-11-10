import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  assignmentSchema,
  caseSchema,
  charterSchema,
  cycleSchema,
  labSchema,
  pageSchema,
  readingSchema,
  sessionSchema,
} from "./content/schemas";

const markdownIn = (folder: string) => glob({ base: `./src/content/${folder}`, pattern: "**/*.md" });

export const collections = {
  sessions: defineCollection({ loader: markdownIn("sessions"), schema: sessionSchema }),
  cycles: defineCollection({ loader: markdownIn("cycles"), schema: cycleSchema }),
  readings: defineCollection({ loader: markdownIn("readings"), schema: readingSchema }),
  labs: defineCollection({ loader: markdownIn("labs"), schema: labSchema }),
  assignments: defineCollection({ loader: markdownIn("assignments"), schema: assignmentSchema }),
  charter: defineCollection({ loader: markdownIn("charter"), schema: charterSchema }),
  cases: defineCollection({ loader: markdownIn("cases"), schema: caseSchema }),
  pages: defineCollection({ loader: markdownIn("pages"), schema: pageSchema }),
};
