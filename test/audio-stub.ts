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
  /** Ids of contexts that were closed, in order. */
  closed: string[];
}

export function stubAudio(): AudioStub {
  let built = 0;
  let started = 0;
  const closed: string[] = [];

  class FakeAudioContext {
    readonly id: string;
    state = "running";
    currentTime = 0;
    destination = {};

    constructor() {
      built += 1;
      this.id = `ctx-${built}`;
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
    closed,
  };
}
