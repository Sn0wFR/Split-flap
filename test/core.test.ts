import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplitFlap } from "../src/core.js";
import { stubAudio } from "./audio-stub.js";

let host: HTMLElement;

/** Glyph resting on each flap, read from the static top halves. */
function readTop(board: SplitFlap): string {
  return [...board.root.querySelectorAll(".sf__panel--top .sf__char")]
    .map((node) => node.textContent ?? "")
    .join("");
}

/** Glyph on each static bottom half — should match the top once settled. */
function readBottom(board: SplitFlap): string {
  return [...board.root.querySelectorAll(".sf__panel--bottom .sf__char")]
    .map((node) => node.textContent ?? "")
    .join("");
}

function flapCount(board: SplitFlap): number {
  return board.root.querySelectorAll(".sf__flap").length;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
});

describe("construction", () => {
  it("renders one flap per character", () => {
    const board = new SplitFlap(host, { value: "HELLO" });
    expect(flapCount(board)).toBe(5);
    expect(readTop(board)).toBe("HELLO");
    expect(readBottom(board)).toBe("HELLO");
  });

  it("accepts a CSS selector", () => {
    host.id = "board";
    const board = new SplitFlap("#board", { value: "AB" });
    expect(board.root).toBe(host);
  });

  it("throws when the selector matches nothing", () => {
    expect(() => new SplitFlap("#nope")).toThrow(/no element matched/);
  });

  it("marks itself up for assistive tech", () => {
    const board = new SplitFlap(host, { value: "GATE 12" });
    expect(board.root.getAttribute("role")).toBe("img");
    expect(board.root.getAttribute("aria-label")).toBe("GATE 12");
    expect(
      board.root.querySelector(".sf__track")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});

describe("padding and alignment", () => {
  it("pads to the right for left alignment", () => {
    const board = new SplitFlap(host, { value: "HI", length: 5 });
    expect(readTop(board)).toBe("HI   ");
  });

  it("pads to the left for right alignment", () => {
    const board = new SplitFlap(host, {
      value: "HI",
      length: 5,
      align: "right",
    });
    expect(readTop(board)).toBe("   HI");
  });

  it("splits the remainder when centring, favouring the left", () => {
    const board = new SplitFlap(host, {
      value: "HI",
      length: 5,
      align: "center",
    });
    expect(readTop(board)).toBe(" HI  ");
  });

  it("truncates a value longer than the board", () => {
    const board = new SplitFlap(host, { value: "ABCDEFGH", length: 3 });
    expect(readTop(board)).toBe("ABC");
    expect(flapCount(board)).toBe(3);
  });
});

describe("character handling", () => {
  it("upper-cases by default", () => {
    const board = new SplitFlap(host, { value: "hello" });
    expect(readTop(board)).toBe("HELLO");
  });

  it("keeps casing when uppercase is off and the alphabet allows it", () => {
    const board = new SplitFlap(host, {
      value: "Hi",
      uppercase: false,
      chars: "mixedCase",
    });
    expect(readTop(board)).toBe("Hi");
  });

  it("strips accents so French text lands on real flaps", () => {
    const board = new SplitFlap(host, { value: "DÉPART" });
    expect(readTop(board)).toBe("DEPART");
  });

  it("falls back to the pad glyph for characters outside the alphabet", () => {
    const board = new SplitFlap(host, { value: "A#B", chars: "letters" });
    expect(readTop(board)).toBe("A B");
  });

  it("de-duplicates a custom alphabet", () => {
    const board = new SplitFlap(host, { value: "AA", chars: " AAB" });
    expect(board.length).toBe(2);
    expect(readTop(board)).toBe("AA");
  });
});

describe("value", () => {
  it("trims trailing padding", () => {
    const board = new SplitFlap(host, { value: "HI", length: 8 });
    expect(board.value).toBe("HI");
  });

  it("resizes an auto-length board and skips animating between geometries", () => {
    const board = new SplitFlap(host, { value: "AB" });
    void board.set("LONGER");
    expect(flapCount(board)).toBe(6);
    expect(readTop(board)).toBe("LONGER");
    expect(board.isAnimating).toBe(false);
  });

  it("applies a value instantly when asked", async () => {
    const board = new SplitFlap(host, { value: "AAA", length: 3 });
    await board.set("ZZZ", { immediate: true });
    expect(readTop(board)).toBe("ZZZ");
    expect(readBottom(board)).toBe("ZZZ");
    expect(board.isAnimating).toBe(false);
  });

  it("resolves without animating when the value is unchanged", async () => {
    const board = new SplitFlap(host, { value: "SAME", length: 4 });
    await board.set("SAME");
    expect(board.isAnimating).toBe(false);
  });
});

describe("animation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("steps forward one glyph at a time and settles on the target", async () => {
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: "letters",
      duration: 100,
      stagger: 0,
      jitter: 0,
    });

    const settled = board.set("D");
    expect(board.isAnimating).toBe(true);

    // Mid-flip the top half already shows the incoming glyph while the
    // bottom half still shows the outgoing one; the leaves hide the seam.
    await vi.advanceTimersByTimeAsync(50);
    expect(readTop(board)).toBe("B");
    expect(readBottom(board)).toBe("A");

    // A -> B -> C -> D is three steps of 100 ms.
    await vi.advanceTimersByTimeAsync(250);

    await settled;
    expect(readTop(board)).toBe("D");
    expect(readBottom(board)).toBe("D");
    expect(board.isAnimating).toBe(false);
  });

  it("wraps past the end of the alphabet rather than running backwards", async () => {
    const board = new SplitFlap(host, {
      value: "Z",
      length: 1,
      chars: "letters",
      duration: 10,
      stagger: 0,
      jitter: 0,
    });

    const flips: string[] = [];
    board.root.addEventListener("splitflap:flip", (event) => {
      flips.push((event as CustomEvent<{ char: string }>).detail.char);
    });

    const settled = board.set("A");
    await vi.advanceTimersByTimeAsync(100);
    await settled;

    // Z is last in " ABC...Z", so the only way to A is through the blank.
    expect(flips).toEqual([" ", "A"]);
  });

  it("honours minSteps by adding whole revolutions", async () => {
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: " AB",
      duration: 10,
      stagger: 0,
      jitter: 0,
      minSteps: 5,
    });

    let flips = 0;
    board.root.addEventListener("splitflap:flip", () => {
      flips += 1;
    });

    const settled = board.set("B");
    await vi.advanceTimersByTimeAsync(500);
    await settled;

    // One step to reach B, padded up to at least 5 by adding the 3-glyph loop.
    expect(flips).toBe(7);
    expect(readTop(board)).toBe("B");
  });

  it("staggers each flap behind the one to its left", async () => {
    const board = new SplitFlap(host, {
      value: "AA",
      length: 2,
      chars: " AB",
      duration: 10,
      stagger: 100,
      jitter: 0,
    });

    const settled = board.set("BB");
    await vi.advanceTimersByTimeAsync(20);
    expect(readTop(board)).toBe("BA");

    await vi.advanceTimersByTimeAsync(200);
    await settled;
    expect(readTop(board)).toBe("BB");
  });

  it("fires start and settle exactly once per run", async () => {
    const onStart = vi.fn();
    const onSettle = vi.fn();
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: " AB",
      duration: 10,
      stagger: 0,
      jitter: 0,
      onStart,
      onSettle,
    });

    const settled = board.set("B");
    await vi.advanceTimersByTimeAsync(100);
    await settled;

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith({ from: "A", to: "B" });
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledWith({ value: "B" });
  });

  it("redirects mid-flight without leaving halves out of sync", async () => {
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: "letters",
      duration: 100,
      stagger: 0,
      jitter: 0,
    });

    void board.set("Z");
    await vi.advanceTimersByTimeAsync(250);

    const settled = board.set("E");
    await vi.advanceTimersByTimeAsync(3000);
    await settled;

    expect(readTop(board)).toBe("E");
    expect(readBottom(board)).toBe("E");
    expect(board.isAnimating).toBe(false);
  });

  it("stop() freezes the board and reports what is actually shown", async () => {
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: "letters",
      duration: 100,
      stagger: 0,
      jitter: 0,
    });

    const settled = board.set("Z");
    await vi.advanceTimersByTimeAsync(250);
    board.stop();
    await settled;

    expect(board.isAnimating).toBe(false);
    expect(readTop(board)).toBe(readBottom(board));
    expect(board.value).toBe(readTop(board).replace(/\s+$/, ""));
  });
});

