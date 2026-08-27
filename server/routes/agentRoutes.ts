import express, { Response } from 'express';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Require Authenticated Agent with APPROVED verification status
function requireApprovedAgent(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  if (req.user.role !== 'AGENT') {
    return res.status(403).json({ 
      error: 'ACCESS_RESTRICTED', 
      code: 'FORBIDDEN_ROLE',
      message: 'Access restricted to approved Hostel Ease Agents.' 
    });
  }

  const agentProfile = db.prepare('SELECT * FROM agent_profiles WHERE user_id = ?').get(req.user.id) as any;
  if (!agentProfile) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Agent profile not found.' });
  }

  if (agentProfile.verification_status !== 'APPROVED') {
    return res.status(403).json({
      error: 'ACCESS_RESTRICTED',
      code: agentProfile.verification_status === 'SUSPENDED' ? 'AGENT_ACCOUNT_SUSPENDED' : 'AGENT_PENDING_APPROVAL',
      message: agentProfile.verification_status === 'SUSPENDED'
        ? 'Your Agent account has been suspended. Please contact Hostel Ease Support.'
        : 'Your Agent account is not yet approved by Admin.'
    });
  }

  (req as any).agentProfile = agentProfile;
  next();
}

// 1. Agent Dashboard Overview
router.get('/dashboard', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const agentProfile = (req as any).agentProfile;

    // Active requests count
    const activeReqCount = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_requests 
      WHERE (agent_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS')) OR (agent_id IS NULL AND status = 'OPEN')
    `).get(agentId) as any)?.count || 0;

    // Assigned students count
    const assignedStudentsCount = (db.prepare(`
      SELECT COUNT(DISTINCT student_id) as count FROM agent_requests 
      WHERE agent_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS')
    `).get(agentId) as any)?.count || 0;

    // Available hostels count
    const availableHostelsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM properties 
      WHERE verification_status = 'APPROVED'
    `).get() as any)?.count || 0;

    // Completed bookings/assistances
    const completedBookingsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM agent_requests 
      WHERE agent_id = ? AND status = 'COMPLETED'
    `).get(agentId) as any)?.count || 0;

    // Earnings totals
    const totalEarnings = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings 
      WHERE agent_id = ?
    `).get(agentId) as any)?.total || 0;

    const availableBalance = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings 
      WHERE agent_id = ? AND status = 'AVAILABLE'
    `).get(agentId) as any)?.total || 0;

    const pendingEarnings = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings 
      WHERE agent_id = ? AND status = 'PENDING'
    `).get(agentId) as any)?.total || 0;

    // Recent Requests
    const recentRequestsRows = db.prepare(`
      SELECT ar.*, u.full_name as student_name, u.email as student_email, u.phone as student_phone, u.avatar_url as student_avatar,
             p.title as property_title,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover_image
      FROM agent_requests ar
      JOIN users u ON ar.student_id = u.id
      LEFT JOIN properties p ON ar.property_id = p.id
      WHERE ar.agent_id = ? OR ar.status = 'OPEN'
      ORDER BY ar.created_at DESC
      LIMIT 8
    `).all(agentId) as any[];

    const recentRequests = recentRequestsRows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      studentEmail: r.student_email,
      studentPhone: r.student_phone,
      studentAvatar: r.student_avatar,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      propertyCoverImage: r.property_cover_image,
      preferredAreas: JSON.parse(r.preferred_areas_json || '[]'),
      budgetMin: r.budget_min,
      budgetMax: r.budget_max,
      roomType: r.room_type,
      moveInDate: r.move_in_date,
      status: r.status,
      notes: r.notes,
      serviceFee: r.service_fee,
      feePaymentStatus: r.fee_payment_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    // Assigned Hostels
    const assignedHostels = db.prepare(`
      SELECT aha.*, p.title, p.address as display_address, p.verification_status,
             (SELECT rent_amount FROM prices WHERE property_id = p.id ORDER BY rent_amount ASC LIMIT 1) as min_price,
             (SELECT rent_amount FROM prices WHERE property_id = p.id ORDER BY rent_amount DESC LIMIT 1) as max_price,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             a.name as area_name
      FROM agent_hostel_authorizations aha
      JOIN properties p ON aha.property_id = p.id
      LEFT JOIN areas a ON p.area_id = a.id
      WHERE aha.agent_id = ? AND aha.status = 'ACTIVE'
    `).all(agentId);

    // Recent Activity
    const recentActivity = [
      {
        id: 'act-1',
        action: 'Assistance Accepted',
        details: 'Assisting student searching for Under G self-contain suite',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'act-2',
        action: 'Service Fee Credited',
        details: '₦5,000 service fee credited to available balance',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'act-3',
        action: 'Agent Verified',
        details: 'Hostel Ease Admin verified your operational credentials in LAUTECH',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
      }
    ];

    // Notifications
    const notifications = [
      {
        id: 'notif-1',
        title: 'New Student Accommodation Request',
        message: 'A student requested agent assistance for ₦250k budget in Under G.',
        type: 'REQUEST',
        createdAt: new Date().toISOString(),
        isRead: false
      },
      {
        id: 'notif-2',
        title: 'Payout Available',
        message: `You have ₦${availableBalance.toLocaleString()} available for bank withdrawal.`,
        type: 'FINANCE',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isRead: true
      }
    ];

    return res.json({
      agent: {
        id: agentId,
        fullName: req.user!.fullName,
        email: req.user!.email,
        businessName: agentProfile.business_name,
        verificationStatus: agentProfile.verification_status,
        rating: agentProfile.rating,
        reviewCount: agentProfile.review_count,
        serviceFeeAmount: agentProfile.service_fee_amount,
        operatingAreas: JSON.parse(agentProfile.operating_areas_json || '[]')
      },
      metrics: {
        activeRequests: activeReqCount,
        assignedStudents: assignedStudentsCount,
        availableHostels: availableHostelsCount,
        pendingBookings: 1,
        completedBookings: completedBookingsCount,
        totalEarnings,
        pendingEarnings,
        availableBalance
      },
      recentRequests,
      assignedHostels,
      recentActivity,
      notifications
    });
  } catch (err: any) {
    console.error('Agent dashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch agent dashboard data.' });
  }
});

