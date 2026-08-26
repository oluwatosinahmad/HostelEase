import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper: Log Status Transition
function logStatusTransition(inspectionId: string, actorId: string, actorRole: string, prevStatus: string, newStatus: string, notes?: string) {
  try {
    db.prepare(`
      INSERT INTO inspection_status_history (id, inspection_id, actor_id, actor_role, previous_status, new_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      inspectionId,
      actorId,
      actorRole,
      prevStatus,
      newStatus,
      notes || null
    );
  } catch (err) {
    console.error('Failed to log inspection status transition:', err);
  }
}

// Helper: Send in-app notification
function sendNotification(userId: string, title: string, message: string, type: string, linkUrl?: string) {
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link_url)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(crypto.randomUUID(), userId, title, message, type, linkUrl || null);
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

// Helper: Post system message in conversation
function postSystemMessage(propertyId: string, studentId: string, providerId: string, content: string, metadata?: any) {
  try {
    // Find or create conversation
    let conv = db.prepare(`
      SELECT id FROM conversations WHERE property_id = ? AND student_id = ? AND provider_id = ?
    `).get(propertyId, studentId, providerId) as any;

    let convId = conv?.id;
    if (!convId) {
      convId = `conv-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(convId, propertyId, studentId, providerId, content);
    } else {
      db.prepare(`
        UPDATE conversations
        SET last_message_text = ?, last_message_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(content, convId);
    }

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, metadata_json, is_read)
      VALUES (?, ?, 'SYSTEM', 'SYSTEM', 'SYSTEM_EVENT', ?, ?, 0)
    `).run(
      crypto.randomUUID(),
      convId,
      content,
      metadata ? JSON.stringify(metadata) : null
    );
  } catch (err) {
    console.error('Failed to post system message:', err);
  }
}

// ----------------------------------------------------
// 1. REQUEST AN INSPECTION (from Hostel Details page)
// ----------------------------------------------------
router.post('/properties/:propertyId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { propertyId } = req.params;
  const { inspectionType, preferredDate, preferredTime, roomId, studentPhone, notes } = req.body;

  if (!inspectionType || !preferredDate || !preferredTime) {
    return res.status(400).json({ error: 'Inspection type, preferred date, and preferred time are required' });
  }

  if (!['PHYSICAL', 'VIRTUAL'].includes(inspectionType)) {
    return res.status(400).json({ error: 'Inspection type must be PHYSICAL or VIRTUAL' });
  }

  // Prevent booking past dates
  const todayStr = new Date().toISOString().split('T')[0];
  if (preferredDate < todayStr) {
    return res.status(400).json({ error: 'Preferred inspection date cannot be in the past' });
  }

  try {
    const property = db.prepare('SELECT id, title, provider_id FROM properties WHERE id = ?').get(propertyId) as any;
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check duplicate active inspection for this student and property
    const duplicate = db.prepare(`
      SELECT id, status, preferred_date, preferred_time 
      FROM inspection_requests 
      WHERE student_id = ? AND property_id = ? AND status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED')
    `).get(req.user.id, propertyId) as any;

    if (duplicate) {
      return res.status(400).json({ 
        error: `You already have an active inspection request (${duplicate.status}) for this hostel on ${duplicate.preferred_date} at ${duplicate.preferred_time}.`
      });
    }

    const inspectionId = `insp-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO inspection_requests (
        id, student_id, property_id, room_id, inspection_type, preferred_date, preferred_time,
        student_phone, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'), datetime('now'))
    `).run(
      inspectionId,
      req.user.id,
      propertyId,
      roomId || null,
      inspectionType,
      preferredDate,
      preferredTime,
      studentPhone || req.user.phone || null,
      notes || null
    );

    // Status log
    logStatusTransition(inspectionId, req.user.id, req.user.role, 'NONE', 'PENDING', 'Inspection requested by student');

    // Notify provider
    sendNotification(
      property.provider_id,
      'New Inspection Request',
      `A student requested a ${inspectionType.toLowerCase()} inspection for ${property.title} on ${preferredDate} at ${preferredTime}.`,
      'INSPECTION_REQUEST',
      `/provider/inspections`
    );

    // Create system card in chat
    postSystemMessage(
      propertyId,
      req.user.id,
      property.provider_id,
      `Inspection request submitted for ${preferredDate} at ${preferredTime} (${inspectionType} inspection).`,
      { inspectionId, status: 'PENDING', preferredDate, preferredTime, inspectionType }
    );

    return res.status(201).json({
      message: `Inspection request submitted for ${property.title}. The provider will review and confirm your slot.`,
      inspectionId
    });
  } catch (err: any) {
    console.error('Request inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit inspection request' });
  }
});

