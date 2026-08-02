# Contributing

## Getting set up

```sh
npm install        # also installs the git hooks
npm run site:dev   # presentation site + live library at http://localhost:5173
```

The demo site imports the library straight from `src/`, so any change shows up
immediately without a rebuild.

## Scripts

| Command              | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `npm test`           | Run the test suite once                           |
| `npm run test:watch` | Run tests in watch mode                           |
| `npm run typecheck`  | `tsc --noEmit` over `src`, `test` and `site`      |
| `npm run build`      | Build `dist/` (ESM, CJS, IIFE, types, stylesheet) |
| `npm run site:build` | Build the presentation site into `site/dist`      |
| `npm run format`     | Rewrite everything with Prettier                  |

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/).
A `commit-msg` hook runs commitlint locally, and CI checks every commit in a
pull request.

```
<type>(<scope>): <subject>
```

Types that appear in the changelog: `feat`, `fix`, `perf`, `refactor`, `docs`,
`revert`. Types that are allowed but hidden: `style`, `test`, `build`, `ci`,
`chore`.

Scopes: `core`, `element`, `react`, `styles`, `sound`, `site`, `deps`,
`release`.

```
feat(core): add extraLoops option
fix(element): read inline text after the parser delivers it
docs(site): document the CSS variables
```

A `!` after the type — or a `BREAKING CHANGE:` footer — marks a breaking change.

## Releases

[release-please](https://github.com/googleapis/release-please) watches `main`
and keeps a release pull request up to date with the pending changelog and the
next version. Merging that pull request tags the release, and the tag triggers
`npm publish`.

Nothing about the version is edited by hand: `package.json`, `CHANGELOG.md` and
`.release-please-manifest.json` are all maintained by the action.

Publishing uses no credential at all. npm is configured with a trusted
publisher for the package, and exchanges the OIDC identity the `publish` job
presents for the right to publish, having checked that it came from this
repository, from `release-please.yml`, in the `npm` environment. That is why
the job declares `id-token: write` and why moving or renaming the workflow
file means updating the package settings on npm to match.

The same identity signs the provenance attestation, which npm only accepts
from a public repository — publishing from a private one fails with a 422.

The first release is `1.0.0`, set by `initial-version` in
`release-please-config.json`. Until a release exists release-please has no
previous version to bump from, so that value decides the opening one on its
own, whatever the commits say.

From there the bumps are plain semver:

| Commit         | Bump  | Example        |
| -------------- | ----- | -------------- |
| breaking (`!`) | major | 1.0.0 -> 2.0.0 |
| `feat`         | minor | 1.0.0 -> 1.1.0 |
| `fix`, `perf`  | patch | 1.0.0 -> 1.0.1 |

Shipping `1.0.0` is a commitment: the public API in `src/index.ts` — options,
methods, events and the `--sf-*` custom properties — cannot change shape
without a major. Renaming an option or dropping a CSS variable is breaking,
even when nothing throws.

## Notes on the code

- **No runtime dependencies.** Keep it that way.
- **The stylesheet is imported as a string** by `src/styles.ts`, so it can be
  injected with no separate asset. tsup does this with esbuild's `text` loader;
  Vite and Vitest need `scripts/vite-css-text.ts`, which redirects the import to
  a virtual module. If you move or rename `src/split-flap.css`, update that
  plugin.
- **Animation is driven by timers, painted by the Web Animations API.** Where
  WAAPI is missing the glyphs still step on schedule, so the text is never
  wrong — only the rotation is lost. Keep that fallback intact.
- **Tests run in happy-dom**, which has no WAAPI, so they exercise that
  fallback path by default.
