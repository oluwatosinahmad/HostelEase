import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Helper to format hostel card details
function formatPropertySummary(p: any) {
  const price = db.prepare(`
    SELECT * FROM prices WHERE property_id = ? ORDER BY rent_amount ASC LIMIT 1
  `).get(p.id) as any;

  const coverMedia = db.prepare(`
    SELECT url FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1
  `).get(p.id) as any || db.prepare(`
    SELECT url FROM property_media WHERE property_id = ? ORDER BY display_order ASC LIMIT 1
  `).get(p.id) as any;

  const keyAmenities = db.prepare(`
    SELECT a.key, a.name, a.icon 
    FROM property_amenities pa
    JOIN amenities a ON pa.amenity_id = a.id
    WHERE pa.property_id = ? AND pa.is_available = 1
    LIMIT 4
  `).all(p.id) as any[];

  const area = db.prepare('SELECT id, name, slug, landmark FROM areas WHERE id = ?').get(p.area_id) as any;

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    address: p.address,
    nearbyLandmark: p.nearby_landmark,
    distanceFromCampusKm: p.distance_from_campus_km,
    propertyType: p.property_type,
    verificationStatus: p.verification_status,
    availabilityStatus: p.availability_status,
    isDemo: Boolean(p.is_demo),
    area: area || { id: p.area_id, name: 'LAUTECH Area', slug: 'lautech', landmark: '' },
    coverImage: coverMedia ? coverMedia.url : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    priceSummary: price ? {
      period: price.period,
      rentAmount: price.rent_amount,
      totalMandatoryCost: price.total_mandatory_cost
    } : null,
    keyAmenities
  };
}

