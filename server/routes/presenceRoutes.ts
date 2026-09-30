import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'hostel-ease-jwt-secure-secret-key-2026';
const router = Router();

// Initialize user_presence table for real online / last-seen tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    last_seen_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence(last_seen_at);
`);

export function updateUserPresence(userId: string) {
  try {
    db.prepare(`
      INSERT INTO user_presence (user_id, last_seen_at)
      VALUES (?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET last_seen_at = datetime('now')
    `).run(userId);
  } catch (err) {
    console.warn('Update user presence error:', err);
  }
}

export function setUserOffline(userId: string) {
  try {
    // Set timestamp to 70 seconds ago so isOnline becomes false immediately while retaining last-seen date
    db.prepare(`
      INSERT INTO user_presence (user_id, last_seen_at)
      VALUES (?, datetime('now', '-70 seconds'))
      ON CONFLICT(user_id) DO UPDATE SET last_seen_at = datetime('now', '-70 seconds')
    `).run(userId);
  } catch (err) {
    console.warn('Set user offline error:', err);
  }
}

export function getUserPresence(userId: string): { isOnline: boolean; lastSeenAt: string | null } {
  try {
    const row = db.prepare('SELECT last_seen_at FROM user_presence WHERE user_id = ?').get(userId) as any;
    if (!row || !row.last_seen_at) {
      return { isOnline: false, lastSeenAt: null };
    }
    // Parse UTC datetime string from SQLite datetime('now')
    const raw = row.last_seen_at.endsWith('Z') ? row.last_seen_at : row.last_seen_at.replace(' ', 'T') + 'Z';
    const lastSeenMs = new Date(raw).getTime();
    // User is Online if active within the last 65 seconds
    const isOnline = !isNaN(lastSeenMs) && (Date.now() - lastSeenMs) < 65000;
    return { isOnline, lastSeenAt: row.last_seen_at };
  } catch (err) {
    return { isOnline: false, lastSeenAt: null };
  }
}

function extractUserId(req: Request): string | null {
  const authUser = (req as AuthenticatedRequest).user;
  if (authUser?.id) return authUser.id;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
      if (decoded && decoded.id) return decoded.id;
    } catch {}
  }
  const headerId = req.headers['x-user-id'] as string;
  if (headerId) return headerId;
  if (req.body && req.body.userId) return req.body.userId;
  return null;
}

// 1. Session Presence Heartbeat
router.post('/heartbeat', optionalAuthenticate, (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ error: 'User identification required' });
  updateUserPresence(userId);
  return res.json({ success: true, userId, timestamp: new Date().toISOString() });
});

// Also support /presence/heartbeat for backwards compatibility
router.post('/presence/heartbeat', optionalAuthenticate, (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ error: 'User identification required' });
  updateUserPresence(userId);
  return res.json({ success: true, userId, timestamp: new Date().toISOString() });
});

// 2. Set user as Offline immediately on sign-out
router.post('/offline', optionalAuthenticate, (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ error: 'User identification required' });
  setUserOffline(userId);
  return res.json({ success: true, userId, isOnline: false });
});

// 3. Query presence for multiple users (batch)
router.post('/batch', (req: Request, res: Response) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array' });
  }

  const result: Record<string, { isOnline: boolean; lastSeenAt: string | null }> = {};
  for (const uid of userIds) {
    if (typeof uid === 'string') {
      result[uid] = getUserPresence(uid);
    }
  }

  return res.json({ presences: result });
});

// 4. Query presence for single user
router.get('/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const presence = getUserPresence(userId);
  return res.json({ userId, ...presence });
});

export default router;
