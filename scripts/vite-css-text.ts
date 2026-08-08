import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

/** Rollup convention: a leading NUL marks a module no other plugin may claim. */
const PREFIX = "\0split-flap-css:";

/**
 * Vite decides what is a stylesheet by matching `.css` at the end of an id
 * (or immediately before a query). Parking the real path behind this suffix
 * keeps the virtual module out of that filter.
 *
 * It has to name a language too, not just something that is not CSS. Rolldown
 * — Vite's bundler since 8 — infers a module's type from the extension on its
 * id, and treats a `.txt` one as text: the JavaScript returned from `load`
 * came back out of the build wrapped in a second string literal, so `styles`
 * held the source `export default "…"` rather than the stylesheet, and every
 * board rendered unstyled.
 */
const SUFFIX = ".js";

/** The one stylesheet that must resolve to a string rather than a stylesheet. */
const TARGET = "split-flap.css";

/**
 * `src/styles.ts` imports the library stylesheet as a string so the bundle can
 * inject it with no extra asset. tsup does this with esbuild's `text` loader;
 * Vite would otherwise hand the import to its own CSS pipeline, which exports
 * no default binding.
 *
 * Redirecting to a virtual module is what makes this reliable. Answering
 * `load` alone is not enough: Vite's CSS plugin resolves the real path first,
 * and its `transform` would overwrite whatever we returned.
 *
 * Scoped to the library's own stylesheet; the demo site's CSS still goes
 * through Vite's normal pipeline.
 */
export function cssAsText(): Plugin {
  return {
    name: "split-flap:css-as-text",
    enforce: "pre",

    resolveId(source, importer) {
      // Our own virtual id comes back through here; claim it unchanged
      // rather than prefixing it a second time.
      if (source.startsWith(PREFIX)) return source;
      if (!importer || !source.endsWith(TARGET)) return null;
      return PREFIX + resolve(dirname(importer), source) + SUFFIX;
    },

    async load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = id.slice(PREFIX.length, -SUFFIX.length);
      return {
        code: `export default ${JSON.stringify(await readFile(file, "utf8"))};`,
        // Said outright as well as spelt in the suffix, so the module stays
        // JavaScript however the id is read. Ignored by Vite's dev pipeline,
        // which has no module types to infer.
        moduleType: "js",
      };
    },
  };
}
