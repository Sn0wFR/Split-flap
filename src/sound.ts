/**
 * A short mechanical click, synthesised rather than shipped as an audio file
 * so the package stays dependency- and asset-free.
 */
export interface Clicker {
  /** Play one click. Silently does nothing if audio is unavailable. */
  tick(): void;
  setVolume(volume: number): void;
  close(): void;
}

const NOOP_CLICKER: Clicker = {
  tick() {},
  setVolume() {},
  close() {},
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Build a burst of white noise once and reuse it for every click. */
function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    // Decaying noise: the tail of a flap hitting its stop.
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  }
  return buffer;
}

/*
 * One AudioContext is shared by every clicker on the page.
 *
 * Browsers cap how many a document may hold — Chrome throws past a handful —
 * and a departure board is naturally built from dozens of displays. Giving
 * each its own context would exhaust that budget and silence the lot.
 */
let shared: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let users = 0;

/** Gestures a browser accepts as permission to start playing audio. */
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

/**
 * Resume the context on the page's first user gesture.
 *
 * A context built before any interaction starts suspended, and calling
 * `resume()` from outside a gesture does not lift that. Without this, a
 * display created with `sound: true` on a freshly loaded page stays mute
 * until something else happens to build a context at the right moment.
 */
function unlockOnGesture(ctx: AudioContext): void {
  if (typeof document === "undefined") return;

  const unlock = () => {
    for (const type of GESTURES) {
      document.removeEventListener(type, unlock, true);
    }
    try {
      void ctx.resume();
    } catch {
      /* context already gone */
    }
  };

  // Capture phase, so a handler that stops propagation cannot hide the
  // gesture from us.
  for (const type of GESTURES) {
    document.addEventListener(type, unlock, true);
  }
}

function acquire(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!shared) {
    shared = new Ctor();
    noise = makeNoiseBuffer(shared);
    unlockOnGesture(shared);
  }
  return shared;
}

/** Drop the shared context once the last clicker using it has closed. */
function release(): void {
  users = Math.max(0, users - 1);
  if (users > 0 || !shared) return;
  try {
    void shared.close();
  } catch {
    /* already closed */
  }
  shared = null;
  noise = null;
}

export function createClicker(volume = 0.25): Clicker {
  if (!getAudioContextCtor()) return NOOP_CLICKER;

  users += 1;
  let closed = false;
  let gain = volume;

  return {
    tick() {
      try {
        if (closed) return;
        const ctx = acquire();
        if (!ctx) return;

        // Browsers hold the context suspended until a user gesture happens.
        if (ctx.state === "suspended") void ctx.resume();
        if (ctx.state !== "running" || !noise) return;

        const now = ctx.currentTime;
        const source = ctx.createBufferSource();
        source.buffer = noise;
        // Slight detune per click so a row of flaps does not sound looped.
        source.playbackRate.value = 0.85 + Math.random() * 0.3;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1800 + Math.random() * 900;
        filter.Q.value = 1.1;

        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(gain, now);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        source.connect(filter).connect(envelope).connect(ctx.destination);
        source.start(now);
        source.stop(now + 0.06);
      } catch {
        // Audio is a garnish; never let it break the display.
      }
    },
    setVolume(next: number) {
      gain = Math.min(1, Math.max(0, next));
    },
    close() {
      // Idempotent: a double close must not release another clicker's claim
      // on the shared context.
      if (closed) return;
      closed = true;
      release();
    },
  };
}
