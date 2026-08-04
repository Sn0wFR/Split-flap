import type { AlphabetName } from "./alphabets.js";

/** How a value shorter than the display is padded out to fill it. */
export type Align = "left" | "center" | "right";

/** Preset themes shipped in the stylesheet. */
export type ThemeName =
  "airport" | "amber" | "vintage" | "terminal" | "paper" | (string & {});

/** The colours one flap wears. */
export interface FlapColors {
  /** Flap background. Covers both halves unless `bgBottom` narrows it. */
  bg?: string;

  /**
   * Lower half only, for the two-tone a real leaf has. Defaults to `bg`.
   */
  bgBottom?: string;

  /**
   * Glyph colour. Set it whenever `bg` is light — the default glyph is
   * near-white, and yellow on white reads as nothing at all.
   */
  color?: string;
}

/** A CSS colour, which is shorthand for `{ bg }`, or the full set. */
export type FlapColor = string | FlapColors;

/**
 * Which flaps wear which colours.
 *
 * As a record it maps an entry — a glyph in character mode, a whole word in
 * word mode — to the colours a flap takes while it rests on that entry. Keys
 * are matched the way input is: case and accents are forgiven unless
 * `uppercase` and `normalize` are turned off.
 *
 * As a function it is handed the entry and the flap's position instead, so a
 * fixed flap can be coloured whatever it happens to show.
 *
 * Either form may answer `null` for "leave this one alone", which matters
 * when the map is built from data rather than written by hand — a status
 * table with an explicit blank does not have to be filtered first.
 */
export type ColorMap =
  | Record<string, FlapColor | null | undefined>
  | ((entry: string, index: number) => FlapColor | null | undefined);

export interface SplitFlapOptions {
  /** Text to display. Defaults to an empty (all blank) board. */
  value?: string;

  /**
   * Number of flaps. Omit to size the board to whatever value is set, which
   * rebuilds the DOM whenever the length changes.
   */
  length?: number;

  /** Glyphs each flap cycles through — a preset name or a custom string. */
  chars?: AlphabetName | string;

  /**
   * Whole words to cycle through instead of characters, the way a real
   * destination module carries one city per leaf rather than one letter.
   *
   * Setting this makes the display a single wide flap that turns through
   * the list until it reaches the word asked for. `chars`, `length` and
   * `align` no longer apply; the flap widens to the longest entry. A blank
   * leaf is added at the front, so `set("")` returns the board to empty.
   *
   * ```ts
   * new SplitFlap("#dest", { words: ["PARIS", "LONDON", "MADRID"] });
   * ```
   */
  words?: string[];

  /** Where a short value sits inside a fixed-length board. */
  align?: Align;

  /** Glyph used to fill unused flaps. Must exist in `chars`. */
  padChar?: string;

  /** Milliseconds for one flap to advance a single glyph. */
  duration?: number;

  /** Milliseconds each flap waits behind the one to its left. */
  stagger?: number;

  /**
   * Per-step timing jitter, 0–1. A little randomness stops the board looking
   * like a spreadsheet and more like a rack of independent motors.
   */
  jitter?: number;

  /**
   * Minimum glyphs any moving flap must travel through. Raise it when short
   * hops (A → B) feel too abrupt.
   */
  minSteps?: number;

  /** Extra full revolutions added to every moving flap. */
  extraLoops?: number;

  /** Upper-case the value before matching it against `chars`. */
  uppercase?: boolean;

  /** Strip accents from characters that are not in `chars`. */
  normalize?: boolean;

  /** Preset theme, applied as a `sf--<name>` class. */
  theme?: ThemeName;

  /**
   * Colour flaps by what they show — amber for DELAYED, red for CANCELLED.
   *
   * The colour rides the leaf rather than the frame: a flap turning from red
   * to green drops a red leaf onto a green one, the way a real board carries
   * the colour on the leaf itself.
   *
   * An entry with no key keeps the theme's own colours, which is usually
   * right for the normal case — colour the exceptions, not the rule.
   *
   * ```ts
   * new SplitFlap("#status", {
   *   words: ["ON TIME", "DELAYED", "CANCELLED"],
   *   colors: {
   *     DELAYED: flapColors.amber,
   *     CANCELLED: flapColors.red,
   *   },
   * });
   * ```
   */
  colors?: ColorMap;

  /** Shorthand for the `--sf-size` custom property, e.g. `"2.5rem"`. */
  size?: string;

  /** Inject the bundled stylesheet on first use. */
  injectStyles?: boolean;

  /** Play a mechanical click on each flip. Requires a user gesture first. */
  sound?: boolean;

  /** Click volume, 0–1. */
  volume?: number;

  /**
   * Skip animation when the user asks for reduced motion. Turning this off
   * is almost always the wrong call.
   */
  respectReducedMotion?: boolean;

  /** Value for the root element's `aria-live`. */
  ariaLive?: "off" | "polite" | "assertive";

  /** Fired once per flap, per glyph advanced. */
  onFlip?: (detail: FlipDetail) => void;

  /** Fired when every flap has reached its target. */
  onSettle?: (detail: SettleDetail) => void;

  /** Fired when a new value starts animating. */
  onStart?: (detail: StartDetail) => void;
}

/** Where a cell sits in the board, passed to a custom refresh order. */
export interface BoardCell {
  row: number;
  column: number;
  /** Total rows on the board. */
  rows: number;
  /** Total columns on the board. */
  columns: number;
}

/**
 * The sequence in which a board's cells start turning.
 *
 * Every named order is a rank function underneath: the board sorts by rank
 * and holds each cell back by `rank × cascade`. A custom function returns
 * that rank, so a diagonal ripple is `({ row, column }) => row + column`.
 */
export type RefreshOrder =
  /** Everything at once. */
  | "simultaneous"
  /** Row by row, top to bottom — how a departure board actually updates. */
  | "rows"
  /** Column by column, left to right. */
  | "columns"
  /** Cell by cell in reading order. */
  | "cells"
  /** Cell by cell, shuffled afresh on every refresh. */
  | "random"
  | ((cell: BoardCell) => number);

export interface SplitFlapBoardOptions {
  /**
   * One entry per column, each configured exactly like a standalone
   * display. Merged over `defaults`.
   */
  columns: SplitFlapOptions[];

  /** Options shared by every column, before per-column overrides. */
  defaults?: SplitFlapOptions;

  /** Optional header text, one per column. Omit for a bare grid. */
  labels?: string[];

  /** Fixed row count. Omit to size the board to whatever `set()` is given. */
  rows?: number;

  /** Sequence in which cells start turning. */
  order?: RefreshOrder;

  /** Milliseconds between one rank in that order and the next. */
  cascade?: number;

  /** Fired when every cell on the board has settled. */
  onSettle?: (detail: BoardSettleDetail) => void;
}

export interface BoardSettleDetail {
  /** Values now displayed, row by row. */
  rows: string[][];
}

export interface FlipDetail {
  /** Index of the flap that moved. */
  index: number;
  /** Glyph the flap just landed on. */
  char: string;
  /** Whether this was the flap's final step. */
  final: boolean;
}

export interface StartDetail {
  /** Value being animated away from. */
  from: string;
  /** Value being animated towards. */
  to: string;
}

export interface SettleDetail {
  /** Value now displayed, padded to the board's length. */
  value: string;
}

export interface SetOptions {
  /** Jump straight to the value with no animation. */
  immediate?: boolean;
}
