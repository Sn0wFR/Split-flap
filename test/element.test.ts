import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineSplitFlapElement, SplitFlapElement } from "../src/element.js";

beforeAll(() => {
  defineSplitFlapElement();
});

function mount(html: string): SplitFlapElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as SplitFlapElement;
}

function readTop(node: Element): string {
  return [...node.querySelectorAll(".sf__panel--top .sf__char")]
    .map((child) => child.textContent ?? "")
    .join("");
}

/** Glyph on each static bottom half — should match the top once settled. */
function readBottom(node: Element): string {
  return [...node.querySelectorAll(".sf__panel--bottom .sf__char")]
    .map((child) => child.textContent ?? "")
    .join("");
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("<split-flap>", () => {
  it("registers under the default tag name", () => {
    expect(customElements.get("split-flap")).toBe(SplitFlapElement);
  });

  it("is idempotent to define twice", () => {
    expect(() => defineSplitFlapElement()).not.toThrow();
  });

  it("uses its text content as the initial value", async () => {
    const node = mount("<split-flap>DEPARTURES</split-flap>");
    // The parser hands children over after the upgrade, so the fallback is
    // adopted on the next microtask rather than synchronously.
    await Promise.resolve();
    expect(readTop(node)).toBe("DEPARTURES");
    expect(node.value).toBe("DEPARTURES");
  });

  it("removes the fallback text once the flaps are rendered", async () => {
    const node = mount("<split-flap>ARRIVALS</split-flap>");
    await Promise.resolve();
    const strayText = [...node.childNodes].some(
      (child) => child.nodeType === Node.TEXT_NODE,
    );
    expect(strayText).toBe(false);
  });

  it("prefers the value attribute over the text content", () => {
    const node = mount('<split-flap value="GATE">fallback</split-flap>');
    expect(readTop(node)).toBe("GATE");
  });

  it("parses numeric and enum attributes", () => {
    const node = mount(
      '<split-flap value="HI" length="6" align="right" chars="letters"></split-flap>',
    );
    expect(node.querySelectorAll(".sf__flap").length).toBe(6);
    expect(readTop(node)).toBe("    HI");
  });

  it("treats a bare boolean attribute as true and 'false' as false", () => {
    const bare = mount('<split-flap value="hi" uppercase></split-flap>');
    expect(readTop(bare)).toBe("HI");

    const off = mount(
      '<split-flap value="hi" uppercase="false" chars="mixedCase"></split-flap>',
    );
    expect(readTop(off)).toBe("hi");
  });

  it("turns a comma-separated words attribute into a word module", () => {
    const node = mount(
      '<split-flap words="PARIS, LONDON, MADRID" value="LONDON"></split-flap>',
    );
    expect(node.querySelectorAll(".sf__flap").length).toBe(1);
    expect(readTop(node)).toBe("LONDON");
  });

  it("applies the theme attribute as a class", () => {
    const node = mount('<split-flap value="A" theme="amber"></split-flap>');
    expect(node.classList.contains("sf--amber")).toBe(true);
  });

  it("re-renders when the value attribute changes", () => {
    const node = mount('<split-flap value="AB" length="2"></split-flap>');
    node.setAttribute("value", "AB");
    expect(readTop(node)).toBe("AB");
  });

  it("forwards set options to the display", async () => {
    const node = mount('<split-flap value="AAA" length="3"></split-flap>');

    // Asserted before the await: an immediate set paints synchronously, so a
    // dropped option shows up here as an animation that has already started.
    const settled = node.set("ZZZ", { immediate: true });
    expect(node.display?.isAnimating).toBe(false);
    expect(readTop(node)).toBe("ZZZ");
    expect(readBottom(node)).toBe("ZZZ");

    await settled;
  });

  it("still animates when set is called with no options", async () => {
    vi.useFakeTimers();
    const node = mount(
      '<split-flap value="AAA" length="3" duration="10" stagger="0" jitter="0"></split-flap>',
    );

    const settled = node.set("ZZZ");
    expect(node.display?.isAnimating).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    await settled;
    expect(readTop(node)).toBe("ZZZ");
    expect(node.display?.isAnimating).toBe(false);
  });

  it("resets instantly so a replayed animation reaches every flap", async () => {
    vi.useFakeTimers();
    const node = mount(
      '<split-flap value="SPLIT-FLAP" length="10" chars="full" duration="10" stagger="5" jitter="0"></split-flap>',
    );

    // The reset lands in one paint, so nothing is still turning when the
    // animation below starts — the collision the attribute route caused.
    await node.set("", { immediate: true });
    expect(readTop(node).trim()).toBe("");
    expect(node.display?.isAnimating).toBe(false);

    const settled = node.set("SPLIT-FLAP");
    await vi.advanceTimersByTimeAsync(5000);
    await settled;

    expect(readTop(node)).toBe("SPLIT-FLAP");
    expect(readBottom(node)).toBe("SPLIT-FLAP");
  });

  it("tears the display down on disconnect", () => {
    const node = mount('<split-flap value="A"></split-flap>');
    expect(node.display).not.toBeNull();
    node.remove();
    expect(node.display).toBeNull();
    expect(node.children.length).toBe(0);
  });
});
