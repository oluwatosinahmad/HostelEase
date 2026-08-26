import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest, requireRole, requirePermission } from '../middleware/auth.js';

const router = Router();

// Helper to generate dispute code (e.g. DISP-2026-081293)
function generateDisputeCode(): string {
  const currentYear = new Date().getFullYear();
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    code = `DISP-${currentYear}-${randomDigits}`;
    const existing = db.prepare('SELECT id FROM disputes WHERE dispute_code = ?').get(code);
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}

// 1. Student creates formal dispute
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const studentId = req.user!.id;
  const {
    bookingId,
    category, // 'HOSTEL_NOT_AS_DESCRIBED', 'PROVIDER_ISSUE', 'PAYMENT_ISSUE', 'BOOKING_ISSUE', 'REFUND_ISSUE', 'INSPECTION_ISSUE', 'SAFETY_ISSUE', 'OTHER'
    subject,
    description,
    evidence = [] // Array of URLs / photo strings
  } = req.body;

  if (!bookingId || !category || !subject || !description) {
    return res.status(400).json({ error: 'Missing required dispute fields (bookingId, category, subject, description)' });
  }

  const validCategories = [
    'HOSTEL_NOT_AS_DESCRIBED', 'PROVIDER_ISSUE', 'PAYMENT_ISSUE',
    'BOOKING_ISSUE', 'REFUND_ISSUE', 'INSPECTION_ISSUE', 'SAFETY_ISSUE', 'OTHER'
  ];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid dispute category' });
  }

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(bookingId, bookingId) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Associated booking reservation not found' });
  }

  if (req.user!.role !== 'ADMIN' && booking.student_id !== studentId) {
    return res.status(403).json({ error: 'You can only file disputes on your own bookings' });
  }

  const disputeId = `disp-${crypto.randomUUID()}`;
  const disputeCode = generateDisputeCode();

  try {
    db.transaction(() => {
      // 1. Insert Dispute Record
      db.prepare(`
        INSERT INTO disputes (
          id, dispute_code, booking_id, student_id, provider_id, property_id,
          category, subject, description, evidence_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', datetime('now'), datetime('now'))
      `).run(
        disputeId,
        disputeCode,
        booking.id,
        studentId,
        booking.provider_id,
        booking.property_id,
        category,
        subject.trim(),
        description.trim(),
        JSON.stringify(evidence)
      );

      // 2. Initial Dispute Message
      db.prepare(`
        INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, message, evidence_json, is_internal_note)
        VALUES (?, ?, ?, 'STUDENT', ?, ?, 0)
      `).run(
        `dmsg-${crypto.randomUUID()}`,
        disputeId,
        studentId,
        description.trim(),
        JSON.stringify(evidence)
      );

      // 3. Notify Landlord
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'DISPUTE_OPENED', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        booking.provider_id,
        '⚠️ Dispute Filed for Booking',
        `A dispute (${disputeCode}) has been filed for ${booking.propertyTitle} (Booking Ref: ${booking.booking_reference}). Our trust & safety team is reviewing.`,
        `/disputes/${disputeId}`
      );

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'STUDENT', 'DISPUTE_OPENED', 'DISPUTE', ?, ?)
      `).run(
        crypto.randomUUID(),
        studentId,
        disputeId,
        JSON.stringify({ disputeCode, bookingReference: booking.booking_reference, category, subject })
      );
    })();

    res.status(201).json({
      message: 'Dispute submitted successfully. Our Trust & Safety team is reviewing.',
      disputeId,
      disputeCode
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to file dispute' });
  }
});

// 2. Student / Provider gets their disputes
router.get('/my', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let query = `
    SELECT d.*,
           b.booking_reference, b.rent_amount, b.total_cost,
           p.title as property_title, p.address as property_address,
           u_student.full_name as student_name,
           u_prov.full_name as provider_name
    FROM disputes d
    JOIN bookings b ON d.booking_id = b.id
    JOIN properties p ON d.property_id = p.id
    JOIN users u_student ON d.student_id = u_student.id
    JOIN users u_prov ON d.provider_id = u_prov.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (userRole === 'STUDENT') {
    query += ' AND d.student_id = ?';
    params.push(userId);
  } else if (userRole === 'PROVIDER') {
    query += ' AND d.provider_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY d.created_at DESC';

  const disputes = db.prepare(query).all(...params) as any[];

  res.json({
    disputes: disputes.map(d => ({
      id: d.id,
      disputeCode: d.dispute_code,
      bookingId: d.booking_id,
      bookingReference: d.booking_reference,
      propertyTitle: d.property_title,
      category: d.category,
      subject: d.subject,
      description: d.description,
      status: d.status,
      resolutionType: d.resolution_type,
      resolutionNotes: d.resolution_notes,
      refundAmount: d.refund_amount,
      studentName: d.student_name,
      providerName: d.provider_name,
      evidence: JSON.parse(d.evidence_json || '[]'),
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
  });
});

// 3. Get single dispute details & timeline
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const dispute = db.prepare(`
    SELECT d.*,
           b.booking_reference, b.rent_amount, b.total_cost, b.move_in_date, b.payment_status,
           p.title as property_title, p.address as property_address,
           u_student.full_name as student_name, u_student.email as student_email, u_student.phone as student_phone,
           u_prov.full_name as provider_name, u_prov.email as provider_email, u_prov.phone as provider_phone
    FROM disputes d
    JOIN bookings b ON d.booking_id = b.id
    JOIN properties p ON d.property_id = p.id
    JOIN users u_student ON d.student_id = u_student.id
    JOIN users u_prov ON d.provider_id = u_prov.id
    WHERE d.id = ? OR d.dispute_code = ?
  `).get(id, id) as any;

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute record not found' });
  }

  // Authorization check
  if (userRole !== 'ADMIN' && dispute.student_id !== userId && dispute.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to view this dispute' });
  }

  // Fetch messages (strip internal admin notes if user is not admin)
  const isAdm = userRole === 'ADMIN';
  const messages = db.prepare(`
    SELECT dm.*, u.full_name as sender_name
    FROM dispute_messages dm
    JOIN users u ON u.id = dm.sender_id
    WHERE dm.dispute_id = ? ${isAdm ? '' : 'AND dm.is_internal_note = 0'}
    ORDER BY dm.created_at ASC
  `).all(dispute.id) as any[];

  res.json({
    dispute: {
      id: dispute.id,
      disputeCode: dispute.dispute_code,
      bookingId: dispute.booking_id,
      bookingReference: dispute.booking_reference,
      category: dispute.category,
      subject: dispute.subject,
      description: dispute.description,
      status: dispute.status,
      resolutionType: dispute.resolution_type,
      resolutionNotes: dispute.resolution_notes,
      refundAmount: dispute.refund_amount,
      evidence: JSON.parse(dispute.evidence_json || '[]'),
      property: {
        id: dispute.property_id,
        title: dispute.property_title,
        address: dispute.property_address
      },
      student: {
        id: dispute.student_id,
        name: dispute.student_name,
        email: dispute.student_email,
        phone: dispute.student_phone
      },
      provider: {
        id: dispute.provider_id,
        name: dispute.provider_name,
        email: dispute.provider_email,
        phone: dispute.provider_phone
      },
      booking: {
        totalCost: dispute.total_cost,
        moveInDate: dispute.move_in_date,
        paymentStatus: dispute.payment_status
      },
      createdAt: dispute.created_at,
      updatedAt: dispute.updated_at
    },
    messages: messages.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      message: m.message,
      isInternalNote: Boolean(m.is_internal_note),
      evidence: JSON.parse(m.evidence_json || '[]'),
      createdAt: m.created_at
    }))
  });
});

