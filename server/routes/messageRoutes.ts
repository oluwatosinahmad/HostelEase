import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'hostel-ease-jwt-secure-secret-key-2026';
const router = Router();

import { updateUserPresence, getUserPresence } from './presenceRoutes.js';
export { updateUserPresence, getUserPresence };

// In-memory typing indicator registry: conversationId -> { userId, userName, expiresAt }
export const conversationTypingMap = new Map<string, { userId: string; userName: string; expiresAt: number }>();

export function getTypingUser(conversationId: string): { userId: string; userName: string } | null {
  const entry = conversationTypingMap.get(conversationId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    conversationTypingMap.delete(conversationId);
    return null;
  }
  return { userId: entry.userId, userName: entry.userName };
}

// In-memory rate limiting map for message spam prevention (per user: max 30 msgs per minute)
const messageRateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = messageRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    messageRateMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count++;
  return true;
}

// ----------------------------------------------------
// 1. GET OR START CONVERSATION FOR A HOSTEL
// ----------------------------------------------------
router.post('/conversations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { propertyId, initialMessage } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  try {
    updateUserPresence(req.user.id);

    const property = db.prepare(`
      SELECT p.id, p.title, p.provider_id,
             COALESCE(u.full_name, 'Verified Agent') as provider_name,
             u.avatar_url as provider_avatar,
             COALESCE(
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
               (SELECT url FROM property_media WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1),
               (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1)
             ) as cover_image,
             COALESCE(a.name, 'Under G') as area_name
      FROM properties p
      LEFT JOIN users u ON u.id = p.provider_id
      LEFT JOIN areas a ON a.id = p.area_id
      WHERE p.id = ?
    `).get(propertyId) as any;

    if (!property) {
      return res.status(404).json({ error: 'Hostel accommodation not found' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const isProviderUser = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';

    let studentId = req.user.id;
    let providerId = property.provider_id;

    if (isProviderUser) {
      // If provider is opening, require studentId in body or find existing
      if (!req.body.studentId) {
        return res.status(400).json({ error: 'studentId is required when provider initiates conversation' });
      }
      studentId = req.body.studentId;
      providerId = req.user.id;
    }

    if (studentId === providerId) {
      return res.status(400).json({ error: 'You cannot initiate a conversation with your own hostel listing' });
    }

    // Check if conversation already exists
    let conv = db.prepare(`
      SELECT * FROM conversations 
      WHERE property_id = ? AND student_id = ? AND provider_id = ?
    `).get(propertyId, studentId, providerId) as any;

    if (!conv) {
      const convId = `conv-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(convId, propertyId, studentId, providerId, initialMessage || 'Conversation started');

      conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);

      // If initial message provided, save it
      if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
        const cleanMsg = initialMessage.trim();
        const msgId = `msg-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, ?, 'TEXT', ?, 0)
        `).run(msgId, convId, req.user.id, req.user.role, cleanMsg);

        // Notify recipient (provider if student sent, or student if provider sent)
        const recipientId = req.user.id === studentId ? providerId : studentId;
        const senderName = req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent');
        sendNotification(
          recipientId,
          `New Message about ${property.title}`,
          `${senderName}: "${cleanMsg.substring(0, 60)}${cleanMsg.length > 60 ? '...' : ''}"`,
          'NEW_MESSAGE',
          `/messages?conversationId=${convId}&propertyId=${propertyId}`,
          convId,
          msgId,
          req.user.id
        );
      }
    } else if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
      // If conversation already existed, persist new message and notify recipient
      const cleanMsg = initialMessage.trim();
      const msgId = `msg-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
        VALUES (?, ?, ?, ?, 'TEXT', ?, 0)
      `).run(msgId, conv.id, req.user.id, req.user.role, cleanMsg);

      db.prepare(`
        UPDATE conversations
        SET last_message_text = ?, last_message_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanMsg, conv.id);

      const recipientId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;
      const senderName = req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent');
      sendNotification(
        recipientId,
        `New Message about ${property.title}`,
        `${senderName}: "${cleanMsg.substring(0, 60)}${cleanMsg.length > 60 ? '...' : ''}"`,
        'NEW_MESSAGE',
        `/messages?conversationId=${conv.id}&propertyId=${propertyId}`,
        conv.id,
        msgId,
        req.user.id
      );
    }

    const providerPresence = getUserPresence(providerId);
    const studentPresence = getUserPresence(studentId);
    const coverImage = property.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';

    return res.json({
      conversationId: conv.id,
      conversation: {
        id: conv.id,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCoverImage: coverImage,
        areaName: property.area_name,
        providerId: property.provider_id,
        providerName: property.provider_name,
        providerAvatarUrl: property.provider_avatar || coverImage,
        providerIsOnline: providerPresence.isOnline,
        providerLastSeenAt: providerPresence.lastSeenAt,
        studentId: conv.student_id,
        studentIsOnline: studentPresence.isOnline,
        studentLastSeenAt: studentPresence.lastSeenAt,
        createdAt: conv.created_at
      }
    });
  } catch (err: any) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to start conversation' });
  }
});

