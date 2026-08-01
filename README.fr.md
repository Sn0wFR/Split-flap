# @sn0wfr/split-flap

Affichez du texte comme un tableau de départs d'aéroport. Chaque volet n'avance
que vers l'avant, glyphe par glyphe, jusqu'à sa cible — exactement comme un
panneau Solari.

**[Démo et documentation →](https://sn0wfr.github.io/Split-flap/)**

🇬🇧 [Read this README in English](./README.md)

- **Zéro dépendance.** La feuille de style est embarquée dans le bundle et
  injectée au premier usage.
- **Partout.** Un cœur vanilla, un custom element `<split-flap>` natif et un
  wrapper React. Vue, Svelte, Angular et Astro passent par l'élément.
- **Accessible.** La valeur reste lisible par un lecteur d'écran, les volets
  lui sont masqués, et `prefers-reduced-motion` coupe l'animation.
- **Thémable.** Tout passe par des variables CSS.
- **Typé.** Déclarations TypeScript, ESM, CJS, et un build IIFE pour une simple
  balise `<script>`.

## Installation

```sh
npm install @sn0wfr/split-flap
```

Ou sans rien installer :

```html
<script src="https://unpkg.com/@sn0wfr/split-flap"></script>
```

## Utilisation

### Vanilla

```js
import { SplitFlap } from "@sn0wfr/split-flap";

const board = new SplitFlap("#board", {
  length: 12,
  chars: "letters",
  duration: 110,
  stagger: 55,
});

await board.set("EMBARQUEMENT");
await board.set("PORTE 24");
```

### Custom element

Importer l'entrée enregistre `<split-flap>`. Le texte entre les balises sert à
la fois de valeur initiale et de repli sans JavaScript.

```js
import "@sn0wfr/split-flap/element";
```

```html
<split-flap length="12" chars="letters" theme="airport">DEPARTS</split-flap>
```

Les attributs reprennent les options en kebab-case (`min-steps`, `extra-loops`,
`pad-char`). Modifier `value` déclenche l'animation ; `element.set(...)` renvoie
une promesse résolue quand le tableau s'est stabilisé.

### React

```tsx
import { SplitFlap } from "@sn0wfr/split-flap/react";

export function Statut({ etat }) {
  return <SplitFlap value={etat} length={12} theme="amber" />;
}
```

Changer `value` anime ; changer une autre prop reconfigure l'instance sur place.
Un hook `useSplitFlap()` est exporté pour un pilotage impératif.

### Styles

La feuille de style est injectée automatiquement. Si votre bundler gère le CSS,
passez `injectStyles: false` et importez-la vous-même :

```js
import "@sn0wfr/split-flap/style.css";
```

## Options

| Option                 | Type                               | Défaut           | Description                                                        |
| ---------------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `value`                | `string`                           | `""`             | Texte affiché.                                                     |
| `length`               | `number`                           | auto             | Nombre de volets. Omis, le tableau s'adapte à la valeur.           |
| `chars`                | `AlphabetName \| string`           | `"alphanumeric"` | Glyphes parcourus par chaque volet.                                |
| `align`                | `"left" \| "center" \| "right"`    | `"left"`         | Position d'une valeur plus courte que le tableau.                  |
| `padChar`              | `string`                           | `" "`            | Glyphe de remplissage des volets inutilisés.                       |
| `duration`             | `number`                           | `110`            | Millisecondes pour avancer d'un seul glyphe.                       |
| `stagger`              | `number`                           | `55`             | Retard de chaque volet sur celui de gauche.                        |
| `jitter`               | `number`                           | `0.18`           | Irrégularité du timing, 0 à 1.                                     |
| `minSteps`             | `number`                           | `1`              | Crans minimum parcourus par un volet qui bouge.                    |
| `extraLoops`           | `number`                           | `0`              | Tours complets ajoutés à chaque volet qui bouge.                   |
| `uppercase`            | `boolean`                          | `true`           | Passe la valeur en majuscules avant l'affichage.                   |
| `normalize`            | `boolean`                          | `true`           | Retire les accents absents de l'alphabet (`DÉPART` → `DEPART`).    |
| `theme`                | `ThemeName`                        | —                | Appliqué comme classe `sf--<nom>`.                                 |
| `size`                 | `string`                           | `3rem`           | Raccourci pour `--sf-size`.                                        |
| `sound`                | `boolean`                          | `false`          | Clic mécanique à chaque cran. Nécessite une interaction préalable. |
| `volume`               | `number`                           | `0.25`           | Volume du clic, 0 à 1.                                             |
| `injectStyles`         | `boolean`                          | `true`           | Injecte la feuille de style au premier usage.                      |
| `respectReducedMotion` | `boolean`                          | `true`           | Applique la valeur sans animation si l'OS le demande.              |
| `ariaLive`             | `"off" \| "polite" \| "assertive"` | `"off"`          | Valeur d'`aria-live` sur l'élément racine.                         |

Alphabets fournis : `letters`, `digits`, `alphanumeric`, `full`, `hex`,
`mixedCase`. Passez n'importe quelle chaîne pour définir le vôtre — l'ordre
décide de la distance à parcourir, et les doublons sont retirés.

## Méthodes

| Membre                 | Retour          | Description                                                   |
| ---------------------- | --------------- | ------------------------------------------------------------- |
| `set(value, options?)` | `Promise<void>` | Anime vers une valeur. `options.immediate` saute l'animation. |
| `value`                | `string`        | Lecture ou écriture du texte affiché.                         |
| `isAnimating`          | `boolean`       | Vrai tant qu'au moins un volet tourne.                        |
| `length`               | `number`        | Nombre de volets actuellement rendus.                         |
| `setOptions(patch)`    | `void`          | Fusionne de nouvelles options.                                |
| `stop()`               | `void`          | Fige les volets sur place.                                    |
| `randomize()`          | `Promise<void>` | Part vers une valeur aléatoire de la longueur courante.       |
| `destroy()`            | `void`          | Démonte l'affichage et libère timers, audio et DOM.           |

## Événements

Émis sur l'élément racine, et disponibles aussi via les options `onStart`,
`onFlip` et `onSettle`.

| Événement          | `detail`                 |
| ------------------ | ------------------------ |
| `splitflap:start`  | `{ from, to }`           |
| `splitflap:flip`   | `{ index, char, final }` |
| `splitflap:settle` | `{ value }`              |

## Thèmes

Un thème n'est qu'un jeu de variables CSS — pas besoin de forker.

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

Thèmes fournis : `airport`, `amber`, `vintage`, `terminal`, `paper`. La liste
complète des variables est dans la
[documentation](https://sn0wfr.github.io/Split-flap/#api).

## Compatibilité

Tout navigateur disposant de la Web Animations API — Chrome 84+, Firefox 75+,
Safari 13.1+. Les moteurs plus anciens affichent quand même le bon texte, cran
par cran, sans la rotation 3D.

## Contribuer

Voir [CONTRIBUTING.md](./CONTRIBUTING.md). Ce dépôt utilise les
[Conventional Commits](https://www.conventionalcommits.org/) et
[release-please](https://github.com/googleapis/release-please) : les messages de
commit pilotent la version et le changelog.

## Licence

[MIT](./LICENSE)
