import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SplitFlapBoard } from "../src/board.js";

let host: HTMLElement;

const COLUMNS = [
  { length: 5, chars: " 0123456789:" },
  // A flight code carries digits, so this column needs more than letters.
  { length: 4, chars: "alphanumeric" },
  { words: ["PARIS", "LISBOA"] },
];

const DATA = [
  ["11:42", "KL44", "PARIS"],
  ["12:05", "TP43", "LISBOA"],
];

/** What each cell is showing, row by row. */
function readGrid(board: SplitFlapBoard): string[][] {
  return board.rows;
}

/** Order in which cells first moved, as "row,column" pairs. */
function watchOrder(board: SplitFlapBoard): string[] {
  const seen: string[] = [];
  board.root.addEventListener("splitflap:flip", (event) => {
    const cell = (event.target as HTMLElement).closest(".sfb__cell");
    if (!cell) return;
    const index = [...board.root.querySelectorAll(".sfb__cell")].indexOf(cell);
    const key = String(index);
    if (!seen.includes(key)) seen.push(key);
  });
  return seen;
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
  it("lays out one cell per row and column", () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS, rows: 3 });
    expect(board.root.querySelectorAll(".sfb__cell").length).toBe(9);
    expect(board.length).toBe(3);
  });

  it("declares its column count for the grid", () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS, rows: 2 });
    expect(board.root.style.getPropertyValue("--sfb-columns")).toBe("3");
  });

  it("renders a heading row only when labels are given", () => {
    const bare = new SplitFlapBoard(host, { columns: COLUMNS, rows: 1 });
    expect(bare.root.querySelectorAll(".sfb__label").length).toBe(0);

    const titled = new SplitFlapBoard(host, {
      columns: COLUMNS,
      rows: 1,
      labels: ["TIME", "FLIGHT", "DESTINATION"],
    });
    expect(
      [...titled.root.querySelectorAll(".sfb__label")].map(
        (n) => n.textContent,
      ),
    ).toEqual(["TIME", "FLIGHT", "DESTINATION"]);
  });

  it("re-labels in place, without destroying the displays", () => {
    const board = new SplitFlapBoard(host, {
      columns: COLUMNS,
      rows: 2,
      labels: ["TIME", "FLIGHT", "DESTINATION"],
    });
    const before = board.cell(0, 0);

    board.setOptions({ labels: ["HEURE", "VOL", "DESTINATION"] });

    expect(
      [...board.root.querySelectorAll(".sfb__label")].map((n) => n.textContent),
    ).toEqual(["HEURE", "VOL", "DESTINATION"]);
    // Same instances: a caller holding one through cell() keeps a live one.
    expect(board.cell(0, 0)).toBe(before);
  });

  it("merges defaults under each column's own options", () => {
    const board = new SplitFlapBoard(host, {
      defaults: { theme: "amber", length: 2 },
      columns: [{ length: 6 }, {}],
      rows: 1,
    });
    expect(board.cell(0, 0)!.length).toBe(6); // column wins
    expect(board.cell(0, 1)!.length).toBe(2); // default applies
    expect(board.cell(0, 0)!.root.classList.contains("sf--amber")).toBe(true);
  });

  it("refuses a board with no columns", () => {
    expect(() => new SplitFlapBoard(host, { columns: [] })).toThrow(
      /at least one column/,
    );
  });

  it("sizes itself to the data when no row count is fixed", async () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS });
    await board.set(DATA, { immediate: true });
    expect(board.length).toBe(2);
    expect(readGrid(board)).toEqual(DATA);
  });
});

describe("values", () => {
  it("fills every cell from a row-major array", async () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS, rows: 2 });
    await board.set(DATA, { immediate: true });
    expect(readGrid(board)).toEqual(DATA);
  });

  it("leaves a cell blank where the data is short", async () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS, rows: 2 });
    await board.set([["11:42"]], { immediate: true });
    expect(board.cell(0, 0)!.value).toBe("11:42");
    expect(board.cell(0, 1)!.value).toBe("");
    expect(board.cell(1, 0)!.value).toBe("");
  });

  it("hands back the display at a position", () => {
    const board = new SplitFlapBoard(host, { columns: COLUMNS, rows: 2 });
    expect(board.cell(1, 2)).not.toBeNull();
    expect(board.cell(9, 9)).toBeNull();
  });

  it("carries a column's colours down to every cell in it", async () => {
    const board = new SplitFlapBoard(host, {
      rows: 2,
      columns: [
        { words: ["ON TIME", "CANCELLED"], colors: { CANCELLED: "#a32b22" } },
      ],
    });
    await board.set([["CANCELLED"], ["ON TIME"]], { immediate: true });

    const painted = [
      ...board.root.querySelectorAll<HTMLElement>(".sf__panel--top"),
    ].map((panel) => panel.style.getPropertyValue("--sf-bg-top"));
    expect(painted).toEqual(["#a32b22", ""]);
  });
});

