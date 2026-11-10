// @ts-check
import { defineConfig } from "astro/config";

// Where the site is served from. The defaults are the GitHub Pages address
// for wilkth01/phil355. To host the built folder somewhere else, set
// SITE_URL and BASE_PATH before building, for example:
//   SITE_URL=https://example.edu BASE_PATH=/ npm run build
const siteUrl = process.env.SITE_URL ?? "https://wilkth01.github.io";
const basePath = process.env.BASE_PATH ?? "/phil355";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: basePath,
  output: "static",
  trailingSlash: "always",
});
