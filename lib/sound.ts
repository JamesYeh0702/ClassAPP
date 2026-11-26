import type { SoundProfile } from './types';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Play a crisp tick sound during the random draw animation.
 * Progress ranges from 0 (start) to 1 (near stop), subtly shifting pitch.
 */
export function playDrawTick(profile: SoundProfile, progress: number): void {
  if (profile === 'muted') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (profile === 'marimba') {
    // Pentatonic marimba-like wooden mallet click
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const idx = Math.min(
      pentatonic.length - 1,
      Math.floor(progress * pentatonic.length)
    );
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pentatonic[idx], now);
    osc.frequency.exponentialRampToValueAtTime(pentatonic[idx] * 0.96, now + 0.065);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  } else {
    // Crisp game wheel click
    const baseFreq = 380 + progress * 460;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Play a joyful celebratory harmonic chime when a student is selected.
 */
export function playDrawReveal(profile: SoundProfile): void {
  if (profile === 'muted') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes =
    profile === 'marimba'
      ? [523.25, 659.25, 783.99, 1046.5] // C5 - E5 - G5 - C6 warm chime
      : [587.33, 739.99, 880.0, 1174.66]; // D5 - F#5 - A5 - D6 bright arcade fanfare

  notes.forEach((freq, i) => {
    const start = now + i * 0.065;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = profile === 'marimba' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.22 : 0.14, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      start + (i === notes.length - 1 ? 0.65 : 0.35)
    );

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.7);
  });
}

/**
 * Play a subtle ascending chord when generating groups.
 */
export function playGroupShuffle(profile: SoundProfile): void {
  if (profile === 'muted') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [440, 554.37, 659.25];

  notes.forEach((freq, i) => {
    const start = now + i * 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.11, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.26);
  });
}

/**
 * Play a soft pop when swapping two students across groups.
 */
export function playSwapPop(profile: SoundProfile): void {
  if (profile === 'muted') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}
