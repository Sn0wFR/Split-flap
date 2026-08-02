/**
 * A short mechanical click, synthesised rather than shipped as an audio file
 * so the package stays dependency- and asset-free.
 *
 * The engine below is a page-level singleton, and deliberately so. Every bug
 * this module has had came from the opposite arrangement — tying the audio
 * context to whether some display currently wanted sound. Muting tore the
 * context down, unmuting had to rebuild it, and rebuilding happens outside a
 * user gesture, which is exactly where browsers refuse to start audio. A
 * display now owns nothing: it asks for a click and the engine decides.
 */

/** Gestures a browser accepts as permission to start playing audio. */
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

type AudioContextCtor = typeof AudioContext;

interface Engine {
  ctx: AudioContext;
  /** One burst of decaying noise, reused for every click. */
  noise: AudioBuffer;
}

let engine: Engine | null = null;
/** Set once construction has failed, so it is not retried on every flip. */
let unavailable = false;
let unlockArmed = false;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

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

/**
 * Resume the context on the page's first user gesture.
 *
 * A context built before any interaction starts suspended, and `resume()`
 * from outside a gesture does not lift that. The handler resolves the engine
 * when it fires rather than capturing one, so it stays correct even if the
 * engine was torn down and rebuilt in between.
 */
function armUnlock(): void {
  if (unlockArmed || typeof document === "undefined") return;
  unlockArmed = true;

  const unlock = () => {
    for (const type of GESTURES) {
      document.removeEventListener(type, unlock, true);
    }
    unlockArmed = false;
    try {
      void engine?.ctx.resume();
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

/** The engine, built on first use. Null where Web Audio is unavailable. */
function getEngine(): Engine | null {
  if (engine) return engine;
  if (unavailable) return null;

  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    unavailable = true;
    return null;
  }

  try {
    const ctx = new Ctor();
    engine = { ctx, noise: makeNoiseBuffer(ctx) };
    armUnlock();
    return engine;
  } catch {
    unavailable = true;
    return null;
  }
}

function clamp(volume: number): number {
  return Math.min(1, Math.max(0, volume));
}

/**
 * Play one click. Does nothing, quietly, where audio is unavailable or the
 * page has not yet been interacted with.
 */
export function playClick(volume = 0.25): void {
  const active = getEngine();
  if (!active) return;

  const { ctx, noise } = active;
  try {
    // Browsers hold the context suspended until a user gesture happens;
    // `armUnlock` handles the case where none has arrived yet.
    if (ctx.state === "suspended") void ctx.resume();
    if (ctx.state !== "running") return;

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
    envelope.gain.setValueAtTime(clamp(volume), now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    source.connect(filter).connect(envelope).connect(ctx.destination);
    source.start(now);
    source.stop(now + 0.06);
  } catch {
    // Audio is a garnish; never let it break the display.
  }
}

/**
 * Release the audio device.
 *
 * Nothing in the library calls this: displays are created and destroyed, and
 * sound is muted and unmuted, without the engine noticing. It exists for
 * hosts that need the device back, and for tests. The next click rebuilds —
 * though on a page that has already seen a gesture, not before one.
 */
export function closeAudio(): void {
  const active = engine;
  engine = null;
  unavailable = false;
  if (!active) return;
  try {
    void active.ctx.close();
  } catch {
    /* already closed */
  }
}

/** A handle that plays clicks at a fixed volume. */
export interface Clicker {
  /** Play one click. Silently does nothing if audio is unavailable. */
  tick(): void;
  setVolume(volume: number): void;
  /** Stop this handle from playing. Leaves the shared engine running. */
  close(): void;
}

/**
 * A `Clicker` bound to a volume.
 *
 * Kept for callers who hold a handle rather than passing a volume per click.
 * `close()` silences the handle only — it no longer tears the audio context
 * down, which is what used to leave a page mute after a mute/unmute cycle.
 * Use `closeAudio()` when you really do want the device released.
 */
export function createClicker(volume = 0.25): Clicker {
  let gain = clamp(volume);
  let closed = false;

  return {
    tick() {
      if (!closed) playClick(gain);
    },
    setVolume(next: number) {
      gain = clamp(next);
    },
    close() {
      closed = true;
    },
  };
}
