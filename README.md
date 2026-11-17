# PHIL 355 course site

The course site for PHIL 355, Ethics of Artificial Intelligence, Widener University, Spring 2027.

This README covers the basics as of Phase 2. The full guide to editing content and deploying is written in Phase 5.

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

To run the tests (date logic, the content checked against the course plan, and the page logic):

```bash
npm test
```

## Preview any day

Add `?date=YYYY-MM-DD` to any page's address to see it as it will look that day, for example:

<https://wilkth01.github.io/phil355/?date=2027-02-09>

The date stays with you as you move between pages. "Back to today" in the banner clears it.

`?date=` changes what the browser shows. It cannot show a Position Paper case before its `publishOn` date, because unpublished cases are left out of the built site. To build the site as of another day, set `BUILD_DATE=YYYY-MM-DD` before `npm run build`.

## Where the content lives

| What | Where |
| --- | --- |
| Sessions, one file each | `src/content/sessions/` |
| Cycles | `src/content/cycles/` |
| Readings and their guides; the file name is the reading's short name | `src/content/readings/` |
| Labs and their lab sheets | `src/content/labs/` |
| Assignments, with their due dates and page text | `src/content/assignments/` |
| Charter versions, one file each | `src/content/charter/` |
| Four-minute cases and the Position Paper case bank | `src/content/cases/` |
| The AI rules, help, and syllabus pages | `src/content/pages/ai.md`, `help.md`, `syllabus.md` |
| Key dates: break, AI Week, exam week | `src/data/term.json` |
| Contract tiers | `src/data/contract.json` |
| The five prompts | `src/data/prompts.json` |
| What the course bot will and won't do | `src/data/bot.json` |
| Instructor, Canvas link, bot link | `src/site.config.ts` |

Every date on the site comes from these files. Change a session's `date` and the schedule, home page, cycle pages and assignment pages follow.

The build stops with a plain message when a file is missing a required field, has a misspelled field name, names a reading that does not exist, or puts a Log on the wrong day of the week.

## Adding content

Each of these is a Markdown file: settings between the `---` lines at the top, then the text.

**A reading guide.** Write the guide under the settings in the reading's file. A core reading's guide must have these five headings, each starting with `## `:

```
## Why we are reading it
## Three things to find
## A hard passage
## The best reply
## Bring to class
```

Once a file has a guide, its `pages`, `minutes` and `access` (`canvas`, `library` or `open`) must be filled in; until then they may be `null` and the page says "Guide coming." Add `url` when the text is free online. Do not put the text of a reading, or a PDF of one, in this repository.

**A lab sheet.** Write it under the settings in the lab's file. The page shows only "No preparation needed" until the lab's `revealOn` date.

**A Charter version.** Add a file to `src/content/charter/`, for example `v1.md`:

```
---
version: 1
date: 2027-01-14
status: draft
---
The text of the Charter.
```

`status` is `draft`, `amended` or `ratified`. The page shows the newest version, marks what changed from the one before, and keeps earlier versions.

**A case.** Add a file to `src/content/cases/` with `set` (`four-minute` or `bank`), `publishOn`, and `title`. A case appears on its assignment page from its `publishOn` date. Put only what students should see in the file: a four-minute case's complicating fact stays off the site.

**The syllabus.** Create `src/content/pages/syllabus.md` with a `title` and the text. Until that file exists the page says the syllabus is coming.

**Links between pages.** Write them from the top of the site, with a slash at each end: `[the contract](/contract/)`, `[Lab 4](/labs/4/)`, `[Hicks](/readings/hicks/)`.

**Optional settings on an assignment.** `botStarters` (opening messages for the course bot; readings and labs take it too), `sessions` (session numbers to list on the assignment's timeline), `showPrompts: true` (show the five prompts), `cases` (`four-minute` or `bank`: show that set of cases).

### What the site hides, and what it does not

This repository is public. Anything committed to it can be read on GitHub, whatever the site shows. The date rules only control the pages: a lab sheet is hidden until `revealOn`, and a case is left out until `publishOn`. To keep something private until its day, do not commit it until that day. Reading-ticket questions and the complicating facts for four-minute cases never belong here.

## The course bot and Canvas

`botUrl` and `canvasUrl` in `src/site.config.ts` are empty for now. While they are, every bot block says the link is coming and still shows the opening messages to copy, and "On Canvas" appears without a link. Fill them in and the links appear everywhere.

## Fonts

Source Serif 4 and Source Sans 3, served from the site itself (the `@fontsource-variable` packages; SIL Open Font License). Nothing is loaded from another site.

## Deploy

Every push to `main` runs the tests, builds, and publishes the site to GitHub Pages at <https://wilkth01.github.io/phil355/>. It also rebuilds itself every night, so the home page is current even for a visitor with JavaScript turned off, and cases appear on their `publishOn` date. The workflow is in `.github/workflows/deploy.yml`.

To host the built folder at a different address, set `SITE_URL` and `BASE_PATH` before building. See `astro.config.mjs`.