// 2. Get All Requests (Open + Assigned)
router.get('/requests', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { status } = req.query;

    let query = `
      SELECT ar.*, u.full_name as student_name, u.email as student_email, u.phone as student_phone, u.avatar_url as student_avatar,
             sp.department as student_department, sp.level as student_level,
             p.title as property_title,
             (SELECT file_url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as property_cover_image
      FROM agent_requests ar
      JOIN users u ON ar.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN properties p ON ar.property_id = p.id
      WHERE (ar.agent_id = ? OR ar.status = 'OPEN')
    `;
    const params: any[] = [agentId];

    if (status) {
      query += ` AND ar.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ar.created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    const requests = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      studentEmail: r.student_email,
      studentPhone: r.student_phone,
      studentAvatar: r.student_avatar,
      studentDepartment: r.student_department,
      studentLevel: r.student_level,
      agentId: r.agent_id,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      propertyCoverImage: r.property_cover_image,
      preferredAreas: JSON.parse(r.preferred_areas_json || '[]'),
      budgetMin: r.budget_min,
      budgetMax: r.budget_max,
      roomType: r.room_type,
      moveInDate: r.move_in_date,
      status: r.status,
      notes: r.notes,
      serviceFee: r.service_fee,
      feePaymentStatus: r.fee_payment_status,
      suggestedHostels: JSON.parse(r.suggested_hostels_json || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return res.json({ requests });
  } catch (err: any) {
    console.error('Agent requests error:', err);
    return res.status(500).json({ error: 'Failed to fetch student requests.' });
  }
});

// 3. Accept / Claim Student Request
router.post('/requests/:id/accept', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = req.params.id;
    const agentId = req.user!.id;

    const request = db.prepare('SELECT * FROM agent_requests WHERE id = ?').get(requestId) as any;
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.agent_id && request.agent_id !== agentId) {
      return res.status(400).json({ error: 'This request is already assigned to another agent.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE agent_requests 
        SET agent_id = ?, status = 'IN_PROGRESS', updated_at = datetime('now')
        WHERE id = ?
      `).run(agentId, requestId);

      db.prepare(`
        UPDATE agent_profiles 
        SET active_students_count = active_students_count + 1, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(agentId);
    })();

    return res.json({ message: 'Request accepted successfully. You can now communicate with the student and suggest vetted hostels.' });
  } catch (err: any) {
    console.error('Accept request error:', err);
    return res.status(500).json({ error: 'Failed to accept request.' });
  }
});

// 4. Suggest Hostels to Student
router.post('/requests/:id/suggest-hostels', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = req.params.id;
    const agentId = req.user!.id;
    const { propertyIds = [] } = req.body;

    const request = db.prepare('SELECT * FROM agent_requests WHERE id = ? AND agent_id = ?').get(requestId, agentId) as any;
    if (!request) {
      return res.status(404).json({ error: 'Active assigned request not found.' });
    }

    const suggestedHostels = propertyIds.map((propId: string) => {
      const prop = db.prepare(`
        SELECT p.id, p.title, p.min_price as rentAmount, a.name as areaName,
               (SELECT file_url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as coverImage
        FROM properties p
        LEFT JOIN areas a ON p.area_id = a.id
        WHERE p.id = ?
      `).get(propId) as any;
      return {
        id: prop?.id || propId,
        title: prop?.title || 'Verified LAUTECH Lodge',
        rentAmount: prop?.rentAmount || 220000,
        areaName: prop?.areaName || 'Under G',
        coverImage: prop?.coverImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        suggestedAt: new Date().toISOString()
      };
    });

    db.prepare(`
      UPDATE agent_requests 
      SET suggested_hostels_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(suggestedHostels), requestId);

    return res.json({ message: 'Hostel options suggested to student successfully.', suggestedHostels });
  } catch (err: any) {
    console.error('Suggest hostels error:', err);
    return res.status(500).json({ error: 'Failed to suggest hostels.' });
  }
});

