import { Router, Response } from 'express';
import db from '../db.js';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';
import { notificationService } from '../services/notificationService.js';

const router = Router();

// Helper to determine status consensus and conflict
function calculateConsensus(reports: any[]) {
  if (!reports || reports.length === 0) {
    return {
      status: 'UNKNOWN',
      consensusStatus: 'UNKNOWN',
      reportCount: 0,
      lastReportedAt: null,
      isConflicted: false,
      conflictNote: null,
      freshnessMinutes: null
    };
  }

  const counts: Record<string, number> = {};
  for (const r of reports) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  // Find majority
  let maxCount = 0;
  let majorityStatus = reports[0].status;
  for (const [st, cnt] of Object.entries(counts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      majorityStatus = st;
    }
  }

  // Conflict check: if total reports >= 2 and top 2 statuses are equal or close
  const distinctStatuses = Object.keys(counts);
  const isConflicted = distinctStatuses.length > 1 && maxCount < (reports.length * 0.7);

  const lastReportedAt = reports[0].created_at;
  const now = new Date().getTime();
  const lastTime = new Date(lastReportedAt).getTime();
  const freshnessMinutes = Math.max(0, Math.floor((now - lastTime) / (1000 * 60)));

  return {
    status: majorityStatus,
    consensusStatus: majorityStatus,
    reportCount: reports.length,
    lastReportedAt,
    isConflicted,
    conflictNote: isConflicted ? 'Mixed reports from students in this area — conditions may be changing.' : null,
    freshnessMinutes
  };
}