// ----------------------------------------------------
// 2. LIST INSPECTIONS (Role-Aware)
// ----------------------------------------------------
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { status, type } = req.query;

  try {
    let query = '';
    const params: any[] = [];

    if (req.user.role === 'STUDENT') {
      query = `
        SELECT ir.*, p.title as property_title, p.address as property_address,
               p.nearby_landmark, a.name as area_name, u.full_name as provider_name,
               u.phone as provider_phone,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
               r.room_name
        FROM inspection_requests ir
        JOIN properties p ON ir.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u ON p.provider_id = u.id
        LEFT JOIN rooms r ON ir.room_id = r.id
        WHERE ir.student_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'PROVIDER') {
      query = `
        SELECT ir.*, p.title as property_title, p.address as property_address,
               a.name as area_name, u.full_name as student_name, u.email as student_email,
               u.phone as student_account_phone,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
               r.room_name
        FROM inspection_requests ir
        JOIN properties p ON ir.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u ON ir.student_id = u.id
        LEFT JOIN rooms r ON ir.room_id = r.id
        WHERE p.provider_id = ?
      `;
      params.push(req.user.id);
    } else if (req.user.role === 'ADMIN') {
      query = `
        SELECT ir.*, p.title as property_title, p.address as property_address,
               a.name as area_name, u_s.full_name as student_name, u_s.email as student_email,
               u_p.full_name as provider_name, u_p.phone as provider_phone,
               (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
               r.room_name
        FROM inspection_requests ir
        JOIN properties p ON ir.property_id = p.id
        JOIN areas a ON p.area_id = a.id
        JOIN users u_s ON ir.student_id = u_s.id
        JOIN users u_p ON p.provider_id = u_p.id
        LEFT JOIN rooms r ON ir.room_id = r.id
        WHERE 1=1
      `;
    }

    if (status && status !== 'ALL') {
      query += ' AND ir.status = ?';
      params.push(status);
    }

    if (type && type !== 'ALL') {
      query += ' AND ir.inspection_type = ?';
      params.push(type);
    }

    query += ' ORDER BY ir.preferred_date DESC, ir.preferred_time DESC';

    const requests = db.prepare(query).all(...params) as any[];

    return res.json({
      inspections: requests.map((r: any) => ({
        id: r.id,
        propertyId: r.property_id,
        propertyTitle: r.property_title,
        propertyAddress: r.property_address,
        nearbyLandmark: r.nearby_landmark,
        areaName: r.area_name,
        coverImage: r.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        roomId: r.room_id,
        roomName: r.room_name,
        inspectionType: r.inspection_type,
        preferredDate: r.preferred_date,
        preferredTime: r.preferred_time,
        proposedAlternativeDate: r.proposed_alternative_date,
        proposedAlternativeTime: r.proposed_alternative_time,
        studentPhone: r.student_phone || r.student_account_phone,
        notes: r.notes,
        status: r.status,
        providerResponse: r.provider_response,
        rescheduleReason: r.reschedule_reason,
        cancellationReason: r.cancellation_reason,
        virtualMeetingUrl: (r.status === 'CONFIRMED' || r.status === 'COMPLETED') ? r.virtual_meeting_url : null,
        privateStudentNotes: req.user!.role === 'STUDENT' ? r.private_student_notes : null,
        feedbackRating: r.feedback_rating,
        feedbackComment: r.feedback_comment,
        studentName: r.student_name,
        studentEmail: r.student_email,
        providerName: r.provider_name,
        providerPhone: r.provider_phone,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (err: any) {
    console.error('Fetch inspections error:', err);
    return res.status(500).json({ error: 'Failed to retrieve inspection requests' });
  }
});

// ----------------------------------------------------
// 3. PROVIDER ACCEPT INSPECTION
// ----------------------------------------------------
router.patch('/:id/accept', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { message } = req.body;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only accommodation providers can accept inspection requests' });
    }

    if (req.user.role === 'PROVIDER' && inspection.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this hostel inspection' });
    }

    if (!['PENDING', 'RESCHEDULE_REQUESTED'].includes(inspection.status)) {
      return res.status(400).json({ error: `Cannot accept an inspection with status ${inspection.status}` });
    }

    // Generate secure virtual link if VIRTUAL
    let virtualUrl = inspection.virtual_meeting_url;
    if (inspection.inspection_type === 'VIRTUAL' && !virtualUrl) {
      virtualUrl = `https://meet.hostelease.ng/room/he-${crypto.randomBytes(8).toString('hex')}`;
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'CONFIRMED',
          virtual_meeting_url = ?,
          provider_response = COALESCE(?, provider_response),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(virtualUrl, message || 'Inspection slot confirmed by landlord', id);

    logStatusTransition(id, req.user.id, req.user.role, inspection.status, 'CONFIRMED', message || 'Accepted');

    // Notify student
    sendNotification(
      inspection.student_id,
      'Inspection Request Confirmed! 🎉',
      `Your ${inspection.inspection_type.toLowerCase()} inspection for ${inspection.property_title} on ${inspection.preferred_date} at ${inspection.preferred_time} has been accepted.`,
      'INSPECTION_CONFIRMED',
      `/student/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Inspection confirmed for ${inspection.preferred_date} at ${inspection.preferred_time}.`,
      { inspectionId: id, status: 'CONFIRMED', virtualMeetingUrl: virtualUrl }
    );

    return res.json({ message: 'Inspection accepted and confirmed successfully', virtualMeetingUrl: virtualUrl });
  } catch (err: any) {
    console.error('Accept inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to accept inspection' });
  }
});

