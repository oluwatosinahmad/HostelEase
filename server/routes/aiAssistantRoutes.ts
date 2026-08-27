import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AIAssistantService } from '../services/aiAssistantService';

const router = Router();

// In-memory sliding window rate limiter (e.g. 30 requests per minute per user)
const userRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const timestamps = userRateLimits.get(userId) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    return false;
  }

  validTimestamps.push(now);
  userRateLimits.set(userId, validTimestamps);
  return true;
}

// ---------------------------------------------------------------------------
// 1. POST /api/ai/chat — Process natural language query
// ---------------------------------------------------------------------------
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const studentId = req.user?.id || 'usr-student-default';

  if (!checkRateLimit(studentId)) {
    return res.status(429).json({ error: 'Too many queries. Please slow down and wait a few seconds before asking again.' });
  }

  const { message, conversationId, context } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    let activeConversationId = conversationId;

    // Create conversation if not exists
    if (!activeConversationId) {
      activeConversationId = `conv-${crypto.randomUUID()}`;
      const title = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
      db.prepare(`
        INSERT INTO ai_conversations (id, student_id, title, context_type, context_property_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        activeConversationId,
        studentId,
        title,
        context?.contextType || 'GENERAL',
        context?.propertyId || null
      );
    } else {
      // Validate ownership
      const existingConv = db.prepare(`SELECT id FROM ai_conversations WHERE id = ? AND student_id = ?`).get(activeConversationId, studentId);
      if (!existingConv) {
        return res.status(404).json({ error: 'Conversation not found or unauthorized' });
      }
      db.prepare(`UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?`).run(activeConversationId);
    }

    // Save User message
    const userMsgId = `aimsg-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, sender, content, created_at)
      VALUES (?, ?, 'USER', ?, datetime('now'))
    `).run(userMsgId, activeConversationId, message.trim());

    // Process through AI Assistant Service
    const aiResult = await AIAssistantService.processStudentQuery(message, studentId, context);

    // Save AI response message
    const aiMsgId = `aimsg-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, sender, content, structured_data, tool_calls, created_at)
      VALUES (?, ?, 'AI', ?, ?, ?, datetime('now'))
    `).run(
      aiMsgId,
      activeConversationId,
      aiResult.message,
      aiResult.structuredData ? JSON.stringify(aiResult.structuredData) : null,
      aiResult.toolCallsExecuted ? JSON.stringify(aiResult.toolCallsExecuted) : null
    );

    const latencyMs = Date.now() - startTime;

    // Log successful AI interaction
    db.prepare(`
      INSERT INTO ai_usage_logs (id, student_id, endpoint, query_text, tool_name, status, latency_ms)
      VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?)
    `).run(
      `log-${crypto.randomUUID()}`,
      studentId,
      '/api/ai/chat',
      message.slice(0, 200),
      aiResult.toolCallsExecuted ? aiResult.toolCallsExecuted.join(',') : 'none',
      latencyMs
    );

    return res.json({
      conversationId: activeConversationId,
      messageId: aiMsgId,
      response: aiResult.message,
      structuredData: aiResult.structuredData,
      toolsUsed: aiResult.toolCallsExecuted
    });
  } catch (err: any) {
    console.error('AI chat error:', err);
    const latencyMs = Date.now() - startTime;

    db.prepare(`
      INSERT INTO ai_usage_logs (id, student_id, endpoint, query_text, status, error_message, latency_ms)
      VALUES (?, ?, ?, ?, 'ERROR', ?, ?)
    `).run(`log-${crypto.randomUUID()}`, studentId, '/api/ai/chat', message.slice(0, 100), err.message, latencyMs);

    return res.status(500).json({
      error: 'AI Assistant encountered an issue processing your inquiry. Please try again or use direct search.'
    });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /api/ai/conversations — List student's chat sessions
// ---------------------------------------------------------------------------
router.get('/conversations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId || req.user?.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const conversations = db.prepare(`
    SELECT c.*, 
           (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.id) as message_count
    FROM ai_conversations c
    WHERE c.student_id = ?
    ORDER BY c.updated_at DESC
    LIMIT 20
  `).all(studentId);

  return res.json({ conversations });
});

// ---------------------------------------------------------------------------
// 3. GET /api/ai/conversations/:id — Get message history for conversation
// ---------------------------------------------------------------------------
router.get('/conversations/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  const conversationId = req.params.id;

  const conv = db.prepare(`SELECT * FROM ai_conversations WHERE id = ? AND student_id = ?`).get(conversationId, studentId) as any;
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const messages = db.prepare(`
    SELECT id, conversation_id, sender, content, structured_data, tool_calls, created_at
    FROM ai_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId) as any[];

  const parsedMessages = messages.map(m => ({
    ...m,
    structuredData: m.structured_data ? JSON.parse(m.structured_data) : null,
    toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : null
  }));

  return res.json({
    conversation: conv,
    messages: parsedMessages
  });
});