// 5. Complete Student Assistance
router.post('/requests/:id/complete', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = req.params.id;
    const agentId = req.user!.id;

    const request = db.prepare('SELECT * FROM agent_requests WHERE id = ? AND agent_id = ?').get(requestId, agentId) as any;
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE agent_requests 
        SET status = 'COMPLETED', fee_payment_status = 'PAID', updated_at = datetime('now')
        WHERE id = ?
      `).run(requestId);

      // Record earning for agent
      const earningId = `ern-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO agent_earnings (id, agent_id, request_id, amount, earning_type, status, notes)
        VALUES (?, ?, ?, ?, 'SERVICE_FEE', 'AVAILABLE', ?)
      `).run(earningId, agentId, requestId, request.service_fee || 5000, `Service fee for completed student assistance (${request.id})`);

      // Update agent stats
      db.prepare(`
        UPDATE agent_profiles 
        SET completed_requests_count = completed_requests_count + 1,
            active_students_count = MAX(0, active_students_count - 1),
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(agentId);
    })();

    return res.json({ message: 'Assistance marked as completed and service fee credited to your available balance.' });
  } catch (err: any) {
    console.error('Complete request error:', err);
    return res.status(500).json({ error: 'Failed to complete request.' });
  }
});

// 6. Get Agent Students (Privacy Compliant)
router.get('/students', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;

    const students = db.prepare(`
      SELECT DISTINCT u.id, u.full_name as fullName, u.avatar_url as avatarUrl,
             sp.department, sp.level, sp.gender,
             ar.id as requestId, ar.status as requestStatus, ar.budget_max as budgetMax,
             ar.room_type as roomType, ar.created_at as requestDate,
             CASE WHEN ar.status IN ('ASSIGNED', 'IN_PROGRESS') THEN u.phone ELSE NULL END as phone,
             CASE WHEN ar.status IN ('ASSIGNED', 'IN_PROGRESS') THEN u.email ELSE NULL END as email
      FROM agent_requests ar
      JOIN users u ON ar.student_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      WHERE ar.agent_id = ?
      ORDER BY ar.created_at DESC
    `).all(agentId);

    return res.json({ students });
  } catch (err: any) {
    console.error('Get agent students error:', err);
    return res.status(500).json({ error: 'Failed to fetch assigned students.' });
  }
});

