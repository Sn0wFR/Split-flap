/**
 * Character sets a flap can cycle through.
 *
 * Order matters: a physical split-flap only ever rotates forward, so the
 * distance between two glyphs — and therefore how long a flip takes — is
 * decided entirely by their position in this string. Blank goes first so an
 * empty flap is the natural resting state.
 */
export const alphabets = {
  /** Blank + A–Z. The classic Solari destination board. */
  letters: " ABCDEFGHIJKLMNOPQRSTUVWXYZ",

  /** Blank + 0–9. Gate numbers, counters, clocks. */
  digits: " 0123456789",

  /** Blank + A–Z + 0–9. Sensible default for arbitrary text. */
  alphanumeric: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",

  /** Alphanumeric plus the punctuation a real board carries. */
  full: " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:'\"!?-+/()&@#%*€$",

  /** Blank + 0–9 + A–F, for hex values and colour codes. */
  hex: " 0123456789ABCDEF",

  /** Lower and upper case, for text that must keep its casing. */
  mixedCase:
    " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:'!?-",
} as const;

export type AlphabetName = keyof typeof alphabets;

/** Resolve an alphabet name, or pass a custom string straight through. */
export function resolveAlphabet(source: AlphabetName | string): string {
  if (source in alphabets) {
    return alphabets[source as AlphabetName];
  }
  return source;
}

/** Unicode combining diacritical marks, built from escapes to keep this file ASCII. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Strip diacritics so accented input still lands on a flap that exists.
 * "DÉPART" becomes "DEPART" rather than two blanks.
 */
export function deaccent(input: string): string {
  return input.normalize("NFD").replace(COMBINING_MARKS, "");
}