// ----------------------------------------------------
// 1. GET /api/student/dashboard — Central Aggregated Hub
// ----------------------------------------------------
router.get('/dashboard', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Access restricted to student accounts' });
  }

  const studentId = req.user.id;

  try {
    // 1. User Profile & Completion
    const user = db.prepare(`
      SELECT id, email, full_name, phone, role, is_active, avatar_url,
             department, level, matric_no, gender, created_at
      FROM users WHERE id = ?
    `).get(studentId) as any;

    let completenessScore = 0;
    const missingFields: string[] = [];
    if (user.full_name) completenessScore += 20; else missingFields.push('Full Name');
    if (user.phone) completenessScore += 20; else missingFields.push('Phone Number');
    if (user.matric_no) completenessScore += 15; else missingFields.push('Matric / JAMB No');
    if (user.department) completenessScore += 15; else missingFields.push('Department');
    if (user.level) completenessScore += 15; else missingFields.push('Level of Study');

    // 2. Student Preferences
    let preferences = db.prepare('SELECT * FROM student_preferences WHERE user_id = ?').get(studentId) as any;
    if (preferences) {
      completenessScore += 15;
      preferences = {
        ...preferences,
        preferredAreas: JSON.parse(preferences.preferred_areas_json || '[]'),
        preferredRoomTypes: JSON.parse(preferences.preferred_room_types_json || '[]'),
        preferredFacilities: JSON.parse(preferences.preferred_facilities_json || '[]'),
        isMoveInFlexible: Boolean(preferences.is_move_in_flexible),
        onboardingCompleted: Boolean(preferences.onboarding_completed)
      };
    } else {
      missingFields.push('Housing Preferences & Budget');
      preferences = {
        minBudget: 100000,
        maxBudget: 250000,
        preferredAreas: [],
        preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM'],
        preferredFacilities: ['water', 'electricity'],
        maxDistanceKm: 2.5,
        genderPreference: 'ANY',
        preferredMoveInDate: null,
        isMoveInFlexible: true,
        academicSession: '2026/2027',
        onboardingCompleted: false
      };
    }

    // 3. Real Summary Counters
    const savedCount = (db.prepare('SELECT COUNT(*) as c FROM saved_properties WHERE user_id = ?').get(studentId) as any)?.c || 0;
    const pendingInspectionsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM inspection_requests 
      WHERE student_id = ? AND status = 'PENDING'
    `).get(studentId) as any)?.c || 0;
    const activeBookingsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM bookings 
      WHERE student_id = ? AND status IN ('PENDING', 'CONFIRMED')
    `).get(studentId) as any)?.c || 0;
    const pendingPaymentsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM bookings 
      WHERE student_id = ? AND status = 'CONFIRMED' AND payment_status IN ('UNPAID', 'PENDING_PAYMENT')
    `).get(studentId) as any)?.c || 0;
    const unreadMessagesCount = (db.prepare(`
      SELECT COUNT(*) as c 
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.student_id = ? AND m.sender_id != ? AND m.is_read = 0
    `).get(studentId, studentId) as any)?.c || 0;

    // 4. Active Booking & Pending Bookings
    const activeBookingDb = db.prepare(`
      SELECT b.*, p.title as property_title, p.address as property_address,
             p.distance_from_campus_km, r.room_name, r.room_type,
             bs.bedspace_number,
             u.full_name as provider_name, u.phone as provider_phone, u.email as provider_email
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
      JOIN users u ON b.provider_id = u.id
      WHERE b.student_id = ? AND b.status IN ('CONFIRMED', 'PENDING')
      ORDER BY CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 2 END, b.created_at DESC
      LIMIT 1
    `).get(studentId) as any;

    let activeBooking = null;
    if (activeBookingDb) {
      const coverMedia = db.prepare(`
        SELECT url FROM property_media WHERE property_id = ? AND is_cover = 1 LIMIT 1
      `).get(activeBookingDb.property_id) as any;

      activeBooking = {
        id: activeBookingDb.id,
        bookingReference: activeBookingDb.booking_reference,
        propertyId: activeBookingDb.property_id,
        propertyTitle: activeBookingDb.property_title,
        propertyAddress: activeBookingDb.property_address,
        coverImage: coverMedia?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
        distanceFromCampusKm: activeBookingDb.distance_from_campus_km,
        roomName: activeBookingDb.room_name,
        roomType: activeBookingDb.room_type,
        bedspaceNumber: activeBookingDb.bedspace_number,
        moveInDate: activeBookingDb.move_in_date,
        academicSession: activeBookingDb.academic_session,
        totalCost: activeBookingDb.total_cost,
        rentAmount: activeBookingDb.rent_amount,
        status: activeBookingDb.status,
        paymentStatus: activeBookingDb.payment_status,
        paidAt: activeBookingDb.paid_at,
        expiresAt: activeBookingDb.expires_at,
        provider: {
          name: activeBookingDb.provider_name,
          phone: activeBookingDb.provider_phone,
          email: activeBookingDb.provider_email
        }
      };
    }

    // Pending Bookings list
    const pendingBookings = db.prepare(`
      SELECT b.id, b.booking_reference, b.status, b.created_at, b.expires_at, b.total_cost,
             p.title as property_title, r.room_name
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.student_id = ? AND b.status = 'PENDING'
      ORDER BY b.created_at DESC
    `).all(studentId);

    // Pending Payments list (Confirmed bookings needing payment)
    const pendingPayments = db.prepare(`
      SELECT b.id, b.booking_reference, b.total_cost, b.status, b.payment_status,
             p.title as property_title, r.room_name,
             (b.total_cost + (SELECT fee_value FROM platform_fee_configs WHERE is_active = 1 LIMIT 1)) as total_payable
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.student_id = ? AND b.status = 'CONFIRMED' AND b.payment_status IN ('UNPAID', 'PENDING_PAYMENT')
      ORDER BY b.created_at DESC
    `).all(studentId);

    // 5. Inspections (Upcoming & Recent)
    const upcomingInspectionDb = db.prepare(`
      SELECT ir.*, p.title as property_title, p.address as property_address,
             u.full_name as provider_name, u.phone as provider_phone
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      LEFT JOIN users u ON p.provider_id = u.id
      WHERE ir.student_id = ? AND ir.status IN ('CONFIRMED', 'PENDING')
      ORDER BY CASE WHEN ir.status = 'CONFIRMED' THEN 1 ELSE 2 END, ir.preferred_date ASC, ir.preferred_time ASC
      LIMIT 1
    `).get(studentId) as any;

    const recentInspections = db.prepare(`
      SELECT ir.id, ir.inspection_type, ir.preferred_date, ir.preferred_time, ir.status,
             p.title as property_title, p.id as property_id
      FROM inspection_requests ir
      JOIN properties p ON ir.property_id = p.id
      WHERE ir.student_id = ?
      ORDER BY ir.created_at DESC
      LIMIT 3
    `).all(studentId);

    // 6. Recent Messages
    const recentMessages = db.prepare(`
      SELECT m.id, c.property_id, m.content, m.created_at, m.is_read,
             p.title as property_title,
             u.full_name as other_party_name
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN properties p ON c.property_id = p.id
      JOIN users u ON c.provider_id = u.id
      WHERE c.student_id = ?
      ORDER BY m.created_at DESC
      LIMIT 4
    `).all(studentId);

    // 7. Saved Hostels with Real-Time Price & Availability Alert Flags
    const savedPropertiesDb = db.prepare(`
      SELECT sp.id as saved_id, sp.created_at as saved_at,
             p.*
      FROM saved_properties sp
      JOIN properties p ON sp.property_id = p.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 6
    `).all(studentId) as any[];

    const savedHostels = savedPropertiesDb.map(p => {
      const summary = formatPropertySummary(p);
      
      // Check if price changed since saved
      const recentPriceChange = db.prepare(`
        SELECT new_rent, previous_rent, created_at
        FROM price_history
        WHERE property_id = ? AND created_at > ?
        ORDER BY created_at DESC LIMIT 1
      `).get(p.id, p.saved_at) as any;

      const priceChanged = Boolean(recentPriceChange);
      const availabilityChanged = p.availability_status === 'LIMITED' || p.availability_status === 'FULLY_OCCUPIED';

      return {
        ...summary,
        savedId: p.saved_id,
        savedAt: p.saved_at,
        priceChanged,
        priceChangeDetails: recentPriceChange ? `Rent updated to ₦${Math.round(recentPriceChange.new_rent).toLocaleString()}` : null,
        availabilityChanged,
        availabilityAlert: availabilityChanged ? (p.availability_status === 'LIMITED' ? 'Few spaces left!' : 'Fully booked') : null
      };
    });

    // 8. Recently Viewed Hostels
    const recentlyViewedDb = db.prepare(`
      SELECT rvh.viewed_at, p.*
      FROM recently_viewed_hostels rvh
      JOIN properties p ON rvh.property_id = p.id
      WHERE rvh.user_id = ?
      ORDER BY rvh.viewed_at DESC
      LIMIT 6
    `).all(studentId) as any[];

    const recentlyViewed = recentlyViewedDb.map(p => ({
      ...formatPropertySummary(p),
      viewedAt: p.viewed_at
    }));

    // 9. Rule-Based Explainable Recommendations
    const allCandidateProps = db.prepare(`
      SELECT p.*, pr.rent_amount, pr.total_mandatory_cost, a.name as area_name
      FROM properties p
      JOIN prices pr ON pr.property_id = p.id
      JOIN areas a ON p.area_id = a.id
      WHERE p.verification_status = 'APPROVED' 
        AND p.availability_status IN ('AVAILABLE', 'LIMITED')
      LIMIT 20
    `).all() as any[];

    const recommendedHostels: any[] = [];
    const minB = preferences.minBudget || preferences.min_budget || 50000;
    const maxB = preferences.maxBudget || preferences.max_budget || 250000;
    const prefAreas: string[] = preferences.preferredAreas || [];
    const maxDist = preferences.maxDistanceKm || preferences.max_distance_km || 2.5;

    for (const prop of allCandidateProps) {
      const matchReasons: string[] = [];

      // Budget check
      if (prop.rent_amount >= minB && prop.rent_amount <= maxB) {
        matchReasons.push(`Within your budget (₦${Math.round(minB / 1000)}k – ₦${Math.round(maxB / 1000)}k)`);
      }
      // Distance check
      if (prop.distance_from_campus_km <= maxDist) {
        matchReasons.push(`Within ${maxDist}km of LAUTECH (${prop.distance_from_campus_km.toFixed(1)}km)`);
      }
      // Area check
      if (prefAreas.length > 0 && prefAreas.includes(prop.area_id)) {
        matchReasons.push(`Located in your preferred area (${prop.area_name})`);
      }
      // Shortlist similarity
      if (savedPropertiesDb.some(s => s.area_id === prop.area_id || s.property_type === prop.property_type)) {
        matchReasons.push('Similar to hostels you shortlisted');
      }

      if (matchReasons.length > 0) {
        recommendedHostels.push({
          ...formatPropertySummary(prop),
          matchScore: matchReasons.length,
          explanationReasons: matchReasons
        });
      }
    }

    // Sort recommended by highest match count
    recommendedHostels.sort((a, b) => b.matchScore - a.matchScore);
    const topRecommendations = recommendedHostels.slice(0, 6);

    // 10. Smart Action Prioritization Engine ("WHAT'S NEXT?")
    let urgentAction = null;
    const actionQueue: any[] = [];

    if (pendingPayments.length > 0) {
      urgentAction = {
        type: 'PAYMENT_REQUIRED',
        priority: 1,
        badge: 'ACTION REQUIRED',
        badgeColor: 'bg-rose-500 text-white',
        title: 'Complete Your Space Payment',
        message: `Your booking for ${pendingPayments[0].property_title} is confirmed. Secure your space before it expires.`,
        bookingId: pendingPayments[0].id,
        amount: pendingPayments[0].total_payable,
        actionLabel: 'Pay Now',
        actionType: 'PAY_NOW'
      };
      actionQueue.push(urgentAction);
    } else if (upcomingInspectionDb && upcomingInspectionDb.status === 'CONFIRMED') {
      urgentAction = {
        type: 'UPCOMING_INSPECTION',
        priority: 2,
        badge: 'CONFIRMED TOUR',
        badgeColor: 'bg-emerald-500 text-white',
        title: `Hostel Inspection on ${new Date(upcomingInspectionDb.preferred_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        message: `Your visit to ${upcomingInspectionDb.property_title} is set for ${upcomingInspectionDb.preferred_time} (${upcomingInspectionDb.inspection_type} tour).`,
        inspectionId: upcomingInspectionDb.id,
        propertyId: upcomingInspectionDb.property_id,
        actionLabel: 'View Details & Landlord Contact',
        actionType: 'VIEW_INSPECTION'
      };
      actionQueue.push(urgentAction);
    } else if (pendingBookings.length > 0) {
      urgentAction = {
        type: 'BOOKING_PENDING',
        priority: 3,
        badge: 'AWAITING CONFIRMATION',
        badgeColor: 'bg-amber-500 text-slate-950',
        title: 'Reservation Sent to Landlord',
        message: `Your booking for ${pendingBookings[0].property_title} is being reviewed by the property owner.`,
        bookingId: pendingBookings[0].id,
        actionLabel: 'Check Booking Status',
        actionType: 'VIEW_BOOKINGS'
      };
      actionQueue.push(urgentAction);
    } else if (pendingInspectionsCount > 0) {
      urgentAction = {
        type: 'INSPECTION_PENDING',
        priority: 4,
        badge: 'INSPECTION REQUESTED',
        badgeColor: 'bg-indigo-500 text-white',
        title: 'Inspection Awaiting Confirmation',
        message: 'You have a pending physical/virtual tour request with the landlord.',
        actionLabel: 'View Inspection Center',
        actionType: 'VIEW_INSPECTIONS'
      };
      actionQueue.push(urgentAction);
    } else if (unreadMessagesCount > 0) {
      urgentAction = {
        type: 'UNREAD_MESSAGES',
        priority: 5,
        badge: 'NEW MESSAGES',
        badgeColor: 'bg-teal-500 text-white',
        title: `${unreadMessagesCount} Unread Accommodation Message${unreadMessagesCount > 1 ? 's' : ''}`,
        message: 'A landlord replied to your inquiry about lodge availability.',
        actionLabel: 'Open Messages',
        actionType: 'VIEW_MESSAGES'
      };
      actionQueue.push(urgentAction);
    } else if (savedCount >= 2) {
      urgentAction = {
        type: 'COMPARE_SAVED',
        priority: 6,
        badge: 'COMPARISON READY',
        badgeColor: 'bg-purple-500 text-white',
        title: 'Compare Your Saved Hostels',
        message: `You have ${savedCount} hostels shortlisted. Compare pricing, distance, and electricity side-by-side.`,
        actionLabel: 'Compare Hostels',
        actionType: 'COMPARE_SAVED'
      };
      actionQueue.push(urgentAction);
    } else {
      urgentAction = {
        type: 'EXPLORE_HOSTELS',
        priority: 7,
        badge: 'START SEARCH',
        badgeColor: 'bg-emerald-600 text-white',
        title: 'Find Your Next LAUTECH Lodge',
        message: 'Browse verified student hostels in Under-G, Adenike, Aroje, and Stadium.',
        actionLabel: 'Explore Verified Hostels',
        actionType: 'EXPLORE_HOSTELS'
      };
      actionQueue.push(urgentAction);
    }

    return res.json({
      summary: {
        savedCount,
        pendingInspectionsCount,
        activeBookingsCount,
        pendingPaymentsCount,
        unreadMessagesCount
      },
      urgentAction,
      actionQueue,
      activeBooking,
      pendingBookings,
      pendingPayments,
      upcomingInspection: upcomingInspectionDb ? {
        id: upcomingInspectionDb.id,
        propertyTitle: upcomingInspectionDb.property_title,
        propertyAddress: upcomingInspectionDb.property_address,
        date: upcomingInspectionDb.preferred_date,
        time: upcomingInspectionDb.preferred_time,
        type: upcomingInspectionDb.inspection_type,
        status: upcomingInspectionDb.status,
        provider: {
          name: upcomingInspectionDb.provider_name,
          phone: upcomingInspectionDb.provider_phone
        }
      } : null,
      recentInspections,
      recentMessages,
      savedHostels,
      recentlyViewed,
      recommendedHostels: topRecommendations,
      preferences,
      profileCompleteness: {
        score: completenessScore,
        missingFields
      },
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        level: user.level,
        matricNo: user.matric_no,
        gender: user.gender,
        avatarUrl: user.avatar_url
      }
    });

  } catch (err: any) {
    console.error('Fetch student dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load student dashboard: ' + err.message });
  }
});

