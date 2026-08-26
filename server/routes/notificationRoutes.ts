import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get current user notifications
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId) as any[];

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).get(userId) as { count: number };

  res.json({
    notifications: notifications.map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: Boolean(n.is_read),
      linkUrl: n.link_url,
      createdAt: n.created_at
    })),
    unreadCount: unreadCount.count
  });
});

// 2. Mark notification as read
router.patch('/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(id, userId);

  res.json({ message: 'Notification marked as read' });
});

// 3. Mark all as read
router.patch('/read-all', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  db.prepare(`
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
  `).run(userId);

  res.json({ message: 'All notifications marked as read' });
});

export default router;
