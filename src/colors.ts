import type { FlapColor, FlapColors } from "./types.js";

/**
 * Ready-made flap colours.
 *
 * A real board only colours the leaves it needs to shout about, and it does
 * so with a handful of paints that never change: red for cancelled, amber
 * for delayed, green for on time. These are those paints, each one shipped
 * as a pair — background and glyph together — because a background on its
 * own is how you end up with white text on yellow.
 *
 * ```ts
 * import { SplitFlap, flapColors } from "@sn0wfr/split-flap";
 *
 * new SplitFlap("#status", {
 *   words: ["ON TIME", "DELAYED", "CANCELLED"],
 *   colors: {
 *     "ON TIME": flapColors.green,
 *     DELAYED: flapColors.amber,
 *     CANCELLED: flapColors.red,
 *   },
 * });
 * ```
 *
 * Each pair clears WCAG AA on its own, and the lower half is a shade darker
 * so a coloured flap keeps the depth the default theme has.
 */
export const flapColors = {
  /** Cancelled, out of service, anything that has gone wrong. */
  red: { bg: "#a32b22", bgBottom: "#8f261e", color: "#fdeceb" },

  /**
   * Last call, closing shortly — a warning that has run out of patience.
   * Sits between amber and red, which is exactly where it reads on a board.
   */
  orange: { bg: "#b0530c", bgBottom: "#9b490b", color: "#fff6f0" },

  /** Delayed, platform changed — a warning, not a failure. */
  amber: { bg: "#d9a406", bgBottom: "#bf9005", color: "#241802" },

  /** On time, boarding, everything as printed. */
  green: { bg: "#1c7a45", bgBottom: "#196b3d", color: "#eefaf1" },

  /** Informational: now boarding, gate open. */
  blue: { bg: "#1d6a86", bgBottom: "#1a5d76", color: "#eef8fc" },

  /** Neutral emphasis, for a flap that should stand out without shouting. */
  slate: { bg: "#39404a", bgBottom: "#323841", color: "#eceff4" },
} as const satisfies Record<string, FlapColors>;

/** Name of a shipped colour. */
export type FlapColorName = keyof typeof flapColors;

/**
 * Normalise one colour entry.
 *
 * A bare string is shorthand for a background, which is what nine callers in
 * ten want. An empty set is folded to `null` so the caller has a single
 * "nothing to paint" case rather than an object full of `undefined`.
 */
export function toFlapColors(
  color: FlapColor | null | undefined,
): FlapColors | null {
  if (!color) return null;
  if (typeof color === "string") {
    const bg = color.trim();
    return bg ? { bg } : null;
  }
  return color.bg || color.bgBottom || color.color ? color : null;
}
