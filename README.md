# PHIL 355 course site

The course site for PHIL 355, Ethics of Artificial Intelligence, Widener University, Spring 2027.

This is the Phase 0 scaffold. The full guide to editing content and deploying is written in Phase 5.

## Run it

You need Node 22.23.4 or newer.

```bash
npm install
```

```bash
npm run build
```

`npm run build` type-checks the project and writes the finished site to `dist/`. That folder can be hosted anywhere.

To work on the site with live reload:

```bash
npm run dev
```

## Deploy

Every push to `main` builds and publishes the site to GitHub Pages at <https://wilkth01.github.io/phil355/>. The workflow is in `.github/workflows/deploy.yml`.

To host the built folder at a different address, set `SITE_URL` and `BASE_PATH` before building. See `astro.config.mjs`.

## Settings

Course-wide settings (instructor, Canvas link, bot link) live in `src/site.config.ts`.