describe("sound", () => {
  const boards: SplitFlap[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // The AudioContext is shared and reference-counted at module scope, so
    // a clicker left open here would still be holding the previous test's
    // stub when the next one starts counting.
    for (const board of boards.splice(0)) board.destroy();
    vi.unstubAllGlobals();
  });

  const mount = (options: ConstructorParameters<typeof SplitFlap>[1]) => {
    const board = new SplitFlap(host, options);
    boards.push(board);
    return board;
  };

  /** Board that takes many steps to settle, so it can be poked mid-flight. */
  const longRunner = () =>
    mount({
      value: "A",
      length: 1,
      chars: "letters",
      duration: 20,
      stagger: 0,
      jitter: 0,
      minSteps: 40,
    });

  it("clicks once per flip while sound is on", async () => {
    const audio = stubAudio();
    const board = mount({
      value: "A",
      length: 1,
      chars: " AB",
      duration: 10,
      stagger: 0,
      jitter: 0,
      sound: true,
    });

    const settled = board.set("B");
    await vi.advanceTimersByTimeAsync(100);
    await settled;

    expect(audio.clicks()).toBe(1);
  });

  it("falls silent the moment sound is switched off mid-flight", async () => {
    const audio = stubAudio();
    const board = longRunner();
    board.setOptions({ sound: true });

    void board.set("Z");
    await vi.advanceTimersByTimeAsync(100);
    const heard = audio.clicks();
    expect(heard).toBeGreaterThan(0);

    board.setOptions({ sound: false });
    await vi.advanceTimersByTimeAsync(300);

    expect(audio.clicks()).toBe(heard);
  });

  it("resumes clicking when sound comes back mid-flight", async () => {
    const audio = stubAudio();
    const board = longRunner();
    board.setOptions({ sound: true });

    void board.set("Z");
    await vi.advanceTimersByTimeAsync(60);

    board.setOptions({ sound: false });
    await vi.advanceTimersByTimeAsync(60);
    const whileMuted = audio.clicks();

    // Back on without starting a new value: the clicker has to be rebuilt
    // on the next step rather than waiting for the next set().
    board.setOptions({ sound: true });
    await vi.advanceTimersByTimeAsync(120);

    expect(audio.clicks()).toBeGreaterThan(whileMuted);
  });
});

