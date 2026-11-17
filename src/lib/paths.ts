// The address of every kind of page. `base` is the site's base path and
// always ends in a slash.

export const paths = {
  home: (base: string) => base,
  schedule: (base: string) => `${base}schedule/`,
  week: (base: string, monday: string) => `${base}schedule/#week-${monday}`,
  cycles: (base: string) => `${base}cycles/`,
  cycle: (base: string, n: number) => `${base}cycles/${n}/`,
  readings: (base: string) => `${base}readings/`,
  reading: (base: string, slug: string) => `${base}readings/${slug}/`,
  labs: (base: string) => `${base}labs/`,
  lab: (base: string, n: number) => `${base}labs/${n}/`,
  assignments: (base: string) => `${base}assignments/`,
  assignment: (base: string, slug: string) => `${base}assignments/${slug}/`,
  charter: (base: string) => `${base}charter/`,
  contract: (base: string) => `${base}contract/`,
  ai: (base: string) => `${base}ai/`,
  help: (base: string) => `${base}help/`,
  syllabus: (base: string) => `${base}syllabus/`,
};
