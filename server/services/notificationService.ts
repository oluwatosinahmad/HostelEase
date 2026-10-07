import crypto from 'crypto';
import EventEmitter from 'events';
import db from '../db.js';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  linkUrl?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  senderId?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  metadata?: any;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  linkUrl: string | null;
  conversationId: string | null;
  messageId: string | null;
  senderId: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  metadata: any;
  createdAt: string;
}

export const notificationEvents = new EventEmitter();

export const notificationService = {
  /**
   * Create a production notification stored directly in SQLite database
   */
  createNotification(params: CreateNotificationParams): NotificationRecord {
    const id = `notif-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const type = params.type || 'INFO';
    const metadataStr = params.metadata
      ? (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata))
      : null;

    db.prepare(`
      INSERT INTO notifications (
        id, user_id, title, message, type, is_read, read_at, link_url,
        conversation_id, message_id, sender_id, related_entity_id, related_entity_type, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      params.userId,
      params.title,
      params.message,
      type,
      params.linkUrl || null,
      params.conversationId || null,
      params.messageId || null,
      params.senderId || null,
      params.relatedEntityId || null,
      params.relatedEntityType || null,
      metadataStr
    );

    const created = this.getNotificationById(id, params.userId);

    // Emit event for real-time subscribers
    try {
      notificationEvents.emit('notification_created', {
        userId: params.userId,
        notification: created,
        unreadCount: this.getUnreadCount(params.userId)
      });
    } catch {}

    return created!;
  },

  /**
   * Retrieve single notification by ID and User ID
   */
  getNotificationById(id: string, userId: string): NotificationRecord | null {
    try {
      const row = db.prepare(`
        SELECT * FROM notifications WHERE id = ? AND user_id = ?
      `).get(id, userId) as any;

      if (!row) return null;

      let parsedMeta = null;
      if (row.metadata) {
        try {
          parsedMeta = JSON.parse(row.metadata);
        } catch {
          parsedMeta = row.metadata;
        }
      }

      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        isRead: Boolean(row.is_read),
        readAt: row.read_at || null,
        linkUrl: row.link_url || null,
        conversationId: row.conversation_id || null,
        messageId: row.message_id || null,
        senderId: row.sender_id || null,
        relatedEntityId: row.related_entity_id || null,
        relatedEntityType: row.related_entity_type || null,
        metadata: parsedMeta,
        createdAt: row.created_at
      };
    } catch (err) {
      console.error('Error fetching notification by id:', err);
      return null;
    }
  },

  /**
   * Pure database-backed unread count (COUNT(*) WHERE user_id = ? AND is_read = 0)
   */
  getUnreadCount(userId: string): number {
    try {
      const row = db.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND is_read = 0
      `).get(userId) as { count: number };
      return Number(row?.count || 0);
    } catch (err) {
      console.error('Error fetching unread notification count:', err);
      return 0;
    }
  },

  /**
   * Get paginated notifications for user with unread count
   */
  getUserNotifications(userId: string, limit: number = 50, offset: number = 0): { notifications: NotificationRecord[]; unreadCount: number } {
    try {
      const rows = db.prepare(`
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT ? OFFSET ?
      `).all(userId, limit, offset) as any[];

      const notifications: NotificationRecord[] = rows.map(row => {
        let parsedMeta = null;
        if (row.metadata) {
          try {
            parsedMeta = JSON.parse(row.metadata);
          } catch {
            parsedMeta = row.metadata;
          }
        }
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          message: row.message,
          type: row.type,
          isRead: Boolean(row.is_read),
          readAt: row.read_at || null,
          linkUrl: row.link_url || null,
          conversationId: row.conversation_id || null,
          messageId: row.message_id || null,
          senderId: row.sender_id || null,
          relatedEntityId: row.related_entity_id || null,
          relatedEntityType: row.related_entity_type || null,
          metadata: parsedMeta,
          createdAt: row.created_at
        };
      });

      const unreadCount = this.getUnreadCount(userId);
      return { notifications, unreadCount };
    } catch (err) {
      console.error('Error fetching user notifications:', err);
      return { notifications: [], unreadCount: 0 };
    }
  },

  /**
   * Mark single notification as read: sets is_read = 1 and read_at = datetime('now')
   */
  markAsRead(userId: string, notificationId: string): { success: boolean; unreadCount: number } {
    try {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE id = ? AND user_id = ? AND is_read = 0
      `).run(notificationId, userId);

      const unreadCount = this.getUnreadCount(userId);

      try {
        notificationEvents.emit('notification_updated', {
          userId,
          notificationId,
          unreadCount
        });
      } catch {}

      return { success: true, unreadCount };
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return { success: false, unreadCount: this.getUnreadCount(userId) };
    }
  },

  /**
   * Mark all notifications for user as read: sets is_read = 1 and read_at = datetime('now')
   */
  markAllAsRead(userId: string): { success: boolean; unreadCount: number } {
    try {
      db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE user_id = ? AND is_read = 0
      `).run(userId);

      try {
        db.prepare(`
          UPDATE messages
          SET is_read = 1, read_at = datetime('now')
          WHERE sender_id != ? AND is_read = 0 AND conversation_id IN (
            SELECT id FROM conversations WHERE student_id = ? OR provider_id = ?
          )
        `).run(userId, userId, userId);
      } catch {}

      try {
        notificationEvents.emit('notifications_all_read', {
          userId,
          unreadCount: 0
        });
      } catch {}

      return { success: true, unreadCount: 0 };
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return { success: false, unreadCount: this.getUnreadCount(userId) };
    }
  },

  /**
   * Delete a notification permanently from database
   */
  deleteNotification(userId: string, notificationId: string): { success: boolean; unreadCount: number } {
    try {
      db.prepare(`
        DELETE FROM notifications
        WHERE id = ? AND user_id = ?
      `).run(notificationId, userId);

      const unreadCount = this.getUnreadCount(userId);
      return { success: true, unreadCount };
    } catch (err) {
      console.error('Error deleting notification:', err);
      return { success: false, unreadCount: this.getUnreadCount(userId) };
    }
  },

  /**
   * Create welcome notification on new user signup (persisted to database)
   */
  createWelcomeNotificationOnSignup(userId: string, role: string, fullName?: string): NotificationRecord | null {
    try {
      const normalizedRole = (role || 'STUDENT').toUpperCase();
      const firstName = fullName ? fullName.trim().split(' ')[0] : (normalizedRole === 'PROVIDER' ? 'Agent' : 'Student');

      let title = `Welcome to Hostel Ease, ${firstName}!`;
      let message = '';
      let linkUrl = '/home';

      if (normalizedRole === 'PROVIDER' || normalizedRole === 'LANDLORD' || normalizedRole === 'AGENT') {
        title = `Welcome to Hostel Ease Agent Portal, ${firstName}!`;
        message = 'Your Agent Dashboard is ready. Add your hostel accommodations to start receiving student inquiries, scheduling physical inspections, and booking tours.';
        linkUrl = '/provider';
      } else if (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER') {
        title = `Hostel Ease Administrative Access Granted`;
        message = 'Your administrator console is initialized. You can verify listings, review student disputes, and manage platform safety.';
        linkUrl = '/admin';
      } else {
        message = 'Your student account is active! Browse verified hostels around LAUTECH with transparent pricing, schedule physical inspections, and message agents directly.';
        linkUrl = '/home';
      }

      return this.createNotification({
        userId,
        title,
        message,
        type: 'WELCOME',
        linkUrl,
        relatedEntityType: 'USER',
        relatedEntityId: userId
      });
    } catch (err) {
      console.error('Failed to create welcome notification on signup:', err);
      return null;
    }
  },

  /**
   * Create instant welcome notification on existing user login.
   * Debounced against rapid multi-clicks / React 18 StrictMode double-mount within 5 seconds.
   * Delivers immediately to database and streams to client in real-time.
   */
  createWelcomeNotificationOnLogin(userId: string, role: string, fullName?: string): NotificationRecord | null {
    try {
      const recent = db.prepare(`
        SELECT id FROM notifications
        WHERE user_id = ? AND type = 'WELCOME'
          AND datetime(created_at) > datetime('now', '-5 seconds')
        LIMIT 1
      `).get(userId);

      if (recent) {
        // Debounce only against rapid double-mount within 5 seconds
        return null;
      }

      const normalizedRole = (role || 'STUDENT').toUpperCase();
      const firstName = fullName ? fullName.trim().split(' ')[0] : '';
      const greeting = firstName ? `Welcome to Hostel Ease, ${firstName}!` : 'Welcome to Hostel Ease!';

      let message = '';
      let linkUrl = '/home';

      if (normalizedRole === 'PROVIDER' || normalizedRole === 'LANDLORD' || normalizedRole === 'AGENT') {
        message = 'Welcome to Hostel Ease Agent Dashboard. Check your student inquiries, pending reservations, and upcoming inspection tours.';
        linkUrl = '/provider';
      } else if (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER') {
        message = 'Welcome to Hostel Ease Admin Console. Review pending listing approvals and active user safety reports.';
        linkUrl = '/admin';
      } else {
        message = 'Welcome to Hostel Ease. Check your chat inquiries, scheduled inspections, and newly listed hostels near LAUTECH.';
        linkUrl = '/home';
      }

      return this.createNotification({
        userId,
        title: greeting,
        message,
        type: 'WELCOME',
        linkUrl,
        relatedEntityType: 'USER',
        relatedEntityId: userId
      });
    } catch (err) {
      console.error('Failed to create welcome notification on login:', err);
      return null;
    }
  }
};

export default notificationService;