// ---------------------------------------------------------------------------
// 4. DELETE /api/ai/conversations/:id — Delete a conversation
// ---------------------------------------------------------------------------
router.delete('/conversations/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  const conversationId = req.params.id;

  const result = db.prepare(`DELETE FROM ai_conversations WHERE id = ? AND student_id = ?`).run(conversationId, studentId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  return res.json({ message: 'Conversation deleted successfully' });
});

// ---------------------------------------------------------------------------
// 5. POST /api/ai/action/confirm — Execute confirmed action
// ---------------------------------------------------------------------------
router.post('/action/confirm', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId || req.user?.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { actionType, payload } = req.body;
  if (!actionType || !payload) {
    return res.status(400).json({ error: 'Action type and payload are required' });
  }

  try {
    const result = AIAssistantService.executeConfirmedAction(actionType, payload, studentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to execute action' });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /api/ai/feedback — Record student feedback
// ---------------------------------------------------------------------------
router.post('/feedback', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user?.id;
  const { messageId, rating, comment } = req.body;

  if (!messageId || !rating || !['HELPFUL', 'UNHELPFUL'].includes(rating)) {
    return res.status(400).json({ error: 'Valid messageId and rating (HELPFUL | UNHELPFUL) required' });
  }

  const id = `feed-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO ai_feedback (id, message_id, student_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, messageId, studentId, rating, comment || null);

  return res.json({ success: true, message: 'Thank you for your feedback!' });
});

// ---------------------------------------------------------------------------
// 7. GET /api/ai/admin/stats — Admin usage statistics & tool distribution
// ---------------------------------------------------------------------------
router.get('/admin/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const totalQueries = db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs`).get() as any;
  const successfulQueries = db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs WHERE status = 'SUCCESS'`).get() as any;
  const rateLimitedQueries = db.prepare(`SELECT COUNT(*) as count FROM ai_usage_logs WHERE status = 'RATE_LIMITED'`).get() as any;
  
  const toolExecutions = db.prepare(`
    SELECT tool_name, COUNT(*) as count
    FROM ai_usage_logs
    WHERE tool_name IS NOT NULL AND tool_name != 'none'
    GROUP BY tool_name
    ORDER BY count DESC
  `).all();

  const feedbackCounts = db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM ai_feedback
    GROUP BY rating
  `).all();

  const recentLogs = db.prepare(`
    SELECT id, endpoint, query_text, tool_name, status, latency_ms, created_at
    FROM ai_usage_logs
    ORDER BY created_at DESC
    LIMIT 20
  `).all();

  return res.json({
    totalQueries: totalQueries?.count || 0,
    successRate: totalQueries?.count > 0 ? ((successfulQueries?.count || 0) / totalQueries.count) * 100 : 100,
    rateLimitedCount: rateLimitedQueries?.count || 0,
    toolExecutions,
    feedbackCounts,
    recentLogs
  });
});

export default router;
