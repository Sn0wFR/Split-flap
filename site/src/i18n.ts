export type Lang = "fr" | "en";

export const LANGS: Lang[] = ["fr", "en"];

/** Keys whose value contains markup and must be assigned as HTML. */
export const HTML_KEYS = new Set([
  "features.any.d",
  "features.a11y.d",
  "features.ts.d",
  "start.html",
  "start.esm",
  "start.react",
]);

type Dict = Record<string, string>;

const fr: Dict = {
  "meta.description":
    "Une librairie sans dépendance qui affiche du texte comme un tableau de départs d'aéroport. Vanilla, Web Component et React.",
  "meta.title": "split-flap — affichage mécanique pour le web",
  "a11y.skip": "Aller au contenu",

  "nav.start": "Démarrer",
  "nav.playground": "Bac à sable",
  "nav.demo": "Démo",
  "nav.themes": "Thèmes",
  "nav.api": "API",

  "sound.label": "Son mécanique",
  "sound.on": "Couper le son mécanique",
  "sound.off": "Activer le son mécanique",
  "sound.title": "Activer le son mécanique",

  "hero.eyebrow": "Zéro dépendance · 5,9 ko gzip · MIT",
  "hero.title": "Affichez du texte comme un tableau de départs",
  "hero.lede":
    "Une librairie qui rend n'importe quelle chaîne comme un panneau Solari : chaque volet tourne glyphe par glyphe jusqu'à sa cible, exactement comme la mécanique d'origine.",
  "hero.cta": "Commencer",
  "hero.play": "Essayer en direct",

  "common.copy": "Copier",
  "common.copied": "Copié !",

  "features.title": "Ce que ça fait bien",
  "features.mech.t": "Mécanique fidèle",
  "features.mech.d":
    "Les volets n'avancent que vers l'avant, glyphe par glyphe, en repassant par le blanc — comme un vrai tableau.",
  "features.dep.t": "Aucune dépendance",
  "features.dep.d":
    "Rien d'autre à installer. Le CSS est embarqué dans le bundle et injecté au premier usage.",
  "features.any.t": "Partout",
  "features.any.d":
    "Un cœur vanilla, un custom element <code>&lt;split-flap&gt;</code> natif, et un wrapper React. Vue, Svelte et Angular passent par l'élément.",
  "features.a11y.t": "Accessible",
  "features.a11y.d":
    "Le texte reste lisible par un lecteur d'écran, les volets sont masqués, et <code>prefers-reduced-motion</code> coupe l'animation.",
  "features.theme.t": "Thémable",
  "features.theme.d":
    "Tout passe par des variables CSS. Un thème, c'est cinq lignes de surcharge — pas un fork.",
  "features.ts.t": "TypeScript",
  "features.ts.d":
    "Types fournis, ESM et CJS, plus un build IIFE pour un simple <code>&lt;script&gt;</code> depuis un CDN.",

  "start.title": "Démarrer",
  "start.lede":
    "Trois façons de l'utiliser, selon ce que vous avez sous la main.",
  "start.html":
    "Une balise script, et l'élément est disponible. Le texte entre les balises sert de repli sans JavaScript.",
  "start.esm":
    "Le cœur est une classe. <code>set()</code> renvoie une promesse résolue quand tous les volets sont arrivés.",
  "start.react":
    "Le composant pilote l'instance : changer <code>value</code> déclenche l'animation, changer une option reconfigure sur place.",

  "play.title": "Bac à sable",
  "play.lede": "Réglez, regardez, puis copiez le code correspondant.",
  "play.replay": "Rejouer",
  "play.random": "Aléatoire",
  "play.text": "Texte",
  "play.theme": "Thème",
  "play.chars": "Alphabet",
  "play.align": "Alignement",
  "play.length": "Volets",
  "play.duration": "Durée / cran",
  "play.stagger": "Décalage",
  "play.jitter": "Irrégularité",
  "play.minsteps": "Crans minimum",
  "play.size": "Taille",
  "play.sound": "Son mécanique",
  "play.code": "Code correspondant",

  "demo.title": "Un vrai tableau de départs",
  "demo.lede":
    "Plusieurs instances côte à côte, rafraîchies comme le ferait un aéroport. Chaque colonne a son propre alphabet et son propre rythme.",
  "demo.time": "HEURE",
  "demo.flight": "VOL",
  "demo.dest": "DESTINATION",
  "demo.gate": "PTE",
  "demo.status": "STATUT",
  "demo.refresh": "Rafraîchir le tableau",

  "themes.title": "Thèmes",
  "themes.lede":
    "Cinq thèmes fournis. Chacun n'est qu'un jeu de variables CSS — le vôtre tient dans un bloc.",
  "themes.custom": "Votre propre thème",

  "api.title": "Référence",
  "api.options": "Options",
  "api.methods": "Méthodes et propriétés",
  "api.events": "Événements",
  "api.vars": "Variables CSS",
  "api.name": "Nom",
  "api.type": "Type",
  "api.default": "Défaut",
  "api.desc": "Description",

  "footer.license": "licence MIT",
};

