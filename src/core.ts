import { deaccent, resolveAlphabet } from "./alphabets.js";
import { createClicker, type Clicker } from "./sound.js";
import { ensureStyles } from "./styles.js";
import type {
  FlipDetail,
  SetOptions,
  SettleDetail,
  SplitFlapOptions,
  StartDetail,
  ThemeName,
} from "./types.js";

/** Options that always hold a value once the constructor has run. */
type DefaultedKey =
  | "value"
  | "chars"
  | "align"
  | "padChar"
  | "duration"
  | "stagger"
  | "jitter"
  | "minSteps"
  | "extraLoops"
  | "uppercase"
  | "normalize"
  | "injectStyles"
  | "sound"
  | "volume"
  | "respectReducedMotion"
  | "ariaLive";

type Defaults = Required<Pick<SplitFlapOptions, DefaultedKey>>;

/** Everything optional stays optional; the defaulted keys are guaranteed. */
type Resolved = SplitFlapOptions & Defaults;

const DEFAULTS: Defaults = {
  value: "",
  chars: "alphanumeric",
  align: "left",
  padChar: " ",
  duration: 110,
  stagger: 55,
  jitter: 0.18,
  minSteps: 1,
  extraLoops: 0,
  uppercase: true,
  normalize: true,
  injectStyles: true,
  sound: false,
  volume: 0.25,
  respectReducedMotion: true,
  ariaLive: "off",
};

/** DOM handles for one flap, kept so the render loop never queries the tree. */
interface Flap {
  root: HTMLElement;
  topChar: HTMLElement;
  bottomChar: HTMLElement;
  frontLeaf: HTMLElement;
  frontChar: HTMLElement;
  frontShade: HTMLElement;
  backLeaf: HTMLElement;
  backChar: HTMLElement;
  backShade: HTMLElement;
  /** Index into the alphabet currently at rest on the flap. */
  index: number;
  /** Steps still to travel in the running animation. */
  remaining: number;
  /** Timer for the next step, or 0 when idle. */
  timer: ReturnType<typeof setTimeout> | 0;
  /** Animations in flight, cancelled if the value changes mid-flip. */
  anims: Animation[];
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/**
 * A row of mechanical flaps that spells out a string.
 *
 * ```ts
 * const board = new SplitFlap("#board", { length: 12, chars: "letters" });
 * await board.set("DEPARTURES");
 * ```
 */
export class SplitFlap {
  /** Root element the display was mounted into. */
  readonly root: HTMLElement;

  private opts: Resolved;
  /** Entries a flap can rest on: single characters, or whole words. */
  private alphabet: string[];
  private track: HTMLElement;
  private flaps: Flap[] = [];
  /** One entry per flap, at rest or being animated towards. */
  private target: string[];
  private settleResolvers: Array<() => void> = [];
  private pending = 0;
  private clicker: Clicker | null = null;
  private destroyed = false;
  /**
   * Cached `--sf-shade-max`. Reading it costs a forced style recalculation
   * — measured at 0.59 ms, because `set()` has just dirtied the styles it
   * would have to flush. The value only moves with the theme, so it is read
   * once and invalidated by `setOptions` rather than probed per run.
   */
  private shade: number | null = null;
  /** Whether the Web Animations API is available in this environment. */
  private readonly canAnimate =
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function";

  constructor(target: HTMLElement | string, options: SplitFlapOptions = {}) {
    const root =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!root) {
      throw new Error(`[split-flap] no element matched ${String(target)}`);
    }

    this.root = root as HTMLElement;
    this.opts = { ...DEFAULTS, ...options };
    this.alphabet = this.buildAlphabet();

    if (this.opts.injectStyles) ensureStyles();

    this.root.classList.add("sf");
    this.root.setAttribute("role", "img");
    if (this.opts.respectReducedMotion) {
      this.root.classList.add("sf--respect-motion");
    }
    this.applyTheme(undefined, this.opts.theme);
    if (this.opts.size)
      this.root.style.setProperty("--sf-size", this.opts.size);
    if (this.opts.ariaLive !== "off") {
      this.root.setAttribute("aria-live", this.opts.ariaLive);
    }

    this.track = el("div", "sf__track");
    this.track.setAttribute("aria-hidden", "true");
    this.root.replaceChildren(this.track);

    this.target = this.pad(this.prepare(this.opts.value));
    this.build(this.target.length);
    this.sizeToWords();
    this.paint(this.target);
  }

