import { Router, Request, Response } from 'express';
import { authenticate, AuthenticatedRequest, decodeTokenClaims } from '../middleware/auth.js';
import { realtimeService } from '../services/realtimeService.js';
import { findOrResolveConversation, isAuthorizedParticipant } from './messageRoutes.js';
import { updateUserPresence } from './presenceRoutes.js';
import db from '../db.js';

const router = Router();

/**
 * 1. SSE Real-time event stream endpoint
 * Supports standard EventSource connecting via ?token=... or Authorization: Bearer ...
 */
router.get('/stream', (req: Request, res: Response) => {
  const token = (req.query.token as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required for realtime stream' });
  }

  const claims = decodeTokenClaims(token);
  if (!claims || (!claims.id && !claims.email)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Update user presence
  try {
    updateUserPresence(claims.id || claims.email);
  } catch {}

  // Hydrate user in database if missing
  try {
    const existing = db.prepare('SELECT id, email, role, full_name as fullName FROM users WHERE id = ? OR LOWER(email) = LOWER(?)')
      .get(claims.id || '', claims.email || '') as any;

    const userObj = existing ? {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      fullName: existing.fullName
    } : {
      id: claims.id || `user-${Date.now()}`,
      email: claims.email || '',
      role: claims.role || 'STUDENT',
      fullName: claims.fullName || claims.name || 'User'
    };

    realtimeService.addClient(userObj, res);
  } catch (err: any) {
    console.error('Error starting realtime SSE stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish realtime stream' });
    }
  }
});

/**
 * 2. Broadcast ephemeral typing indicator
 */
router.post('/typing', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { conversationId, isTyping } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  try {
    const conv = findOrResolveConversation(conversationId, req.user);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!isAuthorizedParticipant(conv, req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const recipientId = req.user!.id === conv.student_id ? conv.provider_id : conv.student_id;
    const recipientEmail = req.user!.id === conv.student_id ? conv.provider_email : conv.student_email;

    const payload = {
      conversationId: conv.id,
      userId: req.user!.id,
      userName: req.user!.fullName || (req.user!.role === 'STUDENT' ? 'Student' : 'Agent'),
      userRole: req.user!.role,
      isTyping: Boolean(isTyping)
    };

    realtimeService.sendToUser(recipientId, 'typing', payload);
    if (recipientEmail && recipientEmail !== recipientId) {
      realtimeService.sendToUser(recipientEmail, 'typing', payload);
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error broadcasting typing indicator:', err);
    return res.status(500).json({ error: 'Failed to broadcast typing indicator' });
  }
});

/**
 * 3. Realtime connection status & health
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    stats: realtimeService.getStats(),
    timestamp: new Date().toISOString()
  });
});

export default router;
