import { SplitFlap, alphabets, createClicker } from "../../src/index.js";
import type { Clicker } from "../../src/index.js";
import {
  airlines,
  apiEvents,
  apiMethods,
  apiOptions,
  apiVars,
  destinations,
  dictionaries,
  heroPhrases,
  HTML_KEYS,
  statuses,
  type Lang,
  type Row,
} from "./i18n.js";
import "./site.css";

/* ===================================================================== */
/* Language                                                              */
/* ===================================================================== */

const STORAGE_KEY = "split-flap-site-lang";

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "fr" || saved === "en") return saved;
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

let lang: Lang = initialLang();

/** Swap every translated string in the page. */
function applyLang(next: Lang): void {
  lang = next;
  const dict = dictionaries[next];
  document.documentElement.lang = next;
  localStorage.setItem(STORAGE_KEY, next);

  for (const node of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const value = dict[node.dataset.i18n ?? ""];
    if (value === undefined) continue;
    // <meta> carries its text in an attribute, not a child node.
    if (node instanceof HTMLMetaElement) node.content = value;
    else node.textContent = value;
  }

  // Authored markup, never user input — safe to assign as HTML.
  for (const node of document.querySelectorAll<HTMLElement>(
    "[data-i18n-html]",
  )) {
    const key = node.dataset.i18nHtml ?? "";
    if (HTML_KEYS.has(key) && dict[key]) node.innerHTML = dict[key];
  }

  for (const node of document.querySelectorAll<HTMLElement>(
    "[data-i18n-title]",
  )) {
    const value = dict[node.dataset.i18nTitle ?? ""];
    if (value) node.title = value;
  }

  document.title = dict["meta.title"] ?? document.title;

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-lang]",
  )) {
    button.classList.toggle("is-active", button.dataset.lang === next);
  }

  renderApiTables();
  refreshBoard();
  // The switch owns its own label, which is state-dependent rather than a
  // fixed string, so it cannot be handled by the data-i18n sweep above.
  applySound();
}

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-lang]",
)) {
  button.addEventListener("click", () =>
    applyLang(button.dataset.lang as Lang),
  );
}

/* ===================================================================== */
/* Sound                                                                 */
/* ===================================================================== */

const SOUND_KEY = "split-flap-site-sound";

/**
 * Boards that follow the header switch. Sound stays off until it is asked
 * for: a page that clatters at a visitor unprompted is obnoxious, and
 * browsers block audio before a gesture anyway, so it would not even work.
 */
const ambient: SplitFlap[] = [];

let soundOn = localStorage.getItem(SOUND_KEY) === "on";

/** Lets the playground react without exporting its internals. */
let syncPlaygroundSound: (() => void) | null = null;

const soundButton = document.querySelector<HTMLButtonElement>("#sound-toggle");

/** A clicker of our own, purely to answer the toggle itself. */
let feedback: Clicker | null = null;

function applySound(): void {
  for (const display of ambient) display.setOptions({ sound: soundOn });
  syncPlaygroundSound?.();

  soundButton?.setAttribute("aria-pressed", String(soundOn));
  const dict = dictionaries[lang];
  const label = dict[soundOn ? "sound.on" : "sound.off"];
  if (soundButton && label) soundButton.title = label;
}

soundButton?.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  applySound();

  // Click once from inside the gesture: that is what lifts the browser's
  // autoplay block, and it answers the button without waiting for a flip.
  if (soundOn) (feedback ??= createClicker(0.3)).tick();
});

/* ===================================================================== */
/* Hero                                                                  */
/* ===================================================================== */

