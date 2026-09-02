/**
 * SocialDesk Notification Audio Engine
 * Uses Web Audio API to synthesize a clean, professional dual-frequency notification chime.
 * Handles browser autoplay policies seamlessly with automatic AudioContext resume on user gesture.
 */

let audioCtx = null;
let isAudioUnlocked = false;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Unlock audio on initial user interaction
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === 'running') {
    isAudioUnlocked = true;
  }
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'keydown'];
  const handleInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((evt) => window.removeEventListener(evt, handleInteraction));
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true, once: true }));
}

/**
 * Synthesizes a crisp, elegant dual-frequency notification chime:
 * Tone 1: 587.33 Hz (D5)
 * Tone 2: 880.00 Hz (A5)
 * Duration: ~350ms with exponential decay envelope.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master Gain for smooth volume control
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    masterGain.connect(ctx.destination);

    // Oscillator 1 (Primary Tone: 587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // Slight pitch bend up to A5

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.9, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    // Oscillator 2 (Harmonic Sparkle: 1174.66 Hz - D6)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.06);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0, now);
    gain2.gain.setValueAtTime(0.35, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    // Playback
    osc1.start(now);
    osc1.stop(now + 0.4);

    osc2.start(now + 0.06);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn('Audio chime playback omitted (browser policy or unsupported):', err.message);
  }
}

/**
 * Manual test sound trigger for Settings Page.
 */
export function testNotificationSound() {
  unlockAudio();
  playNotificationSound();
}
