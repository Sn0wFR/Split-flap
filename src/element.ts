import { SplitFlap } from "./core.js";
import type {
  Align,
  ColorMap,
  FlapColor,
  SetOptions,
  SplitFlapOptions,
  ThemeName,
} from "./types.js";

/**
 * Read the `colors` attribute.
 *
 * The compact form reads like an inline style, which is what it is —
 * `colors="DELAYED: #d9a406; CANCELLED: #b3261e"`. Pairs are separated by
 * semicolons rather than the commas `words` uses, because a CSS colour is
 * allowed to contain a comma and `rgb(163, 43, 34)` must survive.
 *
 * JSON is accepted too, for the one thing the compact form cannot say: a
 * glyph colour alongside its background.
 *
 * Anything unparseable yields an empty map rather than throwing. An
 * attribute is not somewhere a caller can catch anything, and clearing the
 * colours makes the mistake visible without taking the display down.
 */
function parseColors(raw: string): ColorMap {
  const source = raw.trim();
  if (!source) return {};

  if (source.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(source);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed as Record<string, FlapColor>;
    } catch {
      return {};
    }
  }

  const map: Record<string, FlapColor> = {};
  for (const pair of source.split(";")) {
    const split = pair.indexOf(":");
    if (split === -1) continue;
    const key = pair.slice(0, split).trim();
    const value = pair.slice(split + 1).trim();
    if (key && value) map[key] = value;
  }
  return map;
}

/**
 * `<split-flap>` — the same display as a native custom element.
 *
 * Renders in light DOM, so the element's own text content acts as a no-JS
 * fallback and page-level CSS still reaches the flaps:
 *
 * ```html
 * <split-flap length="10" chars="letters">DEPARTURES</split-flap>
 * ```
 */
export class SplitFlapElement extends HTMLElement {
  static readonly observedAttributes = [
    "value",
    "length",
    "chars",
    "words",
    "align",
    "pad-char",
    "duration",
    "stagger",
    "jitter",
    "min-steps",
    "extra-loops",
    "uppercase",
    "normalize",
    "theme",
    "colors",
    "size",
    "sound",
    "volume",
    "live",
  ];

  /** The underlying instance, available once the element is connected. */
  display: SplitFlap | null = null;

  private booted = false;

  connectedCallback(): void {
    if (this.booted) return;
    this.booted = true;

    // Text between the tags is the pre-hydration fallback and the initial
    // value, unless a `value` attribute overrides it.
    const options = this.readOptions();
    const inline = this.takeInlineText();
    if (options.value === undefined && inline) options.value = inline;

    this.display = new SplitFlap(this, options);

    // The HTML parser upgrades a custom element the moment it reads the
    // opening tag, so inline text is often still on its way at this point.
    // Look again once the current task — and then the parse — is done.
    if (options.value === undefined) {
      queueMicrotask(() => this.adoptInlineText());
      if (this.ownerDocument.readyState === "loading") {
        this.ownerDocument.addEventListener(
          "DOMContentLoaded",
          () => this.adoptInlineText(),
          { once: true },
        );
      }
    }
  }

  disconnectedCallback(): void {
    this.display?.destroy();
    this.display = null;
    this.booted = false;
  }

  attributeChangedCallback(
    name: string,
    previous: string | null,
    next: string | null,
  ): void {
    if (!this.display || previous === next) return;

    if (name === "value") {
      void this.display.set(next ?? "");
      return;
    }
    this.display.setOptions(this.readOptions());
  }

  /* --- properties, so frameworks can bind without string coercion ---- */

  get value(): string {
    return this.display?.value ?? this.getAttribute("value") ?? "";
  }

  set value(next: string) {
    this.setAttribute("value", next);
  }

  /**
   * Animate to a value and await the settle, bypassing the attribute.
   *
   * Options are forwarded to the display, so `{ immediate: true }` repaints
   * without animating — the only way to reset a board that already shows a
   * value without the two animations colliding.
   */
  set(next: string, setOptions?: SetOptions): Promise<void> {
    return this.display?.set(next, setOptions) ?? Promise.resolve();
  }

  /**
   * Pull the element's own text nodes out, leaving the rendered flaps alone.
   * They are the no-JS fallback, and must not linger next to the display.
   */
  private takeInlineText(): string {
    let text = "";
    for (const node of [...this.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent ?? "";
        node.remove();
      }
    }
    return text.trim();
  }

  /** Adopt fallback text that the parser delivered after we booted. */
  private adoptInlineText(): void {
    if (!this.display || this.hasAttribute("value")) return;
    const text = this.takeInlineText();
    // No animation: this is the element's first paint, not a value change.
    if (text) void this.display.set(text, { immediate: true });
  }

  private readOptions(): SplitFlapOptions {
    const options: SplitFlapOptions = {};

    const text = (name: string) => this.getAttribute(name) ?? undefined;
    const num = (name: string) => {
      const raw = this.getAttribute(name);
      if (raw === null || raw.trim() === "") return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    /** Present-but-empty counts as true, matching `disabled`-style booleans. */
    const bool = (name: string) => {
      const raw = this.getAttribute(name);
      if (raw === null) return undefined;
      return raw !== "false" && raw !== "0";
    };

    const assign = <K extends keyof SplitFlapOptions>(
      key: K,
      value: SplitFlapOptions[K] | undefined,
    ) => {
      if (value !== undefined) options[key] = value;
    };

    assign("value", text("value"));
    assign("length", num("length"));
    assign("chars", text("chars"));
    // Comma-separated, so `words="PARIS, LONDON"` reads naturally in markup.
    // Empty entries are dropped: the blank leaf is added by the display.
    const words = text("words");
    if (words !== undefined) {
      options.words = words
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean);
    }
    assign("align", text("align") as Align | undefined);
    assign("padChar", text("pad-char"));
    assign("duration", num("duration"));
    assign("stagger", num("stagger"));
    assign("jitter", num("jitter"));
    assign("minSteps", num("min-steps"));
    assign("extraLoops", num("extra-loops"));
    assign("uppercase", bool("uppercase"));
    assign("normalize", bool("normalize"));
    assign("theme", text("theme") as ThemeName | undefined);
    const colors = text("colors");
    if (colors !== undefined) options.colors = parseColors(colors);
    assign("size", text("size"));
    assign("sound", bool("sound"));
    assign("volume", num("volume"));
    assign(
      "ariaLive",
      text("live") as SplitFlapOptions["ariaLive"] | undefined,
    );

    return options;
  }
}

/**
 * Register the custom element. Safe to call more than once.
 * Importing `@sn0wfr/split-flap/element` does this for you.
 */
export function defineSplitFlapElement(tagName = "split-flap"): void {
  if (typeof customElements === "undefined") return;
  if (customElements.get(tagName)) return;
  customElements.define(tagName, SplitFlapElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "split-flap": SplitFlapElement;
  }
}
