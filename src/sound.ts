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

export function createClicker(volume = 0.25): Clicker {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return NOOP_CLICKER;

  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let gain = volume;

  return {
    tick() {
      try {
        if (!ctx) {
          ctx = new Ctor();
          noise = makeNoiseBuffer(ctx);
        }
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
      try {
        void ctx?.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      noise = null;
    },
  };
}