// ----------------------------------------------------
// 4. PROVIDER DECLINE INSPECTION
// ----------------------------------------------------
router.patch('/:id/decline', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only accommodation providers can decline inspection requests' });
    }

    if (req.user.role === 'PROVIDER' && inspection.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this hostel inspection' });
    }

    if (inspection.status !== 'PENDING' && inspection.status !== 'RESCHEDULE_REQUESTED') {
      return res.status(400).json({ error: `Cannot decline an inspection with status ${inspection.status}` });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'CANCELLED',
          cancellation_reason = ?,
          provider_response = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reason || 'Declined by provider', reason || 'Provider unavailable at requested time', id);

    logStatusTransition(id, req.user.id, req.user.role, inspection.status, 'CANCELLED', reason || 'Declined');

    // Notify student
    sendNotification(
      inspection.student_id,
      'Inspection Request Declined',
      `Your inspection request for ${inspection.property_title} could not be accepted. Reason: ${reason || 'Provider unavailable'}.`,
      'INSPECTION_CANCELLED',
      `/student/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Inspection declined by provider: ${reason || 'Slot unavailable'}.`,
      { inspectionId: id, status: 'CANCELLED' }
    );

    return res.json({ message: 'Inspection request declined' });
  } catch (err: any) {
    console.error('Decline inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to decline inspection' });
  }
});

// ----------------------------------------------------
// 5. PROVIDER PROPOSE RESCHEDULE
// ----------------------------------------------------
router.patch('/:id/reschedule', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { alternativeDate, alternativeTime, message } = req.body;

  if (!alternativeDate || !alternativeTime) {
    return res.status(400).json({ error: 'Alternative date and time are required for rescheduling' });
  }

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only accommodation providers can suggest a reschedule' });
    }

    if (req.user.role === 'PROVIDER' && inspection.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to manage this hostel inspection' });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'RESCHEDULE_REQUESTED',
          proposed_alternative_date = ?,
          proposed_alternative_time = ?,
          reschedule_reason = ?,
          provider_response = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(alternativeDate, alternativeTime, message || 'Provider proposed a new time slot', message || null, id);

    logStatusTransition(id, req.user.id, req.user.role, inspection.status, 'RESCHEDULE_REQUESTED', `Proposed: ${alternativeDate} at ${alternativeTime}`);

    // Notify student
    sendNotification(
      inspection.student_id,
      'New Inspection Time Proposed',
      `The provider for ${inspection.property_title} suggested rescheduling your inspection to ${alternativeDate} at ${alternativeTime}.`,
      'INSPECTION_RESCHEDULE',
      `/student/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Reschedule proposed for ${alternativeDate} at ${alternativeTime}. Reason: ${message || 'Alternative slot suggested'}.`,
      { inspectionId: id, status: 'RESCHEDULE_REQUESTED', proposedDate: alternativeDate, proposedTime: alternativeTime }
    );

    return res.json({ message: 'Reschedule proposal sent to student' });
  } catch (err: any) {
    console.error('Reschedule inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to suggest reschedule' });
  }
});

