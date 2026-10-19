import crypto from 'crypto';
import EventEmitter from 'events';
import db from '../db.js';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  eventKey?: string | null;
  propertyId?: string | null;
  actionLabel?: string | null;
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
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  eventKey: string | null;
  propertyId: string | null;
  actionLabel: string | null;
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
   * Create an authoritative production notification stored directly in SQLite database.
   * Enforces event-level idempotency via eventKey.
   */
  createNotification(params: CreateNotificationParams): NotificationRecord {
    // 1. Idempotency Check: if eventKey provided, avoid creating duplicate notification
    if (params.eventKey) {
      const existing = db.prepare(`
        SELECT * FROM notifications WHERE event_key = ?
      `).get(params.eventKey) as any;

      if (existing) {
        console.log(`[NOTIFICATION IDEMPOTENCY] Notification with eventKey "${params.eventKey}" already exists (${existing.id}). Returning existing.`);
        return this.getNotificationById(existing.id, existing.user_id)!;
      }
    }

    const id = `notif-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const type = params.type || 'INFO';
    const priority = params.priority || 'NORMAL';
    const metadataStr = params.metadata
      ? (typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata))
      : null;

    console.log(`[NOTIFICATION SERVICE] CREATING - id: ${id}, userId: ${params.userId}, type: ${type}, priority: ${priority}, title: "${params.title}"`);

    db.prepare(`
      INSERT INTO notifications (
        id, user_id, title, message, type, priority, event_key, property_id, action_label,
        is_read, read_at, link_url, conversation_id, message_id, sender_id,
        related_entity_id, related_entity_type, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      params.userId,
      params.title,
      params.message,
      type,
      priority,
      params.eventKey || null,
      params.propertyId || null,
      params.actionLabel || null,
      params.linkUrl || null,
      params.conversationId || null,
      params.messageId || null,
      params.senderId || null,
      params.relatedEntityId || null,
      params.relatedEntityType || null,
      metadataStr
    );

    const created = this.getNotificationById(id, params.userId);
    const unreadCount = this.getUnreadCount(params.userId);

    // Emit event for real-time SSE stream delivery
    try {
      console.log(`[NOTIFICATION SERVICE] REALTIME EMIT - notifId: ${id}, userId: ${params.userId}, unreadCount: ${unreadCount}`);
      notificationEvents.emit('notification_created', {
        userId: params.userId,
        notification: created,
        unreadCount
      });
    } catch (err) {
      console.error(`[NOTIFICATION SERVICE] REALTIME EMIT ERROR:`, err);
    }

    return created!;
  },

  /**
   * Retrieve single notification by ID and User ID (verifies ownership)
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
        priority: row.priority || 'NORMAL',
        eventKey: row.event_key || null,
        propertyId: row.property_id || null,
        actionLabel: row.action_label || null,
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
   * Get paginated notifications for user with optional category filter
   */
  getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filter: string = 'all'
  ): { notifications: NotificationRecord[]; unreadCount: number } {
    try {
      let query = `SELECT * FROM notifications WHERE user_id = ?`;
      const queryParams: any[] = [userId];

      switch (filter.toLowerCase()) {
        case 'unread':
          query += ` AND is_read = 0`;
          break;
        case 'properties':
          query += ` AND type IN ('PROPERTY_SUBMISSION', 'PROPERTY_APPROVED', 'PROPERTY_REJECTED', 'VERIFICATION', 'LISTING')`;
          break;
        case 'messages':
          query += ` AND type IN ('NEW_MESSAGE', 'MESSAGE')`;
          break;
        case 'inspections':
          query += ` AND type LIKE '%INSPECTION%'`;
          break;
        case 'bookings':
          query += ` AND type LIKE '%BOOKING%'`;
          break;
        case 'maintenance':
          query += ` AND type LIKE '%MAINTENANCE%'`;
          break;
        case 'reports':
          query += ` AND type IN ('REPORT', 'DISPUTE', 'DISPUTE_OPENED', 'INCIDENT')`;
          break;
        case 'payments':
          query += ` AND type IN ('PAYMENT', 'REFUND', 'PAYOUT')`;
          break;
        case 'system':
          query += ` AND type IN ('SYSTEM', 'WELCOME', 'SECURITY', 'ALERT')`;
          break;
        default:
          // 'all': no extra filter
          break;
      }

      query += ` ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const rows = db.prepare(query).all(...queryParams) as any[];

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
          priority: row.priority || 'NORMAL',
          eventKey: row.event_key || null,
          propertyId: row.property_id || null,
          actionLabel: row.action_label || null,
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
      const result = db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE id = ? AND user_id = ? AND is_read = 0
      `).run(notificationId, userId);

      const unreadCount = this.getUnreadCount(userId);

      if (result.changes === 0) {
        const existing = db.prepare(`SELECT user_id, is_read FROM notifications WHERE id = ?`).get(notificationId) as any;
        if (!existing || existing.user_id !== userId) {
          return { success: false, unreadCount };
        }
      }

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
   * Delete a notification permanently from database (with ownership check)
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
   * Create personalized welcome notification strictly once upon new account registration.
   * Addresses Student, Agent, or Admin with role-specific message, functional CTA, and stable idempotency key.
   */
  createWelcomeNotificationOnSignup(userId: string, role: string, _fullName?: string): NotificationRecord | null {
    try {
      const normalizedRole = (role || 'STUDENT').toUpperCase();
      const eventKey = `welcome-${userId}`;

      // Check if welcome notification already exists for this user
      const existing = db.prepare(`
        SELECT id FROM notifications WHERE user_id = ? AND type = 'WELCOME' LIMIT 1
      `).get(userId) as any;

      if (existing) {
        console.log(`[WELCOME NOTIFICATION] User ${userId} already received welcome notification (${existing.id}). Skipping.`);
        return this.getNotificationById(existing.id, userId);
      }

      let title = '';
      let message = '';
      let linkUrl = '';
      let actionLabel = '';

      if (normalizedRole === 'PROVIDER' || normalizedRole === 'LANDLORD' || normalizedRole === 'AGENT') {
        title = 'Welcome to Hostelease, Agent! 🎉';
        message = "Welcome to Hostelease! We're excited to have you on our platform. Set up your profile, add your hostel listings, upload your property photos and videos, manage inspection requests, respond to Student inquiries, and grow your property business with Hostelease.";
        linkUrl = '/provider';
        actionLabel = 'Set Up My Listings';
      } else if (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER') {
        title = 'Welcome to Hostelease Administration';
        message = 'Welcome to the Hostelease Administration Portal. Manage property reviews, Agent verification, platform reports, financial exceptions, and other important operational activities from your dashboard.';
        linkUrl = '/admin';
        actionLabel = 'Open Admin Dashboard';
      } else {
        // Default: Student
        title = 'Welcome to Hostelease! 🏡';
        message = "Welcome to Hostelease! We're happy to have you here. Discover hostels, explore available rooms, connect with Agents, manage your bookings, and enjoy a simpler hostel-hunting experience. Your next home could be just a few clicks away!";
        linkUrl = '/search';
        actionLabel = 'Explore Hostels';
      }

      return this.createNotification({
        userId,
        title,
        message,
        type: 'WELCOME',
        priority: 'NORMAL',
        eventKey,
        actionLabel,
        linkUrl,
        relatedEntityType: 'USER',
        relatedEntityId: userId
      });
    } catch (err) {
      console.error('Failed to create welcome notification on signup:', err);
      return null;
    }
  }
};

export default notificationService;
