import { SplitFlap } from "./core.js";
import { ensureStyles } from "./styles.js";
import type {
  BoardCell,
  BoardSettleDetail,
  RefreshOrder,
  SetOptions,
  SplitFlapBoardOptions,
  SplitFlapOptions,
} from "./types.js";

const DEFAULT_CASCADE = 90;

/**
 * Rank functions behind the named orders.
 *
 * A rank is a position in the queue, not a delay: the board multiplies it by
 * `cascade`. That is what lets a custom order stay this small — a diagonal
 * ripple is `({ row, column }) => row + column`.
 */
const ORDERS: Record<string, (cell: BoardCell) => number> = {
  simultaneous: () => 0,
  rows: ({ row }) => row,
  columns: ({ column }) => column,
  cells: ({ row, column, columns }) => row * columns + column,
};

/** One display, plus where it sits. */
interface Cell {
  display: SplitFlap;
  row: number;
  column: number;
}

/**
 * A grid of displays that refresh together.
 *
 * ```ts
 * const board = new SplitFlapBoard("#departures", {
 *   labels: ["TIME", "FLIGHT", "DESTINATION"],
 *   columns: [
 *     { length: 5, chars: " 0123456789:" },
 *     { length: 6 },
 *     { words: ["PARIS CDG", "LISBOA"] },
 *   ],
 *   order: "rows",
 *   cascade: 120,
 * });
 *
 * await board.set([
 *   ["11:42", "KL441", "PARIS CDG"],
 *   ["12:05", "TP431", "LISBOA"],
 * ]);
 * ```
 */
export class SplitFlapBoard {
  /** Root element the board was mounted into. */
  readonly root: HTMLElement;

  private opts: SplitFlapBoardOptions;
  private grid: HTMLElement;
  private cells: Cell[] = [];
  private labelCells: HTMLElement[] = [];
  private rowCount = 0;
  /** Timers holding cells back for their turn in the order. */
  private timers: Array<ReturnType<typeof setTimeout>> = [];
  private destroyed = false;

  constructor(target: HTMLElement | string, options: SplitFlapBoardOptions) {
    const root =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!root) {
      throw new Error(`[split-flap] no element matched ${String(target)}`);
    }
    if (!options.columns?.length) {
      throw new Error("[split-flap] a board needs at least one column");
    }

    this.root = root as HTMLElement;
    this.opts = options;

    ensureStyles();
    this.root.classList.add("sfb");
    this.root.style.setProperty(
      "--sfb-columns",
      String(options.columns.length),
    );

    this.grid = document.createElement("div");
    this.grid.className = "sfb__grid";
    this.root.replaceChildren(this.grid);

    this.build(options.rows ?? 0);
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /** Number of rows currently rendered. */
  get length(): number {
    return this.rowCount;
  }

  /** True while any cell is still turning. */
  get isAnimating(): boolean {
    return (
      this.timers.length > 0 ||
      this.cells.some((cell) => cell.display.isAnimating)
    );
  }

  /** Values currently displayed, row by row. */
  get rows(): string[][] {
    const out: string[][] = Array.from({ length: this.rowCount }, () => []);
    for (const cell of this.cells)
      out[cell.row]![cell.column] = cell.display.value;
    return out;
  }

  /** The display at a position, or null if there is none. */
  cell(row: number, column: number): SplitFlap | null {
    return (
      this.cells.find((c) => c.row === row && c.column === column)?.display ??
      null
    );
  }

