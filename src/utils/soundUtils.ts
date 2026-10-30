/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to play a subtle, professional audio cue using the Web Audio API
 * for success confirmations (Attendance Saved & Marks Published).
 * Short, non-intrusive, polite chime (soft marimba / pleasant bell tap).
 */
export function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Pleasant two-tone ascending chime (e.g., C5 to G5 soft marimba tone)
    const frequencies = [523.25, 783.99]; // C5, G5

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      // Soft envelope
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
    // Audio context not allowed or blocked before user gesture — safely catch
    console.debug('Web Audio cue skipped:', err);
  }
}

/**
 * Triggers a subtle haptic vibration using navigator.vibrate() on mobile devices
 * when success confirmation screens appear.
 */
export function triggerHapticFeedback() {
  try {
    if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
      // Subtle double tap haptic pulse (e.g. 15ms pulse, 40ms pause, 25ms pulse)
      window.navigator.vibrate([15, 40, 25]);
    }
  } catch (err) {
    console.debug('Haptic vibration skipped:', err);
  }
}

