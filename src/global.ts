/**
 * Entry point for the CDN / `<script>` build.
 *
 * Exposes everything on `window.SplitFlapLib` and registers `<split-flap>`
 * straight away, so a single script tag is enough:
 *
 * ```html
 * <script src="https://unpkg.com/@sn0wfr/split-flap"></script>
 * <split-flap length="10">DEPARTURES</split-flap>
 * ```
 */
import { defineSplitFlapElement } from "./element.js";

export * from "./index.js";

defineSplitFlapElement();