// ----------------------------------------------------
// 2. LIST USER'S CONVERSATIONS
// ----------------------------------------------------
router.get('/conversations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    updateUserPresence(req.user.id);
    let sql = '';
    const params: any[] = [];

    const userRole = (req.user.role || '').toUpperCase();
    const isStudent = userRole === 'STUDENT';
    const isProvider = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';

    if (isStudent || (!isProvider && !isAdmin)) {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               COALESCE(a.name, 'Under G') as area_name,
               COALESCE(u.full_name, 'Verified Agent') as provider_name,
               COALESCE(u_s.full_name, 'Student') as student_name,
               u.avatar_url as other_avatar_url,
               COALESCE(
                 (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1)
               ) as property_cover,
               up.last_seen_at as other_last_seen_at,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
        FROM conversations c
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN areas a ON p.area_id = a.id
        LEFT JOIN users u ON c.provider_id = u.id
        LEFT JOIN users u_s ON c.student_id = u_s.id
        LEFT JOIN user_presence up ON up.user_id = c.provider_id
        WHERE c.student_id = ? OR c.student_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))
        ORDER BY c.last_message_at DESC
      `;
      params.push(req.user.id, req.user.id, req.user.email || '');
    } else if (isProvider) {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               COALESCE(a.name, 'Under G') as area_name,
               COALESCE(u.full_name, 'Student') as student_name,
               COALESCE(u_p.full_name, 'Verified Agent') as provider_name,
               u.avatar_url as other_avatar_url,
               COALESCE(
                 (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1)
               ) as property_cover,
               up.last_seen_at as other_last_seen_at,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
        FROM conversations c
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN areas a ON p.area_id = a.id
        LEFT JOIN users u ON c.student_id = u.id
        LEFT JOIN users u_p ON c.provider_id = u_p.id
        LEFT JOIN user_presence up ON up.user_id = c.student_id
        WHERE c.provider_id = ?
           OR c.provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))
           OR c.property_id IN (SELECT id FROM properties WHERE provider_id = ? OR provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
        ORDER BY c.last_message_at DESC
      `;
      params.push(req.user.id, req.user.id, req.user.email || '', req.user.id, req.user.email || '');
    } else if (isAdmin) {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               COALESCE(a.name, 'Under G') as area_name,
               COALESCE(u_s.full_name, 'Student') as student_name,
               u_s.avatar_url as student_avatar_url,
               COALESCE(u_p.full_name, 'Verified Agent') as provider_name,
               u_p.avatar_url as provider_avatar_url,
               COALESCE(
                 (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1),
                 (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1)
               ) as property_cover,
               up_s.last_seen_at as student_last_seen_at,
               up_p.last_seen_at as provider_last_seen_at,
               0 as unread_count
        FROM conversations c
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN areas a ON p.area_id = a.id
        LEFT JOIN users u_s ON c.student_id = u_s.id
        LEFT JOIN users u_p ON c.provider_id = u_p.id
        LEFT JOIN user_presence up_s ON up_s.user_id = c.student_id
        LEFT JOIN user_presence up_p ON up_p.user_id = c.provider_id
        ORDER BY c.last_message_at DESC
      `;
    }

    const conversations = db.prepare(sql).all(...params) as any[];
    const now = Date.now();

    return res.json({
      conversations: conversations.map(c => {
        const lastSeenRaw = c.other_last_seen_at || (req.user!.role === 'ADMIN' ? c.provider_last_seen_at : null);
        const lastSeenMs = lastSeenRaw ? new Date(lastSeenRaw.endsWith('Z') ? lastSeenRaw : lastSeenRaw.replace(' ', 'T') + 'Z').getTime() : 0;
        const isOnline = !isNaN(lastSeenMs) && lastSeenMs > 0 && (now - lastSeenMs) < 65000;

        const coverImg = c.property_cover || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
        const bestAvatar = c.other_avatar_url || coverImg;

        return {
          id: c.id,
          propertyId: c.property_id,
          propertyTitle: c.property_title,
          propertyAddress: c.property_address,
          propertyCoverImage: coverImg,
          areaName: c.area_name,
          studentId: c.student_id,
          studentName: c.student_name || 'Student',
          providerId: c.provider_id,
          providerName: c.provider_name || 'Hostel Provider',
          avatarUrl: bestAvatar,
          isOnline,
          lastSeenAt: lastSeenRaw || null,
          lastMessageText: c.last_message_text,
          lastMessageAt: c.last_message_at,
          unreadCount: c.unread_count || 0,
          status: c.status,
          createdAt: c.created_at
        };
      })
    });
  } catch (err: any) {
    console.error('List conversations error:', err);
    return res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// ----------------------------------------------------
// 3. GET SINGLE CONVERSATION & MESSAGE HISTORY
// ----------------------------------------------------
router.get('/conversations/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    updateUserPresence(req.user.id);

    const conv = db.prepare(`
      SELECT c.*, COALESCE(p.title, 'Hostel Accommodation') as property_title,
             COALESCE(p.address, 'LAUTECH Area, Ogbomoso') as property_address,
             COALESCE(p.property_type, 'SELF_CONTAIN') as property_type,
             COALESCE(p.distance_from_campus_km, 0.5) as distance_from_campus_km,
             p.provider_id as property_provider_id,
             pr.rent_amount, pr.total_mandatory_cost,
             COALESCE(a.name, 'Under G') as area_name,
             COALESCE(u_s.full_name, 'Student') as student_name,
             u_s.avatar_url as student_avatar,
             u_s.email as student_email,
             u_p.email as provider_email,
             COALESCE(u_p.full_name, 'Verified Agent') as provider_name,
             u_p.avatar_url as provider_avatar,
             COALESCE(
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
               (SELECT url FROM property_media WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1),
               (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1)
             ) as property_cover,
             up_s.last_seen_at as student_last_seen_at,
             up_p.last_seen_at as provider_last_seen_at
      FROM conversations c
      LEFT JOIN properties p ON c.property_id = p.id
      LEFT JOIN areas a ON p.area_id = a.id
      LEFT JOIN prices pr ON pr.property_id = p.id
      LEFT JOIN users u_s ON c.student_id = u_s.id
      LEFT JOIN users u_p ON c.provider_id = u_p.id
      LEFT JOIN user_presence up_s ON up_s.user_id = c.student_id
      LEFT JOIN user_presence up_p ON up_p.user_id = c.provider_id
      WHERE c.id = ?
    `).get(id) as any;

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Role Normalization & Authorization Check: participant student, provider, property owner, or admin
    const userRole = (req.user.role || '').toUpperCase();
    const isStudentRole = userRole === 'STUDENT';
    const isProviderRole = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';

    const isStudent = (isStudentRole || !isProviderRole) && (
      conv.student_id === req.user.id || 
      (req.user.email && conv.student_email && conv.student_email.toLowerCase() === req.user.email.toLowerCase())
    );
    const isProvider = isProviderRole && (
      conv.provider_id === req.user.id || 
      conv.property_provider_id === req.user.id ||
      (req.user.email && conv.provider_email && conv.provider_email.toLowerCase() === req.user.email.toLowerCase())
    );
    const isParticipant = conv.student_id === req.user.id || conv.provider_id === req.user.id;
    const isAdmin = isAdminRole;

    if (!isStudent && !isProvider && !isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this conversation' });
    }

    // Fetch message history
    let messages = db.prepare(`
      SELECT id, conversation_id, sender_id, sender_role, message_type, content,
             metadata_json, is_read, read_at, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(id) as any[];

    // Mark unread messages sent by opposite party as read
    db.prepare(`
      UPDATE messages
      SET is_read = 1, read_at = datetime('now')
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `).run(id, req.user.id);

    const now = Date.now();
    const studentLastSeenRaw = conv.student_last_seen_at;
    const studentLastSeenMs = studentLastSeenRaw ? new Date(studentLastSeenRaw.endsWith('Z') ? studentLastSeenRaw : studentLastSeenRaw.replace(' ', 'T') + 'Z').getTime() : 0;
    const studentIsOnline = !isNaN(studentLastSeenMs) && studentLastSeenMs > 0 && (now - studentLastSeenMs) < 65000;

    const providerLastSeenRaw = conv.provider_last_seen_at;
    const providerLastSeenMs = providerLastSeenRaw ? new Date(providerLastSeenRaw.endsWith('Z') ? providerLastSeenRaw : providerLastSeenRaw.replace(' ', 'T') + 'Z').getTime() : 0;
    const providerIsOnline = !isNaN(providerLastSeenMs) && providerLastSeenMs > 0 && (now - providerLastSeenMs) < 65000;

    const coverImage = conv.property_cover || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';

    const typing = getTypingUser(id);
    const typingInfo = (typing && typing.userId !== req.user.id) ? typing : null;

    return res.json({
      conversation: {
        id: conv.id,
        property: {
          id: conv.property_id,
          title: conv.property_title,
          address: conv.property_address,
          areaName: conv.area_name,
          propertyType: conv.property_type,
          distanceFromCampusKm: conv.distance_from_campus_km,
          rentAmount: conv.rent_amount || 0,
          totalMandatoryCost: conv.total_mandatory_cost || conv.rent_amount || 0,
          coverImage
        },
        student: {
          id: conv.student_id,
          name: conv.student_name,
          avatarUrl: conv.student_avatar || null,
          isOnline: studentIsOnline,
          lastSeenAt: studentLastSeenRaw || null
        },
        provider: {
          id: conv.provider_id,
          name: conv.provider_name,
          avatarUrl: conv.provider_avatar || coverImage,
          isOnline: providerIsOnline,
          lastSeenAt: providerLastSeenRaw || null
        },
        status: conv.status,
        createdAt: conv.created_at
      },
      typingUser: typingInfo,
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderRole: m.sender_role,
        messageType: m.message_type,
        content: m.content,
        metadata: m.metadata_json ? JSON.parse(m.metadata_json) : null,
        isRead: Boolean(m.is_read),
        readAt: m.read_at,
        createdAt: m.created_at
      }))
    });
  } catch (err: any) {
    console.error('Fetch conversation error:', err);
    return res.status(500).json({ error: 'Failed to retrieve conversation messages' });
  }
});

