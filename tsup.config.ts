import { copyFile } from "node:fs/promises";
import { defineConfig } from "tsup";

/** esbuild inlines the stylesheet as a string via the `text` loader. */
const cssAsText = { ".css": "text" } as const;

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      element: "src/element.entry.ts",
      react: "src/react.ts",
    },
    format: ["esm", "cjs"],
    target: "es2020",
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    loader: { ...cssAsText },
    // React is an optional peer: never bundle it.
    external: ["react"],
    async onSuccess() {
      // Ship the raw stylesheet too, for bundlers that own CSS themselves.
      await copyFile("src/split-flap.css", "dist/split-flap.css");
    },
  },
  {
    // tsup appends `.global` for the IIFE format, giving split-flap.global.js.
    entry: { "split-flap": "src/global.ts" },
    format: ["iife"],
    globalName: "SplitFlapLib",
    target: "es2020",
    minify: true,
    sourcemap: true,
    loader: { ...cssAsText },
    external: ["react"],
  },
]);