// ----------------------------------------------------
// 6. STUDENT CONFIRM PROPOSED RESCHEDULE
// ----------------------------------------------------
router.patch('/:id/confirm-reschedule', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (req.user.role === 'STUDENT' && inspection.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (inspection.status !== 'RESCHEDULE_REQUESTED') {
      return res.status(400).json({ error: 'Inspection is not in reschedule requested status' });
    }

    const newDate = inspection.proposed_alternative_date || inspection.preferred_date;
    const newTime = inspection.proposed_alternative_time || inspection.preferred_time;

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'CONFIRMED',
          preferred_date = ?,
          preferred_time = ?,
          proposed_alternative_date = NULL,
          proposed_alternative_time = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(newDate, newTime, id);

    logStatusTransition(id, req.user.id, req.user.role, 'RESCHEDULE_REQUESTED', 'CONFIRMED', 'Student confirmed proposed reschedule');

    // Notify provider
    sendNotification(
      inspection.provider_id,
      'Reschedule Confirmed by Student',
      `Student confirmed inspection for ${inspection.property_title} on ${newDate} at ${newTime}.`,
      'INSPECTION_CONFIRMED',
      `/provider/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Reschedule confirmed for ${newDate} at ${newTime}.`,
      { inspectionId: id, status: 'CONFIRMED', preferredDate: newDate, preferredTime: newTime }
    );

    return res.json({ message: 'Reschedule confirmed successfully' });
  } catch (err: any) {
    console.error('Confirm reschedule error:', err);
    return res.status(500).json({ error: err.message || 'Failed to confirm reschedule' });
  }
});

// ----------------------------------------------------
// 7. CANCEL INSPECTION (Student or Provider)
// ----------------------------------------------------
router.patch('/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    const isStudent = req.user.role === 'STUDENT' && inspection.student_id === req.user.id;
    const isProvider = req.user.role === 'PROVIDER' && inspection.provider_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to cancel this inspection' });
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(inspection.status)) {
      return res.status(400).json({ error: `Cannot cancel an inspection that is already ${inspection.status}` });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'CANCELLED',
          cancellation_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reason || `Cancelled by ${req.user.role.toLowerCase()}`, id);

    logStatusTransition(id, req.user.id, req.user.role, inspection.status, 'CANCELLED', reason);

    // Notify opposite party
    const targetUserId = isStudent ? inspection.provider_id : inspection.student_id;
    sendNotification(
      targetUserId,
      'Inspection Cancelled',
      `The inspection for ${inspection.property_title} was cancelled. Reason: ${reason || 'Not specified'}.`,
      'INSPECTION_CANCELLED',
      isStudent ? `/provider/inspections` : `/student/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Inspection cancelled by ${req.user.role.toLowerCase()}. Reason: ${reason || 'Cancelled'}.`,
      { inspectionId: id, status: 'CANCELLED' }
    );

    return res.json({ message: 'Inspection cancelled successfully' });
  } catch (err: any) {
    console.error('Cancel inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel inspection' });
  }
});

// ----------------------------------------------------
// 8. MARK INSPECTION COMPLETED
// ----------------------------------------------------
router.patch('/:id/complete', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    const isStudent = req.user.role === 'STUDENT' && inspection.student_id === req.user.id;
    const isProvider = req.user.role === 'PROVIDER' && inspection.provider_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (inspection.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Only confirmed inspections can be marked as completed' });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'COMPLETED',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    logStatusTransition(id, req.user.id, req.user.role, 'CONFIRMED', 'COMPLETED', 'Marked as completed');

    // Notify student to write private notes / feedback
    sendNotification(
      inspection.student_id,
      'Inspection Completed — How Was It?',
      `Your inspection for ${inspection.property_title} is marked complete. You can add private notes to remember key details.`,
      'INSPECTION_COMPLETED',
      `/student/inspections`
    );

    // Post in conversation
    postSystemMessage(
      inspection.property_id,
      inspection.student_id,
      inspection.provider_id,
      `Inspection completed successfully.`,
      { inspectionId: id, status: 'COMPLETED' }
    );

    return res.json({ message: 'Inspection marked as completed' });
  } catch (err: any) {
    console.error('Complete inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to complete inspection' });
  }
});

// ----------------------------------------------------
// 9. MARK NO-SHOW
// ----------------------------------------------------
router.patch('/:id/no-show', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.title as property_title, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only providers can record a no-show' });
    }

    if (req.user.role === 'PROVIDER' && inspection.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (inspection.status !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Only confirmed inspections can be marked as no-show' });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET status = 'NO_SHOW',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    logStatusTransition(id, req.user.id, req.user.role, 'CONFIRMED', 'NO_SHOW', 'Marked as no-show');

    return res.json({ message: 'Inspection marked as no-show' });
  } catch (err: any) {
    console.error('No-show inspection error:', err);
    return res.status(500).json({ error: err.message || 'Failed to mark no-show' });
  }
});

