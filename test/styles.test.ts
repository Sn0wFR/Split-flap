import { resolve } from "node:path";
import { build } from "vite";
import { expect, it } from "vitest";
import { cssAsText } from "../scripts/vite-css-text.js";
import { styles } from "../src/styles.js";

const root = resolve(import.meta.dirname, "..");

/**
 * A stylesheet opens on its own banner comment. Read the opening rather than
 * the whole of it: the failure this guards against is the entire stylesheet
 * quoted inside a string, and an unbounded assertion prints all of it.
 */
function opening(css: string): string {
  return css.slice(0, 3);
}

it("exports the stylesheet as its own text", () => {
  expect(opening(styles)).toBe("/*!");
  expect(styles).toContain(".sf__flap {");
});

/**
 * The same import, put through a real bundle.
 *
 * `src/styles.ts` imports a stylesheet as a string, which every toolchain has
 * to be told about separately — the plugin under `scripts/` answers for Vite.
 * The import above cannot stand in for this one: the dev pipeline that serves
 * these tests takes a module's language from the plugin that loaded it, while
 * the bundler infers it from the extension on the id, and it was the bundler
 * that once read the loaded JavaScript as text and handed `styles` its own
 * source. Boards then rendered with no stylesheet at all — every flap showing
 * its glyph on both halves, so the whole site read double.
 */
it("keeps the stylesheet text through a bundled build", async () => {
  const result = await build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [cssAsText()],
    build: {
      write: false,
      lib: { entry: "src/styles.ts", formats: ["es"], fileName: "styles" },
    },
  });

  const bundle = (Array.isArray(result) ? result[0] : result) as {
    output: Array<{ type: string; code?: string }>;
  };
  const code = bundle.output
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code ?? "")
    .join("\n");

  // Run what was built: only the value the browser ends up with can tell a
  // stylesheet apart from a string that merely quotes one.
  const built = (await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  )) as { styles: string };

  expect(opening(built.styles)).toBe("/*!");
  expect(built.styles).toContain(".sf__flap {");
});