// ----------------------------------------------------
// 2. GET & PUT /api/student/preferences
// ----------------------------------------------------
router.get('/preferences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const pref = db.prepare('SELECT * FROM student_preferences WHERE user_id = ?').get(req.user.id) as any;
    if (!pref) {
      return res.json({
        preferences: {
          minBudget: 100000,
          maxBudget: 250000,
          preferredAreas: [],
          preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM'],
          preferredFacilities: ['water', 'electricity'],
          maxDistanceKm: 2.5,
          genderPreference: 'ANY',
          preferredMoveInDate: null,
          isMoveInFlexible: true,
          academicSession: '2026/2027',
          onboardingCompleted: false
        }
      });
    }

    return res.json({
      preferences: {
        id: pref.id,
        minBudget: pref.min_budget,
        maxBudget: pref.max_budget,
        preferredAreas: JSON.parse(pref.preferred_areas_json || '[]'),
        preferredRoomTypes: JSON.parse(pref.preferred_room_types_json || '[]'),
        preferredFacilities: JSON.parse(pref.preferred_facilities_json || '[]'),
        maxDistanceKm: pref.max_distance_km,
        genderPreference: pref.gender_preference,
        preferredMoveInDate: pref.preferred_move_in_date,
        isMoveInFlexible: Boolean(pref.is_move_in_flexible),
        academicSession: pref.academic_session,
        onboardingCompleted: Boolean(pref.onboarding_completed)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve preferences: ' + err.message });
  }
});

const savePreferencesHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  const {
    minBudget = 100000,
    maxBudget = 250000,
    preferredAreas = [],
    preferredRoomTypes = [],
    preferredFacilities = [],
    maxDistanceKm = 2.5,
    genderPreference = 'ANY',
    preferredMoveInDate = null,
    isMoveInFlexible = true,
    academicSession = '2026/2027'
  } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM student_preferences WHERE user_id = ?').get(req.user.id) as any;
    const prefId = existing?.id || `pref-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO student_preferences (
        id, user_id, min_budget, max_budget, preferred_areas_json,
        preferred_room_types_json, preferred_facilities_json, max_distance_km,
        gender_preference, preferred_move_in_date, is_move_in_flexible,
        academic_session, onboarding_completed, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        min_budget = excluded.min_budget,
        max_budget = excluded.max_budget,
        preferred_areas_json = excluded.preferred_areas_json,
        preferred_room_types_json = excluded.preferred_room_types_json,
        preferred_facilities_json = excluded.preferred_facilities_json,
        max_distance_km = excluded.max_distance_km,
        gender_preference = excluded.gender_preference,
        preferred_move_in_date = excluded.preferred_move_in_date,
        is_move_in_flexible = excluded.is_move_in_flexible,
        academic_session = excluded.academic_session,
        onboarding_completed = 1,
        updated_at = datetime('now')
    `).run(
      prefId,
      req.user.id,
      minBudget,
      maxBudget,
      JSON.stringify(preferredAreas),
      JSON.stringify(preferredRoomTypes),
      JSON.stringify(preferredFacilities),
      maxDistanceKm,
      genderPreference,
      preferredMoveInDate,
      isMoveInFlexible ? 1 : 0,
      academicSession
    );

    return res.json({
      success: true,
      message: 'Accommodation preferences saved successfully'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save preferences: ' + err.message });
  }
};