// ----------------------------------------------------
// 4. SEND MESSAGE IN CONVERSATION
// ----------------------------------------------------
router.post('/conversations/:id/messages', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { content, messageType, metadata } = req.body;

  updateUserPresence(req.user.id);

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  // Rate Limiting check
  if (!checkRateLimit(req.user.id)) {
    return res.status(429).json({ error: 'Too many messages sent. Please slow down.' });
  }

  try {
    const conv = db.prepare(`
      SELECT c.*, p.title as property_title, p.provider_id as property_provider_id,
             u_s.email as student_email, u_p.email as provider_email
      FROM conversations c
      LEFT JOIN properties p ON c.property_id = p.id
      LEFT JOIN users u_s ON c.student_id = u_s.id
      LEFT JOIN users u_p ON c.provider_id = u_p.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Role Normalization & Authorization check
    const userRole = (req.user.role || '').toUpperCase();
    const isStudentRole = userRole === 'STUDENT';
    const isProviderRole = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';
    const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';

    const isStudent = (isStudentRole || !isProviderRole) && (
      conv.student_id === req.user.id ||
      (req.user.email && conv.student_email && conv.student_email.toLowerCase() === req.user.email.toLowerCase())
    );
    const isProvider = isProviderRole && (
      conv.provider_id === req.user.id || 
      conv.property_provider_id === req.user.id ||
      (req.user.email && conv.provider_email && conv.provider_email.toLowerCase() === req.user.email.toLowerCase())
    );
    const isParticipant = conv.student_id === req.user.id || conv.provider_id === req.user.id;
    const isAdmin = isAdminRole;

    if (!isStudent && !isProvider && !isAdmin && !isParticipant) {
      return res.status(403).json({ error: 'Access denied: You cannot send messages in this conversation' });
    }

    const messageId = `msg-${crypto.randomUUID()}`;
    const cleanContent = content.trim();

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, metadata_json, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      messageId,
      id,
      req.user.id,
      req.user.role,
      messageType || 'TEXT',
      cleanContent,
      metadata ? JSON.stringify(metadata) : null
    );

    // Update conversation last message snippet and timestamp
    db.prepare(`
      UPDATE conversations
      SET last_message_text = ?, last_message_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(cleanContent, id);

    // Determine recipient
    const recipientId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;

    // Send in-app notification
    const senderName = req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent');
    sendNotification(
      recipientId,
      `New message from ${senderName}`,
      `"${cleanContent.substring(0, 60)}${cleanContent.length > 60 ? '...' : ''}"`,
      'NEW_MESSAGE',
      `/messages?conversationId=${id}&propertyId=${conv.property_id || ''}`,
      id,
      messageId,
      req.user.id
    );

    // Automated Acknowledgement Reply for Students:
    // If sent by a student, check if this conversation has not had any agent response or auto-reply within the past 12 hours
    let autoReplyMessage: any = null;
    if (isStudent && !metadata?.isAutoReply) {
      try {
        const recentProviderMsg = db.prepare(`
          SELECT id FROM messages 
          WHERE conversation_id = ? AND sender_id != ? AND created_at > datetime('now', '-12 hours')
          LIMIT 1
        `).get(id, req.user.id) as any;

        if (!recentProviderMsg) {
          const autoReplyId = `msg-auto-${crypto.randomUUID()}`;
          const autoReplyContent = `Hi! Thanks for reaching out. Your message has been received. The verified agent has been notified and will respond as soon as possible.`;
          const autoMeta = {
            isAutoReply: true,
            automated: true,
            senderTag: 'Hostel Ease Automated Assistant'
          };

          db.prepare(`
            INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, metadata_json, is_read, created_at)
            VALUES (?, ?, ?, 'PROVIDER', 'TEXT', ?, ?, 0, datetime('now', '+1 second'))
          `).run(
            autoReplyId,
            id,
            conv.provider_id,
            autoReplyContent,
            JSON.stringify(autoMeta)
          );

          // Update conversation last message to reflect the auto reply
          db.prepare(`
            UPDATE conversations
            SET last_message_text = ?, last_message_at = datetime('now', '+1 second'), updated_at = datetime('now', '+1 second')
            WHERE id = ?
          `).run(autoReplyContent, id);

          autoReplyMessage = {
            id: autoReplyId,
            conversationId: id,
            senderId: conv.provider_id,
            senderRole: 'PROVIDER',
            messageType: 'TEXT',
            content: autoReplyContent,
            metadata: autoMeta,
            isRead: false,
            createdAt: new Date(Date.now() + 1000).toISOString()
          };

          // Send notification to student about receipt
          sendNotification(
            req.user.id,
            'Hostel Ease Automated Assistant',
            autoReplyContent,
            'NEW_MESSAGE',
            `/messages?conversationId=${id}&propertyId=${conv.property_id || ''}`,
            id,
            autoReplyId,
            conv.provider_id
          );
        }
      } catch (autoErr) {
        console.warn('Auto-reply trigger warning:', autoErr);
      }
    }

    // Clear typing indicator for sender upon message dispatch
    const existingTyping = conversationTypingMap.get(id);
    if (existingTyping && existingTyping.userId === req.user.id) {
      conversationTypingMap.delete(id);
    }

    return res.status(201).json({
      message: {
        id: messageId,
        conversationId: id,
        senderId: req.user.id,
        senderRole: req.user.role,
        messageType: messageType || 'TEXT',
        content: cleanContent,
        metadata: metadata || null,
        isRead: false,
        createdAt: new Date().toISOString()
      },
      autoReply: autoReplyMessage
    });
  } catch (err: any) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// ----------------------------------------------------
// 4b. REAL-TIME TYPING INDICATOR ENDPOINTS
// ----------------------------------------------------
router.post('/conversations/:id/typing', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { isTyping } = req.body;

  if (isTyping) {
    conversationTypingMap.set(id, {
      userId: req.user.id,
      userName: req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent'),
      expiresAt: Date.now() + 4500 // 4.5s TTL
    });
  } else {
    const existing = conversationTypingMap.get(id);
    if (existing && existing.userId === req.user.id) {
      conversationTypingMap.delete(id);
    }
  }

  return res.json({ success: true, conversationId: id, isTyping: Boolean(isTyping) });
});

router.get('/conversations/:id/typing', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const typing = getTypingUser(id);
  if (typing && typing.userId !== req.user.id) {
    return res.json({ typing: true, isTyping: true, user: typing, typingUser: typing });
  }
  return res.json({ typing: false, isTyping: false, user: null, typingUser: null });
});

