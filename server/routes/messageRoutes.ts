import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

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
    const property = db.prepare(`
      SELECT p.id, p.title, p.provider_id, u.full_name as provider_name,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             a.name as area_name
      FROM properties p
      JOIN users u ON u.id = p.provider_id
      JOIN areas a ON a.id = p.area_id
      WHERE p.id = ?
    `).get(propertyId) as any;

    if (!property) {
      return res.status(404).json({ error: 'Hostel accommodation not found' });
    }

    let studentId = req.user.id;
    let providerId = property.provider_id;

    if (req.user.role === 'PROVIDER') {
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
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, ?, 'TEXT', ?, 0)
        `).run(crypto.randomUUID(), convId, req.user.id, req.user.role, initialMessage.trim());

        // Notify provider
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
          VALUES (?, ?, ?, ?, 'NEW_MESSAGE', 0, ?)
        `).run(
          crypto.randomUUID(),
          providerId,
          `New Message about ${property.title}`,
          `${req.user.fullName || 'A student'}: "${initialMessage.trim().substring(0, 60)}"`,
          `/messages`
        );
      }
    }

    return res.json({
      conversationId: conv.id,
      conversation: {
        id: conv.id,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyCoverImage: property.cover_image,
        areaName: property.area_name,
        providerId: property.provider_id,
        providerName: property.provider_name,
        studentId: conv.student_id,
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
    let sql = '';
    const params: any[] = [];

    if (req.user.role === 'STUDENT') {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               a.name as area_name, u.full_name as provider_name,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
        FROM conversations c
        JOIN properties p ON c.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u ON c.provider_id = u.id
        WHERE c.student_id = ?
        ORDER BY c.last_message_at DESC
      `;
      params.push(req.user.id, req.user.id);
    } else if (req.user.role === 'PROVIDER') {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               a.name as area_name, u.full_name as student_name,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover,
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
        FROM conversations c
        JOIN properties p ON c.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u ON c.student_id = u.id
        WHERE c.provider_id = ?
        ORDER BY c.last_message_at DESC
      `;
      params.push(req.user.id, req.user.id);
    } else if (req.user.role === 'ADMIN') {
      sql = `
        SELECT c.*, p.title as property_title, p.address as property_address,
               a.name as area_name, u_s.full_name as student_name, u_p.full_name as provider_name,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover,
               0 as unread_count
        FROM conversations c
        JOIN properties p ON c.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u_s ON c.student_id = u_s.id
        JOIN users u_p ON c.provider_id = u_p.id
        ORDER BY c.last_message_at DESC
      `;
    }

    const conversations = db.prepare(sql).all(...params) as any[];

    return res.json({
      conversations: conversations.map(c => ({
        id: c.id,
        propertyId: c.property_id,
        propertyTitle: c.property_title,
        propertyAddress: c.property_address,
        propertyCoverImage: c.property_cover || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        areaName: c.area_name,
        studentId: c.student_id,
        studentName: c.student_name || 'Student',
        providerId: c.provider_id,
        providerName: c.provider_name || 'Hostel Provider',
        lastMessageText: c.last_message_text,
        lastMessageAt: c.last_message_at,
        unreadCount: c.unread_count || 0,
        status: c.status,
        createdAt: c.created_at
      }))
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
    const conv = db.prepare(`
      SELECT c.*, p.title as property_title, p.address as property_address,
             p.property_type, p.distance_from_campus_km,
             pr.rent_amount, pr.total_mandatory_cost,
             a.name as area_name, u_s.full_name as student_name, u_p.full_name as provider_name,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover
      FROM conversations c
      JOIN properties p ON c.property_id = p.id
      JOIN areas a ON p.area_id = a.id
      LEFT JOIN prices pr ON pr.property_id = p.id
      JOIN users u_s ON c.student_id = u_s.id
      JOIN users u_p ON c.provider_id = u_p.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Strict Authorization Check: Only participant student, provider, or admin
    const isStudent = req.user.role === 'STUDENT' && conv.student_id === req.user.id;
    const isProvider = req.user.role === 'PROVIDER' && conv.provider_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this conversation' });
    }

    // Fetch message history
    const messages = db.prepare(`
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
          coverImage: conv.property_cover || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
        },
        student: { id: conv.student_id, name: conv.student_name },
        provider: { id: conv.provider_id, name: conv.provider_name },
        status: conv.status,
        createdAt: conv.created_at
      },
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

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  // Rate Limiting check
  if (!checkRateLimit(req.user.id)) {
    return res.status(429).json({ error: 'Too many messages sent. Please slow down.' });
  }

  try {
    const conv = db.prepare(`
      SELECT c.*, p.title as property_title
      FROM conversations c
      JOIN properties p ON c.property_id = p.id
      WHERE c.id = ?
    `).get(id) as any;

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Strict Authorization check
    const isStudent = req.user.role === 'STUDENT' && conv.student_id === req.user.id;
    const isProvider = req.user.role === 'PROVIDER' && conv.provider_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
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
    sendNotification(
      recipientId,
      `New message from ${req.user.fullName || req.user.role}`,
      `"${cleanContent.substring(0, 60)}${cleanContent.length > 60 ? '...' : ''}"`,
      'NEW_MESSAGE',
      `/messages`
    );

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
      }
    });
  } catch (err: any) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// ----------------------------------------------------
// 5. MARK CONVERSATION AS READ
// ----------------------------------------------------
router.patch('/conversations/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
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
});

// ----------------------------------------------------
// 6. GLOBAL UNREAD MESSAGES COUNT
// ----------------------------------------------------
router.get('/unread-count', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let sql = '';
    if (req.user.role === 'STUDENT') {
      sql = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.student_id = ? AND m.sender_id != ? AND m.is_read = 0
      `;
    } else if (req.user.role === 'PROVIDER') {
      sql = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.provider_id = ? AND m.sender_id != ? AND m.is_read = 0
      `;
    } else {
      return res.json({ unreadCount: 0 });
    }

    const row = db.prepare(sql).get(req.user.id, req.user.id) as any;
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

function sendNotification(userId: string, title: string, message: string, type: string, linkUrl?: string) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(crypto.randomUUID(), userId, title, message, type, linkUrl || null);
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

export default router;
