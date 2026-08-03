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

### Mode mot

Sur un vrai tableau Solari, le module destination n'épelle pas la ville lettre
par lettre : chaque volet porte un nom entier, et le module tourne jusqu'au
bon. C'est ce que fait `words` :

```js
const dest = new SplitFlap("#dest", {
  words: ["PARIS CDG", "LISBOA", "REYKJAVIK", "SINGAPORE"],
});

await dest.set("REYKJAVIK"); // défile dans la liste, jamais en arrière
```

L'affichage devient un volet unique, dimensionné au mot le plus long. Un volet
vierge est ajouté en tête, donc `set("")` le ramène à vide. `chars`, `length`
et `align` relèvent du mode caractère et ne s'appliquent plus.

Les accents sont rapprochés dans les deux sens : `set("GENEVE")` atteint un
volet imprimé `GENÈVE`. En HTML, la liste est séparée par des virgules :

```html
<split-flap words="PARIS CDG, LISBOA, REYKJAVIK" value="LISBOA"></split-flap>
```

### Couleurs

Un vrai tableau ne peint pas tous ses volets pareil. `colors` donne à un volet
son propre fond et sa propre couleur de glyphe selon ce qu'il affiche : rouge
pour un train supprimé, ambre pour un retard, vert pour un départ à l'heure.

```js
import { SplitFlap, flapColors } from "@sn0wfr/split-flap";

const statut = new SplitFlap("#statut", {
  words: ["A L'HEURE", "RETARDÉ", "SUPPRIMÉ"],
  colors: {
    "A L'HEURE": flapColors.green,
    RETARDÉ: flapColors.amber,
    SUPPRIMÉ: flapColors.red,
  },
});

await statut.set("SUPPRIMÉ"); // le volet qui tombe est déjà le rouge
```

La couleur voyage avec le volet, pas avec le cadre : un module qui passe du
rouge au vert laisse tomber un volet rouge sur un volet vert, comme un vrai
tableau qui porte la couleur sur la feuille elle-même.

Les clés sont des entrées — un glyphe en mode caractère, un mot entier en mode
mot — et sont rapprochées comme l'est la valeur : `SUPPRIME` atteint donc un
volet imprimé `SUPPRIMÉ`. Une couleur CSS seule est un raccourci pour le fond ;
la forme longue prend aussi la couleur du glyphe, ce qui devient indispensable
dès que le fond est clair :

```js
new SplitFlap("#voie", {
  chars: " 0123456789",
  colors: {
    1: "#a32b22", // fond seul
    2: { bg: "#d9a406", color: "#241802" }, // glyphe sombre sur ambre
    3: { bg: "#1c7a45", bgBottom: "#196b3d" }, // volet bicolore
  },
});
```

`flapColors` livre six paires prêtes à l'emploi — `red`, `orange`, `amber`,
`green`, `blue`, `slate` — chacune un fond et un glyphe qui passent ensemble le
niveau AA du WCAG. Un fond seul laisse en place le glyphe quasi blanc du
thème : parfait sur une couleur sombre, invisible sur une couleur claire.

Colorez les exceptions, pas la règle. Une entrée dont la table n'a pas la clé
garde les couleurs du thème, et c'est généralement ce qu'il faut pour le cas
normal : sur un tableau où la plupart des lignes sont à l'heure, toutes les
peindre en vert fait un mur de vert dont les exceptions doivent s'extraire.

Une fonction colore par position plutôt que par valeur. Elle reçoit l'entrée et
l'index du volet ; `null` signifie « pas de couleur » :

```js
new SplitFlap("#board", {
  colors: (entry, index) => (index === 0 ? flapColors.red : null),
});
```

En HTML, la table se lit comme un style inline. Les paires sont séparées par
des points-virgules et non par les virgules qu'utilise `words`, parce qu'une
couleur CSS a le droit d'en contenir une ; le JSON est accepté pour la forme
complète :

```html
<split-flap words="A L'HEURE, RETARDÉ" colors="RETARDÉ: #d9a406"></split-flap>
```

## Tableaux

Une grille d'afficheurs qui se rafraîchissent ensemble, pour un tableau de
départs ou n'importe quel grand panneau. Chaque colonne se configure comme un
afficheur autonome.

```js
import { SplitFlapBoard } from "@sn0wfr/split-flap";

const board = new SplitFlapBoard("#departs", {
  labels: ["HEURE", "VOL", "DESTINATION"],
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

`set()` prend les valeurs ligne par ligne et se résout quand la dernière
cellule s'est stabilisée. Sans `rows`, le tableau s'adapte aux données.

### Ordre de rafraîchissement

`order` décide dans quel ordre les cellules commencent à tourner, `cascade`
combien de millisecondes séparent un rang du suivant.

| Ordre            | Effet                                                     |
| ---------------- | --------------------------------------------------------- |
| `"simultaneous"` | Tout en même temps. Par défaut.                           |
| `"rows"`         | Ligne par ligne — ce que fait un vrai tableau de départs. |
| `"columns"`      | Colonne par colonne, de gauche à droite.                  |
| `"cells"`        | Cellule par cellule, dans l'ordre de lecture.             |
| `"random"`       | Cellule par cellule, mélangé à chaque rafraîchissement.   |

Chacun n'est qu'une fonction de rang : le tableau trie par rang et retient
chaque cellule de `rang × cascade`. Fournir la vôtre suit la même forme, ce
qui met une ondulation en diagonale sur une seule ligne :

```js
board.setOptions({ order: ({ row, column }) => row + column });
```

### Options du tableau

| Option     | Type                 | Défaut           | Description                                               |
| ---------- | -------------------- | ---------------- | --------------------------------------------------------- |
| `columns`  | `SplitFlapOptions[]` | requis           | Une entrée par colonne.                                   |
| `defaults` | `SplitFlapOptions`   | —                | Appliqué à chaque colonne, avant ses propres options.     |
| `labels`   | `string[]`           | —                | En-têtes de colonnes. Omis, la grille est nue.            |
| `rows`     | `number`             | auto             | Nombre de lignes fixe. Omis, le tableau suit les données. |
| `order`    | `RefreshOrder`       | `"simultaneous"` | Ordre de démarrage des cellules.                          |
| `cascade`  | `number`             | `90`             | Millisecondes entre un rang et le suivant.                |
| `onSettle` | `(detail) => void`   | —                | Déclenché quand toutes les cellules sont stabilisées.     |

`cell(row, column)` renvoie l'afficheur sous-jacent, pour piloter une colonne
seule au besoin. Renommer via `setOptions({ labels })` met les en-têtes à jour
en place et laisse ces afficheurs vivants.

## Options

| Option                 | Type                               | Défaut           | Description                                                        |
| ---------------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `value`                | `string`                           | `""`             | Texte affiché.                                                     |
| `words`                | `string[]`                         | —                | Mots entiers à faire défiler, au lieu de caractères.               |
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
| `colors`               | `ColorMap`                         | —                | Fond et glyphe d'un volet, par entrée ou par position.             |
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

Un thème peint tout l'afficheur. [`colors`](#couleurs) peint un volet à la
fois, par-dessus le thème en vigueur.

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