  /**
   * Widen the flap to the longest word it may have to show.
   *
   * Character mode gets its width from the stylesheet, one glyph wide. A
   * word module has to fit "SAN FRANCISCO", and only the instance knows how
   * long that is. `ch` tracks the font, and the property stays overridable.
   */
  private sizeToWords(): void {
    if (!this.wordMode) return;
    const longest = this.alphabet.reduce(
      (max, e) => Math.max(max, e.length),
      0,
    );
    this.root.style.setProperty("--sf-flap-width", `${longest + 1}ch`);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /** The displayed value: entries joined back into one string. */
  private text(entries: string[] = this.target): string {
    return entries.join("");
  }

  /** Text currently displayed, trailing padding trimmed. */
  get value(): string {
    return this.text().replace(/\s+$/, "");
  }

  set value(next: string) {
    void this.set(next);
  }

  /** True while at least one flap is still turning. */
  get isAnimating(): boolean {
    return this.pending > 0;
  }

  /** Number of flaps currently rendered. */
  get length(): number {
    return this.flaps.length;
  }

  /**
   * Animate the board to `next`.
   * The returned promise resolves once every flap has settled.
   */
  set(next: string, setOptions: SetOptions = {}): Promise<void> {
    if (this.destroyed) return Promise.resolve();

    const from = this.text();
    const prepared = this.prepare(next);
    const padded = this.pad(prepared);
    const to = this.text(padded);

    // Growing or shrinking an auto-sized board means rebuilding the row,
    // and there is nothing to animate between two different geometries.
    if (padded.length !== this.flaps.length) {
      this.cancelAll();
      this.build(padded.length);
      this.target = padded;
      this.paint(padded);
      this.resolveSettle();
      this.emit("start", { from, to });
      this.emit("settle", { value: to });
      return Promise.resolve();
    }

    this.target = padded;
    this.root.setAttribute("aria-label", to.trim());

    const immediate =
      setOptions.immediate ||
      (this.opts.respectReducedMotion && prefersReducedMotion());

    if (immediate) {
      this.cancelAll();
      this.paint(padded);
      this.resolveSettle();
      this.emit("start", { from, to });
      this.emit("settle", { value: to });
      return Promise.resolve();
    }

    this.emit("start", { from, to });

    // Work out each flap's travel before touching the DOM, so a no-op set
    // resolves immediately instead of scheduling empty timers.
    const plans = this.flaps.map((flap, i) => {
      const wanted = this.indexOf(padded[i]!);
      let steps =
        (wanted - flap.index + this.alphabet.length) % this.alphabet.length;
      if (steps > 0 || this.opts.extraLoops > 0) {
        while (steps < this.opts.minSteps) steps += this.alphabet.length;
        steps += this.alphabet.length * this.opts.extraLoops;
      }
      return steps;
    });

    if (plans.every((steps) => steps === 0)) {
      this.emit("settle", { value: to });
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve) => {
      this.settleResolvers.push(resolve);
    });

    this.pending = 0;
    this.root.classList.add("is-flipping");

    this.flaps.forEach((flap, i) => {
      this.cancelFlap(flap);
      const steps = plans[i]!;
      if (steps === 0) return;
      flap.remaining = steps;
      this.pending += 1;
      const delay = i * this.opts.stagger;
      flap.timer = setTimeout(() => this.step(flap, i), Math.max(0, delay));
    });

    if (this.pending === 0) {
      this.resolveSettle();
      this.emit("settle", { value: to });
    }

    return promise;
  }

  /** Merge new options in. Anything affecting layout rebuilds the row. */
  setOptions(patch: Partial<SplitFlapOptions>): void {
    if (this.destroyed) return;

    const previousTheme = this.opts.theme;
    const rebuilds =
      ("chars" in patch && patch.chars !== this.opts.chars) ||
      // Compared by content: callers pass a fresh array every render.
      ("words" in patch &&
        this.text(patch.words ?? []) !== this.text(this.opts.words ?? [])) ||
      ("length" in patch && patch.length !== this.opts.length) ||
      ("align" in patch && patch.align !== this.opts.align) ||
      ("padChar" in patch && patch.padChar !== this.opts.padChar) ||
      ("uppercase" in patch && patch.uppercase !== this.opts.uppercase);

    this.opts = { ...this.opts, ...patch };

    // Any reconfiguration may have changed the shading depth — a theme swap
    // certainly does. Cheaper to re-read once here than on every run.
    this.shade = null;

    if ("theme" in patch) this.applyTheme(previousTheme, patch.theme);
    if ("size" in patch) {
      if (patch.size) this.root.style.setProperty("--sf-size", patch.size);
      else this.root.style.removeProperty("--sf-size");
    }
    if ("ariaLive" in patch) {
      if (!patch.ariaLive || patch.ariaLive === "off") {
        this.root.removeAttribute("aria-live");
      } else {
        this.root.setAttribute("aria-live", patch.ariaLive);
      }
    }
    if ("respectReducedMotion" in patch) {
      this.root.classList.toggle(
        "sf--respect-motion",
        !!patch.respectReducedMotion,
      );
    }
    if ("volume" in patch && this.clicker) {
      this.clicker.setVolume(this.opts.volume);
    }
    if (!this.opts.sound && this.clicker) {
      this.clicker.close();
      this.clicker = null;
    }

    if (rebuilds) {
      this.cancelAll();
      const kept = this.value;
      this.alphabet = this.buildAlphabet();
      const padded = this.pad(this.prepare(kept));
      this.build(padded.length);
      this.sizeToWords();
      this.target = padded;
      this.paint(padded);
      this.resolveSettle();
    }
  }