const heroHost = document.querySelector<HTMLElement>("#hero-board");
if (heroHost) {
  const hero = new SplitFlap(heroHost, {
    value: "SPLIT FLAP",
    length: 12,
    align: "center",
    chars: "full",
    duration: 95,
    stagger: 45,
    minSteps: 3,
    size: "clamp(1.5rem, 6.2vw, 4rem)",
    volume: 0.22,
  });
  ambient.push(hero);

  /** How long a settled headline stays readable before the next one. */
  const HERO_REST = 3800;

  let cursor = 0;
  // The pause is measured from the settle, not from the start of the flip.
  // A fixed interval would spend most of itself on the animation — and a
  // long headline travels further than a short one, so the time actually
  // left to read would change from phrase to phrase.
  const cycle = async () => {
    const phrases = heroPhrases[lang];
    cursor = (cursor + 1) % phrases.length;
    await hero.set(phrases[cursor] ?? "SPLIT FLAP");
    window.setTimeout(() => void cycle(), HERO_REST);
  };
  window.setTimeout(() => void cycle(), HERO_REST);
}

/* ===================================================================== */
/* Playground                                                            */
/* ===================================================================== */

interface PlayState {
  value: string;
  length: number;
  chars: string;
  align: "left" | "center" | "right";
  theme: string;
  duration: number;
  stagger: number;
  jitter: number;
  minSteps: number;
  size: number;
  sound: boolean;
}

const playHost = document.querySelector<HTMLElement>("#play-board");

if (playHost) {
  const $ = <T extends HTMLElement>(id: string) =>
    document.querySelector<T>(id)!;

  const inputs = {
    value: $<HTMLInputElement>("#c-value"),
    length: $<HTMLInputElement>("#c-length"),
    chars: $<HTMLSelectElement>("#c-chars"),
    align: $<HTMLSelectElement>("#c-align"),
    theme: $<HTMLSelectElement>("#c-theme"),
    duration: $<HTMLInputElement>("#c-duration"),
    stagger: $<HTMLInputElement>("#c-stagger"),
    jitter: $<HTMLInputElement>("#c-jitter"),
    minSteps: $<HTMLInputElement>("#c-minsteps"),
    size: $<HTMLInputElement>("#c-size"),
    sound: $<HTMLInputElement>("#c-sound"),
  };

  const outputs = {
    length: $("#o-length"),
    duration: $("#o-duration"),
    stagger: $("#o-stagger"),
    jitter: $("#o-jitter"),
    minSteps: $("#o-minsteps"),
    size: $("#o-size"),
  };

  const read = (): PlayState => ({
    value: inputs.value.value,
    length: Number(inputs.length.value),
    chars: inputs.chars.value,
    align: inputs.align.value as PlayState["align"],
    theme: inputs.theme.value,
    duration: Number(inputs.duration.value),
    stagger: Number(inputs.stagger.value),
    jitter: Number(inputs.jitter.value),
    minSteps: Number(inputs.minSteps.value),
    size: Number(inputs.size.value),
    sound: inputs.sound.checked,
  });

  const state = read();
  const board = new SplitFlap(playHost, {
    ...state,
    size: `${state.size}rem`,
    sound: soundOn && state.sound,
  });

  // The header switch can only silence the playground; its own checkbox
  // still decides whether `sound: true` belongs in the generated call.
  syncPlaygroundSound = () => {
    inputs.sound.disabled = !soundOn;
    board.setOptions({ sound: soundOn && inputs.sound.checked });
  };

  const codeOut = $("#play-code");

  const renderCode = (s: PlayState) => {
    const lines = [
      `import { SplitFlap } from "@sn0wfr/split-flap";`,
      ``,
      `const board = new SplitFlap("#board", {`,
      `  length: ${s.length},`,
      `  chars: ${JSON.stringify(s.chars)},`,
      `  align: ${JSON.stringify(s.align)},`,
      `  theme: ${JSON.stringify(s.theme)},`,
      `  duration: ${s.duration},`,
      `  stagger: ${s.stagger},`,
      `  jitter: ${s.jitter},`,
      `  minSteps: ${s.minSteps},`,
      `  size: "${s.size}rem",`,
      ...(s.sound ? [`  sound: true,`] : []),
      `});`,
      ``,
      `await board.set(${JSON.stringify(s.value)});`,
    ];
    codeOut.textContent = lines.join("\n");
  };

  const syncOutputs = (s: PlayState) => {
    outputs.length.textContent = String(s.length);
    outputs.duration.textContent = `${s.duration} ms`;
    outputs.stagger.textContent = `${s.stagger} ms`;
    outputs.jitter.textContent = s.jitter.toFixed(2);
    outputs.minSteps.textContent = String(s.minSteps);
    outputs.size.textContent = `${s.size.toFixed(1)} rem`;
  };

  const update = () => {
    const s = read();
    board.setOptions({
      length: s.length,
      chars: s.chars,
      align: s.align,
      theme: s.theme,
      duration: s.duration,
      stagger: s.stagger,
      jitter: s.jitter,
      minSteps: s.minSteps,
      size: `${s.size}rem`,
      sound: soundOn && s.sound,
    });
    void board.set(s.value);
    syncOutputs(s);
    renderCode(s);
  };

  for (const input of Object.values(inputs)) {
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  }

  $("#play-replay").addEventListener("click", () => {
    const s = read();
    // Blank the board first so the replay travels the full distance.
    void board.set("", { immediate: true }).then(() => board.set(s.value));
  });

  $("#play-random").addEventListener("click", () => void board.randomize());

  syncOutputs(state);
  renderCode(state);
}

