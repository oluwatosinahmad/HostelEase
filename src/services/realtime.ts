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
  private maxReconnectDelay = 10000;
  private isConnecting = false;
  private currentToken: string | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

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

    try {
      const streamUrl = `${API_BASE}/realtime/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.addEventListener('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      });

      es.addEventListener('connected', (_e) => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      });

      // 1. New Notification Arrived
      es.addEventListener('notification:new', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'CREATED',
            notification: data.notification,
            unreadCount: data.unreadCount
          });
        } catch {}
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

      // 4. New Message Arrived
      es.addEventListener('message:new', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.dispatchLocalEvent('hostel_ease_realtime_message', data);
          this.dispatchLocalEvent('hostel_ease_conversations_updated', data);
          this.dispatchLocalEvent('hostel_ease_notification_updated', {
            action: 'MESSAGE_RECEIVED',
            conversationId: data.conversationId
          });
        } catch {}
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
