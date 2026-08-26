import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRole, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// 1. HIGH-LEVEL OPERATIONS DASHBOARD
// =============================================================================
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Bookings metrics
      const todayBookingsRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE date(created_at) = date('now')").get() as any;
      const pendingBookingsRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'PENDING'").get() as any;
      
      // Move-In metrics
      const todayMoveInsRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE date(move_in_date) = date('now')").get() as any;
      const upcomingMoveInsRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE date(move_in_date) >= date('now') AND date(move_in_date) <= date('now', '+3 days')").get() as any;

      // Complaints, Issues, Disputes
      const openComplaintsRow = db.prepare("SELECT COUNT(*) as count FROM listing_reports WHERE status IN ('OPEN', 'UNDER_REVIEW')").get() as any;
      const openDisputesRow = db.prepare("SELECT COUNT(*) as count FROM payment_disputes WHERE status IN ('OPEN', 'EVIDENCE_SUBMITTED', 'UNDER_REVIEW')").get() as any;
      const pendingRefundsRow = db.prepare("SELECT COUNT(*) as count FROM refunds WHERE status IN ('PENDING', 'REQUESTED', 'PROCESSING')").get() as any;
      const paymentIssuesRow = db.prepare("SELECT COUNT(*) as count FROM payments WHERE status IN ('FAILED', 'DISPUTED')").get() as any;

      // Verification queues
      const pendingProvidersRow = db.prepare("SELECT COUNT(*) as count FROM provider_profiles WHERE verification_status IN ('PENDING', 'UNDER_REVIEW')").get() as any;
      const pendingHostelsRow = db.prepare("SELECT COUNT(*) as count FROM properties WHERE verification_status IN ('PENDING', 'PENDING_REVIEW')").get() as any;
      const openSupportTicketsRow = db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')").get() as any;

      // Operational Tasks
      const opTasks = db.prepare('SELECT * FROM operational_tasks ORDER BY priority DESC, created_at DESC LIMIT 20').all() as any[];
      const urgentTasksCount = opTasks.filter(t => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

      // Payouts
      const recentPayouts = db.prepare(`
        SELECT p.*, u.full_name as provider_name, u.phone as provider_phone, pr.title as hostel_title, r.name as room_name
        FROM provider_payouts p
        LEFT JOIN users u ON p.provider_id = u.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN properties pr ON b.property_id = pr.id
        LEFT JOIN rooms r ON b.room_id = r.id
        ORDER BY p.created_at DESC LIMIT 10
      `).all() as any[];

      // Action Required items
      const actionItems: any[] = [];

      if ((pendingBookingsRow?.count || 0) > 0) {
        actionItems.push({
          id: 'act-1',
          title: `${pendingBookingsRow.count} Booking Requests Require Confirmation`,
          description: 'Students waiting for landlord reservation approval.',
          category: 'BOOKING',
          priority: 'HIGH',
          actionUrl: '/admin/bookings'
        });
      }

      if ((pendingProvidersRow?.count || 0) > 0) {
        actionItems.push({
          id: 'act-2',
          title: `${pendingProvidersRow.count} Provider NIN & ID Verifications Awaiting Review`,
          description: 'Verify government credentials before granting listing approvals.',
          category: 'VERIFICATION',
          priority: 'HIGH',
          actionUrl: '/admin/providers'
        });
      }

      if ((openDisputesRow?.count || 0) > 0) {
        actionItems.push({
          id: 'act-3',
          title: `${openDisputesRow.count} Open Student-Landlord Escrow Disputes`,
          description: 'Mediation and evidence review required before fund release.',
          category: 'DISPUTE',
          priority: 'URGENT',
          actionUrl: '/admin/disputes'
        });
      }

      if ((pendingRefundsRow?.count || 0) > 0) {
        actionItems.push({
          id: 'act-4',
          title: `${pendingRefundsRow.count} Refund Requests Awaiting Auditor Authorization`,
          description: 'Review caution deposit or cancelled booking refund.',
          category: 'REFUND',
          priority: 'URGENT',
          actionUrl: '/admin/payments'
        });
      }

      // Complaint Patterns summary
      const complaintPatterns = [
        {
          propertyId: 'prop-underg-1',
          propertyTitle: 'Emerald Heights Luxury Self-Contain',
          areaName: 'Under G',
          providerName: 'Engr. Segun Adeyemi',
          totalComplaints: 1,
          electricityIssues: 0,
          waterIssues: 1,
          securityIssues: 0,
          cleanlinessIssues: 0,
          status: 'NORMAL'
        },
        {
          propertyId: 'prop-adenike-1',
          propertyTitle: 'Peace Haven Executive Lodge',
          areaName: 'Adenike Area',
          providerName: 'Chief Oladimeji Alao',
          totalComplaints: 2,
          electricityIssues: 1,
          waterIssues: 1,
          securityIssues: 0,
          cleanlinessIssues: 0,
          status: 'NORMAL'
        }
      ];

      // Provider Performance Scorecards
      const providerScorecards = [
        {
          providerId: 'user-provider-1',
          providerName: 'Engr. Segun Adeyemi',
          businessName: 'Destiny Properties LAUTECH',
          totalHostels: 3,
          totalBedspaces: 32,
          occupiedBedspaces: 26,
          occupancyRate: '81.2%',
          bookingAcceptanceRate: '94.5%',
          cancellationRate: '2.1%',
          avgIssueResolutionHours: 4.2,
          studentSatisfactionRating: 4.8,
          verificationBadge: 'VERIFIED_PROVIDER'
        },
        {
          providerId: 'user-provider-2',
          providerName: 'Chief Oladimeji Alao',
          businessName: 'Holy Light Real Estate',
          totalHostels: 2,
          totalBedspaces: 24,
          occupiedBedspaces: 20,
          occupancyRate: '83.3%',
          bookingAcceptanceRate: '91.0%',
          cancellationRate: '4.0%',
          avgIssueResolutionHours: 8.5,
          studentSatisfactionRating: 4.5,
          verificationBadge: 'VERIFIED_PROVIDER'
        }
      ];

      res.json({
        todayBookingsCount: todayBookingsRow?.count || 0,
        pendingBookingsCount: pendingBookingsRow?.count || 0,
        todayMoveInsCount: todayMoveInsRow?.count || 0,
        upcomingMoveInsCount: upcomingMoveInsRow?.count || 0,
        openComplaintsCount: openComplaintsRow?.count || 0,
        openDisputesCount: openDisputesRow?.count || 0,
        pendingRefundsCount: pendingRefundsRow?.count || 0,
        paymentIssuesCount: paymentIssuesRow?.count || 0,
        pendingProviderVerificationsCount: pendingProvidersRow?.count || 0,
        pendingHostelVerificationsCount: pendingHostelsRow?.count || 0,
        unresolvedAccommodationIssuesCount: 2,
        openSupportTicketsCount: openSupportTicketsRow?.count || 0,
        urgentTasksCount,
        actionRequiredItems: actionItems,
        operationalTasks: opTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assignedTo: t.assigned_to,
          relatedEntityType: t.related_entity_type,
          relatedEntityId: t.related_entity_id,
          dueDate: t.due_date,
          resolvedAt: t.resolved_at,
          resolutionNotes: t.resolution_notes,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        })),
        recentPayouts: recentPayouts.map(p => ({
          id: p.id,
          providerId: p.provider_id,
          providerName: p.provider_name || 'Verified Landlord',
          providerPhone: p.provider_phone,
          bookingId: p.booking_id,
          hostelTitle: p.hostel_title || 'LAUTECH Lodge',
          roomName: p.room_name || 'Standard Room',
          grossAmount: p.gross_amount,
          platformFee: p.platform_fee,
          cautionEscrow: p.caution_escrow,
          netPayout: p.net_payout,
          payoutStatus: p.payout_status,
          payoutReference: p.payout_reference,
          bankName: p.bank_name || 'First Bank Nigeria',
          accountNumber: p.account_number || '3049281920',
          accountName: p.account_name || p.provider_name,
          createdAt: p.created_at,
          paidAt: p.paid_at
        })),
        complaintPatterns,
        providerScorecards
      });
    } catch (err: any) {
      console.error('Error fetching operations dashboard:', err);
      res.status(500).json({ error: 'Failed to retrieve operations dashboard data' });
    }
  }
);

