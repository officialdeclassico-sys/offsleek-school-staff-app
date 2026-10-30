/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unified Feedback Utility for OFFSLEEK Staff Application.
 * Handles Web Audio API success chimes and navigator.vibrate() haptic feedback,
 * safely respecting browser security and autoplay policies.
 */

export function playSuccessChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Ignored if browser restricts audio context resume prior to direct gesture
      });
    }

    const now = ctx.currentTime;
    const frequencies = [523.25, 783.99]; // C5, G5 pleasant two-tone chime

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const startTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.38);
    });
  } catch (err) {
    console.debug('Web Audio success chime skipped or restricted:', err);
  }
}

export function triggerHapticFeedback(pattern: number | number[] = [15, 40, 25]): void {
  try {
    if (
      typeof window !== 'undefined' &&
      window.navigator &&
      typeof window.navigator.vibrate === 'function'
    ) {
      window.navigator.vibrate(pattern);
    }
  } catch (err) {
    console.debug('Haptic vibration skipped or unsupported:', err);
  }
}

export function triggerSuccessFeedback(): void {
  playSuccessChime();
  triggerHapticFeedback();
}
