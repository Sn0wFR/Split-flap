import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { cssAsText } from "../scripts/vite-css-text.js";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: here,
  // The site is served from https://sn0wfr.github.io/Split-flap/.
  base: process.env.SITE_BASE ?? "/Split-flap/",
  plugins: [cssAsText()],
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
