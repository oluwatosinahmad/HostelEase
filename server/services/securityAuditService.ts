import db from '../db';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
  severity: AuditSeverity;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export const securityAuditService = {
  log(params: {
    actorId?: string | null;
    actorEmail?: string | null;
    actorRole?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    details?: Record<string, any> | string | null;
    severity?: AuditSeverity;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): void {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();
      const detailsStr = typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : (params.details || null);

      const stmt = db.prepare(`
        INSERT INTO audit_logs (
          id, actor_id, actor_email, actor_role, action, entity_type, entity_id, details, severity, ip_address, user_agent, created_at
        ) VALUES (
          @id, @actor_id, @actor_email, @actor_role, @action, @entity_type, @entity_id, @details, @severity, @ip_address, @user_agent, @created_at
        )
      `);

      stmt.run({
        id,
        actor_id: params.actorId || null,
        actor_email: params.actorEmail || null,
        actor_role: params.actorRole || 'STUDENT',
        action: params.action,
        entity_type: params.targetType || 'SYSTEM',
        entity_id: params.targetId || params.actorId || 'GLOBAL',
        details: detailsStr,
        severity: params.severity || 'LOW',
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent ? params.userAgent.substring(0, 255) : null,
        created_at: timestamp
      });
    } catch (err) {
      console.error('[SECURITY AUDIT LOG ERROR]', err);
    }
  },

  getRecentLogs(limit = 100, severityFilter?: AuditSeverity): AuditLogEntry[] {
    try {
      let query = `SELECT * FROM audit_logs`;
      const params: any[] = [];

      if (severityFilter) {
        query += ` WHERE severity = ?`;
        params.push(severityFilter);
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const rows: any[] = db.prepare(query).all(...params);
      return rows.map(r => ({
        id: r.id,
        actorId: r.actor_id,
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        action: r.action,
        targetType: r.entity_type || r.target_type,
        targetId: r.entity_id || r.target_id,
        details: r.details,
        severity: r.severity as AuditSeverity,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        timestamp: r.created_at
      }));
    } catch (err) {
      console.error('[SECURITY AUDIT FETCH ERROR]', err);
      return [];
    }
  }
};
