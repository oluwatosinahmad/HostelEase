import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import { realtimeService } from '../services/realtimeService.js';

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

export function isAuthorizedParticipant(conv: any, reqUser: any): boolean {
  if (!conv || !reqUser) return false;
  const userRole = (reqUser.role || '').toUpperCase();
  const isAdminRole = userRole === 'ADMIN' || userRole === 'OWNER';
  if (isAdminRole) return true;

  const userEmail = (reqUser.email || '').toLowerCase().trim();
  const userId = (reqUser.id || '').toLowerCase().trim();
  const studentId = (conv.student_id || '').toLowerCase().trim();
  const studentEmail = (conv.student_email || '').toLowerCase().trim();
  const providerId = (conv.provider_id || '').toLowerCase().trim();
  const propertyProviderId = (conv.property_provider_id || '').toLowerCase().trim();
  const providerEmail = (conv.provider_email || '').toLowerCase().trim();

  const isStudent = (
    userId === studentId ||
    (userEmail && userEmail === studentEmail) ||
    (userEmail && userEmail === studentId) ||
    (userId && userId === studentEmail)
  );

  const isProvider = (
    userId === providerId ||
    userId === propertyProviderId ||
    (userEmail && userEmail === providerEmail) ||
    (userEmail && userEmail === providerId) ||
    (userId && userId === providerEmail)
  );

  return isStudent || isProvider;
}

