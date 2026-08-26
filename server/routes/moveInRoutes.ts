import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// HELPER: ENSURE OR INITIALIZE MOVE-IN RECORD & CHECKLIST
// =============================================================================
export function getOrCreateMoveInRecord(bookingId: string) {
  let record = db.prepare(`
    SELECT m.*, b.status as booking_status, b.payment_status, b.move_in_date as booking_move_in_date,
           b.rent_amount, b.caution_deposit, b.service_charge, b.total_cost,
           p.title as property_title, p.address as property_address, p.latitude, p.longitude,
           p.distance_from_campus_km, p.nearby_landmark,
           a.name as area_name,
           r.room_name, r.room_type, r.is_ensuite, r.is_furnished,
           bs.bedspace_number,
           u_student.full_name as student_name, u_student.phone as student_phone, u_student.email as student_email,
           u_prov.full_name as provider_name, u_prov.phone as provider_phone, u_prov.email as provider_email,
           pp.business_name as provider_business_name, pp.office_location as provider_office
    FROM move_in_records m
    JOIN bookings b ON m.booking_id = b.id
    JOIN properties p ON m.property_id = p.id
    LEFT JOIN areas a ON p.area_id = a.id
    JOIN rooms r ON m.room_id = r.id
    LEFT JOIN bedspaces bs ON m.bedspace_id = bs.id
    JOIN users u_student ON m.student_id = u_student.id
    JOIN users u_prov ON m.provider_id = u_prov.id
    LEFT JOIN provider_profiles pp ON u_prov.id = pp.user_id
    WHERE m.booking_id = ?
  `).get(bookingId) as any;

  if (!record) {
    const booking = db.prepare(`
      SELECT b.*, p.title as property_title
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = ?
    `).get(bookingId) as any;

    if (!booking) return null;

    const moveInId = `min-${crypto.randomUUID()}`;
    const defaultInstructions = 'Please arrive between 10:00 AM and 4:00 PM. Meet the caretaker at the main gate for key handoff and physical room inspection.';
    const defaultKeyPoint = 'Hostel Caretaker Office (Gate House)';

    db.prepare(`
      INSERT INTO move_in_records (
        id, booking_id, student_id, provider_id, property_id, room_id, bedspace_id,
        move_in_date, status, move_in_instructions, key_collection_point
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NOT_STARTED', ?, ?)
    `).run(
      moveInId,
      booking.id,
      booking.student_id,
      booking.provider_id,
      booking.property_id,
      booking.room_id,
      booking.bedspace_id || null,
      booking.move_in_date,
      defaultInstructions,
      defaultKeyPoint
    );

    // Initialize Default Move-in Checklist
    const defaultItems = [
      { id: 'chk_pay', category: 'BEFORE_MOVE_IN', title: 'Confirm full payment & digital receipt', isCompleted: booking.payment_status === 'PAID' },
      { id: 'chk_cont', category: 'BEFORE_MOVE_IN', title: 'Contact landlord to confirm arrival time', isCompleted: false },
      { id: 'chk_rules', category: 'BEFORE_MOVE_IN', title: 'Review and acknowledge hostel rules', isCompleted: false },
      { id: 'chk_dir', category: 'BEFORE_MOVE_IN', title: 'Save GPS directions to hostel', isCompleted: false },
      { id: 'chk_docs', category: 'BEFORE_MOVE_IN', title: 'Prepare student ID card & admission documents', isCompleted: false },
      { id: 'chk_ess', category: 'BEFORE_MOVE_IN', title: 'Pack essentials based on room amenities', isCompleted: false },
      { id: 'chk_arr_time', category: 'MOVE_IN_DAY', title: 'Confirm arrival at hostel gate', isCompleted: false },
      { id: 'chk_key', category: 'MOVE_IN_DAY', title: 'Collect room keys from caretaker', isCompleted: false },
      { id: 'chk_light', category: 'MOVE_IN_DAY', title: 'Test light switches & prepaid meter', isCompleted: false },
      { id: 'chk_water', category: 'MOVE_IN_DAY', title: 'Check borehole water flow & bathroom taps', isCompleted: false },
      { id: 'chk_locks', category: 'MOVE_IN_DAY', title: 'Check door lock, latch, and window security', isCompleted: false },
      { id: 'chk_photos', category: 'MOVE_IN_DAY', title: 'Take and upload initial room condition photos', isCompleted: false }
    ];

    db.prepare(`
      INSERT OR IGNORE INTO booking_move_in_checklists (id, booking_id, user_id, checklist_json, is_completed)
      VALUES (?, ?, ?, ?, 0)
    `).run(`bchk-${crypto.randomUUID()}`, booking.id, booking.student_id, JSON.stringify(defaultItems));

    return getOrCreateMoveInRecord(bookingId);
  }

  return record;
}

