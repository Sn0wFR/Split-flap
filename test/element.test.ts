import { afterEach, beforeAll, describe, expect, it } from "vitest";
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

afterEach(() => {
  document.body.innerHTML = "";
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

  it("applies the theme attribute as a class", () => {
    const node = mount('<split-flap value="A" theme="amber"></split-flap>');
    expect(node.classList.contains("sf--amber")).toBe(true);
  });

  it("re-renders when the value attribute changes", () => {
    const node = mount('<split-flap value="AB" length="2"></split-flap>');
    node.setAttribute("value", "AB");
    expect(readTop(node)).toBe("AB");
  });

  it("tears the display down on disconnect", () => {
    const node = mount('<split-flap value="A"></split-flap>');
    expect(node.display).not.toBeNull();
    node.remove();
    expect(node.display).toBeNull();
    expect(node.children.length).toBe(0);
  });
});
