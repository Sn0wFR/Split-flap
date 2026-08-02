import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubAudio } from "./audio-stub.js";

/**
 * The engine is module state, so each test needs its own copy of the module.
 */
async function load() {
  return import("../src/sound.js");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the click engine", () => {
  it("builds one AudioContext however many clicks are played", async () => {
    const audio = stubAudio();
    const { playClick } = await load();

    // A departure board is dozens of displays clicking at once; browsers cap
    // how many contexts a document may hold.
    for (let i = 0; i < 200; i += 1) playClick(0.1);

    expect(audio.contexts()).toBe(1);
    expect(audio.clicks()).toBe(200);
  });

  it("builds nothing until the first click", async () => {
    const audio = stubAudio();
    await load();
    expect(audio.contexts()).toBe(0);
  });

  it("survives a clicker being closed", async () => {
    // The regression that motivated the rework: closing a handle used to
    // tear the shared context down, so the page fell silent for everyone.
    const audio = stubAudio();
    const { createClicker, playClick } = await load();

    const handle = createClicker(0.2);
    handle.tick();
    handle.close();

    playClick(0.2);
    expect(audio.closed).toEqual([]);
    expect(audio.contexts()).toBe(1);
    expect(audio.clicks()).toBe(2);
  });

  it("keeps the context across a mute and unmute cycle", async () => {
    const audio = stubAudio();
    const { createClicker } = await load();

    const handle = createClicker(0.2);
    handle.tick();
    handle.close(); // muted
    handle.tick(); // silent while closed

    const revived = createClicker(0.2);
    revived.tick(); // unmuted, and audible straight away

    expect(audio.contexts()).toBe(1);
    expect(audio.clicks()).toBe(2);
  });

  it("stays quiet before a gesture, then unlocks on the first one", async () => {
    // What a browser does on a freshly loaded page: the context exists but
    // is suspended, and resuming is refused until the visitor interacts.
    const audio = stubAudio({ suspended: true });
    const { playClick } = await load();

    playClick();
    expect(audio.clicks()).toBe(0);
    expect(audio.running()).toBe(false);

    audio.allowResume();
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    // The gesture lifted it — no further click was needed to do so.
    expect(audio.running()).toBe(true);

    playClick();
    expect(audio.clicks()).toBe(1);
  });

  it("stops listening for gestures once one has arrived", async () => {
    const audio = stubAudio({ suspended: true });
    const { playClick } = await load();

    playClick();
    const before = audio.resumes();

    audio.allowResume();
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    const afterFirst = audio.resumes();

    document.dispatchEvent(new Event("keydown"));
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    expect(afterFirst).toBe(before + 1);
    expect(audio.resumes()).toBe(afterFirst);
    expect(audio.contexts()).toBe(1);
  });

  it("closeAudio releases the device, and the next click rebuilds", async () => {
    const audio = stubAudio();
    const { playClick, closeAudio } = await load();

    playClick();
    closeAudio();
    expect(audio.closed).toEqual(["ctx-1"]);

    playClick();
    expect(audio.contexts()).toBe(2);
  });

  it("is safe to close twice", async () => {
    const audio = stubAudio();
    const { playClick, closeAudio } = await load();

    playClick();
    closeAudio();
    expect(() => closeAudio()).not.toThrow();
    expect(audio.closed).toEqual(["ctx-1"]);
  });

  it("clamps the volume rather than trusting the caller", async () => {
    const audio = stubAudio();
    const { playClick } = await load();

    expect(() => {
      playClick(-3);
      playClick(50);
      playClick(Number.NaN);
    }).not.toThrow();
    expect(audio.clicks()).toBe(3);
  });

  it("degrades to silence where the Web Audio API is missing", async () => {
    vi.stubGlobal("window", {});
    const { playClick, createClicker, closeAudio } = await load();

    expect(() => {
      playClick();
      const handle = createClicker();
      handle.tick();
      handle.setVolume(0.5);
      handle.close();
      closeAudio();
    }).not.toThrow();
  });

  it("gives up on a context that throws, instead of retrying every flip", async () => {
    let built = 0;
    vi.stubGlobal("window", {
      AudioContext: class {
        constructor() {
          built += 1;
          throw new Error("no audio device");
        }
      },
    });
    const { playClick } = await load();

    for (let i = 0; i < 50; i += 1) playClick();
    expect(built).toBe(1);
  });
});