// 4. Post message to dispute timeline
router.post('/:id/messages', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const senderId = req.user!.id;
  const userRole = req.user!.role;
  const { message, evidence = [], isInternalNote } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ? OR dispute_code = ?').get(id, id) as any;
  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  if (userRole !== 'ADMIN' && dispute.student_id !== senderId && dispute.provider_id !== senderId) {
    return res.status(403).json({ error: 'Unauthorized to post messages on this dispute' });
  }

  const msgId = `dmsg-${crypto.randomUUID()}`;
  const senderType = userRole === 'ADMIN' ? 'ADMIN' : userRole === 'PROVIDER' ? 'PROVIDER' : 'STUDENT';
  const isNote = userRole === 'ADMIN' && Boolean(isInternalNote);

  db.transaction(() => {
    db.prepare(`
      INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, message, evidence_json, is_internal_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(msgId, dispute.id, senderId, senderType, message.trim(), JSON.stringify(evidence), isNote ? 1 : 0);

    db.prepare("UPDATE disputes SET updated_at = datetime('now') WHERE id = ?").run(dispute.id);
  })();

  res.status(201).json({ message: 'Dispute reply submitted', messageId: msgId });
});

// 5. Admin resolves dispute with optional ledger refund
router.patch('/:id/resolve', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.id;
  const {
    resolutionType, // 'FULL_REFUND', 'PARTIAL_REFUND', 'NO_ACTION', 'PROVIDER_WARNING', 'LISTING_SUSPENDED', 'OTHER'
    resolutionNotes,
    refundAmount = 0
  } = req.body;

  if (!resolutionType || !resolutionNotes) {
    return res.status(400).json({ error: 'resolutionType and resolutionNotes are required' });
  }

  const dispute = db.prepare(`
    SELECT d.*, b.booking_reference, b.student_id, b.provider_id, b.property_id
    FROM disputes d
    JOIN bookings b ON d.booking_id = b.id
    WHERE d.id = ? OR d.dispute_code = ?
  `).get(id, id) as any;

  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const actualRefund = Number(refundAmount) || 0;

  try {
    db.transaction(() => {
      // 1. Update Dispute Status
      db.prepare(`
        UPDATE disputes
        SET status = 'RESOLVED',
            resolution_type = ?,
            resolution_notes = ?,
            refund_amount = ?,
            resolved_by = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(resolutionType, resolutionNotes.trim(), actualRefund, adminId, dispute.id);

      // 2. If refund approved, record in financial ledger & update booking payment status
      if (actualRefund > 0 && ['FULL_REFUND', 'PARTIAL_REFUND'].includes(resolutionType)) {
        const refundRef = `HE-REF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        db.prepare(`
          INSERT INTO financial_ledger (
            id, booking_id, entry_type, amount, currency, debit_account, credit_account, description
          ) VALUES (?, ?, 'REFUND_DEBITED', ?, 'NGN', 'GATEWAY_ESCROW', 'STUDENT_ACCOUNT', ?)
        `).run(
          `ledg-${crypto.randomUUID()}`,
          dispute.booking_id,
          actualRefund,
          `Dispute Resolution Refund (${dispute.dispute_code}): ${resolutionNotes.trim()}`
        );

        db.prepare(`
          UPDATE bookings
          SET payment_status = 'REFUNDED',
              cancellation_fee = 0,
              expected_refund_amount = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(actualRefund, dispute.booking_id);
      }

      // 3. Post system resolution message in dispute thread
      db.prepare(`
        INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, message, is_internal_note)
        VALUES (?, ?, ?, 'ADMIN', ?, 0)
      `).run(
        `dmsg-${crypto.randomUUID()}`,
        dispute.id,
        adminId,
        `✅ Dispute officially RESOLVED by Trust & Safety Team.\nResolution: ${resolutionType}\nNotes: ${resolutionNotes.trim()}${actualRefund > 0 ? `\nRefund Granted: ₦${actualRefund.toLocaleString()}` : ''}`
      );

      // 4. Dispatch Notifications
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'DISPUTE_RESOLVED', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        dispute.student_id,
        '🛡️ Dispute Resolved',
        `Your dispute (${dispute.dispute_code}) has been resolved: ${resolutionType}. ${resolutionNotes.trim()}`,
        `/disputes/${dispute.id}`
      );

      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'DISPUTE_RESOLVED', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        dispute.provider_id,
        '🛡️ Dispute Resolved',
        `Dispute (${dispute.dispute_code}) for your listing has been resolved: ${resolutionType}.`,
        `/disputes/${dispute.id}`
      );

      // 5. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'ADMIN', 'DISPUTE_RESOLVED', 'DISPUTE', ?, ?)
      `).run(
        crypto.randomUUID(),
        adminId,
        dispute.id,
        JSON.stringify({ disputeCode: dispute.dispute_code, resolutionType, refundAmount: actualRefund, resolutionNotes })
      );
    })();

    res.json({ message: 'Dispute resolved successfully', disputeId: dispute.id, status: 'RESOLVED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve dispute' });
  }
});

// 6. Admin lists all disputes
router.get('/admin/all', authenticate, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { status, category } = req.query;

  let query = `
    SELECT d.*,
           b.booking_reference, b.total_cost,
           p.title as property_title,
           u_student.full_name as student_name, u_student.email as student_email,
           u_prov.full_name as provider_name
    FROM disputes d
    JOIN bookings b ON d.booking_id = b.id
    JOIN properties p ON d.property_id = p.id
    JOIN users u_student ON d.student_id = u_student.id
    JOIN users u_prov ON d.provider_id = u_prov.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' AND d.status = ?';
    params.push(status);
  }
  if (category && category !== 'all') {
    query += ' AND d.category = ?';
    params.push(category);
  }

  query += ' ORDER BY d.created_at DESC LIMIT 100';

  const disputes = db.prepare(query).all(...params) as any[];

  res.json({
    disputes: disputes.map(d => ({
      id: d.id,
      disputeCode: d.dispute_code,
      bookingId: d.booking_id,
      bookingReference: d.booking_reference,
      propertyTitle: d.property_title,
      category: d.category,
      subject: d.subject,
      description: d.description,
      status: d.status,
      resolutionType: d.resolution_type,
      resolutionNotes: d.resolution_notes,
      refundAmount: d.refund_amount,
      studentName: d.student_name,
      studentEmail: d.student_email,
      providerName: d.provider_name,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }))
  });
});

export default router;