// =============================================================================
// 1. GET CURRENT ACTIVE STUDENT MOVE-IN DASHBOARD
// =============================================================================
router.get('/student/current', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Find latest active booking (CONFIRMED or PENDING with move-in date)
  const booking = db.prepare(`
    SELECT id FROM bookings
    WHERE student_id = ? AND status IN ('CONFIRMED', 'PENDING', 'COMPLETED')
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId) as any;

  if (!booking) {
    return res.json({ hasActiveMoveIn: false, moveIn: null });
  }

  const record = getOrCreateMoveInRecord(booking.id);
  if (!record) {
    return res.json({ hasActiveMoveIn: false, moveIn: null });
  }

  // Fetch checklist
  const chkRow = db.prepare('SELECT checklist_json, is_completed FROM booking_move_in_checklists WHERE booking_id = ?').get(booking.id) as any;
  let checklistItems: any[] = [];
  try {
    checklistItems = JSON.parse(chkRow?.checklist_json || '[]');
  } catch (e) {
    checklistItems = [];
  }

  const completedCount = checklistItems.filter(i => i.isCompleted).length;
  const totalCount = checklistItems.length || 1;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Fetch photos
  const photos = db.prepare('SELECT * FROM move_in_photos WHERE booking_id = ? ORDER BY created_at DESC').all(booking.id);

  // Fetch open issues
  const issues = db.prepare('SELECT * FROM move_in_issues WHERE booking_id = ? ORDER BY created_at DESC').all(booking.id);

  // Calculate move-in countdown
  const moveInDateObj = new Date(record.move_in_date);
  const now = new Date();
  const diffTime = moveInDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let countdownText = '';
  if (diffDays > 1) {
    countdownText = `Your move-in is in ${diffDays} days`;
  } else if (diffDays === 1) {
    countdownText = 'Move-in tomorrow';
  } else if (diffDays === 0) {
    countdownText = 'MOVE-IN DAY';
  } else {
    countdownText = record.status === 'MOVED_IN' ? 'Moved In' : 'Move-in date passed';
  }

  // Cover image
  const coverMedia = db.prepare(`
    SELECT url FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1
  `).get(record.property_id) as any;

  res.json({
    hasActiveMoveIn: true,
    moveIn: {
      id: record.id,
      bookingId: record.booking_id,
      status: record.status,
      moveInDate: record.move_in_date,
      scheduledArrivalTime: record.scheduled_arrival_time || '10:00 AM - 4:00 PM',
      countdownText,
      diffDays,
      arrivalConfirmedAt: record.arrival_confirmed_at,
      acceptedAt: record.accepted_at,
      postMoveInRating: record.post_move_in_rating,
      postMoveInFeedback: record.post_move_in_feedback,
      instructions: record.move_in_instructions || 'Meet the caretaker at the main gate for key handoff.',
      keyCollectionPoint: record.key_collection_point || 'Hostel Main Gate',
      emergencyContactPhone: record.emergency_contact_phone || record.provider_phone,
      hostel: {
        id: record.property_id,
        title: record.property_title,
        address: record.property_address,
        coverImage: coverMedia?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
        areaName: record.area_name || 'LAUTECH Off-Campus',
        distanceFromCampusKm: record.distance_from_campus_km || 0.8,
        nearbyLandmark: record.nearby_landmark || 'Under G / Bovas Station',
        latitude: record.latitude || 8.1438,
        longitude: record.longitude || 4.2638
      },
      room: {
        id: record.room_id,
        name: record.room_name,
        type: record.room_type,
        isEnsuite: Boolean(record.is_ensuite),
        isFurnished: Boolean(record.is_furnished),
        bedspaceNumber: record.bedspace_number ? `Bedspace ${record.bedspace_number}` : 'Whole Room'
      },
      provider: {
        id: record.provider_id,
        name: record.provider_name,
        businessName: record.provider_business_name,
        phone: record.provider_phone,
        email: record.provider_email,
        officeLocation: record.provider_office
      },
      payment: {
        status: record.payment_status || 'UNPAID',
        isPaid: record.payment_status === 'PAID',
        rentAmount: record.rent_amount,
        serviceCharge: record.service_charge,
        cautionDeposit: record.caution_deposit,
        totalCost: record.total_cost,
        outstandingAmount: record.payment_status === 'PAID' ? 0 : record.total_cost
      },
      checklist: {
        items: checklistItems,
        completedCount,
        totalCount,
        completionPercentage,
        isCompleted: Boolean(chkRow?.is_completed)
      },
      photos,
      issues
    }
  });
});

// =============================================================================
// 2. GET STUDENT ACCOMMODATION STAY HISTORY
// =============================================================================
router.get('/student/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const stays = db.prepare(`
    SELECT b.id as bookingId, b.booking_reference, b.status as bookingStatus, b.payment_status,
           b.move_in_date, b.duration_months, b.academic_session, b.rent_amount, b.caution_deposit,
           b.created_at as bookedAt,
           p.id as propertyId, p.title as propertyTitle, p.address as propertyAddress,
           a.name as areaName,
           (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as coverImage,
           r.room_name as roomName, r.room_type as roomType,
           u_prov.full_name as providerName,
           m.status as moveInStatus, m.arrival_confirmed_at, m.accepted_at, m.post_move_in_rating,
           mor.status as moveOutStatus, mor.move_out_date, mor.deposit_refund_status
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    LEFT JOIN areas a ON p.area_id = a.id
    JOIN rooms r ON b.room_id = r.id
    JOIN users u_prov ON b.provider_id = u_prov.id
    LEFT JOIN move_in_records m ON b.id = m.booking_id
    LEFT JOIN move_out_records mor ON b.id = mor.booking_id
    WHERE b.student_id = ?
    ORDER BY b.created_at DESC
  `).all(userId) as any[];

  res.json({ stays });
});

// =============================================================================
// 3. GET SINGLE BOOKING MOVE-IN DETAILS
// =============================================================================
router.get('/:bookingId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) {
    return res.status(404).json({ error: 'Move-in record not found' });
  }

  // Authorization Check
  if (userRole !== 'ADMIN' && record.student_id !== userId && record.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to view this move-in record' });
  }

  const chkRow = db.prepare('SELECT checklist_json, is_completed FROM booking_move_in_checklists WHERE booking_id = ?').get(bookingId) as any;
  let checklistItems: any[] = [];
  try {
    checklistItems = JSON.parse(chkRow?.checklist_json || '[]');
  } catch (e) {
    checklistItems = [];
  }

  const photos = db.prepare('SELECT * FROM move_in_photos WHERE booking_id = ? ORDER BY created_at DESC').all(bookingId);
  const issues = db.prepare('SELECT * FROM move_in_issues WHERE booking_id = ? ORDER BY created_at DESC').all(bookingId);
  const conditionReport = db.prepare('SELECT * FROM move_in_condition_reports WHERE booking_id = ?').get(bookingId);
  const rulesAck = db.prepare('SELECT * FROM rule_acknowledgements WHERE booking_id = ?').get(bookingId);
  const moveOutRecord = db.prepare('SELECT * FROM move_out_records WHERE booking_id = ?').get(bookingId);

  res.json({
    record,
    checklist: checklistItems,
    photos,
    issues,
    conditionReport,
    isRulesAcknowledged: Boolean(rulesAck),
    moveOutRecord
  });
});

// =============================================================================
// 4. UPDATE MOVE-IN CHECKLIST (PERSISTENT & OFFLINE-SYNCABLE)
// =============================================================================
router.patch('/:bookingId/checklist', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const booking = db.prepare('SELECT student_id, provider_id FROM bookings WHERE id = ?').get(bookingId) as any;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (req.user!.role !== 'ADMIN' && booking.student_id !== userId && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to update checklist' });
  }

  const isCompleted = items.length > 0 && items.every((i: any) => i.isCompleted) ? 1 : 0;

  db.prepare(`
    INSERT INTO booking_move_in_checklists (id, booking_id, user_id, checklist_json, is_completed, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(booking_id) DO UPDATE SET
      checklist_json = excluded.checklist_json,
      is_completed = excluded.is_completed,
      updated_at = datetime('now')
  `).run(`bchk-${crypto.randomUUID()}`, bookingId, booking.student_id, JSON.stringify(items), isCompleted);

  // Update status to PREPARING if not already progressed
  db.prepare(`
    UPDATE move_in_records
    SET status = 'PREPARING', updated_at = datetime('now')
    WHERE booking_id = ? AND status = 'NOT_STARTED'
  `).run(bookingId);

  res.json({ message: 'Move-in checklist synchronized successfully', isCompleted: Boolean(isCompleted) });
});

// =============================================================================
// 5. CONFIRM STUDENT ARRIVAL ("I've Arrived")
// =============================================================================
router.post('/:bookingId/arrival', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the booked student can confirm arrival' });
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE move_in_records
      SET status = 'ARRIVED',
          arrival_confirmed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(record.id);

    db.prepare(`
      UPDATE bookings
      SET move_in_status = 'ARRIVED', updated_at = datetime('now')
      WHERE id = ?
    `).run(bookingId);

    // Notify Provider
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, '📍 Student Arrived at Hostel', ?, 'BOOKING_UPDATE', ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      record.provider_id,
      `${record.student_name} has arrived at ${record.property_title}. Please hand over keys and inspect the room.`,
      `/provider-portal`
    );
  })();

  res.json({ message: 'Arrival confirmed successfully', status: 'ARRIVED' });
});

// =============================================================================
// 6. CONFIRM MOVE-IN ACCEPTANCE ("Move-In Accepted")
// =============================================================================
router.post('/:bookingId/accept', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the booked student can accept accommodation' });
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE move_in_records
      SET status = 'MOVED_IN',
          accepted_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(record.id);

    db.prepare(`
      UPDATE bookings
      SET status = 'COMPLETED', move_in_status = 'MOVED_IN', updated_at = datetime('now')
      WHERE id = ?
    `).run(bookingId);

    // Notify Provider
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, '🎉 Move-In Confirmed', ?, 'BOOKING_UPDATE', ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      record.provider_id,
      `${record.student_name} has successfully inspected and moved into Room ${record.room_name}.`,
      `/provider-portal`
    );
  })();

  res.json({ message: 'Accommodation access confirmed and move-in completed', status: 'MOVED_IN' });
});

// =============================================================================
// 7. SUBMIT MOVE-IN CONDITION REPORT & ROOM CHECK
// =============================================================================
router.post('/:bookingId/condition-report', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const {
    overallCondition = 'GOOD', // 'GOOD', 'MINOR_ISSUES', 'MAJOR_ISSUES', 'NOT_AS_DESCRIBED'
    roomChecks = {},
    comments = ''
  } = req.body;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the tenant can submit room condition reports' });
  }

  const reportId = `mcr-${crypto.randomUUID()}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO move_in_condition_reports (
        id, move_in_record_id, booking_id, student_id, overall_condition, room_checks_json, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      record.id,
      bookingId,
      userId,
      overallCondition,
      JSON.stringify(roomChecks),
      comments.trim()
    );

    // If Major Issues or Not As Described, notify landlord immediately
    if (['MAJOR_ISSUES', 'NOT_AS_DESCRIBED'].includes(overallCondition)) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, '⚠️ Move-In Room Condition Alert', ?, 'DISPUTE_UPDATE', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        record.provider_id,
        `${record.student_name} noted ${overallCondition.replace(/_/g, ' ')} during move-in room check for ${record.property_title}.`,
        `/provider-portal`
      );
    }
  })();

  res.status(201).json({ message: 'Room condition report saved successfully', reportId, overallCondition });
});