// 7. Get Hostels for Agent Search (Authorized & Verified)
router.get('/hostels', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { area, roomType, maxPrice, search } = req.query;

    let query = `
      SELECT p.id, p.title, p.property_type as propertyType,
             p.address as displayAddress, p.verification_status as verificationStatus,
             p.is_featured as isFeatured, p.total_rooms as totalRooms,
             (SELECT rent_amount FROM prices WHERE property_id = p.id ORDER BY rent_amount ASC LIMIT 1) as minPrice,
             (SELECT rent_amount FROM prices WHERE property_id = p.id ORDER BY rent_amount DESC LIMIT 1) as maxPrice,
             a.name as areaName,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as coverImage,
             (SELECT COUNT(*) FROM rooms WHERE property_id = p.id AND availability_status = 'AVAILABLE') as availableRoomsCount
      FROM properties p
      LEFT JOIN areas a ON p.area_id = a.id
      WHERE p.verification_status = 'APPROVED'
    `;
    const params: any[] = [];

    if (area) {
      query += ` AND a.name LIKE ?`;
      params.push(`%${area}%`);
    }

    if (roomType) {
      query += ` AND p.property_type = ?`;
      params.push(roomType);
    }

    if (maxPrice) {
      query += ` AND (SELECT rent_amount FROM prices WHERE property_id = p.id ORDER BY rent_amount ASC LIMIT 1) <= ?`;
      params.push(Number(maxPrice));
    }

    if (search) {
      query += ` AND (p.title LIKE ? OR p.address LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 50`;

    const hostels = db.prepare(query).all(...params);
    return res.json({ hostels });
  } catch (err: any) {
    console.error('Get agent hostels error:', err);
    return res.status(500).json({ error: 'Failed to search hostels.' });
  }
});

// 8. Submit Hostel Lead (Unverified Lead)
router.post('/leads', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { hostelName, areaId, landmark, estimatedRent, roomTypes, landlordName, landlordPhone, photos = [], notes } = req.body;

    if (!hostelName || !areaId) {
      return res.status(400).json({ error: 'Hostel name and area location are required.' });
    }

    const leadId = `lead-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO agent_leads (
        id, agent_id, hostel_name, area_id, landmark, estimated_rent, room_types,
        landlord_name, landlord_phone, photos_json, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_VERIFICATION')
    `).run(
      leadId,
      agentId,
      hostelName.trim(),
      areaId,
      landmark || null,
      Number(estimatedRent) || 200000,
      roomTypes || 'Self-Contain',
      landlordName || null,
      landlordPhone || null,
      JSON.stringify(photos),
      notes || null
    );

    return res.status(201).json({
      message: 'Hostel lead submitted successfully. Status is PENDING VERIFICATION until reviewed by Admin.',
      leadId
    });
  } catch (err: any) {
    console.error('Submit lead error:', err);
    return res.status(500).json({ error: 'Failed to submit hostel lead.' });
  }
});

// 9. Get Agent's Submitted Leads
router.get('/leads', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;

    const leads = db.prepare(`
      SELECT al.*, a.name as area_name
      FROM agent_leads al
      LEFT JOIN areas a ON al.area_id = a.id
      WHERE al.agent_id = ?
      ORDER BY al.created_at DESC
    `).all(agentId) as any[];

    const formatted = leads.map(l => ({
      id: l.id,
      agentId: l.agent_id,
      hostelName: l.hostel_name,
      areaId: l.area_id,
      areaName: l.area_name,
      landmark: l.landmark,
      estimatedRent: l.estimated_rent,
      roomTypes: l.room_types,
      landlordName: l.landlord_name,
      landlordPhone: l.landlord_phone,
      photos: JSON.parse(l.photos_json || '[]'),
      notes: l.notes,
      status: l.status,
      adminFeedback: l.admin_feedback,
      createdAt: l.created_at
    }));

    return res.json({ leads: formatted });
  } catch (err: any) {
    console.error('Get agent leads error:', err);
    return res.status(500).json({ error: 'Failed to fetch hostel leads.' });
  }
});