  /**
   * Refresh the board.
   *
   * Cells start turning in the configured order; the promise resolves once
   * the last of them has settled.
   */
  async set(rows: string[][], setOptions: SetOptions = {}): Promise<void> {
    if (this.destroyed) return;

    this.clearTimers();
    if (!this.opts.rows && rows.length !== this.rowCount)
      this.build(rows.length);

    const rank = this.ranker();
    const cascade = setOptions.immediate
      ? 0
      : (this.opts.cascade ?? DEFAULT_CASCADE);

    const settled = this.cells.map((cell) => {
      const value = rows[cell.row]?.[cell.column] ?? "";
      const delay =
        cascade *
        rank({
          row: cell.row,
          column: cell.column,
          rows: this.rowCount,
          columns: this.opts.columns.length,
        });

      if (delay <= 0) return cell.display.set(value, setOptions);

      // Hold the cell back for its turn, and keep the promise chained to the
      // real set so the board only reports settled once it truly is.
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.timers = this.timers.filter((t) => t !== timer);
          void cell.display.set(value, setOptions).then(resolve);
        }, delay);
        this.timers.push(timer);
      });
    });

    await Promise.all(settled);
    if (this.destroyed) return;

    const detail: BoardSettleDetail = { rows: this.rows };
    this.opts.onSettle?.(detail);
    this.root.dispatchEvent(
      new CustomEvent("splitflap:board-settle", { detail, bubbles: true }),
    );
  }

  /**
   * Merge new board options in. Changing `columns`, `labels` or `rows`
   * rebuilds the grid; everything else applies in place.
   */
  setOptions(patch: Partial<SplitFlapBoardOptions>): void {
    if (this.destroyed) return;

    // Re-labelling must not rebuild: a translated heading is no reason to
    // destroy thirty displays, and callers holding references to them
    // through `cell()` would be left with dead ones.
    const relabelsOnly =
      "labels" in patch &&
      (patch.labels?.length ?? 0) === this.labelCells.length;

    const rebuilds =
      ("columns" in patch && patch.columns !== this.opts.columns) ||
      ("labels" in patch && !relabelsOnly) ||
      ("defaults" in patch && patch.defaults !== this.opts.defaults);

    const kept = this.rows;
    this.opts = { ...this.opts, ...patch };

    if (relabelsOnly) this.applyLabels();

    if (rebuilds) {
      this.clearTimers();
      this.root.style.setProperty(
        "--sfb-columns",
        String(this.opts.columns.length),
      );
      this.build(this.opts.rows ?? this.rowCount);
      void this.set(kept, { immediate: true });
    } else if ("rows" in patch && patch.rows !== undefined) {
      this.build(patch.rows);
      void this.set(kept, { immediate: true });
    }
  }

  /** Freeze every cell where it stands. */
  stop(): void {
    this.clearTimers();
    for (const cell of this.cells) cell.display.stop();
  }

  /** Tear the board down, along with every display in it. */
  destroy(): void {
    if (this.destroyed) return;
    this.clearTimers();
    for (const cell of this.cells) cell.display.destroy();
    this.cells = [];
    this.rowCount = 0;
    this.root.replaceChildren();
    this.root.classList.remove("sfb");
    this.root.style.removeProperty("--sfb-columns");
    this.destroyed = true;
  }

  /* ------------------------------------------------------------------ */
  /* Internals                                                           */
  /* ------------------------------------------------------------------ */

  /** Resolve the configured order into a rank function. */
  private ranker(): (cell: BoardCell) => number {
    const order: RefreshOrder = this.opts.order ?? "simultaneous";
    if (typeof order === "function") return order;

    if (order === "random") {
      // Shuffled afresh each refresh, so the ripple is never the same twice.
      const total = this.rowCount * this.opts.columns.length;
      const ranks = Array.from({ length: total }, (_, i) => i);
      for (let i = ranks.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ranks[i], ranks[j]] = [ranks[j]!, ranks[i]!];
      }
      return ({ row, column, columns }) => ranks[row * columns + column] ?? 0;
    }

    return ORDERS[order] ?? ORDERS.simultaneous!;
  }

  private build(rowCount: number): void {
    for (const cell of this.cells) cell.display.destroy();
    this.cells = [];
    this.rowCount = Math.max(0, rowCount);

    const frag = document.createDocumentFragment();
    const { columns, labels, defaults } = this.opts;

    this.labelCells = [];
    if (labels?.length) {
      for (let c = 0; c < columns.length; c += 1) {
        const head = document.createElement("div");
        head.className = "sfb__label";
        frag.append(head);
        this.labelCells.push(head);
      }
    }

    // Cells go straight into the shared grid — no per-row wrapper — so every
    // column stays aligned with its heading.
    const hosts: Array<{ host: HTMLElement; row: number; column: number }> = [];
    for (let r = 0; r < this.rowCount; r += 1) {
      for (let c = 0; c < columns.length; c += 1) {
        const host = document.createElement("div");
        host.className = "sfb__cell";
        frag.append(host);
        hosts.push({ host, row: r, column: c });
      }
    }

    this.grid.replaceChildren(frag);
    this.applyLabels();

    // Mount only once the hosts are in the document, so each display can
    // read the custom properties it inherits.
    for (const { host, row, column } of hosts) {
      const options: SplitFlapOptions = {
        ...defaults,
        ...columns[column],
        // The board owns the value; a per-column one would fight `set()`.
        value: "",
      };
      this.cells.push({ display: new SplitFlap(host, options), row, column });
    }
  }

  private applyLabels(): void {
    const labels = this.opts.labels ?? [];
    this.labelCells.forEach((node, i) => {
      node.textContent = labels[i] ?? "";
    });
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
  }
}