// =============================================================================
// 8. UPLOAD MOVE-IN PHOTOS
// =============================================================================
router.post('/:bookingId/photos', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { photoUrl, category = 'GENERAL', caption = '' } = req.body;

  if (!photoUrl) {
    return res.status(400).json({ error: 'photoUrl is required' });
  }

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (userRole !== 'ADMIN' && record.student_id !== userId && record.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to add photos to this booking' });
  }

  const photoId = `mph-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO move_in_photos (id, move_in_record_id, booking_id, uploader_id, uploader_role, photo_url, category, caption)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(photoId, record.id, bookingId, userId, userRole, photoUrl, category, caption.trim());

  res.status(201).json({ message: 'Move-in condition photo uploaded', photoId, photoUrl });
});

// =============================================================================
// 9. REPORT MOVE-IN ISSUE
// =============================================================================
router.post('/:bookingId/issues', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const {
    category = 'OTHER', // 'ELECTRICITY', 'WATER', 'ROOM', 'FURNITURE', 'SECURITY', 'CLEANLINESS', 'BATHROOM', 'INTERNET', 'OTHER'
    severity = 'MEDIUM', // 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    title,
    description,
    evidence = []
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the student can report move-in issues' });
  }

  const issueId = `mis-${crypto.randomUUID()}`;
  const issueCode = `ISSUE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  db.transaction(() => {
    db.prepare(`
      INSERT INTO move_in_issues (
        id, issue_code, move_in_record_id, booking_id, student_id, provider_id, property_id,
        category, severity, status, title, description, evidence_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
    `).run(
      issueId,
      issueCode,
      record.id,
      bookingId,
      userId,
      record.provider_id,
      record.property_id,
      category,
      severity,
      title.trim(),
      description.trim(),
      JSON.stringify(evidence)
    );

    // Notify Provider
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, '🔧 New Move-In Issue Reported', ?, 'BOOKING_UPDATE', ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      record.provider_id,
      `[${severity}] ${title.trim()} reported by ${record.student_name} for ${record.property_title}.`,
      `/provider-portal`
    );
  })();

  res.status(201).json({ message: 'Move-in issue submitted successfully', issueId, issueCode });
});