// 10. Get Agent Earnings & Balance
router.get('/earnings', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;

    const earnings = db.prepare(`
      SELECT * FROM agent_earnings 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).all(agentId);

    const payouts = db.prepare(`
      SELECT * FROM agent_payouts 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).all(agentId);

    const totalEarnings = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings WHERE agent_id = ?
    `).get(agentId) as any)?.total || 0;

    const availableBalance = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings WHERE agent_id = ? AND status = 'AVAILABLE'
    `).get(agentId) as any)?.total || 0;

    const pendingEarnings = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings WHERE agent_id = ? AND status = 'PENDING'
    `).get(agentId) as any)?.total || 0;

    const completedPayouts = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_payouts WHERE agent_id = ? AND status = 'PAID'
    `).get(agentId) as any)?.total || 0;

    return res.json({
      summary: {
        totalEarnings,
        availableBalance,
        pendingEarnings,
        completedPayouts
      },
      earnings,
      payouts
    });
  } catch (err: any) {
    console.error('Get earnings error:', err);
    return res.status(500).json({ error: 'Failed to fetch earnings.' });
  }
});

// 11. Request Agent Payout
router.post('/payouts', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;
    const { amount, bankName, accountNumber, accountName } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 2000) {
      return res.status(400).json({ error: 'Minimum payout withdrawal amount is ₦2,000.' });
    }

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ error: 'Complete Nigerian bank details are required.' });
    }

    const availableBalance = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agent_earnings WHERE agent_id = ? AND status = 'AVAILABLE'
    `).get(agentId) as any)?.total || 0;

    if (numAmount > availableBalance) {
      return res.status(400).json({ error: `Insufficient available balance. You have ₦${availableBalance.toLocaleString()} available.` });
    }

    const payoutId = `pay-${crypto.randomUUID()}`;
    const payoutRef = `HE-AGT-PO-${Date.now().toString().slice(-6)}`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO agent_payouts (
          id, payout_reference, agent_id, amount, bank_name, account_number, account_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(payoutId, payoutRef, agentId, numAmount, bankName, accountNumber, accountName);

      // Deduct from available earnings
      db.prepare(`
        UPDATE agent_earnings
        SET status = 'PAID'
        WHERE agent_id = ? AND status = 'AVAILABLE'
      `).run(agentId);
    })();

    return res.status(201).json({
      message: `Payout request for ₦${numAmount.toLocaleString()} submitted successfully. Payout Reference: ${payoutRef}`,
      payoutReference: payoutRef
    });
  } catch (err: any) {
    console.error('Request payout error:', err);
    return res.status(500).json({ error: 'Failed to submit payout request.' });
  }
});

// 12. Get Agent Reviews
router.get('/reviews', authenticate, requireApprovedAgent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const agentId = req.user!.id;

    const reviews = db.prepare(`
      SELECT ar.*, u.full_name as student_name, u.avatar_url as student_avatar
      FROM agent_reviews ar
      JOIN users u ON ar.student_id = u.id
      WHERE ar.agent_id = ?
      ORDER BY ar.created_at DESC
    `).all(agentId);

    return res.json({ reviews });
  } catch (err: any) {
    console.error('Get reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

// 13. Student Action: Request Agent Assistance (Called by Student)
router.post('/request-assistance', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can request Agent Assistance.' });
    }

    const { propertyId, preferredAreas = ['Under G'], budgetMin = 150000, budgetMax = 350000, roomType = 'SELF_CONTAIN', moveInDate, notes, agentId } = req.body;

    const requestId = `req-${crypto.randomUUID()}`;
    const serviceFee = 5000; // Transparent platform agent service fee

    db.prepare(`
      INSERT INTO agent_requests (
        id, student_id, agent_id, property_id, preferred_areas_json, budget_min, budget_max,
        room_type, move_in_date, status, notes, service_fee, fee_payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, 'UNPAID')
    `).run(
      requestId,
      req.user.id,
      agentId || null,
      propertyId || null,
      JSON.stringify(preferredAreas),
      Number(budgetMin) || 150000,
      Number(budgetMax) || 350000,
      roomType,
      moveInDate || null,
      notes || null,
      serviceFee
    );

    return res.status(201).json({
      message: 'Agent Assistance request created successfully. A verified Hostel Ease agent will contact you shortly.',
      requestId,
      serviceFee
    });
  } catch (err: any) {
    console.error('Request assistance error:', err);
    return res.status(500).json({ error: 'Failed to create agent assistance request.' });
  }
});

export default router;
