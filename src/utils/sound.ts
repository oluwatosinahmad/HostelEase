// ============================================================================
// Hostel Ease - Centralized Notification Audio Engine (Web Audio API Synthesizer)
// Provides a warm, professional, two-tone chime and an urgent 3-tone chime.
// Pure synthesized Web Audio API: 100% zero external audio file dependencies.
// Guarded with volume controls, mute settings, session deduplication, and a 30s freshness limit.
// ============================================================================

import { safeStorage } from './safeStorage';

const SOUND_ENABLED_KEY = 'hostel_ease_sound_enabled';
const SOUND_VOLUME_KEY = 'hostel_ease_sound_volume';

let audioCtx: AudioContext | null = null;
const playedNotificationIds = new Set<string>();

/**
 * Checks if notification sound is enabled in user settings (default: true)
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = safeStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === null || stored === undefined) return true;
  return stored === 'true' || stored === '1';
}

/**
 * Updates user sound enabled setting and broadcasts state change
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  safeStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('hostel_ease_sound_settings_changed', {
    detail: { enabled, volume: getSoundVolume() }
  }));
}

/**
 * Returns current sound volume level from 0.0 to 1.0 (default: 0.6)
 */
export function getSoundVolume(): number {
  if (typeof window === 'undefined') return 0.6;
  const stored = safeStorage.getItem(SOUND_VOLUME_KEY);
  if (!stored) return 0.6;
  const parsed = parseFloat(stored);
  return isNaN(parsed) ? 0.6 : Math.max(0, Math.min(1, parsed));
}

/**
 * Updates sound volume level (0.0 to 1.0) and broadcasts state change
 */
export function setSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  safeStorage.setItem(SOUND_VOLUME_KEY, clamped.toString());
  window.dispatchEvent(new CustomEvent('hostel_ease_sound_settings_changed', {
    detail: { enabled: isSoundEnabled(), volume: clamped }
  }));
}

/**
 * Ensures AudioContext is created and resumed upon user interaction
 */
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('AudioContext initialization deferred:', err);
  }

  return audioCtx;
}

// Auto-bind one-time interaction listeners to unlock audio on first click, key, or touch
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Plays standard pleasant dual-tone chime (C5 523.25 Hz -> E5 659.25 Hz)
 */
export function playStandardChime(volumeOverride?: number): boolean {
  if (!isSoundEnabled() && volumeOverride === undefined) return false;

  try {
    const ctx = initAudioContext();
    if (!ctx || ctx.state !== 'running') return false;

    const baseVol = volumeOverride !== undefined ? volumeOverride : getSoundVolume();
    if (baseVol <= 0) return false;

    const now = ctx.currentTime;

    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18 * baseVol, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.26);

    // Tone 2: E5 (659.25 Hz) harmonic partner
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.09);

    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.22 * baseVol, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.09);
    osc2.stop(now + 0.43);

    return true;
  } catch (err) {
    console.warn('Failed to play standard notification chime:', err);
    return false;
  }
}

/**
 * Plays urgent 3-tone chime for critical safety/security alerts
 */
export function playUrgentChime(volumeOverride?: number): boolean {
  if (!isSoundEnabled() && volumeOverride === undefined) return false;

  try {
    const ctx = initAudioContext();
    if (!ctx || ctx.state !== 'running') return false;

    const baseVol = volumeOverride !== undefined ? volumeOverride : getSoundVolume();
    if (baseVol <= 0) return false;

    const now = ctx.currentTime;

    // 3 ascending energetic tones: G5 (784Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
    const tones = [
      { freq: 783.99, delay: 0.0, dur: 0.14 },
      { freq: 1046.50, delay: 0.10, dur: 0.14 },
      { freq: 1318.51, delay: 0.20, dur: 0.28 }
    ];

    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.delay);

      gain.gain.setValueAtTime(0, now + t.delay);
      gain.gain.linearRampToValueAtTime(0.20 * baseVol, now + t.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t.delay + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.delay);
      osc.stop(now + t.delay + t.dur + 0.01);
    }

    return true;
  } catch (err) {
    console.warn('Failed to play urgent chime:', err);
    return false;
  }
}

/**
 * Master notification sound trigger:
 * - Checks sound enabled/disabled setting.
 * - Deduplicates against already played notification IDs.
 * - Discards events older than 30 seconds (prevents sound storms on page load/reconnect).
 * - Selects urgent or standard chime based on priority.
 */
export function playNotificationSound(options?: {
  notificationId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt?: string;
  volumeOverride?: number;
}): boolean {
  if (!isSoundEnabled() && options?.volumeOverride === undefined) {
    return false;
  }

  // Deduplication guard: never chime twice for the same notification ID in this session
  if (options?.notificationId) {
    if (playedNotificationIds.has(options.notificationId)) {
      return false;
    }
    playedNotificationIds.add(options.notificationId);

    // Keep memory bounded to last 500 IDs
    if (playedNotificationIds.size > 500) {
      const firstEntry = playedNotificationIds.values().next().value;
      if (firstEntry) playedNotificationIds.delete(firstEntry);
    }
  }

  // Freshness guard: never chime for items older than 30 seconds (e.g. historical items on login/refresh)
  if (options?.createdAt) {
    const ageMs = Date.now() - new Date(options.createdAt).getTime();
    if (!isNaN(ageMs) && ageMs > 30000) {
      return false;
    }
  }

  if (options?.priority === 'urgent') {
    return playUrgentChime(options.volumeOverride);
  }

  return playStandardChime(options?.volumeOverride);
}

/**
 * Preview chime for testing volume changes in user settings
 */
export function playTestChime(volume?: number): void {
  playStandardChime(volume !== undefined ? volume : getSoundVolume());
}

/**
 * Backward compatibility alias for message notification sounds
 */
export function playMessageNotificationSound(
  messageId?: string,
  senderId?: string,
  currentUserId?: string,
  createdAt?: string
): boolean {
  if (senderId && currentUserId && senderId === currentUserId) {
    return false;
  }
  return playNotificationSound({
    notificationId: messageId ? `msg-${messageId}` : undefined,
    priority: 'normal',
    createdAt
  });
}

/**
 * Backward compatibility alias for basic playChime
 */
export function playChime(): boolean {
  return playStandardChime();
}

/**
 * Pre-marks a notification ID as heard (useful when seeding or hydrating historical items)
 */
export function markNotificationAsAlreadyHeard(notificationId: string): void {
  if (notificationId) {
    playedNotificationIds.add(notificationId);
  }
}
export const markMessageAsAlreadyHeard = markNotificationAsAlreadyHeard;
