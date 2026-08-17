import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import type { Plugin } from "vite";

/** The constant the site reads; Vite inlines it at build time. */
const TOKEN = "__BUNDLE_GZIP_BYTES__";

/**
 * Weighs the bundle the site advertises, so the headline figure comes from
 * the file itself rather than from a number somebody remembered to update.
 *
 * The target is `dist/split-flap.global.js` — what `unpkg.com/@sn0wfr/split-flap`
 * serves, and therefore exactly what a visitor following the script-tag
 * snippet downloads. Level 9 because that is what a CDN sends.
 *
 * `null` when the file is missing: `site:dev` runs Vite on its own, with no
 * `dist/` to read. The page drops the claim rather than printing a stale or
 * invented one; `site:build` builds the library first, so the deployed page
 * always carries a real measurement.
 */
export function bundleSize(file: string): Plugin {
  return {
    name: "split-flap:bundle-size",

    async config() {
      let bytes: number | null = null;
      try {
        bytes = gzipSync(await readFile(file), { level: 9 }).byteLength;
      } catch {
        console.warn(`[bundle-size] ${file} not built — hero size claim off.`);
      }
      return { define: { [TOKEN]: JSON.stringify(bytes) } };
    },
  };
}