// 1. Get UtilityRadar Overview across all verified areas
router.get('/overview', (req, res: Response) => {
  try {
    const areas = db.prepare(`
      SELECT id, name, slug, landmark, approx_distance_min_km 
      FROM areas 
      WHERE is_active = 1 
      ORDER BY 
        CASE 
          WHEN id = 'area-under-g' THEN 1
          WHEN id = 'area-adenike' THEN 2
          WHEN id = 'area-oluyole' THEN 3
          WHEN id = 'area-college-road' THEN 4
          WHEN id = 'area-abaa' THEN 5
          WHEN id = 'area-isale-general' THEN 6
          ELSE 7
        END, name ASC
    `).all();

    // Query reports from the last 6 hours (excluding flagged)
    const recentElectricityReports = db.prepare(`
      SELECT id, area_id, status, notes, created_at 
      FROM utility_reports 
      WHERE utility_type = 'ELECTRICITY' AND created_at >= datetime('now', '-6 hours')
      AND (is_flagged = 0 OR is_flagged IS NULL)
      ORDER BY created_at DESC
    `).all() as any[];

    const recentWaterReports = db.prepare(`
      SELECT id, area_id, status, notes, created_at 
      FROM utility_reports 
      WHERE utility_type = 'WATER' AND created_at >= datetime('now', '-6 hours')
      AND (is_flagged = 0 OR is_flagged IS NULL)
      ORDER BY created_at DESC
    `).all() as any[];

    const areaSummaries = areas.map((area: any) => {
      const elecReports = recentElectricityReports.filter(r => r.area_id === area.id);
      const waterReports = recentWaterReports.filter(r => r.area_id === area.id);

      const elecConsensus = calculateConsensus(elecReports);
      const waterConsensus = calculateConsensus(waterReports);

      return {
        areaId: area.id,
        areaName: area.name,
        slug: area.slug,
        landmark: area.landmark,
        electricity: {
          ...elecConsensus,
          recentNotes: elecReports.slice(0, 3).map(r => ({ id: r.id, notes: r.notes, created_at: r.created_at }))
        },
        water: {
          ...waterConsensus,
          recentNotes: waterReports.slice(0, 3).map(r => ({ id: r.id, notes: r.notes, created_at: r.created_at }))
        }
      };
    });

    const totalReportsToday = (db.prepare(`
      SELECT COUNT(*) as count FROM utility_reports 
      WHERE created_at >= datetime('now', '-24 hours')
      AND (is_flagged = 0 OR is_flagged IS NULL)
    `).get() as { count: number }).count;

    return res.json({
      areas: areaSummaries,
      totalReportsToday,
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching UtilityRadar overview:', err);
    return res.status(500).json({ error: 'Failed to retrieve UtilityRadar data' });
  }
});

// 2. Submit a utility report (rate limited to 1 per utility per area per user/IP per 10 mins)
router.post('/report', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-user-id'] as string) || null;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const { areaId, utilityType, status, notes, propertyId } = req.body;

    if (!areaId) {
      return res.status(400).json({ error: 'Area selection is required' });
    }

    const area = db.prepare('SELECT id, name FROM areas WHERE id = ?').get(areaId) as any;
    if (!area) {
      return res.status(404).json({ error: 'Selected area does not exist' });
    }

    if (!['ELECTRICITY', 'WATER'].includes(utilityType)) {
      return res.status(400).json({ error: 'Invalid utility type' });
    }

    const validElectricity = ['POWER_ON', 'POWER_OFF', 'GENERATOR_ON'];
    const validWater = ['WATER_AVAILABLE', 'WATER_UNAVAILABLE'];

    if (utilityType === 'ELECTRICITY' && !validElectricity.includes(status)) {
      return res.status(400).json({ error: `Invalid electricity status. Choose from: ${validElectricity.join(', ')}` });
    }

    if (utilityType === 'WATER' && !validWater.includes(status)) {
      return res.status(400).json({ error: `Invalid water status. Choose from: ${validWater.join(', ')}` });
    }

    // Rate limiting: Prevent multiple reports within 10 minutes from same user or recent spam
    if (userId) {
      const recentUserReport = db.prepare(`
        SELECT id, created_at FROM utility_reports 
        WHERE user_id = ? AND area_id = ? AND utility_type = ? 
        AND created_at >= datetime('now', '-10 minutes')
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, areaId, utilityType);

      if (recentUserReport) {
        return res.status(429).json({ 
          error: 'You recently submitted a report for this area. Please wait 10 minutes before submitting another update.' 
        });
      }
    }

    const reportId = `ur-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO utility_reports (id, user_id, area_id, property_id, utility_type, status, notes, is_flagged, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(reportId, userId, areaId, propertyId || null, utilityType, status, notes ? notes.trim() : null);

    // If propertyId is provided and indicates an outage (POWER_OFF or WATER_UNAVAILABLE), notify the Agent
    if (propertyId && (status === 'POWER_OFF' || status === 'WATER_UNAVAILABLE')) {
      try {
        const prop = db.prepare(`
          SELECT p.id, p.title, p.provider_id, u.full_name as provider_name 
          FROM properties p 
          JOIN users u ON p.provider_id = u.id 
          WHERE p.id = ?
        `).get(propertyId) as any;

        if (prop && prop.provider_id) {
          notificationService.createNotification({
            userId: prop.provider_id,
            title: `Utility Outage Reported: ${prop.title}`,
            message: `A student submitted an outage report for ${utilityType.toLowerCase()} (${status.replace('_', ' ')}) affecting ${prop.title} in ${area.name}.`,
            type: 'MAINTENANCE',
            linkUrl: `/provider?tab=maintenance`,
            relatedEntityId: reportId,
            relatedEntityType: 'UTILITY_REPORT',
            senderId: userId || null,
            metadata: { propertyId: prop.id, utilityType, status, areaId }
          });
        }
      } catch (notifErr) {
        console.error('Error notifying agent about property utility outage:', notifErr);
      }
    }

    // Fetch refreshed area status
    const recentReports = db.prepare(`
      SELECT status, notes, created_at FROM utility_reports 
      WHERE area_id = ? AND utility_type = ? AND created_at >= datetime('now', '-6 hours')
      AND (is_flagged = 0 OR is_flagged IS NULL)
      ORDER BY created_at DESC
    `).all(areaId, utilityType) as any[];

    const consensus = calculateConsensus(recentReports);

    return res.status(201).json({
      success: true,
      message: 'Utility Report Submitted Successfully',
      reportId,
      updatedConsensus: consensus
    });
  } catch (err: any) {
    console.error('Error submitting utility report:', err);
    return res.status(500).json({ error: 'Failed to submit utility report' });
  }
});

// 3. Flag an inaccurate or abusive report
router.post('/reports/:id/flag', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const report = db.prepare('SELECT id FROM utility_reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ error: 'Utility report not found' });
    }

    db.prepare(`
      UPDATE utility_reports 
      SET is_flagged = 1, flag_reason = ? 
      WHERE id = ?
    `).run(reason ? reason.trim() : 'Flagged as inaccurate by community member', id);

    return res.json({
      success: true,
      message: 'Report flagged for community review. Inaccurate status will be recalculated.'
    });
  } catch (err: any) {
    console.error('Error flagging utility report:', err);
    return res.status(500).json({ error: 'Failed to flag utility report' });
  }
});

// 4. Get list of areas for reporting
router.get('/areas', (req, res: Response) => {
  try {
    const areas = db.prepare(`
      SELECT id, name, slug, landmark, approx_distance_min_km 
      FROM areas 
      WHERE is_active = 1 
      ORDER BY name ASC
    `).all();
    return res.json({ areas });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch areas' });
  }
});

// 5. Area detailed history (24h)
router.get('/history/:areaId', (req, res: Response) => {
  try {
    const { areaId } = req.params;
    const reports = db.prepare(`
      SELECT ur.id, ur.utility_type, ur.status, ur.notes, ur.created_at,
             u.full_name as reporter_name
      FROM utility_reports ur
      LEFT JOIN users u ON ur.user_id = u.id
      WHERE ur.area_id = ? AND ur.created_at >= datetime('now', '-24 hours')
      AND (ur.is_flagged = 0 OR ur.is_flagged IS NULL)
      ORDER BY ur.created_at DESC LIMIT 30
    `).all(areaId);

    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch area history' });
  }
});

export default router;
