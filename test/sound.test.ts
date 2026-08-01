import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The shared context and its reference count are module state, so each test
 * needs its own copy of the module or leftover clickers from one test keep
 * the context alive in the next.
 */
async function loadClicker() {
  return (await import("../src/sound.js")).createClicker;
}

beforeEach(() => {
  vi.resetModules();
});

/** Minimal AudioContext good enough to count constructions and closures. */
function stubAudio() {
  let built = 0;
  const closed: string[] = [];

  class FakeAudioContext {
    static get built() {
      return built;
    }
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
        start() {},
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

  vi.stubGlobal("window", { AudioContext: FakeAudioContext });
  return { count: () => built, closed };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createClicker", () => {
  it("shares one AudioContext across every clicker", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    // A departure board is built from dozens of displays; browsers cap how
    // many contexts a document may hold, so they must all share one.
    const clickers = Array.from({ length: 30 }, () => createClicker(0.1));
    for (const clicker of clickers) clicker.tick();

    expect(audio.count()).toBe(1);
  });

  it("creates the context lazily, on the first tick", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    createClicker();
    expect(audio.count()).toBe(0);
  });

  it("keeps the context alive while another clicker still holds it", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    const first = createClicker();
    const second = createClicker();
    first.tick();

    first.close();
    expect(audio.closed).toEqual([]);

    second.close();
    expect(audio.closed).toEqual(["ctx-1"]);
  });

  it("ignores a double close rather than freeing another holder's context", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    const first = createClicker();
    const second = createClicker();
    first.tick();

    first.close();
    first.close();
    expect(audio.closed).toEqual([]);

    second.close();
    expect(audio.closed).toEqual(["ctx-1"]);
  });

  it("builds a fresh context after every clicker has gone", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    const first = createClicker();
    first.tick();
    first.close();

    const second = createClicker();
    second.tick();

    expect(audio.count()).toBe(2);
  });

  it("degrades to silence where the Web Audio API is missing", async () => {
    vi.stubGlobal("window", {});
    const createClicker = await loadClicker();

    const clicker = createClicker();
    expect(() => {
      clicker.tick();
      clicker.setVolume(0.5);
      clicker.close();
    }).not.toThrow();
  });
});
