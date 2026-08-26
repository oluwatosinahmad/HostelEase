import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { RoommateService } from '../services/roommateService.js';

const router = Router();

// =============================================================================
// ROOMMATE PROFILE & MATCHING ROUTES
// =============================================================================

// Get My Roommate Profile
router.get('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = RoommateService.getProfile(req.user!.id);
    res.json({ profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or Update Roommate Profile
router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = RoommateService.upsertProfile(req.user!.id, req.body);
    res.json({ profile, message: 'Roommate profile saved successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Discover Potential Roommate Matches (with Compatibility % and Trade-offs)
router.get('/discover', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const matches = RoommateService.discoverMatches(req.user!.id);
    res.json({ matches, total: matches.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send Roommate Request
router.post('/requests', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, message } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'receiverId is required' });
    }

    const result = RoommateService.sendRequest(senderId, receiverId, message);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Respond to Roommate Request (ACCEPT, DECLINE, END)
router.put('/requests/:id/respond', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { action } = req.body;

    if (!['ACCEPT', 'DECLINE', 'END'].includes(action)) {
      return res.status(400).json({ error: 'Valid action (ACCEPT, DECLINE, END) is required' });
    }

    const result = RoommateService.respondRequest(req.params.id, userId, action);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Send Message in Mutual Roommate Chat
router.post('/requests/:id/messages', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { message } = req.body;

    const result = RoommateService.sendMessage(req.params.id, senderId, message);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get Messages in Mutual Roommate Chat
router.get('/requests/:id/messages', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = RoommateService.getMessages(req.params.id, userId);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Block User
router.post('/block', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const blockerId = req.user!.id;
    const { blockedId, reason } = req.body;

    if (!blockedId) {
      return res.status(400).json({ error: 'blockedId is required' });
    }

    const result = RoommateService.blockUser(blockerId, blockedId, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
