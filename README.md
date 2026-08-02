# @sn0wfr/split-flap

Render text like an airport departure board. Every flap turns forward one glyph
at a time until it reaches its target — the same way a Solari board does.

**[Live demo and documentation →](https://sn0wfr.github.io/Split-flap/)**

🇫🇷 [Lire ce README en français](./README.fr.md)

- **Zero dependencies.** The stylesheet ships inside the bundle and is injected
  on first use.
- **Runs anywhere.** A vanilla core, a native `<split-flap>` custom element, and
  a React wrapper. Vue, Svelte, Angular and Astro use the element.
- **Accessible.** The value stays readable to screen readers, the flaps are
  hidden from them, and `prefers-reduced-motion` skips the animation.
- **Themeable.** Everything runs through CSS custom properties.
- **Typed.** TypeScript declarations, ESM, CJS, and an IIFE build for a plain
  `<script>` tag.

## Install

```sh
npm install @sn0wfr/split-flap
```

Or skip the install entirely:

```html
<script src="https://unpkg.com/@sn0wfr/split-flap"></script>
```

## Usage

### Vanilla

```js
import { SplitFlap } from "@sn0wfr/split-flap";

const board = new SplitFlap("#board", {
  length: 12,
  chars: "letters",
  duration: 110,
  stagger: 55,
});

await board.set("BOARDING");
await board.set("GATE 24");
```

### Custom element

Importing the entry registers `<split-flap>`. The text between the tags is both
the initial value and the no-JavaScript fallback.

```js
import "@sn0wfr/split-flap/element";
```

```html
<split-flap length="12" chars="letters" theme="airport">DEPARTURES</split-flap>
```

Attributes mirror the options in kebab-case (`min-steps`, `extra-loops`,
`pad-char`). Set `value` to animate to a new string, or call `element.set(...)`
for a promise that resolves once the board settles.

### React

```tsx
import { SplitFlap } from "@sn0wfr/split-flap/react";

export function Status({ state }) {
  return <SplitFlap value={state} length={12} theme="amber" />;
}
```

Changing `value` animates; changing any other prop reconfigures the instance in
place. A `useSplitFlap()` hook is exported for imperative control.

### Styles

The stylesheet is injected automatically. If your bundler owns CSS, pass
`injectStyles: false` and import it yourself:

```js
import "@sn0wfr/split-flap/style.css";
```

### Word mode

A real Solari destination unit does not spell a city out letter by letter —
each leaf carries a whole name, and the module turns until it reaches the
right one. Pass `words` to get that:

```js
const dest = new SplitFlap("#dest", {
  words: ["PARIS CDG", "LISBOA", "REYKJAVIK", "SINGAPORE"],
});

await dest.set("REYKJAVIK"); // turns through the list, never backwards
```

The display becomes a single flap, wide enough for the longest entry. A blank
leaf is added at the front, so `set("")` returns it to empty. `chars`,
`length` and `align` belong to character mode and no longer apply.

Accents are matched loosely in both directions, so `set("GENEVE")` reaches a
leaf printed `GENÈVE`. In markup the list is comma-separated:

```html
<split-flap words="PARIS CDG, LISBOA, REYKJAVIK" value="LISBOA"></split-flap>
```

## Boards

A grid of displays that refresh together, for a departure board or any large
sign. Columns are configured exactly like standalone displays.

```js
import { SplitFlapBoard } from "@sn0wfr/split-flap";

const board = new SplitFlapBoard("#departures", {
  labels: ["TIME", "FLIGHT", "DESTINATION"],
  columns: [
    { length: 5, chars: " 0123456789:" },
    { length: 6 },
    { words: ["PARIS CDG", "LISBOA", "REYKJAVIK"] },
  ],
  order: "rows",
  cascade: 110,
});

await board.set([
  ["11:42", "KL441", "PARIS CDG"],
  ["12:05", "TP431", "LISBOA"],
]);
```

`set()` takes the values row-major and resolves once the last cell settles.
Omit `rows` and the board sizes itself to the data.

### Refresh order

`order` decides the sequence in which cells start turning, and `cascade` how
many milliseconds separate one rank from the next.

| Order            | Effect                                               |
| ---------------- | ---------------------------------------------------- |
| `"simultaneous"` | Everything at once. The default.                     |
| `"rows"`         | Row by row — how a departure board actually updates. |
| `"columns"`      | Column by column, left to right.                     |
| `"cells"`        | Cell by cell in reading order.                       |
| `"random"`       | Cell by cell, shuffled afresh on every refresh.      |

Each of those is a rank function underneath: the board sorts by rank and holds
each cell back by `rank × cascade`. Passing your own is the same shape, which
makes a diagonal ripple one line:

```js
board.setOptions({ order: ({ row, column }) => row + column });
```

### Board options

| Option     | Type                 | Default          | Description                                           |
| ---------- | -------------------- | ---------------- | ----------------------------------------------------- |
| `columns`  | `SplitFlapOptions[]` | required         | One entry per column.                                 |
| `defaults` | `SplitFlapOptions`   | —                | Applied to every column, before its own options.      |
| `labels`   | `string[]`           | —                | Column headings. Omit for a bare grid.                |
| `rows`     | `number`             | auto             | Fixed row count. Omitted, the board follows the data. |
| `order`    | `RefreshOrder`       | `"simultaneous"` | Sequence cells start turning in.                      |
| `cascade`  | `number`             | `90`             | Milliseconds between one rank and the next.           |
| `onSettle` | `(detail) => void`   | —                | Fired when every cell has settled.                    |

`cell(row, column)` hands back the underlying display, so a single column can
still be driven on its own. Re-labelling through `setOptions({ labels })`
updates the headings in place and leaves those displays alive.

## Options

| Option                 | Type                               | Default          | Description                                                    |
| ---------------------- | ---------------------------------- | ---------------- | -------------------------------------------------------------- |
| `value`                | `string`                           | `""`             | Text to display.                                               |
| `words`                | `string[]`                         | —                | Whole words to turn through instead of characters.             |
| `length`               | `number`                           | auto             | Number of flaps. Omitted, the board sizes itself to the value. |
| `chars`                | `AlphabetName \| string`           | `"alphanumeric"` | Glyphs each flap cycles through.                               |
| `align`                | `"left" \| "center" \| "right"`    | `"left"`         | Where a value shorter than the board sits.                     |
| `padChar`              | `string`                           | `" "`            | Glyph used to fill unused flaps.                               |
| `duration`             | `number`                           | `110`            | Milliseconds to advance a single glyph.                        |
| `stagger`              | `number`                           | `55`             | Delay of each flap behind the one to its left.                 |
| `jitter`               | `number`                           | `0.18`           | Timing jitter, 0–1.                                            |
| `minSteps`             | `number`                           | `1`              | Minimum glyphs any moving flap travels through.                |
| `extraLoops`           | `number`                           | `0`              | Extra full revolutions added to every moving flap.             |
| `uppercase`            | `boolean`                          | `true`           | Upper-case the value before display.                           |
| `normalize`            | `boolean`                          | `true`           | Strip accents missing from the alphabet (`DÉPART` → `DEPART`). |
| `theme`                | `ThemeName`                        | —                | Applied as an `sf--<name>` class.                              |
| `size`                 | `string`                           | `3rem`           | Shorthand for `--sf-size`.                                     |
| `sound`                | `boolean`                          | `false`          | Mechanical click per step. Needs a prior user gesture.         |
| `volume`               | `number`                           | `0.25`           | Click volume, 0–1.                                             |
| `injectStyles`         | `boolean`                          | `true`           | Inject the stylesheet on first use.                            |
| `respectReducedMotion` | `boolean`                          | `true`           | Apply the value with no animation when the OS asks for it.     |
| `ariaLive`             | `"off" \| "polite" \| "assertive"` | `"off"`          | Value of `aria-live` on the root element.                      |

Built-in alphabets: `letters`, `digits`, `alphanumeric`, `full`, `hex`,
`mixedCase`. Pass any string to define your own — order decides how far a flap
has to travel, and duplicates are removed.

## Methods

| Member                 | Returns         | Description                                                  |
| ---------------------- | --------------- | ------------------------------------------------------------ |
| `set(value, options?)` | `Promise<void>` | Animate to a value. `options.immediate` skips the animation. |
| `value`                | `string`        | Read or write the displayed text.                            |
| `isAnimating`          | `boolean`       | True while at least one flap is turning.                     |
| `length`               | `number`        | Number of flaps currently rendered.                          |
| `setOptions(patch)`    | `void`          | Merge new options in.                                        |
| `stop()`               | `void`          | Freeze the flaps where they stand.                           |
| `randomize()`          | `Promise<void>` | Flip to a random value of the current length.                |
| `destroy()`            | `void`          | Tear the display down and release timers, audio and DOM.     |

## Events

Dispatched on the root element, and also available as `onStart`, `onFlip` and
`onSettle` options.

| Event              | `detail`                 |
| ------------------ | ------------------------ |
| `splitflap:start`  | `{ from, to }`           |
| `splitflap:flip`   | `{ index, char, final }` |
| `splitflap:settle` | `{ value }`              |

## Theming

A theme is a set of CSS custom properties — no fork required.

```css
.sf--midnight {
  --sf-color: #cfe3ff;
  --sf-bg-top: #10203a;
  --sf-bg-bottom: #0a1729;
  --sf-divider: rgba(0, 0, 0, 0.7);
  --sf-radius: 0.12em;
}
```

```js
new SplitFlap("#board", { theme: "midnight" });
```

Shipped themes: `airport`, `amber`, `vintage`, `terminal`, `paper`. The full
list of variables is in the
[documentation](https://sn0wfr.github.io/Split-flap/#api).

## Browser support

Any browser with the Web Animations API — Chrome 84+, Firefox 75+, Safari 13.1+.
Older engines still get correct text, stepped on schedule, without the 3D
rotation.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). This repository uses
[Conventional Commits](https://www.conventionalcommits.org/) and
[release-please](https://github.com/googleapis/release-please); commit messages
drive the version bump and the changelog.

## Licence

[MIT](./LICENSE)
