import css from "./split-flap.css";

/** The bundled stylesheet as a string, for manual injection or SSR. */
export const styles: string = css;

const MARKER = "data-split-flap";
let injected = false;

/**
 * Add the stylesheet to the document once.
 *
 * Called automatically on construction unless `injectStyles: false` is set.
 * Import `@sn0wfr/split-flap/style.css` instead if your bundler owns CSS.
 */
export function ensureStyles(
  doc: Document | null = globalThis.document ?? null,
): void {
  if (!doc) return;
  if (injected && doc === globalThis.document) return;
  if (doc.head.querySelector(`style[${MARKER}]`)) {
    injected = true;
    return;
  }

  const tag = doc.createElement("style");
  tag.setAttribute(MARKER, "");
  tag.textContent = css;
  doc.head.prepend(tag);
  injected = true;
}
