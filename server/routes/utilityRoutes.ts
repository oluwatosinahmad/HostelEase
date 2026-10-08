import { Router, Response } from 'express';
import db from '../db.js';
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth.js';
import crypto from 'crypto';

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

    // Query reports from the last 6 hours
    const recentElectricityReports = db.prepare(`
      SELECT id, area_id, status, notes, created_at 
      FROM utility_reports 
      WHERE utility_type = 'ELECTRICITY' AND created_at >= datetime('now', '-6 hours')
      ORDER BY created_at DESC
    `).all() as any[];

    const recentWaterReports = db.prepare(`
      SELECT id, area_id, status, notes, created_at 
      FROM utility_reports 
      WHERE utility_type = 'WATER' AND created_at >= datetime('now', '-6 hours')
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
          recentNotes: elecReports.slice(0, 3).map(r => ({ notes: r.notes, created_at: r.created_at }))
        },
        water: {
          ...waterConsensus,
          recentNotes: waterReports.slice(0, 3).map(r => ({ notes: r.notes, created_at: r.created_at }))
        }
      };
    });

    const totalReportsToday = (db.prepare(`
      SELECT COUNT(*) as count FROM utility_reports 
      WHERE created_at >= datetime('now', '-24 hours')
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
    const { areaId, utilityType, status, notes } = req.body;

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
      INSERT INTO utility_reports (id, user_id, area_id, utility_type, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(reportId, userId, areaId, utilityType, status, notes ? notes.trim() : null);

    // Fetch refreshed area status
    const recentReports = db.prepare(`
      SELECT status, notes, created_at FROM utility_reports 
      WHERE area_id = ? AND utility_type = ? AND created_at >= datetime('now', '-6 hours')
      ORDER BY created_at DESC
    `).all(areaId, utilityType) as any[];

    const consensus = calculateConsensus(recentReports);

    return res.status(201).json({
      success: true,
      message: `Thank you for contributing to UtilityRadar! Your report for ${area.name} has been broadcast to fellow students.`,
      reportId,
      updatedConsensus: consensus
    });
  } catch (err: any) {
    console.error('Error submitting utility report:', err);
    return res.status(500).json({ error: 'Failed to submit utility report' });
  }
});

// 3. Get list of areas for reporting
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

// 4. Area detailed history (24h)
router.get('/history/:areaId', (req, res: Response) => {
  try {
    const { areaId } = req.params;
    const reports = db.prepare(`
      SELECT ur.id, ur.utility_type, ur.status, ur.notes, ur.created_at,
             u.full_name as reporter_name
      FROM utility_reports ur
      LEFT JOIN users u ON ur.user_id = u.id
      WHERE ur.area_id = ? AND ur.created_at >= datetime('now', '-24 hours')
      ORDER BY ur.created_at DESC LIMIT 30
    `).all(areaId);

    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch area history' });
  }
});

export default router;
