import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { bundleSize } from "../scripts/bundle-size.js";
import { cssAsText } from "../scripts/vite-css-text.js";

const here = fileURLToPath(new URL(".", import.meta.url));

/** What unpkg serves for `@sn0wfr/split-flap`, and what the hero weighs. */
const cdnBundle = fileURLToPath(
  new URL("../dist/split-flap.global.js", import.meta.url),
);

export default defineConfig({
  root: here,
  // The site is served from https://sn0wfr.github.io/Split-flap/.
  base: process.env.SITE_BASE ?? "/Split-flap/",
  plugins: [cssAsText(), bundleSize(cdnBundle)],
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