describe("refresh order", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /** A board whose cells all have to travel, so every one of them moves. */
  const board = () =>
    new SplitFlapBoard(host, {
      columns: [
        { chars: " AB", length: 1 },
        { chars: " AB", length: 1 },
      ],
      rows: 3,
      cascade: 100,
      defaults: { duration: 10, stagger: 0, jitter: 0 },
    });

  const full = [
    ["A", "A"],
    ["A", "A"],
    ["A", "A"],
  ];

  it("moves everything at once by default", async () => {
    const b = board();
    const order = watchOrder(b);

    const settled = b.set(full);
    await vi.advanceTimersByTimeAsync(20);
    // All six cells have started before any cascade could have elapsed.
    expect(order.length).toBe(6);

    await vi.advanceTimersByTimeAsync(500);
    await settled;
  });

  it("cascades row by row", async () => {
    const b = board();
    b.setOptions({ order: "rows" });
    const order = watchOrder(b);

    const settled = b.set(full);
    await vi.advanceTimersByTimeAsync(20);
    expect(order).toEqual(["0", "1"]); // row 0 only

    await vi.advanceTimersByTimeAsync(100);
    expect(order).toEqual(["0", "1", "2", "3"]); // row 1 joins

    await vi.advanceTimersByTimeAsync(600);
    await settled;
    expect(order.length).toBe(6);
  });

  it("cascades column by column", async () => {
    const b = board();
    b.setOptions({ order: "columns" });
    const order = watchOrder(b);

    const settled = b.set(full);
    await vi.advanceTimersByTimeAsync(20);
    // Column 0 is cells 0, 2 and 4 in reading order.
    expect(order).toEqual(["0", "2", "4"]);

    await vi.advanceTimersByTimeAsync(600);
    await settled;
    expect(order.length).toBe(6);
  });

  it("cascades cell by cell in reading order", async () => {
    const b = board();
    b.setOptions({ order: "cells" });
    const order = watchOrder(b);

    const settled = b.set(full);
    await vi.advanceTimersByTimeAsync(20);
    expect(order).toEqual(["0"]);

    await vi.advanceTimersByTimeAsync(250);
    expect(order).toEqual(["0", "1", "2"]);

    await vi.advanceTimersByTimeAsync(600);
    await settled;
    expect(order.length).toBe(6);
  });

  it("takes a rank function, so a diagonal is one line", async () => {
    const b = board();
    // The classic ripple: everything on a diagonal moves together.
    b.setOptions({ order: ({ row, column }) => row + column });
    const order = watchOrder(b);

    const settled = b.set(full);
    await vi.advanceTimersByTimeAsync(20);
    expect(order).toEqual(["0"]); // rank 0: (0,0)

    await vi.advanceTimersByTimeAsync(100);
    expect(order).toEqual(["0", "1", "2"]); // rank 1: (0,1) and (1,0)

    await vi.advanceTimersByTimeAsync(600);
    await settled;
    expect(order.length).toBe(6);
  });

  it("ignores the cascade when the refresh is immediate", async () => {
    const b = board();
    b.setOptions({ order: "cells" });
    await b.set(full, { immediate: true });
    expect(readGrid(b)).toEqual(full);
  });

  it("resolves only once the last cell has settled", async () => {
    const b = board();
    b.setOptions({ order: "rows" });

    let done = false;
    const settled = b.set(full).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(150);
    expect(done).toBe(false);
    expect(b.isAnimating).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);
    await settled;
    expect(done).toBe(true);
    expect(b.isAnimating).toBe(false);
  });

  it("drops pending cells when a new refresh arrives", async () => {
    const b = board();
    b.setOptions({ order: "rows" });

    void b.set(full);
    await vi.advanceTimersByTimeAsync(50);

    const settled = b.set([
      ["B", "B"],
      ["B", "B"],
      ["B", "B"],
    ]);
    await vi.advanceTimersByTimeAsync(1500);
    await settled;

    expect(readGrid(b)).toEqual([
      ["B", "B"],
      ["B", "B"],
      ["B", "B"],
    ]);
  });
});

describe("teardown", () => {
  it("stop() freezes every cell", async () => {
    vi.useFakeTimers();
    const b = new SplitFlapBoard(host, {
      columns: [{ chars: "letters", length: 1 }],
      rows: 2,
      cascade: 50,
      defaults: { duration: 20, stagger: 0, jitter: 0 },
    });

    void b.set([["Z"], ["Z"]]);
    await vi.advanceTimersByTimeAsync(60);
    b.stop();
    await vi.advanceTimersByTimeAsync(500);

    expect(b.isAnimating).toBe(false);
  });

  it("empties the host and drops its own attributes", () => {
    const b = new SplitFlapBoard(host, { columns: COLUMNS, rows: 2 });
    b.destroy();

    expect(host.children.length).toBe(0);
    expect(host.classList.contains("sfb")).toBe(false);
    expect(host.style.getPropertyValue("--sfb-columns")).toBe("");
  });

  it("is safe to destroy twice", () => {
    const b = new SplitFlapBoard(host, { columns: COLUMNS, rows: 1 });
    b.destroy();
    expect(() => b.destroy()).not.toThrow();
  });
});