router.put('/preferences', authenticate, savePreferencesHandler);
router.post('/preferences', authenticate, savePreferencesHandler);
router.post('/dashboard/preferences', authenticate, savePreferencesHandler);
router.put('/dashboard/preferences', authenticate, savePreferencesHandler);

// ----------------------------------------------------
// 3. Recently Viewed Hostels
// ----------------------------------------------------
router.post('/recently-viewed', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });
  const { propertyId } = req.body;
  if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });

  try {
    const id = `rvh-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO recently_viewed_hostels (id, user_id, property_id, viewed_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, property_id) DO UPDATE SET
        viewed_at = datetime('now')
    `).run(id, req.user.id, propertyId);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record recently viewed: ' + err.message });
  }
});

router.get('/recently-viewed', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const list = db.prepare(`
      SELECT rvh.viewed_at, p.*
      FROM recently_viewed_hostels rvh
      JOIN properties p ON rvh.property_id = p.id
      WHERE rvh.user_id = ?
      ORDER BY rvh.viewed_at DESC
      LIMIT 12
    `).all(req.user.id) as any[];

    const results = list.map(p => ({
      ...formatPropertySummary(p),
      viewedAt: p.viewed_at
    }));

    return res.json({ recentlyViewed: results });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recently viewed: ' + err.message });
  }
});