/* ===================================================================== */
/* Departure board                                                       */
/* ===================================================================== */

interface BoardRow {
  time: SplitFlap;
  flight: SplitFlap;
  dest: SplitFlap;
  gate: SplitFlap;
  status: SplitFlap;
}

const boardRows: BoardRow[] = [];
const ROW_COUNT = 6;
const GATE_LETTERS = ["A", "B", "C", "D"];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function buildBoard(): void {
  const host = document.querySelector<HTMLElement>("#board-grid");
  if (!host) return;

  for (let i = 0; i < ROW_COUNT; i += 1) {
    // Cells go straight into the shared grid — no per-row wrapper — so every
    // column stays aligned with its header.
    const cell = (className: string) => {
      const node = document.createElement("div");
      node.className = `board__cell ${className}`;
      host.append(node);
      return node;
    };

    const shared = {
      duration: 85,
      stagger: 35,
      // Rows lower down start later, the way a real board cascades.
      minSteps: 2,
      size: "clamp(0.8rem, 2.1vw, 1.35rem)",
      // Thirty columns click at once here. Per-cell volume has to sit far
      // below the hero's or the sum clips into noise.
      volume: 0.05,
    } as const;

    boardRows.push({
      time: new SplitFlap(cell("is-time"), {
        ...shared,
        length: 5,
        chars: " 0123456789:",
      }),
      flight: new SplitFlap(cell("is-flight"), {
        ...shared,
        length: 6,
        chars: "alphanumeric",
      }),
      dest: new SplitFlap(cell("is-dest"), {
        ...shared,
        length: 11,
        chars: "letters",
      }),
      gate: new SplitFlap(cell("is-gate"), {
        ...shared,
        length: 3,
        chars: "alphanumeric",
        align: "center",
      }),
      status: new SplitFlap(cell("is-status"), {
        ...shared,
        length: 11,
        chars: "letters",
      }),
    });
  }

  for (const row of boardRows) ambient.push(...Object.values(row));
}

/** Fill every row with a fresh, plausible departure. */
function refreshBoard(): void {
  const now = new Date();
  boardRows.forEach((row, i) => {
    const at = new Date(now.getTime() + (i + 1) * 17 * 60_000);
    const time = `${String(at.getHours()).padStart(2, "0")}:${String(
      at.getMinutes(),
    ).padStart(2, "0")}`;

    void row.time.set(time);
    void row.flight.set(
      `${pick(airlines)}${String(100 + Math.floor(Math.random() * 899))}`,
    );
    void row.dest.set(pick(destinations));
    void row.gate.set(
      `${pick(GATE_LETTERS)}${1 + Math.floor(Math.random() * 30)}`,
    );
    void row.status.set(pick(statuses[lang]));
  });
}

buildBoard();

