/**
 * Conventional Commits, enforced locally by the husky `commit-msg` hook and
 * in CI over a pull request's commit range.
 *
 * The types listed here are the ones release-please knows how to turn into
 * a changelog entry and a version bump.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "perf",
        "refactor",
        "docs",
        "style",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    // Scopes match the repository's top-level areas.
    "scope-enum": [
      1,
      "always",
      [
        "core",
        "element",
        "react",
        "styles",
        "sound",
        "site",
        "deps",
        "release",
      ],
    ],
    "body-max-line-length": [0],
  },
};