// ----------------------------------------------------
// 4. Search History
// ----------------------------------------------------
router.get('/search-history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const history = db.prepare(`
      SELECT id, query_text, filter_criteria_json, created_at
      FROM student_search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(req.user.id) as any[];

    const results = history.map(h => ({
      id: h.id,
      queryText: h.query_text,
      filters: h.filter_criteria_json ? JSON.parse(h.filter_criteria_json) : null,
      createdAt: h.created_at
    }));

    return res.json({ searchHistory: results });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch search history: ' + err.message });
  }
});

router.post('/search-history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });
  const { queryText, filters } = req.body;
  if (!queryText || typeof queryText !== 'string') {
    return res.status(400).json({ error: 'queryText is required' });
  }

  try {
    const id = `sh-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO student_search_history (id, user_id, query_text, filter_criteria_json, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, req.user.id, queryText.trim(), filters ? JSON.stringify(filters) : null);

    return res.status(201).json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save search: ' + err.message });
  }
});

router.delete('/search-history/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const result = db.prepare(`
      DELETE FROM student_search_history WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Search record not found' });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete search record: ' + err.message });
  }
});

router.delete('/search-history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    db.prepare('DELETE FROM student_search_history WHERE user_id = ?').run(req.user.id);
    return res.json({ success: true, message: 'Search history cleared' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to clear search history: ' + err.message });
  }
});

