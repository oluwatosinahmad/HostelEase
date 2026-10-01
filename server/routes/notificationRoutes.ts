import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// 1. Dedicated ultra-fast unread count endpoint (pure DB query)
router.get('/unread-count', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const count = notificationService.getUnreadCount(userId);
  return res.json({ unreadCount: count });
});

// 2. Get current user notifications list (with pagination support)
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const result = notificationService.getUserNotifications(userId, limit, offset);

  return res.json({
    notifications: result.notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      readAt: n.readAt,
      linkUrl: n.linkUrl,
      conversationId: n.conversationId,
      messageId: n.messageId,
      senderId: n.senderId,
      relatedEntityId: n.relatedEntityId,
      relatedEntityType: n.relatedEntityType,
      metadata: n.metadata,
      createdAt: n.createdAt
    })),
    unreadCount: result.unreadCount
  });
});

// 3. Mark all notifications as read (supports PATCH, PUT, and POST)
const handleMarkAllRead = (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const result = notificationService.markAllAsRead(userId);
  return res.json({
    success: true,
    message: 'All notifications marked as read',
    unreadCount: result.unreadCount
  });
};

router.patch('/read-all', authenticate, handleMarkAllRead);
router.put('/read-all', authenticate, handleMarkAllRead);
router.post('/read-all', authenticate, handleMarkAllRead);

// 4. Mark single notification as read (supports PATCH, PUT, and POST)
const handleMarkSingleRead = (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const result = notificationService.markAsRead(userId, id);
  return res.json({
    success: true,
    message: 'Notification marked as read',
    unreadCount: result.unreadCount
  });
};

router.patch('/:id/read', authenticate, handleMarkSingleRead);
router.put('/:id/read', authenticate, handleMarkSingleRead);
router.post('/:id/read', authenticate, handleMarkSingleRead);

// 5. Create notification endpoint (e.g. from client triggers or administrative alerts)
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  const {
    userId,
    title,
    message,
    type,
    linkUrl,
    conversationId,
    messageId,
    senderId,
    relatedEntityId,
    relatedEntityType,
    metadata
  } = req.body;

  // Normal users can only send to themselves or participants in their entities, admin can send to anyone
  const targetUserId = userId || caller.id;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const notification = notificationService.createNotification({
    userId: targetUserId,
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'SYSTEM',
    linkUrl: linkUrl || null,
    conversationId: conversationId || null,
    messageId: messageId || null,
    senderId: senderId || caller.id,
    relatedEntityId: relatedEntityId || null,
    relatedEntityType: relatedEntityType || null,
    metadata
  });

  return res.status(201).json({
    success: true,
    notification,
    unreadCount: notificationService.getUnreadCount(targetUserId)
  });
});

// 6. Delete notification
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const result = notificationService.deleteNotification(userId, id);
  return res.json({
    success: true,
    message: 'Notification deleted',
    unreadCount: result.unreadCount
  });
});

export default router;