describe("options", () => {
  it("swaps the theme class", () => {
    const board = new SplitFlap(host, { value: "A", theme: "amber" });
    expect(board.root.classList.contains("sf--amber")).toBe(true);

    board.setOptions({ theme: "vintage" });
    expect(board.root.classList.contains("sf--amber")).toBe(false);
    expect(board.root.classList.contains("sf--vintage")).toBe(true);
  });

  it("rebuilds when the length changes", () => {
    const board = new SplitFlap(host, { value: "HI", length: 4 });
    board.setOptions({ length: 8 });
    expect(flapCount(board)).toBe(8);
    expect(readTop(board)).toBe("HI      ");
  });

  it("keeps the visible text when the alphabet changes", () => {
    const board = new SplitFlap(host, { value: "AB", chars: "letters" });
    board.setOptions({ chars: "full" });
    expect(readTop(board)).toBe("AB");
  });

  it("exposes size through a custom property", () => {
    const board = new SplitFlap(host, { value: "A", size: "2rem" });
    expect(board.root.style.getPropertyValue("--sf-size")).toBe("2rem");
  });
});

describe("reduced motion", () => {
  it("jumps straight to the value", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, media: "" }),
    );

    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: "letters",
      duration: 100,
    });

    await board.set("Z");
    expect(readTop(board)).toBe("Z");
    expect(board.isAnimating).toBe(false);

    vi.unstubAllGlobals();
  });
});

describe("destroy", () => {
  it("empties the host and drops its own attributes", () => {
    const board = new SplitFlap(host, { value: "BYE", theme: "amber" });
    board.destroy();

    expect(host.children.length).toBe(0);
    expect(host.classList.contains("sf")).toBe(false);
    expect(host.classList.contains("sf--amber")).toBe(false);
    expect(host.hasAttribute("role")).toBe(false);
    expect(host.hasAttribute("aria-label")).toBe(false);
  });

  it("cancels pending timers so nothing fires afterwards", async () => {
    vi.useFakeTimers();
    const onFlip = vi.fn();
    const board = new SplitFlap(host, {
      value: "A",
      length: 1,
      chars: "letters",
      duration: 50,
      stagger: 0,
      jitter: 0,
      onFlip,
    });

    void board.set("Z");
    await vi.advanceTimersByTimeAsync(60);
    const seen = onFlip.mock.calls.length;

    board.destroy();
    await vi.advanceTimersByTimeAsync(2000);
    expect(onFlip.mock.calls.length).toBe(seen);
  });

  it("is safe to call twice", () => {
    const board = new SplitFlap(host, { value: "A" });
    board.destroy();
    expect(() => board.destroy()).not.toThrow();
  });
});