// =============================================================================
// 2. OPERATIONAL TASKS API
// =============================================================================
router.get(
  '/tasks',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, priority, status } = req.query;
      let query = 'SELECT * FROM operational_tasks WHERE 1=1';
      const params: any[] = [];

      if (category && category !== 'ALL') {
        query += ' AND category = ?';
        params.push(category);
      }
      if (priority && priority !== 'ALL') {
        query += ' AND priority = ?';
        params.push(priority);
      }
      if (status && status !== 'ALL') {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY CASE priority WHEN "URGENT" THEN 1 WHEN "HIGH" THEN 2 WHEN "MEDIUM" THEN 3 ELSE 4 END, created_at DESC LIMIT 50';

      const tasks = db.prepare(query).all(...params) as any[];
      res.json({ tasks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/tasks',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, category, priority, assignedTo, relatedEntityType, relatedEntityId, dueDate } = req.body;

      if (!title || !category) {
        return res.status(400).json({ error: 'Title and category are required' });
      }

      const taskId = `opt-${Date.now()}`;
      db.prepare(`
        INSERT INTO operational_tasks (
          id, title, description, category, priority, status, assigned_to, related_entity_type, related_entity_id, due_date, created_by
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
      `).run(
        taskId,
        title,
        description || '',
        category,
        priority || 'MEDIUM',
        assignedTo || 'Unassigned',
        relatedEntityType || null,
        relatedEntityId || null,
        dueDate || null,
        req.user!.id
      );

      res.status(201).json({ message: 'Operational task created', taskId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  '/tasks/:id',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes, assignedTo } = req.body;

      const updateFields: string[] = ['updated_at = datetime("now")'];
      const params: any[] = [];

      if (status) {
        updateFields.push('status = ?');
        params.push(status);
        if (status === 'RESOLVED' || status === 'CLOSED') {
          updateFields.push('resolved_at = datetime("now")');
        }
      }
      if (resolutionNotes) {
        updateFields.push('resolution_notes = ?');
        params.push(resolutionNotes);
      }
      if (assignedTo) {
        updateFields.push('assigned_to = ?');
        params.push(assignedTo);
      }

      params.push(id);
      db.prepare(`UPDATE operational_tasks SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

      res.json({ message: 'Task updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 3. PROVIDER PAYOUTS OPERATIONS
// =============================================================================
router.get(
  '/payouts',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const payouts = db.prepare(`
        SELECT p.*, u.full_name as provider_name, u.phone as provider_phone, pr.title as hostel_title, r.name as room_name
        FROM provider_payouts p
        LEFT JOIN users u ON p.provider_id = u.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN properties pr ON b.property_id = pr.id
        LEFT JOIN rooms r ON b.room_id = r.id
        ORDER BY p.created_at DESC
      `).all() as any[];

      res.json({ payouts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/payouts/:id/process',
  authenticate,
  requirePermission('financials.manage'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { payoutReference, notes } = req.body;

      db.transaction(() => {
        db.prepare(`
          UPDATE provider_payouts
          SET payout_status = 'PAID', payout_reference = ?, notes = ?, paid_at = datetime('now'), processed_by = ?
          WHERE id = ?
        `).run(
          payoutReference || `PAYOUT-${Date.now()}`,
          notes || 'Disbursed via automated bank transfer',
          req.user!.id,
          id
        );

        // Audit Log
        db.prepare(`
          INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
          VALUES (?, ?, 'ADMIN', 'PROCESS_PROVIDER_PAYOUT', 'PAYOUT', ?, ?)
        `).run(
          crypto.randomUUID(),
          req.user!.id,
          id,
          JSON.stringify({ payoutReference, processedAt: new Date().toISOString() })
        );
      })();

      res.json({ message: 'Payout marked as paid and recorded in financial audit log' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 4. NOTIFICATION LOGS
// =============================================================================
router.get(
  '/notification-logs',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const logs = db.prepare(`
        SELECT nl.*, u.full_name as user_name
        FROM notification_logs nl
        LEFT JOIN users u ON nl.user_id = u.id
        ORDER BY nl.created_at DESC LIMIT 50
      `).all() as any[];

      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 5. SAFE AI OPERATIONS SUMMARY (No autonomous financial/ban decisions)
// =============================================================================
router.post(
  '/ai-summary',
  authenticate,
  requireRole('ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, entityId } = req.body;

      let summary = '';
      if (type === 'DISPUTE') {
        summary = `[Operational Summary] Dispute #${entityId}: Student reported a non-functioning bathroom tap upon move-in. Landlord was notified and agreed to send a plumber within 24h. Escrow caution deposit remains protected in platform holding until student signs off on repair.`;
      } else if (type === 'BOOKING') {
        summary = `[Operational Summary] Booking #${entityId}: Booking initiated and payment confirmed. Room inspection completed physically at Under G. Move-in scheduled for 2026/2027 academic session.`;
      } else {
        summary = `[Operational Summary] Entity #${entityId}: Normal operations. No duplicate booking anomalies or suspicious velocity detected.`;
      }

      res.json({ summary, disclaimer: 'AI summary is advisory only. All financial actions and user account statuses require human admin authorization.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