// ----------------------------------------------------
// 5. MARK CONVERSATION AS READ
// ----------------------------------------------------
const handleMarkConversationRead = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    db.prepare(`
      UPDATE messages
      SET is_read = 1, read_at = datetime('now')
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `).run(id, req.user.id);

    return res.json({ message: 'Conversation marked as read' });
  } catch (err: any) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

router.patch('/conversations/:id/read', authenticate, handleMarkConversationRead);
router.put('/conversations/:id/read', authenticate, handleMarkConversationRead);
router.post('/conversations/:id/read', authenticate, handleMarkConversationRead);

// ----------------------------------------------------
// 6. GLOBAL UNREAD MESSAGES COUNT
// ----------------------------------------------------
router.get('/unread-count', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRole = (req.user.role || '').toUpperCase();
    const isStudent = userRole === 'STUDENT';
    const isProvider = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';

    let sql = '';
    const params: any[] = [];
    if (isStudent) {
      sql = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.student_id = ? OR c.student_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
          AND m.sender_id != ? AND m.is_read = 0
      `;
      params.push(req.user.id, req.user.email || '', req.user.id);
    } else if (isProvider) {
      sql = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.provider_id = ? OR c.provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
          AND m.sender_id != ? AND m.is_read = 0
      `;
      params.push(req.user.id, req.user.email || '', req.user.id);
    } else {
      return res.json({ unreadCount: 0 });
    }

    const row = db.prepare(sql).get(...params) as any;
    return res.json({ unreadCount: row?.unread_count || 0 });
  } catch (err: any) {
    console.error('Unread count error:', err);
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ----------------------------------------------------
// 7. REPORT USER / CONVERSATION
// ----------------------------------------------------
router.post('/report', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { reportedUserId, conversationId, reason, description } = req.body;

  if (!reportedUserId || !reason || !description) {
    return res.status(400).json({ error: 'reportedUserId, reason, and description are required' });
  }

  const validReasons = ['SCAM', 'HARASSMENT', 'SUSPICIOUS_BEHAVIOR', 'INAPPROPRIATE_CONTENT', 'OTHER'];
  if (!validReasons.includes(reason)) {
    return res.status(400).json({ error: 'Invalid report reason' });
  }

  try {
    const reportId = `report-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO communication_reports (id, reporter_id, reported_user_id, conversation_id, reason, description, status)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
    `).run(reportId, req.user.id, reportedUserId, conversationId || null, reason, description);

    return res.status(201).json({
      message: 'Report submitted successfully. Our safety moderation team will investigate.'
    });
  } catch (err: any) {
    console.error('Report user error:', err);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

// ----------------------------------------------------
// 8. DELETE SINGLE MESSAGE (WhatsApp-style delete)
// ----------------------------------------------------
router.delete('/conversations/:conversationId/messages/:messageId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { conversationId, messageId } = req.params;

  try {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is student or provider in this conversation
    if (conv.student_id !== req.user.id && conv.provider_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM messages WHERE id = ? AND conversation_id = ?').run(messageId, conversationId);

    // Update last message in conversation if necessary
    const latest = db.prepare('SELECT content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(conversationId) as any;
    if (latest) {
      db.prepare('UPDATE conversations SET last_message_text = ?, last_message_at = ? WHERE id = ?')
        .run(latest.content, latest.created_at, conversationId);
    } else {
      db.prepare('UPDATE conversations SET last_message_text = ? WHERE id = ?')
        .run('No messages', conversationId);
    }

    return res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err: any) {
    console.error('Delete message error:', err);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ----------------------------------------------------
// 9. CLEAR CHAT (Delete all messages in conversation)
// ----------------------------------------------------
router.delete('/conversations/:conversationId/messages', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { conversationId } = req.params;

  try {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conv.student_id !== req.user.id && conv.provider_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
    db.prepare('UPDATE conversations SET last_message_text = ?, unread_count = 0 WHERE id = ?')
      .run('Chat cleared', conversationId);

    return res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (err: any) {
    console.error('Clear chat error:', err);
    return res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// ----------------------------------------------------
// 10. DELETE CONVERSATION (WhatsApp-style delete chat thread)
// ----------------------------------------------------
router.delete('/conversations/:conversationId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { conversationId } = req.params;

  try {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conv.student_id !== req.user.id && conv.provider_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);

    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err: any) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  linkUrl?: string,
  conversationId?: string,
  messageId?: string,
  senderId?: string
) {
  try {
    notificationService.createNotification({
      userId,
      title,
      message,
      type,
      linkUrl: linkUrl || null,
      conversationId: conversationId || null,
      messageId: messageId || null,
      senderId: senderId || null,
      relatedEntityId: messageId || null,
      relatedEntityType: 'MESSAGE'
    });
  } catch (err) {
    console.error('Failed to send notification via notificationService:', err);
  }
}

export default router;
