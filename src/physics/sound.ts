/**
 * Procedural impact sounds — no samples, just a tiny WebAudio synth.
 * Every collision voice is built from oscillators + filtered noise so the
 * whole machine shop fits in ~150 lines.
 */

import type { Material } from './materials';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastPlayed = new Map<string, number>();

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call once from a user gesture so the AudioContext is allowed to start. */
export function primeAudio() {
  ensureCtx();
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

interface VoiceOpts {
  gain: number; // 0..1 loudness for this hit
  pitch: number; // 0..1 size hint (small part = higher)
}

type VoiceFn = (c: AudioContext, out: GainNode, o: VoiceOpts) => void;

const voices: Record<Material['voice'], VoiceFn> = {
  // Dead metallic slab: low sine drop + click of noise
  thud(c, out, { gain, pitch }) {
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    const f = 70 + pitch * 60;
    osc.frequency.setValueAtTime(f * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.18);
  },
  // Woody knock: bandpassed noise burst + short triangle
  knock(c, out, { gain, pitch }) {
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.06);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500 + pitch * 700;
    bp.Q.value = 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp).connect(g).connect(out);
    src.start(t);
  },
  // Cartoon spring: sine glide up-down with vibrato
  boing(c, out, { gain, pitch }) {
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    const f0 = 160 + pitch * 160;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.28);
    const vib = c.createOscillator();
    vib.frequency.value = 22;
    const vibGain = c.createGain();
    vibGain.gain.value = 26;
    vib.connect(vibGain).connect(osc.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(gain * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(out);
    osc.start(t);
    vib.start(t);
    osc.stop(t + 0.32);
    vib.stop(t + 0.32);
  },
  // Brass bell: two detuned triangles, longer ring
  ding(c, out, { gain, pitch }) {
    const t = c.currentTime;
    const f = 620 + pitch * 620;
    for (const [ratio, amt] of [
      [1, 1],
      [2.76, 0.4],
    ] as const) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(gain * 0.45 * amt, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.52);
    }
  },
  // Glass tap: bright short highpassed noise + high sine
  clink(c, out, { gain, pitch }) {
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.04);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2400;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1900 + pitch * 900;
    const og = c.createGain();
    og.gain.setValueAtTime(gain * 0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + 0.14);
  },
  // Paper: soft lowpassed noise puff
  flutter(c, out, { gain }) {
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.09);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(lp).connect(g).connect(out);
    src.start(t);
  },
};

/** One-off UI sounds (shatter, eject, machinery). */
export function playEffect(kind: 'shatter' | 'pop' | 'ratchet' | 'whoosh', intensity = 1) {
  const c = ensureCtx();
  if (!c || !master || muted) return;
  const t = c.currentTime;
  if (kind === 'shatter') {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        voices.clink(c, master!, { gain: 0.4 * intensity, pitch: Math.random() });
      }, i * 35);
    }
  } else if (kind === 'pop') {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.4 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.1);
  } else if (kind === 'ratchet') {
    for (let i = 0; i < 3; i++) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 0.015);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 3;
      const g = c.createGain();
      g.gain.value = 0.25 * intensity;
      src.connect(bp).connect(g).connect(master);
      src.start(t + i * 0.045);
    }
  } else if (kind === 'whoosh') {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.3);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0.2 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(lp).connect(g).connect(master);
    src.start(t);
  }
}

/**
 * Play a collision sound for a material hit.
 * @param speed impact speed in px/tick — scales loudness, gates tiny scrapes
 * @param size body area hint used to pitch small parts higher
 */
export function playImpact(voice: Material['voice'], speed: number, size: number, key: string) {
  const c = ensureCtx();
  if (!c || !master || muted) return;
  if (speed < 2.2) return;
  // Per-body rate limit so a rolling ball doesn't machine-gun.
  const now = performance.now();
  const last = lastPlayed.get(key) ?? 0;
  if (now - last < 90) return;
  lastPlayed.set(key, now);
  if (lastPlayed.size > 200) lastPlayed = new Map([...lastPlayed].slice(-100));

  const gain = Math.min(1, (speed - 2) / 14) * 0.85 + 0.05;
  const pitch = Math.max(0, Math.min(1, 1 - size / 30000));
  voices[voice](c, master, { gain, pitch });
}