// ----------------------------------------------------
// 5. Standalone Personalized Recommendations
// ----------------------------------------------------
router.get('/recommendations', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const pref = db.prepare('SELECT * FROM student_preferences WHERE user_id = ?').get(studentId) as any;
    const minB = pref?.min_budget || 50000;
    const maxB = pref?.max_budget || 250000;
    const prefAreas: string[] = pref ? JSON.parse(pref.preferred_areas_json || '[]') : [];
    const maxDist = pref?.max_distance_km || 2.5;

    const savedProps = db.prepare('SELECT property_id FROM saved_properties WHERE user_id = ?').all(studentId) as any[];
    const savedIds = new Set(savedProps.map(s => s.property_id));

    const candidates = db.prepare(`
      SELECT p.*, pr.rent_amount, a.name as area_name
      FROM properties p
      JOIN prices pr ON pr.property_id = p.id
      JOIN areas a ON p.area_id = a.id
      WHERE p.verification_status = 'APPROVED' 
        AND p.availability_status IN ('AVAILABLE', 'LIMITED')
    `).all() as any[];

    const recommendations: any[] = [];
    for (const prop of candidates) {
      const matchReasons: string[] = [];

      if (prop.rent_amount >= minB && prop.rent_amount <= maxB) {
        matchReasons.push(`Within your budget (₦${Math.round(minB / 1000)}k – ₦${Math.round(maxB / 1000)}k)`);
      }
      if (prop.distance_from_campus_km <= maxDist) {
        matchReasons.push(`Close to school (${prop.distance_from_campus_km.toFixed(1)}km from gate)`);
      }
      if (prefAreas.length > 0 && prefAreas.includes(prop.area_id)) {
        matchReasons.push(`In your preferred area of ${prop.area_name}`);
      }
      if (savedIds.has(prop.id)) {
        matchReasons.push('From your saved shortlist');
      }

      if (matchReasons.length > 0) {
        recommendations.push({
          ...formatPropertySummary(prop),
          matchScore: matchReasons.length,
          explanationReasons: matchReasons
        });
      }
    }

    recommendations.sort((a, b) => b.matchScore - a.matchScore);
    return res.json({ recommendations: recommendations.slice(0, 10) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recommendations: ' + err.message });
  }
});