const en: Dict = {
  "meta.description":
    "A zero-dependency library that renders text as an airport departure board. Vanilla, Web Component and React.",
  "meta.title": "split-flap — mechanical text display for the web",
  "a11y.skip": "Skip to content",

  "nav.start": "Get started",
  "nav.playground": "Playground",
  "nav.demo": "Demo",
  "nav.themes": "Themes",
  "nav.api": "API",

  "sound.label": "Mechanical sound",
  "sound.on": "Mute the mechanical sound",
  "sound.off": "Turn on the mechanical sound",
  "sound.title": "Turn on the mechanical sound",

  "hero.eyebrow": "Zero dependencies · 5.9 kB gzip · MIT",
  "hero.title": "Render text like a departure board",
  "hero.lede":
    "A library that renders any string as a Solari board: every flap turns one glyph at a time until it reaches its target, exactly like the original mechanism.",
  "hero.cta": "Get started",
  "hero.play": "Try it live",

  "common.copy": "Copy",
  "common.copied": "Copied!",

  "features.title": "What it does well",
  "features.mech.t": "Faithful mechanics",
  "features.mech.d":
    "Flaps only ever move forward, one glyph at a time, wrapping through the blank — just like the real thing.",
  "features.dep.t": "No dependencies",
  "features.dep.d":
    "Nothing else to install. The CSS ships inside the bundle and is injected on first use.",
  "features.any.t": "Runs anywhere",
  "features.any.d":
    "A vanilla core, a native <code>&lt;split-flap&gt;</code> custom element, and a React wrapper. Vue, Svelte and Angular use the element.",
  "features.a11y.t": "Accessible",
  "features.a11y.d":
    "The text stays readable to screen readers, the flaps are hidden from them, and <code>prefers-reduced-motion</code> skips the animation.",
  "features.theme.t": "Themeable",
  "features.theme.d":
    "Everything runs through CSS custom properties. A theme is five lines of overrides — not a fork.",
  "features.ts.t": "TypeScript",
  "features.ts.d":
    "Types included, ESM and CJS, plus an IIFE build for a plain <code>&lt;script&gt;</code> tag from a CDN.",

  "start.title": "Get started",
  "start.lede": "Three ways to use it, depending on what you already have.",
  "start.html":
    "One script tag and the element is available. The text between the tags is the no-JavaScript fallback.",
  "start.esm":
    "The core is a class. <code>set()</code> returns a promise that resolves once every flap has landed.",
  "start.react":
    "The component drives the instance: changing <code>value</code> animates, changing an option reconfigures in place.",

  "play.title": "Playground",
  "play.lede": "Tune it, watch it, then copy the matching code.",
  "play.replay": "Replay",
  "play.random": "Randomise",
  "play.text": "Text",
  "play.theme": "Theme",
  "play.chars": "Alphabet",
  "play.align": "Align",
  "play.length": "Flaps",
  "play.duration": "Duration / step",
  "play.stagger": "Stagger",
  "play.jitter": "Jitter",
  "play.minsteps": "Min steps",
  "play.size": "Size",
  "play.sound": "Mechanical sound",
  "play.code": "Matching code",

  "demo.title": "An actual departure board",
  "demo.lede":
    "Several instances side by side, refreshed the way an airport would. Each column has its own alphabet and its own rhythm.",
  "demo.time": "TIME",
  "demo.flight": "FLIGHT",
  "demo.dest": "DESTINATION",
  "demo.gate": "GATE",
  "demo.status": "STATUS",
  "demo.refresh": "Refresh the board",

  "themes.title": "Themes",
  "themes.lede":
    "Five themes included. Each is nothing but a set of CSS variables — yours fits in one block.",
  "themes.custom": "Your own theme",

  "api.title": "Reference",
  "api.options": "Options",
  "api.methods": "Methods and properties",
  "api.events": "Events",
  "api.vars": "CSS variables",
  "api.name": "Name",
  "api.type": "Type",
  "api.default": "Default",
  "api.desc": "Description",

  "footer.license": "MIT licence",
};

