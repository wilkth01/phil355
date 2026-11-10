// The one place for course-wide settings. Every link to Canvas or to the
// course bot reads from here. Leave a value empty ("") until it is known:
// the page shows a plain "link coming" state and the build still passes.

export const site = {
  title: "PHIL 355 · Ethics of Artificial Intelligence",
  term: "Spring 2027",
  timezone: "America/New_York",
  instructor: { name: "Tom Wilk", email: "twilk@widener.edu", office: "Kapelski 205" },
  canvasUrl: "",        // course home in Canvas; empty until Tom supplies it
  botUrl: "",           // BoodleBox course bot share link; empty until Tom supplies it
  botName: "355 Study Partner",
  tallyApiUrl: "",      // Render service URL; empty disables class tallies and the site falls back to local-only
  logDue: { weekday: 3, time: "21:00" },   // Wednesday 9 p.m.
};

export type SiteConfig = typeof site;
