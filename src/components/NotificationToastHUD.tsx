import React, { useEffect, useState, useRef } from 'react';
import { Bell, MessageSquare, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { safeStorage } from '../utils/safeStorage';

export interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: any;
}

export const NotificationToastHUD: React.FC = () => {
  const [activeToasts, setActiveToasts] = useState<ToastNotification[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play a gentle modern sound chime using Web Audio API (no external file needed)
  const playChime = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // High-pitched pleasant dual-tone chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // 880Hz (A5) -> 1320Hz (E6) harmonic ping
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {
      // Audio autoplay policy might block before user interaction, safely ignore
    }
  };

  useEffect(() => {
    const handleNotificationUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      console.log('[NOTIFICATION DEBUG] TOAST HUD EVENT RECEIVED:', detail.action, detail);

      if (detail.action === 'CREATED' && detail.notification) {
        const notif = detail.notification;
        // Check if current user is the recipient
        const currentUserId = safeStorage.getItem('hostel_ease_user_id') || 
          (() => {
            try {
              const u = JSON.parse(safeStorage.getItem('hostel_ease_user') || '{}');
              return u.id || '';
            } catch { return ''; }
          })();

        if (notif.userId && currentUserId && notif.userId !== currentUserId) {
          return; // Not for this user
        }

        const newToast: ToastNotification = {
          id: notif.id || `toast-${Date.now()}`,
          type: notif.type || 'info',
          title: notif.title || 'Notification',
          message: notif.message || notif.body || '',
          time: 'Just now',
          read: false,
          link: notif.link,
          priority: notif.priority || 'normal',
          data: notif.data
        };

        setActiveToasts(prev => {
          // Avoid duplicate IDs
          if (prev.some(t => t.id === newToast.id)) return prev;
          return [newToast, ...prev.slice(0, 2)]; // Keep up to 3 toasts on screen
        });

        playChime();
        console.log('[NOTIFICATION DEBUG] NOTIFICATION RENDERED TO SCREEN:', newToast.title);

        // Auto dismiss after 6 seconds
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 6000);
      }
    };

    window.addEventListener('hostel_ease_notification_updated', handleNotificationUpdated);
    return () => {
      window.removeEventListener('hostel_ease_notification_updated', handleNotificationUpdated);
    };
  }, []);

  const dismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleAction = (toast: ToastNotification) => {
    dismissToast(toast.id);

    // If there is a conversation or message link
    if (toast.type === 'message' || toast.data?.conversationId) {
      const convId = toast.data?.conversationId || (toast.link?.includes('conversation=') ? toast.link.split('conversation=')[1] : null);
      if (convId) {
        window.dispatchEvent(new CustomEvent('hostel_ease_open_conversation', { detail: { conversationId: convId } }));
        return;
      }
    }

    if (toast.link) {
      window.location.hash = toast.link;
    }
  };

  if (activeToasts.length === 0) return null;

  return (
    <div 
      className="fixed top-20 right-4 md:right-8 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Real-time notifications"
    >
      {activeToasts.map((toast) => {
        const isMsg = toast.type === 'message' || toast.type === 'chat';
        const isBooking = toast.type === 'booking' || toast.type === 'inspection';
        const isSecurity = toast.type === 'security' || toast.type === 'system';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 shadow-2xl rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden backdrop-blur-md"
            style={{
              boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.15)'
            }}
          >
            {/* Top accent indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 animate-pulse" />

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
                {isMsg ? (
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                ) : isBooking ? (
                  <Calendar className="w-5 h-5 text-amber-500" />
                ) : isSecurity ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Bell className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {toast.title}
                  </h4>
                  <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Just now
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-1"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAction(toast)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToastHUD;