  /** Freeze every flap where it stands, resolving any pending `set()`. */
  stop(): void {
    this.cancelAll();
    this.target = this.flaps.map((f) => this.alphabet[f.index]!);
    this.root.setAttribute("aria-label", this.text().trim());
    this.resolveSettle();
  }

  /** Flip to a random value of the current length. Handy for demos. */
  randomize(): Promise<void> {
    // Skip the blank leaf: a random pick should show something.
    const pool = this.alphabet.filter((entry) => entry.trim() !== "");
    const source = pool.length ? pool : this.alphabet;
    const picked = Array.from(
      { length: this.flaps.length },
      () => source[Math.floor(Math.random() * source.length)]!,
    );
    return this.set(picked.join(""));
  }

  /** Tear the display down and release timers, audio and DOM. */
  destroy(): void {
    if (this.destroyed) return;
    this.cancelAll();
    this.resolveSettle();
    this.clicker?.close();
    this.clicker = null;
    this.flaps = [];
    this.root.replaceChildren();
    this.root.classList.remove("sf", "sf--respect-motion", "is-flipping");
    if (this.opts.theme) this.root.classList.remove(`sf--${this.opts.theme}`);
    this.root.removeAttribute("role");
    this.root.removeAttribute("aria-label");
    this.root.removeAttribute("aria-live");
    this.destroyed = true;
  }

