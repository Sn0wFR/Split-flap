/**
 * Side-effecting entry point: importing `@sn0wfr/split-flap/element`
 * registers `<split-flap>` and nothing else.
 *
 * The main entry re-exports the class and `defineSplitFlapElement()` without
 * touching the custom element registry, so bundlers can drop them.
 */
import { defineSplitFlapElement } from "./element.js";

export * from "./element.js";

defineSplitFlapElement();