export const dictionaries: Record<Lang, Dict> = { fr, en };

/** Headlines the hero board cycles through. */
export const heroPhrases: Record<Lang, string[]> = {
  fr: ["SPLIT FLAP", "DEPART 1240", "EMBARQUEMENT", "PORTE 24", "A L HEURE"],
  en: ["SPLIT FLAP", "DEPART 1240", "NOW BOARDING", "GATE 24", "ON TIME"],
};

/**
 * Status column of the departure board demo.
 *
 * Spelt out in full rather than abbreviated: a word module carries one whole
 * word per leaf, so there is no per-character budget to save — the flap just
 * widens to the longest entry.
 */
export const statuses: Record<Lang, string[]> = {
  fr: [
    "A L'HEURE",
    "EMBARQUEMENT",
    "RETARDÉ",
    "DERNIER APPEL",
    "ANNULÉ",
    "PORTE OUVERTE",
  ],
  en: ["ON TIME", "BOARDING", "DELAYED", "LAST CALL", "CANCELLED", "GATE OPEN"],
};

/**
 * A colour per status, in the order `statuses` lists them — the same order in
 * both languages, so one list covers the two. `null` leaves a status on the
 * theme's own flaps.
 *
 * On time is the unpainted one. A real board is mostly on-time rows, and
 * painting them all makes a field of colour the exceptions have to fight
 * their way out of; left alone, every colour that appears means "this one is
 * different". The demo draws its statuses uniformly rather than realistically,
 * so it shows the mechanism rather than the full effect.
 *
 * That leaves five paints for five statuses, and each has to be legible
 * against bare flaps as well as against each other. A muted colour cannot be:
 * slate is only 1.7:1 against the theme background, so a slate flap and an
 * unpainted one read the same from any distance. Green and blue both clear
 * 2.8:1 and separate on hue, which is what survives.
 */
export const statusPalette = [
  null,
  "blue",
  "amber",
  "orange",
  "red",
  "green",
] as const;

export const destinations = [
  "PARIS CDG",
  "LISBOA",
  "REYKJAVIK",
  "MARRAKECH",
  "SINGAPORE",
  "SAO PAULO",
  "KOBENHAVN",
  "ISTANBUL",
  "MONTREAL",
  "NAIROBI",
  "OSAKA",
  "EDINBURGH",
];

export const airlines = ["AF", "LH", "BA", "KL", "IB", "SK", "TP", "EK"];

interface Row {
  name: string;
  type: string;
  fallback?: string;
  fr: string;
  en: string;
}

