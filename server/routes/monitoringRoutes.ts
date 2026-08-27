import { Router, Request, Response } from 'express';
import db from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { securityAuditService } from '../services/securityAuditService';

const router = Router();
const SERVER_START_TIME = new Date();

// Public lightweight health check (for load balancers & uptime monitors)
router.get('/health', (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  try {
    db.prepare('SELECT 1').get();
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME.getTime()) / 1000);

  res.status(dbStatus === 'healthy' ? 200 : 503).json({
    status: dbStatus === 'healthy' ? 'ok' : 'degraded',
    platform: 'Hostel Ease',
    tagline: 'Find your hostel. Stress less.',
    university: 'LAUTECH, Ogbomoso',
    environment: process.env.NODE_ENV || 'production',
    uptimeSeconds,
    timestamp: new Date().toISOString()
  });
});

// Admin-Only Detailed System Metrics & Health Telemetry
const metricsHandler = (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME.getTime()) / 1000);

    // Database counts
    const propertyCount = (db.prepare('SELECT COUNT(*) as count FROM properties').get() as any)?.count || 0;
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
    const bookingCount = (db.prepare('SELECT COUNT(*) as count FROM bookings').get() as any)?.count || 0;
    const auditLogCount = (db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as any)?.count || 0;
    const recentCriticalAlerts = securityAuditService.getRecentLogs(10, 'CRITICAL');

    res.json({
      success: true,
      system: {
        nodeVersion: process.version,
        uptimeSeconds,
        memory: {
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
        }
      },
      database: {
        status: 'connected',
        records: {
          properties: propertyCount,
          users: userCount,
          bookings: bookingCount,
          auditLogs: auditLogCount
        }
      },
      security: {
        recentCriticalAlerts
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve system metrics', code: 'METRICS_ERROR' });
  }
};

router.get('/metrics', requireAuth, requireRole(['ADMIN']), metricsHandler);
router.get('/summary', requireAuth, requireRole(['ADMIN']), metricsHandler);

export default router;
