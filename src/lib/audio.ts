"use client";

/**
 * audio.ts — Synthesized scanner sound design (Web Audio API only)
 *
 * Per Overhaul 5B: all sounds are synthesized at runtime — zero external
 * audio files, zero dependencies. A single shared AudioContext is lazily
 * created on first use (after a user gesture, per browser autoplay policy).
 *
 * Public sound set (Overhaul 5B spec):
 *   scanSuccess   → 880 Hz square,  80 ms   (short high beep)
 *   scanError     → 220 Hz sawtooth, 120 ms  (low buzz)
 *   ctrlKey       → 440 Hz sine,     40 ms   (soft click)
 *   toteComplete  → C-E-G chord,    300 ms   (success chord)
 *   sessionDone   → ascending 4-note fanfare
 *
 * Legacy exports (playSuccessBeep / playErrorBuzz) are retained so existing
 * callers keep working; they now map to the spec'd success/error sounds.
 */

let audioCtx: AudioContext | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL MUTE
// The flag is seeded from the persisted accessibility prefs blob so pages that
// never mount useAccessibilityPrefs (e.g. /drill) still honor the setting.
// ─────────────────────────────────────────────────────────────────────────────

const A11Y_STORAGE_KEY = "warehousepro.a11y";

let muted: boolean | null = null;

function isMutedNow(): boolean {
  if (muted === null) {
    muted = false;
    try {
      const raw = window.localStorage.getItem(A11Y_STORAGE_KEY);
      if (raw) muted = Boolean(JSON.parse(raw).muteAudio);
    } catch {
      // Storage unavailable or malformed — default to unmuted.
    }
  }
  return muted;
}

/** Instantly silence (or restore) every synthesized sound. */
export function setAudioMuted(flag: boolean): void {
  muted = flag;
}

/** Current mute state (lazily seeded from persisted accessibility prefs). */
export function isAudioMuted(): boolean {
  return typeof window === "undefined" ? true : isMutedNow();
}

/** Lazily create (and resume) the shared AudioContext. SSR-safe. */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a single synthesized tone.
 *
 * @param frequency  Tone frequency in Hz.
 * @param duration   Duration in seconds.
 * @param shape      Oscillator waveform (default "sine").
 * @param when       Offset in seconds from now (for sequencing).
 * @param peakGain   Peak gain 0–1 (default 0.12).
 */
export function playTone(
  frequency: number,
  duration: number,
  shape: OscillatorType = "sine",
  when = 0,
  peakGain = 0.12
): void {
  if (isAudioMuted()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = shape;
  osc.frequency.setValueAtTime(frequency, start);

  // Fast attack, exponential decay — characteristic scanner envelope.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Play several frequencies simultaneously as a chord. */
export function playChord(
  frequencies: number[],
  duration: number,
  shape: OscillatorType = "sine"
): void {
  frequencies.forEach((f) => playTone(f, duration, shape, 0, 0.08));
}

/** Ascending 4-note success fanfare (C5 → E5 → G5 → C6). */
export function playFanfare(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => playTone(f, 0.18, "triangle", i * 0.12, 0.1));
}

// ─────────────────────────────────────────────────────────────────────────────
// NAMED SOUND SET (Overhaul 5B)
// ─────────────────────────────────────────────────────────────────────────────

export const sounds = {
  /** Short high beep — correct scan. */
  scanSuccess: () => playTone(880, 0.08, "square", 0, 0.12),
  /** Low buzz — wrong scan / invalid input. */
  scanError: () => playTone(220, 0.12, "sawtooth", 0, 0.12),
  /** Soft click — keyboard shortcut accepted. */
  ctrlKey: () => playTone(440, 0.04, "sine", 0, 0.08),
  /** Tactile chiclet key depression click. */
  keyClick: () => playTone(700, 0.015, "triangle", 0, 0.05),
  /** C-E-G success chord — tote complete. */
  toteComplete: () => playChord([523.25, 659.25, 783.99], 0.3, "sine"),
  /** Ascending fanfare — session complete. */
  sessionDone: () => playFanfare(),
  /** Crisp industrial high-pitched chirp (880 Hz, 80 ms) — check-digit decode */
  checkDigitChirp: () => playCheckDigitChirp(),
  /** Clean dual-tone verification beep (1046 Hz -> 1318 Hz) — barcode scan */
  barcodeVerificationBeep: () => playBarcodeVerificationBeep(),
  /** Warm low-frequency chime — item deposited into tote */
  toteChime: () => playToteChime(),
  /** Gentle double-bonk tone (180 Hz -> 140 Hz) — non-punitive sequence correction */
  softFailBonk: () => playSoftFailBonk(),
} as const;

/** Tactile mechanical chiclet key depression. */
export function playKeyClick(): void {
  playTone(700, 0.015, "triangle", 0, 0.05);
}

/** Crisp industrial high-pitched chirp (880 Hz, 80 ms) — check-digit decode */
export function playCheckDigitChirp(): void {
  playTone(880, 0.08, "square", 0, 0.12);
}

/** Clean dual-tone verification beep (1046 Hz -> 1318 Hz) — barcode scan */
export function playBarcodeVerificationBeep(): void {
  playTone(1046.5, 0.06, "sine", 0, 0.1);
  playTone(1318.5, 0.08, "sine", 0.065, 0.1);
}

/** Warm low-frequency chime — item deposited into tote */
export function playToteChime(): void {
  playTone(440, 0.12, "sine", 0, 0.1);
  playTone(554.37, 0.18, "sine", 0.1, 0.12);
}

/** Gentle double-bonk tone (180 Hz -> 140 Hz) — non-punitive sequence correction */
export function playSoftFailBonk(): void {
  playTone(180, 0.07, "triangle", 0, 0.1);
  playTone(140, 0.09, "triangle", 0.08, 0.09);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY EXPORTS (retained for existing callers)
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use `sounds.scanSuccess()`. */
export function playSuccessBeep(): void {
  sounds.scanSuccess();
}

/** @deprecated Use `sounds.scanError()`. */
export function playErrorBuzz(): void {
  sounds.scanError();
}