export const apiOptions: Row[] = [
  {
    name: "value",
    type: "string",
    fallback: '""',
    fr: "Texte affiché.",
    en: "Text to display.",
  },
  {
    name: "words",
    type: "string[]",
    fallback: "—",
    fr: "Mots entiers à faire défiler au lieu de caractères, comme le module destination d'un vrai tableau. Le volet devient unique et s'élargit au mot le plus long ; « chars », « length » et « align » ne s'appliquent plus.",
    en: "Whole words to turn through instead of characters, like the destination unit on a real board. The display becomes a single flap sized to the longest word; `chars`, `length` and `align` no longer apply.",
  },
  {
    name: "length",
    type: "number",
    fallback: "auto",
    fr: "Nombre de volets. Omis, le tableau s'adapte à la valeur.",
    en: "Number of flaps. Omitted, the board sizes itself to the value.",
  },
  {
    name: "chars",
    type: "AlphabetName | string",
    fallback: '"alphanumeric"',
    fr: "Glyphes parcourus : un preset ou votre propre chaîne.",
    en: "Glyphs each flap cycles through: a preset or your own string.",
  },
  {
    name: "align",
    type: '"left" | "center" | "right"',
    fallback: '"left"',
    fr: "Position d'une valeur plus courte que le tableau.",
    en: "Where a value shorter than the board sits.",
  },
  {
    name: "padChar",
    type: "string",
    fallback: '" "',
    fr: "Glyphe de remplissage des volets inutilisés.",
    en: "Glyph used to fill unused flaps.",
  },
  {
    name: "duration",
    type: "number",
    fallback: "110",
    fr: "Millisecondes pour avancer d'un seul glyphe.",
    en: "Milliseconds to advance a single glyph.",
  },
  {
    name: "stagger",
    type: "number",
    fallback: "55",
    fr: "Retard de chaque volet sur celui de gauche.",
    en: "Delay of each flap behind the one to its left.",
  },
  {
    name: "jitter",
    type: "number",
    fallback: "0.18",
    fr: "Irrégularité du timing, 0 à 1. Évite l'effet tableur.",
    en: "Timing jitter, 0 to 1. Stops the board looking like a spreadsheet.",
  },
  {
    name: "minSteps",
    type: "number",
    fallback: "1",
    fr: "Crans minimum parcourus par un volet qui bouge.",
    en: "Minimum glyphs any moving flap travels through.",
  },
  {
    name: "extraLoops",
    type: "number",
    fallback: "0",
    fr: "Tours complets ajoutés à chaque volet qui bouge.",
    en: "Extra full revolutions added to every moving flap.",
  },
  {
    name: "uppercase",
    type: "boolean",
    fallback: "true",
    fr: "Passe la valeur en majuscules avant l'affichage.",
    en: "Upper-cases the value before display.",
  },
  {
    name: "normalize",
    type: "boolean",
    fallback: "true",
    fr: "Retire les accents absents de l'alphabet (DÉPART → DEPART).",
    en: "Strips accents missing from the alphabet (DÉPART → DEPART).",
  },
  {
    name: "theme",
    type: "ThemeName",
    fallback: "—",
    fr: "Thème appliqué comme classe sf--<nom>.",
    en: "Theme applied as an sf--<name> class.",
  },
  {
    name: "colors",
    type: "ColorMap",
    fallback: "—",
    fr: "Fond et couleur de glyphe d'un volet, selon ce qu'il affiche — rouge pour un vol annulé, ambre pour un retard, orange pour un dernier appel. Une entrée sans clé garde les couleurs du thème : colorez les exceptions, pas la règle. Une fonction (entrée, index) colore par position. Six paires prêtes à l'emploi dans « flapColors ».",
    en: "Flap background and glyph colour, by what it shows — red for a cancelled flight, amber for a delay, orange for a last call. An entry with no key keeps the theme's colours: colour the exceptions, not the rule. A function (entry, index) colours by position instead. Six ready-made pairs ship in `flapColors`.",
  },
  {
    name: "size",
    type: "string",
    fallback: "3rem",
    fr: "Raccourci pour la variable CSS --sf-size.",
    en: "Shorthand for the --sf-size custom property.",
  },
  {
    name: "sound",
    type: "boolean",
    fallback: "false",
    fr: "Clic mécanique à chaque cran. Nécessite une interaction préalable.",
    en: "Mechanical click on each step. Needs a prior user gesture.",
  },
  {
    name: "volume",
    type: "number",
    fallback: "0.25",
    fr: "Volume du clic, 0 à 1.",
    en: "Click volume, 0 to 1.",
  },
  {
    name: "injectStyles",
    type: "boolean",
    fallback: "true",
    fr: "Injecte la feuille de style au premier usage.",
    en: "Injects the stylesheet on first use.",
  },
  {
    name: "respectReducedMotion",
    type: "boolean",
    fallback: "true",
    fr: "Applique la valeur sans animation si l'OS le demande.",
    en: "Applies the value with no animation when the OS asks for it.",
  },
  {
    name: "ariaLive",
    type: '"off" | "polite" | "assertive"',
    fallback: '"off"',
    fr: "Valeur d'aria-live sur l'élément racine.",
    en: "Value of aria-live on the root element.",
  },
];