  /* ------------------------------------------------------------------ */
  /* Text handling                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * The glyphs one flap can rest on.
   *
   * In word mode an entry is a whole word, which is what a real destination
   * module carries — one leaf per city, not one per letter. Everything
   * downstream treats an entry as opaque, so the two modes share the same
   * travel, timing and rendering.
   */
  private buildAlphabet(): string[] {
    const source = this.opts.words
      ? // A blank leaf first, so an unset board rests empty and `set("")`
        // has somewhere to land — the same role the leading space plays in
        // the character alphabets.
        ["", ...this.opts.words]
      : [...resolveAlphabet(this.opts.chars)];

    const cased = this.opts.uppercase
      ? source.map((entry) => entry.toUpperCase())
      : source;

    // De-duplicate: a repeated entry would make the travel distance to it
    // ambiguous.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of cased) {
      if (!seen.has(entry)) {
        seen.add(entry);
        out.push(entry);
      }
    }
    return out.length ? out : [" "];
  }

  /** True when the board turns through whole words rather than characters. */
  private get wordMode(): boolean {
    return this.opts.words !== undefined;
  }

  /** Resolve input into entries the board can actually rest on. */
  private prepare(input: string): string[] {
    let text = input ?? "";
    if (this.opts.uppercase) text = text.toUpperCase();

    if (this.wordMode) {
      // A word display is a single module, so the whole input is one entry.
      return [this.matchWord(text)];
    }

    const out: string[] = [];
    for (const char of text) {
      if (this.alphabet.includes(char)) {
        out.push(char);
        continue;
      }
      if (this.opts.normalize) {
        const stripped = deaccent(char);
        // A single source glyph can decompose to several code points; take
        // the first that the board can actually show.
        const match = [...stripped].find((c) => this.alphabet.includes(c));
        if (match) {
          out.push(match);
          continue;
        }
      }
      out.push(this.fallbackEntry());
    }
    return out;
  }

  /** Find the word an input names, falling back to the blank leaf. */
  private matchWord(text: string): string {
    if (this.alphabet.includes(text)) return text;

    if (this.opts.normalize) {
      // "GENEVE" should reach a leaf printed "GENÈVE": compare both sides
      // stripped rather than requiring the caller to match the accents.
      const wanted = deaccent(text);
      const match = this.alphabet.find((entry) => deaccent(entry) === wanted);
      if (match !== undefined) return match;
    }
    return this.fallbackEntry();
  }

  private fallbackEntry(): string {
    if (this.wordMode)
      return this.alphabet.includes("") ? "" : this.alphabet[0]!;
    return this.alphabet.includes(this.opts.padChar)
      ? this.opts.padChar
      : this.alphabet[0]!;
  }

  private pad(
    entries: string[],
    // A word display is a single module, so `length` has no say over it.
    width = this.wordMode ? 1 : (this.opts.length ?? entries.length),
  ): string[] {
    const fill = this.fallbackEntry();
    if (entries.length >= width) return entries.slice(0, width);
    const missing = width - entries.length;
    const filler = Array.from({ length: missing }, () => fill);
    switch (this.opts.align) {
      case "right":
        return [...filler, ...entries];
      case "center": {
        const left = Math.floor(missing / 2);
        return [...filler.slice(0, left), ...entries, ...filler.slice(left)];
      }
      default:
        return [...entries, ...filler];
    }
  }

  private indexOf(entry: string | undefined): number {
    const i = this.alphabet.indexOf(entry ?? this.fallbackEntry());
    return i === -1 ? 0 : i;
  }

  /* ------------------------------------------------------------------ */
  /* DOM                                                                 */
  /* ------------------------------------------------------------------ */

  private build(count: number): void {
    this.flaps = [];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const root = el("span", "sf__flap");

      const topPanel = el("span", "sf__panel sf__panel--top");
      const topChar = el("span", "sf__char");
      topPanel.append(topChar);

      const bottomPanel = el("span", "sf__panel sf__panel--bottom");
      const bottomChar = el("span", "sf__char");
      bottomPanel.append(bottomChar);

      const frontLeaf = el("span", "sf__leaf sf__leaf--front");
      const frontChar = el("span", "sf__char");
      const frontShade = el("span", "sf__shade");
      frontLeaf.append(frontChar, frontShade);

      const backLeaf = el("span", "sf__leaf sf__leaf--back");
      const backChar = el("span", "sf__char");
      const backShade = el("span", "sf__shade");
      backLeaf.append(backChar, backShade);

      root.append(topPanel, bottomPanel, frontLeaf, backLeaf);
      frag.append(root);

      this.flaps.push({
        root,
        topChar,
        bottomChar,
        frontLeaf,
        frontChar,
        frontShade,
        backLeaf,
        backChar,
        backShade,
        index: 0,
        remaining: 0,
        timer: 0,
        anims: [],
      });
    }

    this.track.replaceChildren(frag);
  }

  /** Snap every flap to the given text with no animation. */
  private paint(entries: string[]): void {
    this.flaps.forEach((flap, i) => {
      const index = this.indexOf(entries[i]);
      flap.index = index;
      flap.remaining = 0;
      const entry = this.alphabet[index]!;
      flap.topChar.textContent = entry;
      flap.bottomChar.textContent = entry;
      flap.root.classList.remove("is-flipping");
    });
    this.root.classList.remove("is-flipping");
    this.root.setAttribute("aria-label", this.text(entries).trim());
  }

  /* ------------------------------------------------------------------ */
  /* Animation                                                           */
  /* ------------------------------------------------------------------ */

  /** Advance one flap by a single glyph and schedule the next step. */
  private step(flap: Flap, index: number): void {
    if (this.destroyed || flap.remaining <= 0) return;

    const current = this.alphabet[flap.index]!;
    const nextIndex = (flap.index + 1) % this.alphabet.length;
    const next = this.alphabet[nextIndex]!;

    // Static halves show the state *after* the flip on top, *before* it on
    // the bottom; the two leaves cover the transition between them.
    flap.topChar.textContent = next;
    flap.bottomChar.textContent = current;
    flap.frontChar.textContent = current;
    flap.backChar.textContent = next;

    flap.root.classList.add("is-flipping");

    const duration = this.jittered(this.opts.duration);
    flap.anims = this.rotate(flap, duration / 2);

    flap.index = nextIndex;
    flap.remaining -= 1;
    const final = flap.remaining === 0;

    this.clicks()?.tick();
    this.emit("flip", { index, char: next, final });

    flap.timer = setTimeout(() => {
      // Land the flip: the bottom half catches up and the leaves stand down.
      flap.bottomChar.textContent = next;
      this.clearAnimations(flap);
      flap.root.classList.remove("is-flipping");

      if (final) {
        this.finish();
      } else {
        this.step(flap, index);
      }
    }, duration);
  }

  /**
   * Drive one flip: the upper leaf falls through 90°, then the lower leaf
   * swings up to meet it, each darkening as it turns away from the light.
   *
   * Returns an empty list where the Web Animations API is missing (Safari
   * below 13.1, jsdom/happy-dom, SSR shims). The glyphs still step on
   * schedule there — only the rotation is lost.
   */
  private rotate(flap: Flap, half: number): Animation[] {
    if (!this.canAnimate) return [];
    const shade = this.readShadeMax();
    return [
      flap.frontLeaf.animate(
        [{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }],
        { duration: half, easing: "ease-in", fill: "forwards" },
      ),
      flap.frontShade.animate([{ opacity: 0 }, { opacity: shade }], {
        duration: half,
        easing: "ease-in",
        fill: "forwards",
      }),
      flap.backLeaf.animate(
        [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }],
        { duration: half, delay: half, easing: "ease-out", fill: "both" },
      ),
      flap.backShade.animate([{ opacity: shade }, { opacity: 0 }], {
        duration: half,
        delay: half,
        easing: "ease-out",
        fill: "both",
      }),
    ];
  }

  /**
   * The clicker, built the first time a flip actually needs it.
   *
   * Creating it here rather than when a value is set is what lets sound
   * switched on mid-flight be heard for the rest of that flip: `setOptions`
   * closes the clicker when sound goes off, and nothing would rebuild it
   * until the next `set()`.
   */
  private clicks(): Clicker | null {
    if (!this.opts.sound) return null;
    return (this.clicker ??= createClicker(this.opts.volume));
  }

  private jittered(base: number): number {
    const amount = this.opts.jitter;
    if (!amount) return base;
    const factor = 1 + (Math.random() * 2 - 1) * amount;
    return Math.max(16, base * factor);
  }

  private readShadeMax(): number {
    if (this.shade !== null) return this.shade;
    if (typeof getComputedStyle !== "function") return (this.shade = 0.5);
    const raw = getComputedStyle(this.root).getPropertyValue("--sf-shade-max");
    const parsed = Number.parseFloat(raw);
    return (this.shade = Number.isFinite(parsed) ? parsed : 0.5);
  }

  private finish(): void {
    this.pending -= 1;
    if (this.pending > 0) return;
    this.root.classList.remove("is-flipping");
    this.resolveSettle();
    this.emit("settle", { value: this.text() });
  }

  private clearAnimations(flap: Flap): void {
    for (const anim of flap.anims) anim.cancel();
    flap.anims = [];
  }

  private cancelFlap(flap: Flap): void {
    if (flap.timer) clearTimeout(flap.timer);
    flap.timer = 0;
    flap.remaining = 0;
    this.clearAnimations(flap);
    flap.root.classList.remove("is-flipping");
    // `step()` advances the index up front, so a flip interrupted halfway
    // leaves the bottom half a glyph behind. Whatever index the flap stopped
    // on is now its resting state; make both halves agree on it.
    const char = this.alphabet[flap.index]!;
    flap.topChar.textContent = char;
    flap.bottomChar.textContent = char;
  }

  private cancelAll(): void {
    for (const flap of this.flaps) this.cancelFlap(flap);
    this.pending = 0;
    this.root.classList.remove("is-flipping");
  }

  private resolveSettle(): void {
    const resolvers = this.settleResolvers;
    this.settleResolvers = [];
    for (const resolve of resolvers) resolve();
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  private applyTheme(
    previous: ThemeName | undefined,
    next: ThemeName | undefined,
  ): void {
    if (previous) this.root.classList.remove(`sf--${previous}`);
    if (next) this.root.classList.add(`sf--${next}`);
  }

  private emit(name: "start", detail: StartDetail): void;
  private emit(name: "flip", detail: FlipDetail): void;
  private emit(name: "settle", detail: SettleDetail): void;
  private emit(name: string, detail: object): void {
    if (name === "start") this.opts.onStart?.(detail as StartDetail);
    else if (name === "flip") this.opts.onFlip?.(detail as FlipDetail);
    else if (name === "settle") this.opts.onSettle?.(detail as SettleDetail);
    this.root.dispatchEvent(
      new CustomEvent(`splitflap:${name}`, { detail, bubbles: true }),
    );
  }
}