// =============================================================================
// 10. LIST ISSUES FOR BOOKING
// =============================================================================
router.get('/:bookingId/issues', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare('SELECT student_id, provider_id FROM bookings WHERE id = ?').get(bookingId) as any;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (userRole !== 'ADMIN' && booking.student_id !== userId && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to view issues for this booking' });
  }

  const issues = db.prepare('SELECT * FROM move_in_issues WHERE booking_id = ? ORDER BY created_at DESC').all(bookingId);
  res.json({ issues });
});

// =============================================================================
// 11. PROVIDER ACTIONS ON MOVE-IN ISSUE (Acknowledge, Respond, Resolve)
// =============================================================================
router.patch('/issues/:issueId/provider-action', authenticate, requireRole('PROVIDER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { issueId } = req.params;
  const userId = req.user!.id;
  const { actionStatus = 'IN_PROGRESS', responseText = '' } = req.body;

  const issue = db.prepare('SELECT * FROM move_in_issues WHERE id = ?').get(issueId) as any;
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  if (req.user!.role !== 'ADMIN' && issue.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to respond to this issue' });
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE move_in_issues
      SET status = ?,
          provider_response = ?,
          provider_action_date = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(actionStatus, responseText.trim(), issue.id);

    // Notify Student
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url)
      VALUES (?, ?, '🔧 Landlord Responded to Issue', ?, 'BOOKING_UPDATE', ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      issue.student_id,
      `Landlord updated issue #${issue.issue_code}: "${responseText.trim() || actionStatus}"`,
      `/student/move-in`
    );
  })();

  res.json({ message: 'Issue updated by provider', status: actionStatus });
});

