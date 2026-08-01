import { vi } from "vitest";

/**
 * Minimal Web Audio stand-in: happy-dom ships none, and the parts of the API
 * the clicker touches are small enough to fake exactly.
 *
 * Reports how many contexts were built, which were closed, and how many
 * sources were actually started — one per click that reached the graph.
 */
export interface AudioStub {
  /** Number of AudioContexts constructed. */
  contexts(): number;
  /** Number of clicks that reached the audio graph. */
  clicks(): number;
  /** Number of times `resume()` was called, granted or not. */
  resumes(): number;
  /** Whether the most recent context is running rather than suspended. */
  running(): boolean;
  /** Ids of contexts that were closed, in order. */
  closed: string[];
  /**
   * Start granting `resume()`, the way a browser does once the page has
   * seen a user gesture. Before this, resuming is a no-op — which is the
   * whole reason the unlock-on-gesture path exists.
   */
  allowResume(): void;
}

export interface StubOptions {
  /**
   * Start contexts suspended, the way a browser does before the page has
   * seen a user gesture. `resume()` then flips them to running.
   */
  suspended?: boolean;
}

export function stubAudio({ suspended = false }: StubOptions = {}): AudioStub {
  let built = 0;
  let started = 0;
  let resumeCalls = 0;
  let resumeAllowed = !suspended;
  let latest: { state: string } | null = null;
  const closed: string[] = [];

  class FakeAudioContext {
    readonly id: string;
    state = suspended ? "suspended" : "running";
    currentTime = 0;
    destination = {};

    constructor() {
      built += 1;
      this.id = `ctx-${built}`;
      latest = this;
    }
    createBuffer(_channels: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { value: 1 },
        connect: (next: unknown) => next,
        start() {
          started += 1;
        },
        stop() {},
      };
    }
    createBiquadFilter() {
      return {
        type: "",
        frequency: { value: 0 },
        Q: { value: 0 },
        connect: (next: unknown) => next,
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect: (next: unknown) => next,
      };
    }
    resume() {
      resumeCalls += 1;
      // Browsers ignore resume() until the page has seen a gesture.
      // Applied synchronously so a test can assert right after dispatching.
      if (resumeAllowed) this.state = "running";
      return Promise.resolve();
    }
    close() {
      closed.push(this.id);
      return Promise.resolve();
    }
  }

  // The clicker reads `window` at call time, so stubbing it here is enough.
  vi.stubGlobal("window", { AudioContext: FakeAudioContext });

  return {
    contexts: () => built,
    clicks: () => started,
    resumes: () => resumeCalls,
    running: () => latest?.state === "running",
    closed,
    allowResume: () => {
      resumeAllowed = true;
    },
  };
}
