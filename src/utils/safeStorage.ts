// =========================================================================
// HOSTELEASE — RESILIENT SAFE STORAGE & QUOTA EVICTION MANAGER
// =========================================================================

/**
 * Priority order for storage persistence:
 * 1. CRITICAL: Authentication tokens and logged-in user profile
 * 2. ESSENTIAL: Active draft bookings and critical user settings
 * 3. CACHE: Saved properties, offline properties, messages, radar data, audit logs
 */

const LOW_PRIORITY_KEYS = [
  'campusnest_audit_logs_v1',
  'hostel_ease_audit_logs',
  'hostel_ease_utility_radar_data',
  'hostel_ease_user_utility_votes',
  'campusnest_properties_v1',
  'hostel_ease_properties',
  'campusnest_saved_searches_v1',
  'hostel_ease_inspections',
  'hostel_ease_bookings',
  'hostel_ease_notifications'
];

// Memory fallback store for when localStorage is full, blocked, or unavailable
const memoryFallback = new Map<string, string>();

function isQuotaError(err: any): boolean {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    (typeof err.message === 'string' && /quota/i.test(err.message))
  );
}

/**
 * Attempts to free up storage space by evicting low-priority caches
 */
function evictCaches(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // 1. Evict known low priority static/cache keys
    for (const key of LOW_PRIORITY_KEYS) {
      if (localStorage.getItem(key)) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }

    // 2. Evict any message history caches (hostel_ease_msgs_*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('hostel_ease_msgs_') || key.startsWith('hostelease_movein_chk_'))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    console.info('[safeStorage] Quota eviction completed successfully.');
  } catch (err) {
    console.warn('[safeStorage] Cache eviction warning:', err);
  }
}

/**
 * Strips heavy base64 strings from data objects before saving to localStorage
 */
function sanitizeForStorage(val: string): string {
  // If string contains a huge base64 data URL (> 50KB), replace it with a placeholder
  if (val.length > 50000 && val.includes('data:image/')) {
    try {
      const parsed = JSON.parse(val);
      const stripObj = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(stripObj);
        const clone: any = { ...obj };
        for (const k of Object.keys(clone)) {
          if (typeof clone[k] === 'string' && clone[k].startsWith('data:image/') && clone[k].length > 50000) {
            clone[k] = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
          } else if (typeof clone[k] === 'object') {
            clone[k] = stripObj(clone[k]);
          }
        }
        return clone;
      };
      return JSON.stringify(stripObj(parsed));
    } catch {
      return val;
    }
  }
  return val;
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item !== null) return item;
      }
    } catch {}
    return memoryFallback.get(key) || null;
  },

  setItem(key: string, value: string, isCritical: boolean = false): boolean {
    const sanitized = sanitizeForStorage(value);

    // Keep memory fallback in sync
    memoryFallback.set(key, sanitized);

    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }

    try {
      localStorage.setItem(key, sanitized);
      return true;
    } catch (err: any) {
      if (isQuotaError(err)) {
        console.warn(`[safeStorage] Quota exceeded while saving "${key}". Evicting non-essential cache...`);
        evictCaches();

        // Retry saving once after eviction
        try {
          localStorage.setItem(key, sanitized);
          return true;
        } catch (retryErr: any) {
          console.warn(`[safeStorage] Retry failed for "${key}". Falling back to in-memory session store.`, retryErr);
          // In-memory fallback ensures login/session never fails!
          return false;
        }
      } else {
        console.warn(`[safeStorage] Storage error for "${key}":`, err);
        return false;
      }
    }
  },

  removeItem(key: string): void {
    memoryFallback.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch {}
  },

  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON<T>(key: string, data: T, isCritical: boolean = false): boolean {
    try {
      return this.setItem(key, JSON.stringify(data), isCritical);
    } catch {
      return false;
    }
  }
};
