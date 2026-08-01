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
  private alphabet: string;
  private track: HTMLElement;
  private flaps: Flap[] = [];
  /** Padded text currently at rest, or being animated towards. */
  private target: string;
  private settleResolvers: Array<() => void> = [];
  private pending = 0;
  private clicker: Clicker | null = null;
  private destroyed = false;
  /** Cached `--sf-shade-max`, refreshed once per animation run. */
  private shade = 0.5;
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
    this.paint(this.target);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /** Text currently displayed, trailing padding trimmed. */
  get value(): string {
    return this.target.replace(/\s+$/, "");
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

    const from = this.target;
    const prepared = this.prepare(next);
    const padded = this.pad(prepared, this.opts.length ?? prepared.length);

    // Growing or shrinking an auto-sized board means rebuilding the row,
    // and there is nothing to animate between two different geometries.
    if (padded.length !== this.flaps.length) {
      this.cancelAll();
      this.build(padded.length);
      this.target = padded;
      this.paint(padded);
      this.resolveSettle();
      this.emit("start", { from, to: padded });
      this.emit("settle", { value: padded });
      return Promise.resolve();
    }

    this.target = padded;
    this.root.setAttribute("aria-label", padded.trim());

    const immediate =
      setOptions.immediate ||
      (this.opts.respectReducedMotion && prefersReducedMotion());

    if (immediate) {
      this.cancelAll();
      this.paint(padded);
      this.resolveSettle();
      this.emit("start", { from, to: padded });
      this.emit("settle", { value: padded });
      return Promise.resolve();
    }

    this.emit("start", { from, to: padded });

    // Work out each flap's travel before touching the DOM, so a no-op set
    // resolves immediately instead of scheduling empty timers.
    const plans = this.flaps.map((flap, i) => {
      const to = this.indexOf(padded[i]!);
      let steps =
        (to - flap.index + this.alphabet.length) % this.alphabet.length;
      if (steps > 0 || this.opts.extraLoops > 0) {
        while (steps < this.opts.minSteps) steps += this.alphabet.length;
        steps += this.alphabet.length * this.opts.extraLoops;
      }
      return steps;
    });

    if (plans.every((steps) => steps === 0)) {
      this.emit("settle", { value: padded });
      return Promise.resolve();
    }

    if (this.opts.sound && !this.clicker) {
      this.clicker = createClicker(this.opts.volume);
    }

    // Read the shading depth once per run: querying it per step would force
    // a style recalculation on every flap, every frame.
    this.shade = this.readShadeMax();

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
      this.emit("settle", { value: padded });
    }

    return promise;
  }

  /** Merge new options in. Anything affecting layout rebuilds the row. */
  setOptions(patch: Partial<SplitFlapOptions>): void {
    if (this.destroyed) return;

    const previousTheme = this.opts.theme;
    const rebuilds =
      ("chars" in patch && patch.chars !== this.opts.chars) ||
      ("length" in patch && patch.length !== this.opts.length) ||
      ("align" in patch && patch.align !== this.opts.align) ||
      ("padChar" in patch && patch.padChar !== this.opts.padChar) ||
      ("uppercase" in patch && patch.uppercase !== this.opts.uppercase);

    this.opts = { ...this.opts, ...patch };

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
      this.alphabet = this.buildAlphabet();
      const padded = this.pad(this.prepare(this.value));
      this.build(padded.length);
      this.target = padded;
      this.paint(padded);
      this.resolveSettle();
    }
  }

  /** Freeze every flap where it stands, resolving any pending `set()`. */
  stop(): void {
    this.cancelAll();
    this.target = this.flaps.map((f) => this.alphabet[f.index]!).join("");
    this.root.setAttribute("aria-label", this.target.trim());
    this.resolveSettle();
  }

  /** Flip to a random value of the current length. Handy for demos. */
  randomize(): Promise<void> {
    const pool = this.alphabet.trim() || this.alphabet;
    let out = "";
    for (let i = 0; i < this.flaps.length; i += 1) {
      out += pool[Math.floor(Math.random() * pool.length)];
    }
    return this.set(out);
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

  private buildAlphabet(): string {
    const raw = resolveAlphabet(this.opts.chars);
    const source = this.opts.uppercase ? raw.toUpperCase() : raw;
    // De-duplicate: a repeated glyph would make the shortest path ambiguous.
    const seen = new Set<string>();
    let out = "";
    for (const char of source) {
      if (!seen.has(char)) {
        seen.add(char);
        out += char;
      }
    }
    return out || " ";
  }

  /** Normalise input into glyphs that exist in the alphabet. */
  private prepare(input: string): string {
    let text = input ?? "";
    if (this.opts.uppercase) text = text.toUpperCase();

    let out = "";
    for (const char of text) {
      if (this.alphabet.includes(char)) {
        out += char;
        continue;
      }
      if (this.opts.normalize) {
        const stripped = deaccent(char);
        // A single source glyph can decompose to several code points; take
        // the first that the board can actually show.
        const match = [...stripped].find((c) => this.alphabet.includes(c));
        if (match) {
          out += match;
          continue;
        }
      }
      out += this.fallbackChar();
    }
    return out;
  }

  private fallbackChar(): string {
    return this.alphabet.includes(this.opts.padChar)
      ? this.opts.padChar
      : this.alphabet[0]!;
  }

  private pad(text: string, width = this.opts.length ?? text.length): string {
    const fill = this.fallbackChar();
    if (text.length >= width) return text.slice(0, width);
    const missing = width - text.length;
    switch (this.opts.align) {
      case "right":
        return fill.repeat(missing) + text;
      case "center": {
        const left = Math.floor(missing / 2);
        return fill.repeat(left) + text + fill.repeat(missing - left);
      }
      default:
        return text + fill.repeat(missing);
    }
  }

  private indexOf(char: string | undefined): number {
    const i = this.alphabet.indexOf(char ?? this.fallbackChar());
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
  private paint(text: string): void {
    this.flaps.forEach((flap, i) => {
      const index = this.indexOf(text[i]);
      flap.index = index;
      flap.remaining = 0;
      const char = this.alphabet[index]!;
      flap.topChar.textContent = char;
      flap.bottomChar.textContent = char;
      flap.root.classList.remove("is-flipping");
    });
    this.root.classList.remove("is-flipping");
    this.root.setAttribute("aria-label", text.trim());
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

    this.clicker?.tick();
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
    return [
      flap.frontLeaf.animate(
        [{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }],
        { duration: half, easing: "ease-in", fill: "forwards" },
      ),
      flap.frontShade.animate([{ opacity: 0 }, { opacity: this.shade }], {
        duration: half,
        easing: "ease-in",
        fill: "forwards",
      }),
      flap.backLeaf.animate(
        [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }],
        { duration: half, delay: half, easing: "ease-out", fill: "both" },
      ),
      flap.backShade.animate([{ opacity: this.shade }, { opacity: 0 }], {
        duration: half,
        delay: half,
        easing: "ease-out",
        fill: "both",
      }),
    ];
  }

  private jittered(base: number): number {
    const amount = this.opts.jitter;
    if (!amount) return base;
    const factor = 1 + (Math.random() * 2 - 1) * amount;
    return Math.max(16, base * factor);
  }

  private readShadeMax(): number {
    if (typeof getComputedStyle !== "function") return 0.5;
    const raw = getComputedStyle(this.root).getPropertyValue("--sf-shade-max");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0.5;
  }

  private finish(): void {
    this.pending -= 1;
    if (this.pending > 0) return;
    this.root.classList.remove("is-flipping");
    this.resolveSettle();
    this.emit("settle", { value: this.target });
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