export function findOrResolveConversation(id: string, reqUser: any, bodyPropertyId?: string): any {
  if (!id && !bodyPropertyId) return null;

  // 1. Direct match by conversation ID
  let conv = db.prepare(`
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

  if (conv) return conv;

  // 2. Derive property ID if id is formatted as conv_${studentId}_${propertyId} or if bodyPropertyId passed, or if id matches property
  let propId = bodyPropertyId;
  let explicitStudentId: string | null = null;
  if (!propId && id && id.startsWith('conv_')) {
    const prefix = `conv_${reqUser.id}_`;
    if (id.startsWith(prefix)) {
      propId = id.substring(prefix.length);
    } else {
      const parts = id.split('_');
      if (parts.length >= 3) {
        explicitStudentId = parts[1];
        propId = parts.slice(2).join('_');
      }
    }
  }

  // Also check if id directly matches a property ID or slug
  if (!propId && id) {
    const propCheck = db.prepare('SELECT id FROM properties WHERE id = ? OR slug = ?').get(id, id) as any;
    if (propCheck) {
      propId = propCheck.id;
    }
  }

  if (propId) {
    const userRole = (reqUser.role || '').toUpperCase();
    const isProvider = userRole === 'PROVIDER' || userRole === 'LANDLORD' || userRole === 'AGENT';

    if (isProvider) {
      // For provider: find conversation for this property managed by this provider
      conv = db.prepare(`
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
        WHERE (c.property_id = ? OR p.slug = ?)
          AND (c.provider_id = ? OR p.provider_id = ? OR c.provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
          AND (? IS NULL OR c.student_id = ?)
        ORDER BY c.last_message_at DESC
        LIMIT 1
      `).get(propId, propId, reqUser.id, reqUser.id, reqUser.email || '', explicitStudentId, explicitStudentId) as any;
    } else {
      // For student or admin: find conversation for this property where user is the student
      conv = db.prepare(`
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
        WHERE (c.property_id = ? OR p.slug = ?)
          AND (c.student_id = ? OR c.student_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
        ORDER BY c.last_message_at DESC
        LIMIT 1
      `).get(propId, propId, reqUser.id, reqUser.email || '') as any;
    }

    if (conv) return conv;

    // 3. Auto-create conversation if missing
    let property = db.prepare('SELECT id, provider_id FROM properties WHERE id = ? OR slug = ?').get(propId, propId) as any;
    let providerId = property?.provider_id || 'user-provider-1';
    let studentId = reqUser.id;
    if (isProvider) {
      providerId = reqUser.id;
      studentId = explicitStudentId || 'user-student-1';
    }

    try {
      if (!property) {
        db.prepare(`
          INSERT OR IGNORE INTO properties (id, title, address, provider_id, rent_amount, property_type, area_id)
          VALUES (?, 'Hostel Accommodation', 'LAUTECH Area, Ogbomoso', ?, 150000, 'SELF_CONTAIN', 'area-under-g')
        `).run(propId, providerId);
      }

      const targetId = (id && id.startsWith('conv_')) ? id : `conv_${studentId}_${propId}`;
      db.prepare(`
        INSERT OR IGNORE INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at)
        VALUES (?, ?, ?, ?, 'Conversation started', datetime('now'))
      `).run(targetId, propId, studentId, providerId);

      return db.prepare(`
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
      `).get(targetId) as any;
    } catch (createErr) {
      console.warn('[MESSAGE_ROUTES] Auto-create conversation warning:', createErr);
    }
  }

  return null;
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

    let property = db.prepare(`
      SELECT p.id, p.title, p.address, p.provider_id,
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
      WHERE p.id = ? OR p.slug = ?
    `).get(propertyId, propertyId) as any;

    if (!property && (req.body.propertyTitle || propertyId)) {
      const bodyTitle = req.body.propertyTitle || 'Hostel Accommodation';
      const bodyAddress = req.body.propertyAddress || 'LAUTECH Area, Ogbomoso';
      const bodyCover = req.body.propertyCoverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
      const bodyProviderId = req.body.providerId || 'user-provider-1';
      const bodyProviderName = req.body.providerName || 'Verified Agent';
      const bodyAreaName = req.body.areaName || 'Under G';

      try {
        db.prepare(`
          INSERT OR IGNORE INTO properties (id, title, address, provider_id, rent_amount, property_type, area_id)
          VALUES (?, ?, ?, ?, 150000, 'SELF_CONTAIN', 'area-under-g')
        `).run(propertyId, bodyTitle, bodyAddress, bodyProviderId);

        property = {
          id: propertyId,
          title: bodyTitle,
          address: bodyAddress,
          provider_id: bodyProviderId,
          provider_name: bodyProviderName,
          provider_avatar: bodyCover,
          cover_image: bodyCover,
          area_name: bodyAreaName
        };
      } catch (insertErr) {
        console.warn('[HOSTEL_RESOLUTION] Could not auto-insert property into DB:', insertErr);
      }
    }

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

    // Check if conversation already exists for this student and property (enforce single active thread)
    let conv = db.prepare(`
      SELECT * FROM conversations 
      WHERE property_id = ? AND (student_id = ? OR student_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
      ORDER BY last_message_at DESC
      LIMIT 1
    `).get(property.id, studentId, req.user.email || '') as any;

    if (!conv) {
      const convId = `conv_${studentId}_${property.id}`;
      conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId) as any;
      if (!conv) {
        db.prepare(`
          INSERT OR IGNORE INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(convId, property.id, studentId, providerId, initialMessage || 'No messages yet');

        conv = db.prepare(`
          SELECT * FROM conversations 
          WHERE id = ? OR (property_id = ? AND student_id = ? AND provider_id = ?)
        `).get(convId, property.id, studentId, providerId);
      }

      // If initial message provided, save it
      if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim()) {
        const cleanMsg = initialMessage.trim();
        const msgId = `msg-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, ?, 'TEXT', ?, 0)
        `).run(msgId, conv.id, req.user.id, req.user.role, cleanMsg);

        // Notify recipient (provider if student sent, or student if provider sent)
        const recipientId = req.user.id === studentId ? providerId : studentId;
        const senderName = req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent');
        sendNotification(
          recipientId,
          `New Message about ${property.title}`,
          `${senderName}: "${cleanMsg.substring(0, 60)}${cleanMsg.length > 60 ? '...' : ''}"`,
          'NEW_MESSAGE',
          `/messages?conversationId=${conv.id}&propertyId=${property.id}`,
          conv.id,
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
        `/messages?conversationId=${conv.id}&propertyId=${property.id}`,
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
        propertyAddress: property.address || 'LAUTECH Area, Ogbomoso',
        propertyCoverImage: coverImage,
        areaName: property.area_name,
        providerId: property.provider_id,
        providerName: property.provider_name,
        avatarUrl: property.provider_avatar || coverImage,
        providerAvatarUrl: property.provider_avatar || coverImage,
        providerIsOnline: providerPresence.isOnline,
        providerLastSeenAt: providerPresence.lastSeenAt,
        studentId: conv.student_id,
        studentName: req.user.role === 'STUDENT' ? (req.user.fullName || 'Student') : 'Student',
        studentIsOnline: studentPresence.isOnline,
        studentLastSeenAt: studentPresence.lastSeenAt,
        lastMessageText: conv.last_message_text || 'No messages yet',
        lastMessageAt: conv.last_message_at || conv.created_at,
        unreadCount: 0,
        status: conv.status || 'ACTIVE',
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
        SELECT c.id, c.property_id, c.student_id, c.provider_id, c.status, c.created_at, c.updated_at,
               COALESCE(
                 (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 CASE 
                   WHEN c.last_message_text LIKE 'Inquiry for %' OR c.last_message_text = 'Conversation started' THEN 'No messages yet'
                   ELSE COALESCE(c.last_message_text, 'No messages yet')
                 END
               ) as last_message_text,
               COALESCE(
                 (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 c.last_message_at,
                 c.created_at
               ) as last_message_at,
               p.title as property_title, p.address as property_address,
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
               (SELECT COUNT(*) FROM messages m 
                 WHERE m.conversation_id = c.id 
                   AND m.sender_id != ? 
                   AND m.is_read = 0 
                   AND m.message_type != 'AUTOMATED_ACKNOWLEDGEMENT' 
                   AND (m.metadata_json IS NULL OR m.metadata_json NOT LIKE '%"isAutoReply":true%')
                ) as unread_count
        FROM conversations c
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN areas a ON p.area_id = a.id
        LEFT JOIN users u ON c.provider_id = u.id
        LEFT JOIN users u_s ON c.student_id = u_s.id
        LEFT JOIN user_presence up ON up.user_id = c.provider_id
        WHERE c.student_id = ? OR c.student_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))
        ORDER BY last_message_at DESC
      `;
      params.push(req.user.id, req.user.id, req.user.email || '');
    } else if (isProvider) {
      sql = `
        SELECT c.id, c.property_id, c.student_id, c.provider_id, c.status, c.created_at, c.updated_at,
               COALESCE(
                 (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 CASE 
                   WHEN c.last_message_text LIKE 'Inquiry for %' OR c.last_message_text = 'Conversation started' THEN 'No messages yet'
                   ELSE COALESCE(c.last_message_text, 'No messages yet')
                 END
               ) as last_message_text,
               COALESCE(
                 (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 c.last_message_at,
                 c.created_at
               ) as last_message_at,
               p.title as property_title, p.address as property_address,
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
               (SELECT COUNT(*) FROM messages m 
                 WHERE m.conversation_id = c.id 
                   AND m.sender_id != ? 
                   AND m.is_read = 0 
                   AND m.message_type != 'AUTOMATED_ACKNOWLEDGEMENT' 
                   AND (m.metadata_json IS NULL OR m.metadata_json NOT LIKE '%"isAutoReply":true%')
                ) as unread_count
        FROM conversations c
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN areas a ON p.area_id = a.id
        LEFT JOIN users u ON c.student_id = u.id
        LEFT JOIN users u_p ON c.provider_id = u_p.id
        LEFT JOIN user_presence up ON up.user_id = c.student_id
        WHERE c.provider_id = ?
           OR c.provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?))
           OR c.property_id IN (SELECT id FROM properties WHERE provider_id = ? OR provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
        ORDER BY last_message_at DESC
      `;
      params.push(req.user.id, req.user.id, req.user.email || '', req.user.id, req.user.email || '');
    } else if (isAdmin) {
      sql = `
        SELECT c.id, c.property_id, c.student_id, c.provider_id, c.status, c.created_at, c.updated_at,
               COALESCE(
                 (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 CASE 
                   WHEN c.last_message_text LIKE 'Inquiry for %' OR c.last_message_text = 'Conversation started' THEN 'No messages yet'
                   ELSE COALESCE(c.last_message_text, 'No messages yet')
                 END
               ) as last_message_text,
               COALESCE(
                 (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
                 c.last_message_at,
                 c.created_at
               ) as last_message_at,
               p.title as property_title, p.address as property_address,
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
        ORDER BY last_message_at DESC
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

    const conv = findOrResolveConversation(id, req.user);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isAuthorizedParticipant(conv, req.user)) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this conversation' });
    }

    // Mark unread messages sent by opposite party as read FIRST before SELECT
    db.prepare(`
      UPDATE messages
      SET is_read = 1, read_at = datetime('now')
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `).run(conv.id, req.user.id);

    // Also mark notifications for this conversation as read
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE user_id = ? AND conversation_id = ? AND is_read = 0
    `).run(req.user.id, conv.id);

    // Instant real-time read receipt delivery to sender
    const oppositePartyId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;
    try {
      realtimeService.sendToUser(oppositePartyId, 'message:read', {
        conversationId: conv.id,
        readBy: req.user.id,
        readAt: new Date().toISOString()
      });
      if (conv.provider_email && conv.provider_email !== oppositePartyId) {
        realtimeService.sendToUser(conv.provider_email, 'message:read', {
          conversationId: conv.id,
          readBy: req.user.id,
          readAt: new Date().toISOString()
        });
      }
      if (conv.student_email && conv.student_email !== oppositePartyId) {
        realtimeService.sendToUser(conv.student_email, 'message:read', {
          conversationId: conv.id,
          readBy: req.user.id,
          readAt: new Date().toISOString()
        });
      }
    } catch {}

    // Fetch message history - now all messages returned have is_read = 1
    let messages = db.prepare(`
      SELECT id, conversation_id, sender_id, sender_role, message_type, content,
             metadata_json, is_read, read_at, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, rowid ASC
    `).all(conv.id) as any[];

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
    const conv = findOrResolveConversation(id, req.user, req.body.propertyId);

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isAuthorizedParticipant(conv, req.user)) {
      return res.status(403).json({ error: 'Access denied: You cannot send messages in this conversation' });
    }

    const messageId = `msg-${crypto.randomUUID()}`;
    const cleanContent = content.trim();

    // Automated Acknowledgement Reply for Students:
    let autoReplyMessage: any = null;
    let shouldGenerateAutoReply = false;
    let autoReplyId = '';
    const autoReplyContent = `Hi! Thanks for reaching out. Your message has been received. The verified agent has been notified and will respond as soon as possible.`;
    const autoMeta = {
      isAutoReply: true,
      automated: true,
      senderTag: 'Hostel Ease Automated Assistant'
    };

    const userRole = (req.user.role || '').toUpperCase();
    const isStudent = userRole === 'STUDENT';

    if (isStudent && !metadata?.isAutoReply && (messageType || 'TEXT') !== 'AUTOMATED_ACKNOWLEDGEMENT') {
      try {
        // 1. Did provider send a manual message in the last 15 minutes?
        const recentProviderMsg = db.prepare(`
          SELECT id FROM messages 
          WHERE conversation_id = ? AND sender_id != ? 
            AND (metadata_json IS NULL OR metadata_json NOT LIKE '%"automated":true%')
            AND created_at > datetime('now', '-15 minutes')
          LIMIT 1
        `).get(conv.id, req.user.id) as any;

        // 2. Was an automated assistant acknowledgement sent in this conversation within the last 10 minutes?
        const recentAutoReply = db.prepare(`
          SELECT id FROM messages 
          WHERE conversation_id = ? 
            AND (message_type = 'AUTOMATED_ACKNOWLEDGEMENT' OR metadata_json LIKE '%"isAutoReply":true%')
            AND created_at > datetime('now', '-10 minutes')
          LIMIT 1
        `).get(conv.id) as any;

        if (!recentProviderMsg && !recentAutoReply) {
          shouldGenerateAutoReply = true;
          autoReplyId = `msg-auto-${crypto.randomUUID()}`;
          autoReplyMessage = {
            id: autoReplyId,
            conversationId: conv.id,
            senderId: conv.provider_id,
            senderRole: 'PROVIDER',
            messageType: 'AUTOMATED_ACKNOWLEDGEMENT',
            content: autoReplyContent,
            metadata: autoMeta,
            isRead: true, // Marked as read for the active chatting student
            createdAt: new Date().toISOString()
          };
        }
      } catch (autoErr) {
        console.warn('Auto-reply check warning:', autoErr);
      }
    }

    // Atomic SQLite transaction for instant execution (<15ms)
    const sendTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, metadata_json, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        messageId,
        conv.id,
        req.user.id,
        req.user.role,
        messageType || 'TEXT',
        cleanContent,
        metadata ? JSON.stringify(metadata) : null
      );

      if (shouldGenerateAutoReply && autoReplyMessage) {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, metadata_json, is_read, read_at, created_at)
          VALUES (?, ?, ?, 'PROVIDER', 'AUTOMATED_ACKNOWLEDGEMENT', ?, ?, 1, datetime('now'), datetime('now'))
        `).run(
          autoReplyId,
          conv.id,
          conv.provider_id,
          autoReplyContent,
          JSON.stringify(autoMeta)
        );

        db.prepare(`
          UPDATE conversations
          SET last_message_text = ?, last_message_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).run(autoReplyContent, conv.id);
      } else {
        db.prepare(`
          UPDATE conversations
          SET last_message_text = ?, last_message_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).run(cleanContent, conv.id);
      }
    });
    sendTx();

    // Clear typing indicator for sender upon message dispatch
    const existingTyping = conversationTypingMap.get(conv.id) || conversationTypingMap.get(id);
    if (existingTyping && existingTyping.userId === req.user.id) {
      conversationTypingMap.delete(conv.id);
      conversationTypingMap.delete(id);
    }

    // Determine recipient & dispatch in-app notifications and real-time event immediately
    const recipientId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;
    const senderName = req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent');

    const newMsgObj = {
      id: messageId,
      conversationId: conv.id,
      senderId: req.user.id,
      senderRole: req.user.role,
      messageType: messageType || 'TEXT',
      content: cleanContent,
      metadata: metadata || null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString()
    };

    // Instant real-time push to recipient's connected device(s)
    try {
      realtimeService.sendToUser(recipientId, 'message:new', {
        conversationId: conv.id,
        message: newMsgObj
      });
      if (conv.provider_email && conv.provider_email !== recipientId) {
        realtimeService.sendToUser(conv.provider_email, 'message:new', {
          conversationId: conv.id,
          message: newMsgObj
        });
      }
      if (conv.student_email && conv.student_email !== recipientId) {
        realtimeService.sendToUser(conv.student_email, 'message:new', {
          conversationId: conv.id,
          message: newMsgObj
        });
      }

      if (shouldGenerateAutoReply && autoReplyMessage) {
        realtimeService.sendToUser(req.user.id, 'message:new', {
          conversationId: conv.id,
          message: autoReplyMessage
        });
      }
    } catch (realtimeErr) {
      console.warn('Realtime message dispatch error:', realtimeErr);
    }

    // Synchronously create notification in database and emit real-time event immediately
    try {
      console.log(`[NOTIFICATION DEBUG] SENDING MESSAGE NOTIFICATION - sender: "${senderName}", recipientId: "${recipientId}", messageId: "${messageId}"`);
      sendNotification(
        recipientId,
        `New message from ${senderName}`,
        `"${cleanContent.substring(0, 60)}${cleanContent.length > 60 ? '...' : ''}"`,
        'NEW_MESSAGE',
        `/messages?conversationId=${conv.id}&propertyId=${conv.property_id || ''}`,
        conv.id,
        messageId,
        req.user.id
      );

      if (shouldGenerateAutoReply && autoReplyMessage) {
        sendNotification(
          req.user.id,
          'Hostel Ease Automated Assistant',
          autoReplyContent,
          'NEW_MESSAGE',
          `/messages?conversationId=${conv.id}&propertyId=${conv.property_id || ''}`,
          conv.id,
          autoReplyId,
          conv.provider_id
        );
      }
    } catch (notifErr) {
      console.warn('Sync notification dispatch warning:', notifErr);
    }

    return res.status(201).json({
      message: {
        id: messageId,
        conversationId: conv.id,
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

  const conv = findOrResolveConversation(id, req.user);
  if (conv) {
    const recipientId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;
    const typingPayload = {
      conversationId: conv.id,
      userId: req.user.id,
      userName: req.user.fullName || (req.user.role === 'STUDENT' ? 'Student' : 'Agent'),
      userRole: req.user.role,
      isTyping: Boolean(isTyping)
    };
    try {
      realtimeService.sendToUser(recipientId, 'typing', typingPayload);
      if (conv.provider_email && conv.provider_email !== recipientId) {
        realtimeService.sendToUser(conv.provider_email, 'typing', typingPayload);
      }
      if (conv.student_email && conv.student_email !== recipientId) {
        realtimeService.sendToUser(conv.student_email, 'typing', typingPayload);
      }
    } catch {}
  }

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
    const conv = findOrResolveConversation(id, req.user);
    const markReadTx = db.transaction(() => {
      db.prepare(`
        UPDATE messages
        SET is_read = 1, read_at = datetime('now')
        WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
      `).run(id, req.user.id);

      db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE user_id = ? AND conversation_id = ? AND is_read = 0
      `).run(req.user.id, id);
    });
    markReadTx();

    if (conv) {
      const recipientId = req.user.id === conv.student_id ? conv.provider_id : conv.student_id;
      try {
        realtimeService.sendToUser(recipientId, 'message:read', {
          conversationId: conv.id,
          readBy: req.user.id,
          readAt: new Date().toISOString()
        });
      } catch {}
    }

    return res.json({ success: true, message: 'Conversation marked as read' });
  } catch (err: any) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

router.patch('/conversations/:id/read', authenticate, handleMarkConversationRead);
router.put('/conversations/:id/read', authenticate, handleMarkConversationRead);
router.post('/conversations/:id/read', authenticate, handleMarkConversationRead);

// ----------------------------------------------------
// 5c. TOGGLE MESSAGE REACTION (WhatsApp-Style reactions: ❤️ 👍 😂 😮 😢 🙏)
// ----------------------------------------------------
router.post('/conversations/:id/messages/:messageId/reactions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id, messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji || typeof emoji !== 'string') {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  try {
    const conv = findOrResolveConversation(id, req.user);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isAuthorizedParticipant(conv, req.user)) {
      return res.status(403).json({ error: 'Access denied: You cannot react to messages in this conversation' });
    }

    const msg = db.prepare('SELECT id, metadata_json FROM messages WHERE id = ? AND conversation_id = ?').get(messageId, conv.id) as any;
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    let meta: any = {};
    if (msg.metadata_json) {
      try {
        meta = JSON.parse(msg.metadata_json);
      } catch {}
    }

    if (!meta.reactions || typeof meta.reactions !== 'object') {
      meta.reactions = {};
    }

    const userId = req.user.id;
    const currentReactions: Record<string, string[]> = meta.reactions;

    // Check if user already reacted with THIS emoji
    const existingList = currentReactions[emoji] || [];
    const hasThisEmoji = existingList.includes(userId);

    // Remove user from all emojis first (WhatsApp-style single active reaction)
    for (const em of Object.keys(currentReactions)) {
      currentReactions[em] = (currentReactions[em] || []).filter(u => u !== userId);
      if (currentReactions[em].length === 0) {
        delete currentReactions[em];
      }
    }

    // If user didn't already have this emoji, add it
    if (!hasThisEmoji) {
      if (!currentReactions[emoji]) {
        currentReactions[emoji] = [];
      }
      currentReactions[emoji].push(userId);
    }

    meta.reactions = currentReactions;

    db.prepare('UPDATE messages SET metadata_json = ? WHERE id = ?')
      .run(JSON.stringify(meta), messageId);

    // Broadcast reaction update to participants in real time
    const reactionPayload = {
      conversationId: conv.id,
      messageId,
      reactions: meta.reactions,
      userId,
      emoji: hasThisEmoji ? null : emoji
    };

    realtimeService.sendToConversation(conv.student_id, conv.provider_id, 'message:reaction', reactionPayload);
    if (conv.provider_email) realtimeService.sendToUser(conv.provider_email, 'message:reaction', reactionPayload);
    if (conv.student_email) realtimeService.sendToUser(conv.student_email, 'message:reaction', reactionPayload);

    return res.json({
      success: true,
      messageId,
      reactions: meta.reactions
    });
  } catch (err: any) {
    console.error('Toggle reaction error:', err);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// 5b. MARK ALL CONVERSATIONS AS READ
const handleMarkAllConversationsRead = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const markAllTx = db.transaction(() => {
      db.prepare(`
        UPDATE messages
        SET is_read = 1, read_at = datetime('now')
        WHERE sender_id != ? AND is_read = 0 AND conversation_id IN (
          SELECT id FROM conversations WHERE student_id = ? OR provider_id = ?
        )
      `).run(req.user.id, req.user.id, req.user.id);

      db.prepare(`
        UPDATE notifications
        SET is_read = 1, read_at = datetime('now')
        WHERE user_id = ? AND is_read = 0
      `).run(req.user.id);
    });
    markAllTx();

    return res.json({ success: true, unreadCount: 0, message: 'All conversations marked as read' });
  } catch (err: any) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

router.post('/conversations/read-all', authenticate, handleMarkAllConversationsRead);
router.patch('/conversations/read-all', authenticate, handleMarkAllConversationsRead);
router.put('/conversations/read-all', authenticate, handleMarkAllConversationsRead);

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
          AND m.message_type != 'AUTOMATED_ACKNOWLEDGEMENT'
          AND (m.metadata_json IS NULL OR m.metadata_json NOT LIKE '%"isAutoReply":true%')
      `;
      params.push(req.user.id, req.user.email || '', req.user.id);
    } else if (isProvider) {
      sql = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.provider_id = ? OR c.provider_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))
          AND m.sender_id != ? AND m.is_read = 0
          AND m.message_type != 'AUTOMATED_ACKNOWLEDGEMENT'
          AND (m.metadata_json IS NULL OR m.metadata_json NOT LIKE '%"isAutoReply":true%')
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
    const latest = db.prepare('SELECT content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(conversationId) as any;
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
