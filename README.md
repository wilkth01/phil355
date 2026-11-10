# PHIL 355 course site

The course site for PHIL 355, Ethics of Artificial Intelligence, Widener University, Spring 2027.

This README covers the basics as of Phase 1. The full guide to editing content and deploying is written in Phase 5.

## Run it

You need Node 22.23.4 or newer.

```bash
npm install
```

```bash
npm run build
```

`npm run build` type-checks the project, checks every content file, and writes the finished site to `dist/`. That folder can be hosted anywhere.

To work on the site with live reload:

```bash
npm run dev
```

To run the tests (date logic, and the content checked against the course plan):

```bash
npm test
```

## Preview any day

Add `?date=YYYY-MM-DD` to any page's address to see it as it will look that day, for example:

<https://wilkth01.github.io/phil355/?date=2027-02-09>

The date stays with you as you move between pages. "Back to today" in the banner clears it.

## Where the content lives

| What | Where |
| --- | --- |
| Sessions, one file each | `src/content/sessions/` |
| Cycles | `src/content/cycles/` |
| Readings; the file name is the reading's short name | `src/content/readings/` |
| Labs | `src/content/labs/` |
| Assignments, with their due dates | `src/content/assignments/` |
| Key dates: break, AI Week, exam week | `src/data/term.json` |
| Contract tiers | `src/data/contract.json` |
| The five prompts | `src/data/prompts.json` |
| Instructor, Canvas link, bot link | `src/site.config.ts` |

Every date on the site comes from these files. Change a session's `date` and the schedule and home page follow.

The build stops with a plain message when a file is missing a required field, has a misspelled field name, names a reading that does not exist, or puts a Log on the wrong day of the week. A reading's `pages`, `minutes` and `access` may be `null` until its guide is written; once the file has a guide, they must be filled in.

## Deploy

Every push to `main` runs the tests, builds, and publishes the site to GitHub Pages at <https://wilkth01.github.io/phil355/>. It also rebuilds itself every night, so the home page is current even for a visitor with JavaScript turned off. The workflow is in `.github/workflows/deploy.yml`.

To host the built folder at a different address, set `SITE_URL` and `BASE_PATH` before building. See `astro.config.mjs`.