document
  .querySelector("#board-shuffle")
  ?.addEventListener("click", () => refreshBoard());

/* ===================================================================== */
/* Themes gallery                                                        */
/* ===================================================================== */

const THEMES = ["airport", "amber", "vintage", "terminal", "paper"] as const;

function buildThemes(): void {
  const host = document.querySelector<HTMLElement>("#themegrid");
  if (!host) return;

  for (const theme of THEMES) {
    const card = document.createElement("figure");
    card.className = "themecard";

    const stage = document.createElement("div");
    const caption = document.createElement("figcaption");
    caption.textContent = theme;
    card.append(stage, caption);
    host.append(card);

    const display = new SplitFlap(stage, {
      value: theme.toUpperCase(),
      length: 8,
      align: "center",
      theme,
      chars: "letters",
      duration: 90,
      stagger: 40,
      size: "clamp(1.1rem, 3vw, 1.6rem)",
      volume: 0.14,
    });
    ambient.push(display);

    // Re-flip on hover so each theme can be seen in motion.
    card.addEventListener("mouseenter", () => {
      if (!display.isAnimating) {
        void display
          .set("", { immediate: true })
          .then(() => display.set(theme.toUpperCase()));
      }
    });
  }
}

buildThemes();

/* ===================================================================== */
/* API tables                                                            */
/* ===================================================================== */

function fillTable(selector: string, rows: Row[], withDefault: boolean): void {
  const body = document.querySelector<HTMLElement>(selector);
  if (!body) return;

  body.replaceChildren(
    ...rows.map((row) => {
      const tr = document.createElement("tr");

      const name = document.createElement("td");
      const code = document.createElement("code");
      code.textContent = row.name;
      name.append(code);
      tr.append(name);

      if (row.type) {
        const type = document.createElement("td");
        const typeCode = document.createElement("code");
        typeCode.className = "muted";
        typeCode.textContent = row.type;
        type.append(typeCode);
        tr.append(type);
      } else if (!withDefault) {
        tr.append(document.createElement("td"));
      }

      if (withDefault) {
        const fallback = document.createElement("td");
        fallback.className = "muted";
        fallback.textContent = row.fallback ?? "—";
        tr.append(fallback);
      }

      const desc = document.createElement("td");
      desc.textContent = row[lang];
      tr.append(desc);

      return tr;
    }),
  );
}

function renderApiTables(): void {
  fillTable("#api-options", apiOptions, true);
  fillTable("#api-methods", apiMethods, false);
  fillTable("#api-events", apiEvents, false);
  fillTable("#api-vars", apiVars, true);
}

/* ===================================================================== */
/* Tabs                                                                  */
/* ===================================================================== */

for (const group of document.querySelectorAll<HTMLElement>("[data-tabs]")) {
  const tabs = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  const select = (tab: HTMLButtonElement) => {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute("aria-selected", String(selected));
      other.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(
        other.getAttribute("aria-controls") ?? "",
      );
      if (panel) panel.hidden = !selected;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const offset =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!offset) return;
      event.preventDefault();
      const next = tabs[(index + offset + tabs.length) % tabs.length]!;
      select(next);
      next.focus();
    });
  });
}

/* ===================================================================== */
/* Copy buttons                                                          */
/* ===================================================================== */

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-copy]",
)) {
  button.addEventListener("click", async () => {
    const source = document.querySelector(button.dataset.copy ?? "");
    if (!source) return;

    try {
      await navigator.clipboard.writeText(source.textContent ?? "");
    } catch {
      return; // Clipboard blocked; leave the label alone.
    }

    const label = button.querySelector("span") ?? button;
    const original = label.textContent;
    label.textContent = dictionaries[lang]["common.copied"] ?? "OK";
    setTimeout(() => {
      label.textContent = original;
    }, 1400);
  });
}

/* ===================================================================== */
/* Boot                                                                  */
/* ===================================================================== */

// Expose the alphabets for anyone poking at the page from the console.
Object.assign(window, { SplitFlap, alphabets });

applyLang(lang);