export const apiMethods: Row[] = [
  {
    name: "set(value, options?)",
    type: "Promise<void>",
    fr: "Anime vers une valeur. La promesse se résout quand tout est arrivé. options.immediate saute l'animation.",
    en: "Animates to a value. The promise resolves once everything has landed. options.immediate skips the animation.",
  },
  {
    name: "value",
    type: "string",
    fr: "Lecture ou écriture du texte affiché, padding de fin retiré.",
    en: "Reads or writes the displayed text, trailing padding removed.",
  },
  {
    name: "isAnimating",
    type: "boolean",
    fr: "Vrai tant qu'au moins un volet tourne.",
    en: "True while at least one flap is turning.",
  },
  {
    name: "length",
    type: "number",
    fr: "Nombre de volets actuellement rendus.",
    en: "Number of flaps currently rendered.",
  },
  {
    name: "setOptions(patch)",
    type: "void",
    fr: "Fusionne de nouvelles options. Ce qui touche la géométrie reconstruit la rangée.",
    en: "Merges new options in. Anything affecting geometry rebuilds the row.",
  },
  {
    name: "stop()",
    type: "void",
    fr: "Fige les volets sur place et résout les set() en cours.",
    en: "Freezes the flaps where they stand and resolves any pending set().",
  },
  {
    name: "randomize()",
    type: "Promise<void>",
    fr: "Part vers une valeur aléatoire de la longueur courante.",
    en: "Flips to a random value of the current length.",
  },
  {
    name: "destroy()",
    type: "void",
    fr: "Démonte l'affichage et libère timers, audio et DOM.",
    en: "Tears the display down and releases timers, audio and DOM.",
  },
  {
    name: "root",
    type: "HTMLElement",
    fr: "L'élément dans lequel l'affichage est monté.",
    en: "The element the display is mounted into.",
  },
];

export const apiEvents: Row[] = [
  {
    name: "splitflap:start",
    type: "{ from, to }",
    fr: "Une nouvelle valeur commence à s'animer.",
    en: "A new value starts animating.",
  },
  {
    name: "splitflap:flip",
    type: "{ index, char, final }",
    fr: "Un volet vient d'avancer d'un cran.",
    en: "A flap has just advanced one step.",
  },
  {
    name: "splitflap:settle",
    type: "{ value }",
    fr: "Tous les volets ont atteint leur cible.",
    en: "Every flap has reached its target.",
  },
];

export const apiVars: Row[] = [
  {
    name: "--sf-size",
    type: "",
    fallback: "3rem",
    fr: "Taille de police, dont dérivent toutes les dimensions.",
    en: "Font size; every other dimension derives from it.",
  },
  {
    name: "--sf-flap-width",
    type: "",
    fallback: "0.76em",
    fr: "Largeur d'un volet.",
    en: "Width of one flap.",
  },
  {
    name: "--sf-flap-height",
    type: "",
    fallback: "1.18em",
    fr: "Hauteur d'un volet.",
    en: "Height of one flap.",
  },
  {
    name: "--sf-gap",
    type: "",
    fallback: "0.07em",
    fr: "Espace entre deux volets.",
    en: "Space between two flaps.",
  },
  {
    name: "--sf-radius",
    type: "",
    fallback: "0.07em",
    fr: "Arrondi des coins.",
    en: "Corner radius.",
  },
  {
    name: "--sf-color",
    type: "",
    fallback: "#f2f2f4",
    fr: "Couleur des glyphes.",
    en: "Glyph colour.",
  },
  {
    name: "--sf-bg-top / --sf-bg-bottom",
    type: "",
    fallback: "#1b1c22 / #141519",
    fr: "Fond des moitiés haute et basse.",
    en: "Background of the upper and lower halves.",
  },
  {
    name: "--sf-divider",
    type: "",
    fallback: "rgba(0,0,0,.6)",
    fr: "Couleur du trait de séparation central.",
    en: "Colour of the centre hairline.",
  },
  {
    name: "--sf-perspective",
    type: "",
    fallback: "6em",
    fr: "Profondeur 3D de la rotation.",
    en: "3D depth of the rotation.",
  },
  {
    name: "--sf-shade-max",
    type: "",
    fallback: "0.5",
    fr: "Assombrissement maximal d'un volet en rotation.",
    en: "Maximum darkening of a rotating leaf.",
  },
  {
    name: "--sf-font",
    type: "",
    fallback: "ui-monospace",
    fr: "Police des glyphes. Une chasse fixe est fortement conseillée.",
    en: "Glyph font. A monospaced face is strongly recommended.",
  },
];

export type { Row };
