// ============================================================================
// Hostel Ease - Message Notification Sound Utility (Web Audio API Synthesizer)
// Provides a clean, elegant, two-tone chime for incoming chat messages.
// Unlocks AudioContext on user interaction; zero external dependencies.
// ============================================================================

let audioCtx: AudioContext | null = null;
const playedMessageIds = new Set<string>();

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

// Auto-bind one-time interaction listeners to unlock audio on first click or touch
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
 * Plays an elegant two-tone chime (587.33 Hz [D5] -> 880 Hz [A5])
 * Returns true if audio played, false otherwise.
 */
export function playChime(): boolean {
  try {
    const ctx = initAudioContext();
    if (!ctx || ctx.state !== 'running') return false;

    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.23);

    // Tone 2: A5 (880 Hz) - pleasant major chord harmonizer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);

    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.1);
    osc2.stop(now + 0.43);

    return true;
  } catch (err) {
    console.warn('Failed to play notification chime:', err);
    return false;
  }
}

/**
 * Plays a notification sound specifically for a new incoming chat message.
 * Guarded against:
 *  1. Messages sent by the current user (never chime for own messages).
 *  2. Duplicate chimes for the same message ID.
 *  3. Messages older than 60 seconds (prevents chime storm on initial conversation load).
 */
export function playMessageNotificationSound(
  messageId?: string,
  senderId?: string,
  currentUserId?: string,
  createdAt?: string
): boolean {
  // Never play for own outgoing messages
  if (senderId && currentUserId && senderId === currentUserId) {
    return false;
  }

  // Prevent duplicate chime for the same message
  if (messageId) {
    if (playedMessageIds.has(messageId)) {
      return false;
    }
    playedMessageIds.add(messageId);

    // Keep set bounded to last 200 message IDs
    if (playedMessageIds.size > 200) {
      const firstEntry = playedMessageIds.values().next().value;
      if (firstEntry) playedMessageIds.delete(firstEntry);
    }
  }

  // Don't chime for messages older than 45 seconds (e.g. historical messages during initial fetch)
  if (createdAt) {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (!isNaN(ageMs) && ageMs > 45000) {
      return false;
    }
  }

  return playChime();
}

/**
 * Mark a message ID as already notified without playing audio (useful for initial data seeding)
 */
export function markMessageAsAlreadyHeard(messageId: string): void {
  if (messageId) {
    playedMessageIds.add(messageId);
  }
}
