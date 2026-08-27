import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const VALID_REASONS = [
  'FAKE_HOSTEL',
  'WRONG_PRICE',
  'WRONG_PHOTOS',
  'HOSTEL_UNAVAILABLE',
  'SUSPICIOUS_PROVIDER',
  'MISLEADING_INFO',
  'WRONG_LOCATION',
  'OTHER'
];

// 1. Submit a Listing Report (Student)
const submitReportHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const propertyId = req.params.propertyId || req.body.propertyId || req.body.targetId;
  const { reason = 'OTHER', description, category } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Detailed description is required' });
  }

  try {
    const property = propertyId ? db.prepare('SELECT id, title FROM properties WHERE id = ?').get(propertyId) as any : null;
    const resolvedPropId = property?.id || propertyId || 'general';

    const reportId = `report-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO listing_reports (
        id, user_id, property_id, reason, description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
    `).run(reportId, req.user.id, resolvedPropId, category || reason || 'OTHER', description.trim());

    return res.status(201).json({
      message: 'Thank you for submitting this report. Our operations team will review it to protect students.',
      reportId
    });
  } catch (err: any) {
    console.error('Submit report error:', err);
    return res.status(500).json({ error: 'Failed to submit report: ' + err.message });
  }
};

router.post('/properties/:propertyId', authenticate, submitReportHandler);
router.post('/', authenticate, submitReportHandler);

// 2. Admin List of Reports
router.get('/', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = db.prepare(`
      SELECT lr.*, p.title as property_title, p.slug as property_slug, p.verification_status,
             u_rep.full_name as reporter_name, u_rep.email as reporter_email,
             u_prov.full_name as provider_name, u_prov.phone as provider_phone
      FROM listing_reports lr
      JOIN properties p ON lr.property_id = p.id
      JOIN users u_rep ON lr.user_id = u_rep.id
      JOIN users u_prov ON p.provider_id = u_prov.id
      ORDER BY lr.created_at DESC
    `).all() as any[];

    return res.json({
      reports: reports.map(r => ({
        id: r.id,
        propertyId: r.property_id,
        propertyTitle: r.property_title,
        propertySlug: r.property_slug,
        propertyVerificationStatus: r.verification_status,
        reason: r.reason,
        description: r.description,
        status: r.status,
        adminActionNotes: r.admin_action_notes,
        reporterName: r.reporter_name,
        reporterEmail: r.reporter_email,
        providerName: r.provider_name,
        providerPhone: r.provider_phone,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

// 3. Admin Update Report Status
router.patch('/:id', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminActionNotes, suspendListing } = req.body;

  if (!['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid report status' });
  }

  try {
    db.transaction(() => {
      const report = db.prepare('SELECT property_id FROM listing_reports WHERE id = ?').get(id) as any;
      if (!report) {
        throw new Error('Report not found');
      }

      db.prepare(`
        UPDATE listing_reports
        SET status = ?,
            admin_action_notes = COALESCE(?, admin_action_notes),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(status, adminActionNotes || null, id);

      if (suspendListing) {
        db.prepare(`
          UPDATE properties
          SET verification_status = 'SUSPENDED',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(report.property_id);
      }
    })();

    return res.json({ message: 'Report updated successfully' });
  } catch (err: any) {
    console.error('Update report error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update report' });
  }
});

export default router;
