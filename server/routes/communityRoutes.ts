import { Router, Response } from 'express';
import db from '../db.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { CommunityService } from '../services/communityService.js';
import { ExperienceService } from '../services/experienceService.js';
import { AICommunityService } from '../services/aiCommunityService.js';
import { RoommateService } from '../services/roommateService.js';

const router = Router();

// =============================================================================
// 1. COMMUNITY QUESTIONS & ANSWERS
// =============================================================================

// List Questions
router.get('/questions', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, propertyId, areaId, search, status, limit, offset } = req.query;
    const result = CommunityService.getQuestions({
      category: category as string,
      propertyId: propertyId as string,
      areaId: areaId as string,
      search: search as string,
      status: status as string,
      limit: limit ? parseInt(limit as string, 10) : 25,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Question Details & Answers
router.get('/questions/:id', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = CommunityService.getQuestionDetail(req.params.id, req.user?.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Ask Question
router.post('/questions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, description, category, propertyId, areaId, isAnonymous } = req.body;

    // AI Safety Pre-check
    const safety = AICommunityService.evaluateContentSafety(`${title} ${description}`);
    if (safety.flagged) {
      // Still log but flag for moderation
      console.warn('Community question flagged by AI safety check:', safety.detectedReasons);
    }

    const question = CommunityService.createQuestion({
      userId,
      title,
      description,
      category,
      propertyId,
      areaId,
      isAnonymous
    });

    res.status(201).json(question);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Answer Question
router.post('/answers', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, content } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    const result = CommunityService.answerQuestion({
      questionId,
      userId,
      content
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// React to Answer (Helpful / Unhelpful)
router.post('/reactions', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { answerId, reactionType } = req.body;

    if (!answerId || !['HELPFUL', 'UNHELPFUL'].includes(reactionType)) {
      return res.status(400).json({ error: 'Valid answerId and reactionType (HELPFUL/UNHELPFUL) are required' });
    }

    const result = CommunityService.reactToAnswer({
      answerId,
      userId,
      reactionType
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// =============================================================================
// 2. STRUCTURED HOSTEL EXPERIENCES & INSIGHTS
// =============================================================================

// Post Hostel Experience
router.post('/experiences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const experience = ExperienceService.postExperience({
      ...req.body,
      userId
    });
    res.status(201).json(experience);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List Experiences
router.get('/experiences', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { propertyId, limit } = req.query;
    const experiences = ExperienceService.getExperiences(
      propertyId as string,
      limit ? parseInt(limit as string, 10) : 20
    );
    res.json({ experiences });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Hostel Student Insights
router.get('/insights/:propertyId', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const insights = ExperienceService.getHostelStudentInsights(req.params.propertyId);
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 3. OFFICIAL GUIDES & AREA GUIDES
// =============================================================================

// List Official Guides
router.get('/guides', (req, res) => {
  try {
    const guides = db.prepare(`
      SELECT g.*, u.full_name as author_name
      FROM community_guides g
      JOIN users u ON u.id = g.author_id
      ORDER BY g.created_at DESC
    `).all();
    res.json({ guides });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Guide Details
router.get('/guides/:slug', (req, res) => {
  try {
    const guide = db.prepare(`
      SELECT g.*, u.full_name as author_name
      FROM community_guides g
      JOIN users u ON u.id = g.author_id
      WHERE g.slug = ? OR g.id = ?
    `).get(req.params.slug, req.params.slug);

    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(guide);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List Area Information Guides
router.get('/areas', (req, res) => {
  try {
    const areas = db.prepare('SELECT * FROM area_guides ORDER BY walking_minutes_to_campus ASC').all();
    res.json({ areas });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 4. COMMUNITY SEARCH & AI SUMMARIES
// =============================================================================

router.get('/search', (req, res) => {
  try {
    const { q = '' } = req.query;
    const results = CommunityService.searchCommunity(q as string);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ai/summary', (req, res) => {
  try {
    const { propertyId, areaName } = req.query;
    const summary = AICommunityService.summarizeCommunityInsights({
      propertyId: propertyId as string,
      areaName: areaName as string
    });
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 5. COMMUNITY REPORTING & MODERATION
// =============================================================================

// Submit Report
router.post('/reports', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const reporterId = req.user!.id;
    const { entityType, entityId, reason, description } = req.body;

    if (!entityType || !entityId || !reason) {
      return res.status(400).json({ error: 'entityType, entityId, and reason are required' });
    }

    const report = RoommateService.createReport({
      reporterId,
      entityType,
      entityId,
      reason,
      description
    });

    res.status(201).json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Get Community Reports
router.get('/admin/reports', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = db.prepare(`
      SELECT r.*, u.full_name as reporter_name, u.email as reporter_email
      FROM community_reports r
      JOIN users u ON u.id = r.reporter_id
      ORDER BY r.created_at DESC
    `).all();

    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Resolve Community Report & Moderate Content
router.put('/admin/reports/:id', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const { status = 'RESOLVED', actionTaken, adminNotes, hideEntity } = req.body;
    const reportId = req.params.id;

    const report = db.prepare('SELECT * FROM community_reports WHERE id = ?').get(reportId) as any;
    if (!report) return res.status(404).json({ error: 'Report not found' });

    db.transaction(() => {
      db.prepare(`
        UPDATE community_reports SET
          status = ?,
          action_taken = ?,
          admin_notes = ?,
          resolved_by = ?,
          resolved_at = datetime('now')
        WHERE id = ?
      `).run(status, actionTaken || 'RESOLVED_BY_ADMIN', adminNotes || null, adminId, reportId);

      // Optionally hide offending content
      if (hideEntity) {
        if (report.entity_type === 'QUESTION') {
          db.prepare('UPDATE community_questions SET status = "HIDDEN" WHERE id = ?').run(report.entity_id);
        } else if (report.entity_type === 'ANSWER') {
          db.prepare('UPDATE community_answers SET status = "HIDDEN" WHERE id = ?').run(report.entity_id);
        } else if (report.entity_type === 'EXPERIENCE') {
          db.prepare('UPDATE community_experiences SET status = "HIDDEN" WHERE id = ?').run(report.entity_id);
        }
      }
    })();

    res.json({ message: 'Report updated and moderation action recorded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get Unanswered Questions for Community Moderation
router.get('/admin/unanswered', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const unanswered = db.prepare(`
      SELECT q.*, u.full_name as author_name
      FROM community_questions q
      JOIN users u ON u.id = q.user_id
      WHERE q.is_answered = 0 AND q.status = 'ACTIVE'
      ORDER BY q.created_at DESC
    `).all();

    res.json({ unanswered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
