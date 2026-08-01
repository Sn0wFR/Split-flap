import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import { SplitFlap as SplitFlapDisplay } from "./core.js";
import type { SplitFlapOptions } from "./types.js";

/** `useLayoutEffect` warns during SSR; fall back to `useEffect` there. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface SplitFlapProps extends SplitFlapOptions {
  className?: string;
  style?: CSSProperties;
}

/**
 * React wrapper around the display.
 *
 * ```tsx
 * import { SplitFlap } from "@sn0wfr/split-flap/react";
 *
 * <SplitFlap value={status} length={12} theme="amber" />
 * ```
 */
export function SplitFlap({
  className,
  style,
  ...options
}: SplitFlapProps): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const display = useRef<SplitFlapDisplay | null>(null);
  // Options at mount time, read through a ref so changing a callback prop
  // never tears the display down and rebuilds it.
  const initial = useRef(options);
  initial.current = options;

  useIsomorphicLayoutEffect(() => {
    if (!host.current) return;
    const instance = new SplitFlapDisplay(host.current, initial.current);
    display.current = instance;
    return () => {
      instance.destroy();
      display.current = null;
    };
  }, []);

  const {
    value,
    length,
    chars,
    align,
    padChar,
    duration,
    stagger,
    jitter,
    minSteps,
    extraLoops,
    uppercase,
    normalize,
    theme,
    size,
    sound,
    volume,
    ariaLive,
  } = options;

  // Everything except `value` reconfigures the instance in place.
  useEffect(() => {
    display.current?.setOptions({
      length,
      chars,
      align,
      padChar,
      duration,
      stagger,
      jitter,
      minSteps,
      extraLoops,
      uppercase,
      normalize,
      theme,
      size,
      sound,
      volume,
      ariaLive,
      onFlip: initial.current.onFlip,
      onSettle: initial.current.onSettle,
      onStart: initial.current.onStart,
    });
  }, [
    length,
    chars,
    align,
    padChar,
    duration,
    stagger,
    jitter,
    minSteps,
    extraLoops,
    uppercase,
    normalize,
    theme,
    size,
    sound,
    volume,
    ariaLive,
  ]);

  useEffect(() => {
    if (value !== undefined) void display.current?.set(value);
  }, [value]);

  return createElement("div", { ref: host, className, style });
}

export interface UseSplitFlapResult<T extends HTMLElement = HTMLDivElement> {
  /** Attach to the element the board should mount into. */
  ref: RefObject<T | null>;
  /** The live instance, or `null` before mount. */
  display: RefObject<SplitFlapDisplay | null>;
}

/**
 * Hook form, for when you want to drive the display imperatively.
 *
 * ```tsx
 * const { ref, display } = useSplitFlap({ length: 8 });
 * <div ref={ref} onClick={() => display.current?.randomize()} />
 * ```
 */
export function useSplitFlap<T extends HTMLElement = HTMLDivElement>(
  options: SplitFlapOptions = {},
): UseSplitFlapResult<T> {
  const ref = useRef<T>(null);
  const display = useRef<SplitFlapDisplay | null>(null);
  const initial = useRef(options);
  initial.current = options;

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const instance = new SplitFlapDisplay(ref.current, initial.current);
    display.current = instance;
    return () => {
      instance.destroy();
      display.current = null;
    };
  }, []);

  return { ref, display };
}

export type { SplitFlapOptions };