// ----------------------------------------------------
// 6. Student Profile & Settings
// ----------------------------------------------------
router.get('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const user = db.prepare(`
      SELECT id, email, full_name, phone, role, avatar_url,
             department, level, matric_no, gender, created_at
      FROM users WHERE id = ?
    `).get(req.user.id) as any;

    if (!user) return res.status(404).json({ error: 'Student profile not found' });
    return res.json({ profile: user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch profile: ' + err.message });
  }
});

router.put('/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  const { fullName, phone, department, level, matricNo, gender, avatarUrl } = req.body;
  if (!fullName || typeof fullName !== 'string') {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    db.prepare(`
      UPDATE users
      SET full_name = ?,
          phone = COALESCE(?, phone),
          department = COALESCE(?, department),
          level = COALESCE(?, level),
          matric_no = COALESCE(?, matric_no),
          gender = COALESCE(?, gender),
          avatar_url = COALESCE(?, avatar_url),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      fullName.trim(),
      phone ? phone.trim() : null,
      department ? department.trim() : null,
      level ? level.trim() : null,
      matricNo ? matricNo.trim() : null,
      gender || 'ANY',
      avatarUrl || null,
      req.user.id
    );

    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// ----------------------------------------------------
// 7. Notification Preferences
// ----------------------------------------------------
router.get('/notification-preferences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  try {
    let pref = db.prepare('SELECT * FROM student_notification_preferences WHERE user_id = ?').get(req.user.id) as any;
    if (!pref) {
      pref = {
        inspectionReminders: true,
        availabilityAlerts: true,
        priceAlerts: true,
        recommendationAlerts: true
      };
    } else {
      pref = {
        inspectionReminders: Boolean(pref.inspection_reminders),
        availabilityAlerts: Boolean(pref.availability_alerts),
        priceAlerts: Boolean(pref.price_alerts),
        recommendationAlerts: Boolean(pref.recommendation_alerts)
      };
    }

    return res.json({ notificationPreferences: pref });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch notification preferences: ' + err.message });
  }
});

router.put('/notification-preferences', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Unauthorized' });

  const {
    inspectionReminders = true,
    availabilityAlerts = true,
    priceAlerts = true,
    recommendationAlerts = true
  } = req.body;

  try {
    const id = `np-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO student_notification_preferences (
        id, user_id, inspection_reminders, availability_alerts,
        price_alerts, recommendation_alerts, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        inspection_reminders = excluded.inspection_reminders,
        availability_alerts = excluded.availability_alerts,
        price_alerts = excluded.price_alerts,
        recommendation_alerts = excluded.recommendation_alerts,
        updated_at = datetime('now')
    `).run(
      id,
      req.user.id,
      inspectionReminders ? 1 : 0,
      availabilityAlerts ? 1 : 0,
      priceAlerts ? 1 : 0,
      recommendationAlerts ? 1 : 0
    );

    return res.json({ success: true, message: 'Notification preferences updated' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update notification preferences: ' + err.message });
  }
});

// ----------------------------------------------------
// 8. Account Security & Password Change
// ----------------------------------------------------
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newHash, req.user.id);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to change password: ' + err.message });
  }
});

export default router;
