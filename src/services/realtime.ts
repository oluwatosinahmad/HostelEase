import { API_BASE } from './api';
import { safeStorage } from '../utils/safeStorage';

export interface RealtimeMessageEvent {
  conversationId: string;
  message: any;
}

export interface RealtimeReactionEvent {
  conversationId: string;
  messageId: string;
  reactions: Record<string, string[]>;
  userId: string;
  emoji: string | null;
}

export interface RealtimeTypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  userRole?: string;
  isTyping: boolean;
}

export interface RealtimeReadEvent {
  conversationId: string;
  readBy: string;
  readAt: string;
}

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 8000;
  private isConnecting = false;
  private currentToken: string | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  // Adaptive background sync & failover polling
  private pollInterval: any = null;
  private lastKnownNotifCount: number | null = null;
  private lastKnownMsgCount: number | null = null;
  private seenNotifIds = new Set<string>();
  private isPolling = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('hostel_ease_realtime_events');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type && event.data?.payload) {
            this.dispatchLocalEvent(event.data.type, event.data.payload, false);
          }
        };
      } catch {}
    }
  }

  public connect(tokenOverride?: string) {
    if (typeof window === 'undefined') return;

    const token = tokenOverride || safeStorage.getItem('hostel_ease_token');
    if (!token) {
      this.disconnect();
      return;
    }

    if (this.eventSource && this.currentToken === token && this.eventSource.readyState !== EventSource.CLOSED) {
      return; // Already actively connected
    }

    this.disconnect();
    this.currentToken = token;
    this.isConnecting = true;

    // Start adaptive polling failover immediately
    this.startAdaptivePolling();

    try {
      const streamUrl = `${API_BASE}/realtime/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.addEventListener('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[NOTIFICATION DEBUG] REALTIME CONNECTION ACTIVE: SSE connected');
      });

      es.addEventListener('connected', (_e) => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[NOTIFICATION DEBUG] REALTIME CONNECTION ACTIVE: handshake verified');
      });

      // 1. New Notification Arrived via SSE
      es.addEventListener('notification:new', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[NOTIFICATION DEBUG] CLIENT EVENT RECEIVED: notification:new', data);
          if (data.notification?.id) {
            this.seenNotifIds.add(data.notification.id);
          }
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'CREATED',
            notification: data.notification,
            unreadCount: data.unreadCount
          });
          console.log('[NOTIFICATION DEBUG] FRONTEND STATE UPDATED: hostel_ease_notification_updated emitted');
        } catch (err) {
          console.warn('[NOTIFICATION DEBUG] Failed to parse notification:new event', err);
        }
      });

      // 2. Notification marked as read
      es.addEventListener('notification:read', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'MARK_READ',
            notificationId: data.notificationId,
            unreadCount: data.unreadCount
          });
        } catch {}
      });

      // 3. All notifications marked as read
      es.addEventListener('notification:all_read', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'MARK_ALL_READ',
            unreadCount: data.unreadCount || 0
          });
        } catch {}
      });

      // 4. New Message Arrived via SSE
      es.addEventListener('message:new', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[NOTIFICATION DEBUG] CLIENT EVENT RECEIVED: message:new', data);
          this.dispatchLocalEvent('hostel_ease_realtime_message', data);
          this.dispatchLocalEvent('hostel_ease_conversations_updated', data);
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'MESSAGE_RECEIVED',
            conversationId: data.conversationId
          });

          // Check if current user is the recipient of the message to trigger on-screen toast HUD
          const currentUserId = safeStorage.getItem('hostel_ease_user_id') || (() => {
            try {
              const u = JSON.parse(safeStorage.getItem('hostel_ease_user') || '{}');
              return u.id || '';
            } catch { return ''; }
          })();

          if (data.message && data.message.senderId && data.message.senderId !== currentUserId) {
            const senderName = data.message.senderName || (data.message.senderRole === 'STUDENT' ? 'Student' : 'Agent');
            this.dispatchLocalEvent('hostel_ease_notification_updated', {
              action: 'CREATED',
              notification: {
                id: `toast-msg-${data.message.id || Date.now()}`,
                type: 'message',
                title: `New Message from ${senderName}`,
                message: data.message.content || 'Sent you a message',
                priority: 'high',
                data: { conversationId: data.conversationId }
              }
            });
          }
          console.log('[NOTIFICATION DEBUG] FRONTEND STATE UPDATED: realtime message and notification dispatched');
        } catch (err) {
          console.warn('[NOTIFICATION DEBUG] Failed to parse message:new event', err);
        }
      });

      // 5. Message Read Receipt
      es.addEventListener('message:read', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_message_read', data);
          this.dispatchLocalEvent('hostel_ease_conversations_updated', data);
        } catch {}
      });

      // 6. Message Reaction
      es.addEventListener('message:reaction', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_message_reaction', data);
        } catch {}
      });

      // 7. Ephemeral Typing Indicator
      es.addEventListener('typing', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_typing', data);
        } catch {}
      });

      es.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private startAdaptivePolling() {
    if (this.pollInterval) return;

    const pollTick = async () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') return;
      if (!this.currentToken) return;
      if (this.isPolling) return;

      this.isPolling = true;
      try {
        const token = this.currentToken;
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch unread counts concurrently
        const [notifRes, msgRes] = await Promise.all([
          fetch(`${API_BASE}/notifications/unread-count`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/messages/unread-count`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (notifRes && typeof notifRes.unreadCount === 'number') {
          const newCount = notifRes.unreadCount;
          const oldCount = this.lastKnownNotifCount;
          this.lastKnownNotifCount = newCount;

          if (oldCount !== null && newCount > oldCount) {
            // New notification detected! Fetch latest to pop on screen
            const fullNotifRes = await fetch(`${API_BASE}/notifications`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);
            if (fullNotifRes?.notifications && Array.isArray(fullNotifRes.notifications)) {
              const latestUnread = fullNotifRes.notifications.find((n: any) => !n.isRead && !this.seenNotifIds.has(n.id));
              if (latestUnread) {
                this.seenNotifIds.add(latestUnread.id);
                console.log('[NOTIFICATION DEBUG] CLIENT EVENT RECEIVED (POLL):', latestUnread);
                this.dispatchLocalEvent('hostel_ease_notification_updated', {
                  action: 'CREATED',
                  notification: latestUnread,
                  unreadCount: newCount
                });
                console.log('[NOTIFICATION DEBUG] FRONTEND STATE UPDATED (POLL)');
              } else {
                this.dispatchLocalEvent('hostel_ease_notification_updated', {
                  action: 'COUNT_UPDATED',
                  unreadCount: newCount
                });
              }
            }
          }
        }

        if (msgRes && typeof msgRes.unreadCount === 'number') {
          const newMsgCount = msgRes.unreadCount;
          const oldMsgCount = this.lastKnownMsgCount;
          this.lastKnownMsgCount = newMsgCount;

          if (oldMsgCount !== null && newMsgCount > oldMsgCount) {
            console.log('[NOTIFICATION DEBUG] CLIENT EVENT RECEIVED (POLL: MESSAGE COUNT INCREASED):', newMsgCount);
            this.dispatchLocalEvent('hostel_ease_conversations_updated', { action: 'NEW_MESSAGE' });
            this.dispatchLocalEvent('hostel_ease_notification_updated', { action: 'MESSAGE_RECEIVED' });
          }
        }
      } catch (pollErr) {
        // Silent fail on network blips
      } finally {
        this.isPolling = false;
      }
    };

    // Fast polling tick: 2000ms when SSE is closed/reconnecting, 10000ms when SSE is active
    const getIntervalDelay = () => {
      return (this.eventSource && this.eventSource.readyState === EventSource.OPEN) ? 10000 : 2000;
    };

    const runPollLoop = () => {
      if (!this.currentToken) return;
      pollTick().finally(() => {
        if (this.currentToken) {
          this.pollInterval = setTimeout(runPollLoop, getIntervalDelay());
        }
      });
    };

    this.pollInterval = setTimeout(runPollLoop, 1500);
  }

  private stopAdaptivePolling() {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    this.lastKnownNotifCount = null;
    this.lastKnownMsgCount = null;
    this.isPolling = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      const token = safeStorage.getItem('hostel_ease_token');
      if (token) {
        this.connect(token);
        // Refresh state after reconnect
        window.dispatchEvent(new CustomEvent('hostel_ease_notification_updated', { detail: { action: 'RECONNECT' } }));
        window.dispatchEvent(new CustomEvent('hostel_ease_conversations_updated', { detail: { action: 'RECONNECT' } }));
      }
    }, delay);
  }

  private dispatchLocalEvent(eventType: string, payload: any, broadcast = true) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: eventType, payload });
      } catch {}
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stopAdaptivePolling();
    this.currentToken = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  public async sendTyping(conversationId: string, isTyping: boolean) {
    try {
      await fetch(`${API_BASE}/realtime/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeStorage.getItem('hostel_ease_token') || ''}`
        },
        body: JSON.stringify({ conversationId, isTyping })
      });
    } catch {}
  }
}

export const realtimeClient = new RealtimeClient();
export default realtimeClient;
