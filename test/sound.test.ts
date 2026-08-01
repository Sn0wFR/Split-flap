import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubAudio } from "./audio-stub.js";

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

    expect(audio.contexts()).toBe(1);
  });

  it("creates the context lazily, on the first tick", async () => {
    const audio = stubAudio();
    const createClicker = await loadClicker();

    createClicker();
    expect(audio.contexts()).toBe(0);
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

    expect(audio.contexts()).toBe(2);
  });

  it("stays quiet before a gesture, then unlocks on the first one", async () => {
    // What a browser does on a freshly loaded page: the context exists but
    // is suspended, and resuming it is refused until the visitor interacts.
    const audio = stubAudio({ suspended: true });
    const createClicker = await loadClicker();

    const clicker = createClicker();
    clicker.tick();
    expect(audio.clicks()).toBe(0);
    expect(audio.running()).toBe(false);

    audio.allowResume();
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    // The gesture is what lifted it — no further tick was needed. This is
    // the case a restored `sound: true` hits on a freshly loaded page.
    expect(audio.running()).toBe(true);

    clicker.tick();
    expect(audio.clicks()).toBe(1);
  });

  it("stops listening for gestures once one has arrived", async () => {
    const audio = stubAudio({ suspended: true });
    const createClicker = await loadClicker();

    const clicker = createClicker();
    clicker.tick();
    const beforeGesture = audio.resumes();

    audio.allowResume();
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    const afterFirst = audio.resumes();

    document.dispatchEvent(new Event("keydown"));
    document.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    expect(afterFirst).toBe(beforeGesture + 1);
    // The listener removed itself, so later gestures cost nothing.
    expect(audio.resumes()).toBe(afterFirst);
    expect(audio.contexts()).toBe(1);
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