// ----------------------------------------------------
// 10. PRIVATE STUDENT NOTES
// ----------------------------------------------------
router.post('/:id/private-notes', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const inspection = db.prepare('SELECT student_id FROM inspection_requests WHERE id = ?').get(id) as any;
    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (inspection.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Private notes can only be managed by the student who requested the inspection' });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET private_student_notes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(notes || null, id);

    return res.json({ message: 'Private inspection notes saved successfully' });
  } catch (err: any) {
    console.error('Save private notes error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save private notes' });
  }
});

// ----------------------------------------------------
// 11. INSPECTION FEEDBACK (1-5 Experience Rating)
// ----------------------------------------------------
router.post('/:id/feedback', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const inspection = db.prepare('SELECT student_id, status FROM inspection_requests WHERE id = ?').get(id) as any;
    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    if (inspection.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (inspection.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Feedback can only be submitted after inspection is completed' });
    }

    db.prepare(`
      UPDATE inspection_requests
      SET feedback_rating = ?,
          feedback_comment = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(rating, comment || null, id);

    return res.json({ message: 'Thank you for your inspection feedback!' });
  } catch (err: any) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit feedback' });
  }
});

// ----------------------------------------------------
// 12. SECURE VIRTUAL MEETING LINK ACCESS
// ----------------------------------------------------
router.get('/:id/virtual-link', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const inspection = db.prepare(`
      SELECT ir.*, p.provider_id 
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.id = ?
    `).get(id) as any;

    if (!inspection) return res.status(404).json({ error: 'Inspection request not found' });

    const isStudent = req.user.role === 'STUDENT' && inspection.student_id === req.user.id;
    const isProvider = req.user.role === 'PROVIDER' && inspection.provider_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isStudent && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You are not an authorized participant in this virtual inspection' });
    }

    if (inspection.status !== 'CONFIRMED' && inspection.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Virtual meeting link is only accessible for confirmed inspections' });
    }

    return res.json({
      virtualMeetingUrl: inspection.virtual_meeting_url,
      inspectionType: inspection.inspection_type,
      preferredDate: inspection.preferred_date,
      preferredTime: inspection.preferred_time
    });
  } catch (err: any) {
    console.error('Virtual link access error:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve virtual meeting link' });
  }
});

// ----------------------------------------------------
// 13. PROVIDER CALENDAR GROUPING
// ----------------------------------------------------
router.get('/calendar', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || (req.user.role !== 'PROVIDER' && req.user.role !== 'ADMIN')) {
    return res.status(403).json({ error: 'Provider authorization required' });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const sql = `
      SELECT ir.*, p.title as property_title, p.address as property_address,
             a.name as area_name, u.full_name as student_name, u.phone as student_account_phone,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             r.room_name
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      JOIN areas a ON p.area_id = a.id
      JOIN users u ON ir.student_id = u.id
      LEFT JOIN rooms r ON ir.room_id = r.id
      WHERE p.provider_id = ?
      ORDER BY ir.preferred_date ASC, ir.preferred_time ASC
    `;

    const allInspections = db.prepare(sql).all(req.user.id) as any[];

    const todayList = allInspections.filter(i => i.preferred_date === todayStr && i.status === 'CONFIRMED');
    const tomorrowList = allInspections.filter(i => i.preferred_date === tomorrowStr && i.status === 'CONFIRMED');
    const upcomingList = allInspections.filter(i => i.preferred_date > tomorrowStr && i.status === 'CONFIRMED');
    const pendingList = allInspections.filter(i => i.status === 'PENDING' || i.status === 'RESCHEDULE_REQUESTED');
    const completedList = allInspections.filter(i => i.status === 'COMPLETED');

    return res.json({
      todayCount: todayList.length,
      tomorrowCount: tomorrowList.length,
      upcomingCount: upcomingList.length,
      pendingCount: pendingList.length,
      today: todayList,
      tomorrow: tomorrowList,
      upcoming: upcomingList,
      pending: pendingList,
      completed: completedList
    });
  } catch (err: any) {
    console.error('Calendar error:', err);
    return res.status(500).json({ error: err.message || 'Failed to load calendar' });
  }
});

export default router;