// =============================================================================
// 12. STUDENT CONFIRM ISSUE RESOLUTION
// =============================================================================
router.patch('/issues/:issueId/student-confirm', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { issueId } = req.params;
  const userId = req.user!.id;
  const { isResolved, feedbackNotes = '' } = req.body;

  const issue = db.prepare('SELECT * FROM move_in_issues WHERE id = ?').get(issueId) as any;
  if (!issue) return res.status(404).json({ error: 'Issue not found' });

  if (req.user!.role !== 'ADMIN' && issue.student_id !== userId) {
    return res.status(403).json({ error: 'Only the tenant can confirm issue resolution' });
  }

  db.transaction(() => {
    if (isResolved) {
      db.prepare(`
        UPDATE move_in_issues
        SET status = 'RESOLVED',
            student_confirmed_resolved = 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(issue.id);
    } else {
      // Escalate to Phase 11 Dispute if unresolved
      const disputeCode = `DISP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const disputeId = `disp-${crypto.randomUUID()}`;

      db.prepare(`
        INSERT INTO disputes (
          id, dispute_code, booking_id, student_id, provider_id, property_id,
          category, subject, description, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'HOSTEL_NOT_AS_DESCRIBED', ?, ?, 'OPEN')
      `).run(
        disputeId,
        disputeCode,
        issue.booking_id,
        issue.student_id,
        issue.provider_id,
        issue.property_id,
        `Unresolved Move-In Issue: ${issue.title}`,
        `Student confirmed issue remains unresolved after landlord response: ${feedbackNotes || issue.description}`
      );

      db.prepare(`
        UPDATE move_in_issues
        SET status = 'ESCALATED',
            escalated_dispute_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(disputeId, issue.id);
    }
  })();

  res.json({ message: isResolved ? 'Issue marked resolved by student' : 'Issue escalated to Trust & Safety dispute center' });
});

// =============================================================================
// 13. ACKNOWLEDGE HOSTEL RULES
// =============================================================================
router.post('/:bookingId/rules/acknowledge', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const { version = 1 } = req.body;

  const booking = db.prepare('SELECT student_id FROM bookings WHERE id = ?').get(bookingId) as any;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the booked student can acknowledge rules' });
  }

  db.prepare(`
    INSERT INTO rule_acknowledgements (id, booking_id, student_id, rule_version, acknowledged_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(`rack-${crypto.randomUUID()}`, bookingId, userId, version);

  res.json({ message: 'Hostel rules acknowledged successfully', version });
});

// =============================================================================
// 14. PROVIDER MOVE-IN MANAGEMENT DASHBOARD
// =============================================================================
router.get('/provider/overview', authenticate, requireRole('PROVIDER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const moveIns = db.prepare(`
    SELECT m.*, b.booking_reference, b.rent_amount, b.caution_deposit, b.payment_status,
           p.title as property_title, r.room_name, bs.bedspace_number,
           u.full_name as student_name, u.phone as student_phone, u.email as student_email
    FROM move_in_records m
    JOIN bookings b ON m.booking_id = b.id
    JOIN properties p ON m.property_id = p.id
    JOIN rooms r ON m.room_id = r.id
    LEFT JOIN bedspaces bs ON m.bedspace_id = bs.id
    JOIN users u ON m.student_id = u.id
    WHERE m.provider_id = ?
    ORDER BY m.move_in_date ASC
  `).all(userId) as any[];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMoveIns = moveIns.filter(m => m.move_in_date === todayStr);
  const upcomingMoveIns = moveIns.filter(m => m.move_in_date > todayStr);
  const openIssues = db.prepare(`
    SELECT mi.*, p.title as property_title, u.full_name as student_name
    FROM move_in_issues mi
    JOIN properties p ON mi.property_id = p.id
    JOIN users u ON mi.student_id = u.id
    WHERE mi.provider_id = ? AND mi.status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS')
    ORDER BY mi.created_at DESC
  `).all(userId);

  res.json({
    todayMoveIns,
    upcomingMoveIns,
    completedMoveIns: moveIns.filter(m => m.status === 'MOVED_IN' || m.status === 'COMPLETED'),
    openIssues,
    totalMoveIns: moveIns.length
  });
});

// =============================================================================
// 15. UPDATE PROVIDER MOVE-IN INSTRUCTIONS & ARRIVAL TIME
// =============================================================================
router.patch('/provider/:bookingId/instructions', authenticate, requireRole('PROVIDER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const { moveInInstructions, keyCollectionPoint, emergencyPhone, scheduledArrivalTime } = req.body;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Move-in record not found' });

  if (req.user!.role !== 'ADMIN' && record.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to update instructions for this booking' });
  }

  db.prepare(`
    UPDATE move_in_records
    SET move_in_instructions = COALESCE(?, move_in_instructions),
        key_collection_point = COALESCE(?, key_collection_point),
        emergency_contact_phone = COALESCE(?, emergency_contact_phone),
        scheduled_arrival_time = COALESCE(?, scheduled_arrival_time),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    moveInInstructions?.trim(),
    keyCollectionPoint?.trim(),
    emergencyPhone?.trim(),
    scheduledArrivalTime?.trim(),
    record.id
  );

  res.json({ message: 'Move-in instructions updated successfully' });
});

// =============================================================================
// 16. MOVE-OUT CHECKLIST & INITIATION
// =============================================================================
router.post('/:bookingId/move-out', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const { moveOutDate, checklist = {} } = req.body;

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Booking record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the tenant can confirm move-out' });
  }

  const moveOutId = `mout-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO move_out_records (
      id, booking_id, student_id, provider_id, property_id, move_out_date,
      status, checklist_json, deposit_paid, student_confirmed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'STUDENT_CONFIRMED', ?, ?, datetime('now'))
    ON CONFLICT(booking_id) DO UPDATE SET
      move_out_date = excluded.move_out_date,
      status = 'STUDENT_CONFIRMED',
      checklist_json = excluded.checklist_json,
      student_confirmed_at = datetime('now'),
      updated_at = datetime('now')
  `).run(
    moveOutId,
    bookingId,
    userId,
    record.provider_id,
    record.property_id,
    moveOutDate || new Date().toISOString().split('T')[0],
    JSON.stringify(checklist),
    record.caution_deposit || 0
  );

  res.json({ message: 'Move-out confirmation submitted successfully' });
});

// =============================================================================
// 17. POST-MOVE-IN CHECK-IN FEEDBACK (😊 Good / 😐 Some problems / 😞 Serious)
// =============================================================================
router.post('/:bookingId/check-in-feedback', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { bookingId } = req.params;
  const userId = req.user!.id;
  const { rating, feedbackText = '' } = req.body; // 'GOOD', 'MINOR_PROBLEMS', 'SERIOUS_PROBLEM'

  if (!rating) return res.status(400).json({ error: 'rating is required' });

  const record = getOrCreateMoveInRecord(bookingId);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  if (record.student_id !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only the tenant can submit check-in feedback' });
  }

  db.prepare(`
    UPDATE move_in_records
    SET post_move_in_rating = ?,
        post_move_in_feedback = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(rating, feedbackText.trim(), record.id);

  res.json({ message: 'Post-move-in check-in feedback saved' });
});

export default router;
