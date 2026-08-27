import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper: Calculate listing completeness score (0 - 100) and missing items
export function calculateCompleteness(property: any, prices: any, media: any[], amenitiesCount: number): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  if (property.title && property.title.length > 5) score += 10;
  else missing.push('Clear hostel title');

  if (property.description && property.description.length > 20) score += 10;
  else missing.push('Detailed description & house rules');

  if (property.address && property.area_id) score += 10;
  else missing.push('Street address and LAUTECH area');

  if (property.distance_from_campus_km > 0) score += 5;
  else missing.push('Distance to campus');

  if (property.nearby_landmark) score += 5;
  else missing.push('Nearby landmark / directions');

  if (prices && prices.rent_amount > 0) score += 15;
  else missing.push('Annual rent amount');

  if (prices && (prices.service_charge > 0 || prices.agency_fee > 0 || prices.caution_fee > 0)) score += 10;
  else missing.push('Itemized fee breakdown (Service / Caution / Agency)');

  const hasExterior = media.some(m => (m.category || m.cat) === 'EXTERIOR');
  const hasBedroom = media.some(m => (m.category || m.cat) === 'BEDROOM' || (m.category || m.cat) === 'ROOM');
  const hasBathroom = media.some(m => (m.category || m.cat) === 'BATHROOM');
  const hasKitchen = media.some(m => (m.category || m.cat) === 'KITCHEN');
  const hasVideo = media.some(m => (m.media_type || m.type) === 'VIDEO' || (m.category || m.cat) === 'VIDEO_WALKTHROUGH');

  if (hasExterior) score += 10;
  else missing.push('Exterior compound photo');

  if (hasBedroom) score += 10;
  else missing.push('Bedroom/Room photo');

  if (hasBathroom) score += 5;
  else missing.push('Bathroom photo');

  if (hasKitchen) score += 5;
  else missing.push('Kitchen photo');

  if (hasVideo) score += 5;
  else missing.push('Video walkthrough tour');

  if (amenitiesCount > 2) score += 10;
  else missing.push('Key facilities (Borehole, Power, Security, etc.)');

  return { score: Math.min(100, score), missing };
}

// -----------------------------------------------------------------------------
// 1. GET /api/provider/dashboard — Comprehensive Real Metrics Hub
// -----------------------------------------------------------------------------
router.get(
  '/dashboard',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { propertyId } = req.query;

    const propertyFilter = propertyId && propertyId !== 'all' ? 'AND p.id = ?' : '';
    const propertyParams = propertyId && propertyId !== 'all' ? [providerId, propertyId] : [providerId];

    // 1. Hostels & Listings
    const totalHostels = db.prepare('SELECT COUNT(*) as count FROM properties WHERE provider_id = ?').get(providerId) as { count: number };
    const activeHostels = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'APPROVED'").get(providerId) as { count: number };
    const pendingApproval = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'PENDING_REVIEW'").get(providerId) as { count: number };
    const drafts = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'DRAFT'").get(providerId) as { count: number };

    // 2. Capacity & Real Availability Spaces
    let capacityQuery = `
      SELECT 
        SUM(r.quantity_total) as total_capacity,
        SUM(r.quantity_available) as available_spaces,
        SUM(r.occupied_count) as occupied_spaces
      FROM rooms r
      JOIN properties p ON p.id = r.property_id
      WHERE p.provider_id = ? ${propertyFilter}
    `;
    const capacityRow = db.prepare(capacityQuery).get(...propertyParams) as any;
    const totalCapacity = capacityRow?.total_capacity || 0;
    const availableSpaces = capacityRow?.available_spaces || 0;
    const occupiedSpaces = capacityRow?.occupied_spaces || 0;

    // Reserved spaces from active bookings in PENDING status
    let reservedQuery = `
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE p.provider_id = ? AND b.status = 'PENDING' ${propertyFilter}
    `;
    const reservedRow = db.prepare(reservedQuery).get(...propertyParams) as { count: number };
    const reservedSpaces = reservedRow?.count || 0;

    // 3. Bookings
    let bookingQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status = 'PENDING' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN b.payment_status = 'UNPAID' AND b.status = 'CONFIRMED' THEN 1 ELSE 0 END) as pending_payments
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE p.provider_id = ? ${propertyFilter}
    `;
    const bookingRow = db.prepare(bookingQuery).get(...propertyParams) as any;
    const pendingBookings = bookingRow?.pending_bookings || 0;
    const confirmedBookings = bookingRow?.confirmed_bookings || 0;
    const pendingPayments = bookingRow?.pending_payments || 0;

    // 4. Inspections
    let inspectionQuery = `
      SELECT 
        COUNT(*) as total_inspections,
        SUM(CASE WHEN ir.status = 'PENDING' THEN 1 ELSE 0 END) as pending_inspections,
        SUM(CASE WHEN ir.status = 'CONFIRMED' AND date(ir.preferred_date) >= date('now') THEN 1 ELSE 0 END) as upcoming_inspections
      FROM inspection_requests ir
      JOIN properties p ON p.id = ir.property_id
      WHERE p.provider_id = ? ${propertyFilter}
    `;
    const inspectionRow = db.prepare(inspectionQuery).get(...propertyParams) as any;
    const pendingInspections = inspectionRow?.pending_inspections || 0;
    const upcomingInspections = inspectionRow?.upcoming_inspections || 0;

    // 5. Unread Messages
    const unreadMessagesCount = (db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.provider_id = ? AND m.is_read = 0 AND m.sender_role = 'STUDENT'
    `).get(providerId) as any)?.count || 0;

    // 6. Revenue & Financial Summary (Phase 6 Real Ledgers)
    let revenueQuery = `
      SELECT 
        COALESCE(SUM(pay.provider_amount), 0) as total_revenue,
        COALESCE(SUM(pay.platform_fee), 0) as total_platform_fees,
        COUNT(CASE WHEN pay.status = 'SUCCESS' THEN 1 END) as paid_bookings_count
      FROM payments pay
      JOIN properties p ON p.id = pay.property_id
      WHERE p.provider_id = ? AND pay.status = 'SUCCESS' ${propertyFilter}
    `;
    const revenueRow = db.prepare(revenueQuery).get(...propertyParams) as any;
    const totalRevenue = revenueRow?.total_revenue || 0;

    // 7. Provider Profile & Onboarding State
    let profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(providerId) as any;
    if (!profile) {
      const newProfId = `prof-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, provider_type, verification_status, onboarding_completed, onboarding_step)
        VALUES (?, ?, 'HOSTEL_OWNER', 'PENDING', 0, 1)
      `).run(newProfId, providerId);
      profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(providerId) as any;
    }

    // 8. Properties List for Switcher & Quick Navigation
    const properties = db.prepare(`
      SELECT p.id, p.title, p.slug, p.address, p.verification_status, p.availability_status,
             p.total_rooms, p.completeness_score, p.created_at, p.updated_at,
             a.name as area_name,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             (SELECT rent_amount FROM prices WHERE property_id = p.id LIMIT 1) as rent_amount,
             (SELECT total_mandatory_cost FROM prices WHERE property_id = p.id LIMIT 1) as total_mandatory_cost,
             (SELECT COUNT(*) FROM rooms WHERE property_id = p.id) as room_count
      FROM properties p
      LEFT JOIN areas a ON a.id = p.area_id
      WHERE p.provider_id = ?
      ORDER BY p.created_at DESC
    `).all(providerId) as any[];

    // 9. Action Required Items
    const actionRequired: any[] = [];
    if (pendingBookings > 0) {
      actionRequired.push({
        type: 'PENDING_BOOKINGS',
        title: `${pendingBookings} Booking Request${pendingBookings > 1 ? 's' : ''} Awaiting Confirmation`,
        description: 'Students are waiting for your approval. Reservations expire automatically after 48 hours.',
        ctaLabel: 'Review Bookings',
        ctaTab: 'bookings'
      });
    }
    if (pendingInspections > 0) {
      actionRequired.push({
        type: 'PENDING_INSPECTIONS',
        title: `${pendingInspections} Inspection Request${pendingInspections > 1 ? 's' : ''} Pending`,
        description: 'Students want to inspect your hostel. Confirm date and time or propose alternative slots.',
        ctaLabel: 'Manage Inspections',
        ctaTab: 'inspections'
      });
    }
    if (profile.verification_status !== 'APPROVED') {
      actionRequired.push({
        type: 'VERIFICATION_REQUIRED',
        title: 'Landlord Identity Verification Pending',
        description: 'Upload valid ID (NIN / Driver License) to earn the Verified Landlord badge and boost student trust.',
        ctaLabel: 'Submit Verification',
        ctaTab: 'verification'
      });
    }

    // 10. Quality Alerts
    const qualityAlerts: any[] = [];
    properties.forEach(prop => {
      if (prop.completeness_score < 70) {
        qualityAlerts.push({
          propertyId: prop.id,
          propertyTitle: prop.title,
          type: 'INCOMPLETE_LISTING',
          message: `"${prop.title}" is ${prop.completeness_score}% complete. Add more photos and facility details to rank higher in student search.`
        });
      }
    });

    res.json({
      stats: {
        totalHostels: totalHostels.count,
        activeListings: activeHostels.count,
        pendingApproval: pendingApproval.count,
        drafts: drafts.count,
        totalCapacity,
        availableSpaces,
        occupiedSpaces,
        reservedSpaces,
        pendingBookings,
        confirmedBookings,
        pendingInspections,
        upcomingInspections,
        unreadMessages: unreadMessagesCount,
        pendingPayments,
        totalRevenue,
        verificationStatus: profile.verification_status || 'PENDING'
      },
      properties,
      actionRequired,
      qualityAlerts,
      onboarding: {
        completed: Boolean(profile.onboarding_completed),
        step: profile.onboarding_step || 1
      }
    });
  }
);

// Backward compatibility alias for /dashboard/stats
router.get(
  '/dashboard/stats',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;

    const totalHostels = db.prepare('SELECT COUNT(*) as count FROM properties WHERE provider_id = ?').get(providerId) as { count: number };
    const activeHostels = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'APPROVED'").get(providerId) as { count: number };
    const pendingApproval = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'PENDING_REVIEW'").get(providerId) as { count: number };
    const drafts = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND verification_status = 'DRAFT'").get(providerId) as { count: number };
    const actionRequired = db.prepare("SELECT COUNT(*) as count FROM properties WHERE provider_id = ? AND admin_feedback_notes IS NOT NULL").get(providerId) as { count: number };

    const totalRooms = db.prepare(`
      SELECT SUM(r.quantity_total) as total, SUM(r.quantity_available) as available
      FROM rooms r
      JOIN properties p ON p.id = r.property_id
      WHERE p.provider_id = ?
    `).get(providerId) as { total: number | null; available: number | null };

    const inspectionsCount = db.prepare(`
      SELECT COUNT(*) as count FROM inspection_requests ir
      JOIN properties p ON p.id = ir.property_id
      WHERE p.provider_id = ?
    `).get(providerId) as { count: number };

    const pendingInspections = db.prepare(`
      SELECT COUNT(*) as count FROM inspection_requests ir
      JOIN properties p ON p.id = ir.property_id
      WHERE p.provider_id = ? AND ir.status = 'PENDING'
    `).get(providerId) as { count: number };

    const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(providerId) as any;

    res.json({
      stats: {
        totalHostels: totalHostels.count,
        activeHostels: activeHostels.count,
        pendingApproval: pendingApproval.count,
        drafts: drafts.count,
        actionRequired: actionRequired.count,
        totalRooms: totalRooms.total || 0,
        availableRooms: totalRooms.available || 0,
        totalInspections: inspectionsCount.count,
        pendingInspections: pendingInspections.count,
        providerVerificationStatus: profile?.verification_status || 'PENDING',
        providerType: profile?.provider_type || 'HOSTEL_OWNER'
      }
    });
  }
);

// -----------------------------------------------------------------------------
// 2. PROVIDER ONBOARDING FLOW (Save & Continue Later)
// -----------------------------------------------------------------------------
router.get(
  '/onboarding',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const user = db.prepare('SELECT id, full_name, email, phone FROM users WHERE id = ?').get(providerId) as any;
    let profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(providerId) as any;

    if (!profile) {
      const newProfId = `prof-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, provider_type, verification_status, onboarding_completed, onboarding_step)
        VALUES (?, ?, 'HOSTEL_OWNER', 'PENDING', 0, 1)
      `).run(newProfId, providerId);
      profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(providerId) as any;
    }

    res.json({
      onboarding: {
        userId: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        businessName: profile.business_name || '',
        businessRegNo: profile.business_reg_no || '',
        managementType: profile.management_type || 'DIRECT_OWNER',
        address: profile.address || '',
        idType: profile.id_type || 'NIN_CARD',
        verificationStatus: profile.verification_status || 'PENDING',
        onboardingCompleted: Boolean(profile.onboarding_completed),
        onboardingStep: profile.onboarding_step || 1
      }
    });
  }
);

router.put(
  '/onboarding',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const {
      fullName,
      phone,
      businessName,
      businessRegNo,
      managementType,
      address,
      idType,
      step,
      completed
    } = req.body;

    db.transaction(() => {
      if (fullName || phone) {
        db.prepare(`
          UPDATE users
          SET full_name = COALESCE(?, full_name),
              phone = COALESCE(?, phone),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(fullName, phone, providerId);
      }

      db.prepare(`
        UPDATE provider_profiles
        SET business_name = COALESCE(?, business_name),
            business_reg_no = COALESCE(?, business_reg_no),
            management_type = COALESCE(?, management_type),
            address = COALESCE(?, address),
            id_type = COALESCE(?, id_type),
            onboarding_step = COALESCE(?, onboarding_step),
            onboarding_completed = CASE WHEN ? IS NOT NULL THEN ? ELSE onboarding_completed END,
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        businessName,
        businessRegNo,
        managementType,
        address,
        idType,
        step || 1,
        completed !== undefined ? (completed ? 1 : 0) : null,
        completed !== undefined ? (completed ? 1 : 0) : 0,
        providerId
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'PROVIDER', 'UPDATE_ONBOARDING', 'PROVIDER_PROFILE', ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        providerId,
        JSON.stringify({ step, completed })
      );
    })();

    res.json({ message: 'Onboarding data saved successfully', completed: Boolean(completed) });
  }
);

// -----------------------------------------------------------------------------
// 3. PROPERTY CRUD & MANAGEMENT (With Location Confirmation & Photos)
// -----------------------------------------------------------------------------
router.get(
  '/properties',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;

    const properties = db.prepare(`
      SELECT p.*, a.name as area_name,
             pr.rent_amount, pr.service_charge, pr.agency_fee, pr.caution_fee, pr.other_mandatory_charges, pr.total_mandatory_cost,
             (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             (SELECT COUNT(*) FROM rooms WHERE property_id = p.id) as room_count,
             (SELECT SUM(quantity_available) FROM rooms WHERE property_id = p.id) as available_spaces,
             (SELECT SUM(quantity_total) FROM rooms WHERE property_id = p.id) as total_capacity
      FROM properties p
      LEFT JOIN areas a ON a.id = p.area_id
      LEFT JOIN prices pr ON pr.property_id = p.id
      WHERE p.provider_id = ?
      ORDER BY p.created_at DESC
    `).all(providerId) as any[];

    res.json({
      properties: properties.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        address: p.address,
        nearbyLandmark: p.nearby_landmark,
        distanceFromCampusKm: p.distance_from_campus_km,
        propertyType: p.property_type,
        genderPreference: p.gender_preference,
        totalRooms: p.total_rooms,
        latitude: p.latitude || 8.1438,
        longitude: p.longitude || 4.2638,
        verificationStatus: p.verification_status,
        availabilityStatus: p.availability_status,
        isDemo: Boolean(p.is_demo),
        isFeatured: Boolean(p.is_featured),
        adminFeedbackNotes: p.admin_feedback_notes,
        rejectionReason: p.rejection_reason,
        completenessScore: p.completeness_score,
        area: { id: p.area_id, name: p.area_name },
        coverImage: p.cover_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
        availableSpaces: p.available_spaces || 0,
        totalCapacity: p.total_capacity || 0,
        priceSummary: {
          rentAmount: p.rent_amount || 0,
          serviceCharge: p.service_charge || 0,
          agencyFee: p.agency_fee || 0,
          cautionFee: p.caution_fee || 0,
          otherCharges: p.other_mandatory_charges || 0,
          totalMandatoryCost: p.total_mandatory_cost || p.rent_amount || 0
        },
        createdAt: p.created_at
      }))
    });
  }
);

router.post(
  '/properties',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const {
      title,
      areaId,
      description,
      address,
      nearbyLandmark,
      distanceFromCampusKm,
      latitude,
      longitude,
      propertyType,
      genderPreference,
      totalRooms,
      pricing,
      amenityKeys,
      mediaItems,
      rules,
      isDraft,
      roomsList
    } = req.body;

    if (!title || !areaId) {
      return res.status(400).json({ error: 'Hostel name and LAUTECH area are required' });
    }

    const propId = `prop-${Date.now()}-${crypto.randomUUID().substring(0, 5)}`;
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${crypto.randomUUID().substring(0, 6)}`;
    const uniRow = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;
    const universityId = uniRow?.id || 'uni-lautech-ogbomoso';
    const status = isDraft ? 'DRAFT' : 'PENDING_REVIEW';

    db.transaction(() => {
      // 1. Insert Property
      db.prepare(`
        INSERT INTO properties (
          id, provider_id, university_id, area_id, title, slug, description, address,
          nearby_landmark, latitude, longitude, distance_from_campus_km, property_type,
          gender_preference, total_rooms, verification_status, availability_status,
          rules_json, is_demo, completeness_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, 0, 0)
      `).run(
        propId,
        providerId,
        universityId,
        areaId,
        title.trim(),
        slug,
        description ? description.trim() : 'Draft accommodation listing',
        address ? address.trim() : 'LAUTECH off-campus',
        nearbyLandmark ? nearbyLandmark.trim() : null,
        parseFloat(latitude) || 8.1438,
        parseFloat(longitude) || 4.2638,
        parseFloat(distanceFromCampusKm) || 1.0,
        propertyType || 'SELF_CONTAIN',
        genderPreference || 'ANY',
        parseInt(totalRooms, 10) || 1,
        status,
        rules ? JSON.stringify(rules) : '[]'
      );

      // 2. Insert Pricing
      const rent = parseFloat(pricing?.rentAmount) || 0;
      const service = parseFloat(pricing?.serviceCharge) || 0;
      const agency = parseFloat(pricing?.agencyFee) || 0;
      const caution = parseFloat(pricing?.cautionFee) || 0;
      const other = parseFloat(pricing?.otherMandatoryCharges) || 0;
      const totalMandatory = rent + service + agency + other;
      const totalRefundable = caution;

      db.prepare(`
        INSERT INTO prices (
          id, property_id, period, rent_amount, service_charge, agency_fee,
          caution_fee, other_mandatory_charges, total_mandatory_cost, total_refundable_cost, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `price-${propId}`,
        propId,
        pricing?.period || 'YEARLY',
        rent,
        service,
        agency,
        caution,
        other,
        totalMandatory,
        totalRefundable,
        pricing?.notes || 'Standard annual student accommodation pricing'
      );

      // 3. Insert Amenities
      if (Array.isArray(amenityKeys)) {
        const insertAmenity = db.prepare('INSERT OR IGNORE INTO property_amenities (id, property_id, amenity_id) VALUES (?, ?, ?)');
        for (const key of amenityKeys) {
          const am = db.prepare('SELECT id FROM amenities WHERE key = ?').get(key) as any;
          if (am) {
            insertAmenity.run(`pa-${propId}-${key}`, propId, am.id);
          }
        }
      }

      // 4. Insert Media (with categories: EXTERIOR, ROOM, BATHROOM, KITCHEN, COMMON_AREA, SECURITY, FACILITIES)
      const finalMedia = Array.isArray(mediaItems) ? mediaItems : [];
      if (finalMedia.length > 0) {
        const insertMedia = db.prepare(`
          INSERT INTO property_media (
            id, property_id, media_type, category, url, caption, display_order, is_cover, is_verified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        finalMedia.forEach((m: any, idx: number) => {
          insertMedia.run(
            `media-${propId}-${idx}`,
            propId,
            m.type || 'IMAGE',
            m.category || m.cat || 'EXTERIOR',
            m.url,
            m.caption || null,
            idx,
            m.isCover ? 1 : idx === 0 ? 1 : 0
          );
        });
      }

      // 5. Insert Rooms & Bedspaces
      if (Array.isArray(roomsList) && roomsList.length > 0) {
        const insertRoom = db.prepare(`
          INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertBed = db.prepare(`
          INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
          VALUES (?, ?, ?, ?, ?)
        `);

        roomsList.forEach((r: any, idx: number) => {
          const roomId = `room-${propId}-${idx + 1}`;
          const total = parseInt(r.total, 10) || 1;
          const avail = parseInt(r.available, 10) || total;
          const occupied = total - avail;
          insertRoom.run(roomId, propId, r.name || `Room ${idx + 1}`, r.type || propertyType || 'SELF_CONTAIN', r.maxOccupants || 1, total, avail, occupied, r.isEnsuite ? 1 : 0, r.isFurnished ? 1 : 0, avail > 0 ? 'AVAILABLE' : 'FULL');

          // Initialize individual bedspaces
          for (let b = 1; b <= (r.maxOccupants || 1); b++) {
            insertBed.run(`bed-${roomId}-${b}`, roomId, `Space ${b}`, b <= occupied ? 1 : 0, b <= occupied ? 'OCCUPIED' : 'AVAILABLE');
          }
        });
      } else {
        // Create default unit
        const defaultRoomId = `room-${propId}-default`;
        db.prepare(`
          INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
          VALUES (?, ?, 'Standard Unit', ?, 1, 1, 1, 0, 1, 0, 'AVAILABLE')
        `).run(defaultRoomId, propId, propertyType || 'SELF_CONTAIN');

        db.prepare(`
          INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
          VALUES (?, ?, 'Space 1', 0, 'AVAILABLE')
        `).run(`bed-${defaultRoomId}-1`, defaultRoomId);
      }

      // Calculate completeness
      const comp = calculateCompleteness(
        { title, description, address, area_id: areaId, distance_from_campus_km: distanceFromCampusKm, nearby_landmark: nearbyLandmark },
        { rent_amount: rent, service_charge: service, agency_fee: agency, caution_fee: caution },
        finalMedia,
        Array.isArray(amenityKeys) ? amenityKeys.length : 0
      );

      db.prepare('UPDATE properties SET completeness_score = ? WHERE id = ?').run(comp.score, propId);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'PROVIDER', ?, 'PROPERTY', ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        isDraft ? 'SAVE_DRAFT' : 'CREATE_PROPERTY',
        propId,
        JSON.stringify({ title, status, completeness: comp.score })
      );
    })();

    res.status(201).json({
      message: isDraft ? 'Listing draft saved successfully' : 'Hostel added and submitted for review',
      propertyId: propId,
      slug
    });
  }
);

router.put(
  '/properties/:id',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;

    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as any;
    if (!prop) {
      return res.status(404).json({ error: 'Hostel listing not found' });
    }

    if (req.user!.role !== 'ADMIN' && prop.provider_id !== providerId) {
      return res.status(403).json({ error: 'Unauthorized to modify this hostel' });
    }

    const {
      title,
      areaId,
      description,
      address,
      nearbyLandmark,
      distanceFromCampusKm,
      latitude,
      longitude,
      propertyType,
      genderPreference,
      pricing,
      amenityKeys,
      mediaItems,
      rules,
      submitForReview
    } = req.body;

    db.transaction(() => {
      // 1. Price Change Tracking
      if (pricing) {
        const currentPrice = db.prepare('SELECT * FROM prices WHERE property_id = ?').get(id) as any;
        const newRent = parseFloat(pricing.rentAmount) || currentPrice?.rent_amount || 0;
        const newService = parseFloat(pricing.serviceCharge) || 0;
        const newAgency = parseFloat(pricing.agencyFee) || 0;
        const newCaution = parseFloat(pricing.cautionFee) || 0;
        const newOther = parseFloat(pricing.otherMandatoryCharges) || 0;
        const newTotalMandatory = newRent + newService + newAgency + newOther;

        if (currentPrice && currentPrice.rent_amount !== newRent) {
          db.prepare(`
            INSERT INTO price_history (id, property_id, provider_id, previous_rent, new_rent, previous_total_mandatory, new_total_mandatory, change_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            id,
            providerId,
            currentPrice.rent_amount,
            newRent,
            currentPrice.total_mandatory_cost,
            newTotalMandatory,
            pricing.changeReason || pricing.reason || 'Provider updated annual rent.'
          );
        }

        db.prepare(`
          UPDATE prices
          SET rent_amount = ?, service_charge = ?, agency_fee = ?, caution_fee = ?,
              other_mandatory_charges = ?, total_mandatory_cost = ?, total_refundable_cost = ?,
              notes = ?, updated_at = datetime('now')
          WHERE property_id = ?
        `).run(
          newRent,
          newService,
          newAgency,
          newCaution,
          newOther,
          newTotalMandatory,
          currentPrice?.total_refundable_cost || 0,
          pricing.notes || currentPrice?.notes || null,
          id
        );
      }

      // 2. Update Core Property
      db.prepare(`
        UPDATE properties
        SET title = COALESCE(?, title),
            area_id = COALESCE(?, area_id),
            description = COALESCE(?, description),
            address = COALESCE(?, address),
            nearby_landmark = COALESCE(?, nearby_landmark),
            distance_from_campus_km = COALESCE(?, distance_from_campus_km),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            property_type = COALESCE(?, property_type),
            gender_preference = COALESCE(?, gender_preference),
            rules_json = COALESCE(?, rules_json),
            verification_status = CASE WHEN ? = 1 THEN 'PENDING_REVIEW' ELSE verification_status END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        title,
        areaId,
        description,
        address,
        nearbyLandmark,
        distanceFromCampusKm,
        latitude,
        longitude,
        propertyType,
        genderPreference,
        rules ? JSON.stringify(rules) : null,
        submitForReview ? 1 : 0,
        id
      );

      // 3. Refresh Amenities
      if (Array.isArray(amenityKeys)) {
        db.prepare('DELETE FROM property_amenities WHERE property_id = ?').run(id);
        const insertAmenity = db.prepare('INSERT OR IGNORE INTO property_amenities (id, property_id, amenity_id) VALUES (?, ?, ?)');
        for (const key of amenityKeys) {
          const am = db.prepare('SELECT id FROM amenities WHERE key = ?').get(key) as any;
          if (am) {
            insertAmenity.run(`pa-${id}-${key}`, id, am.id);
          }
        }
      }

      // 4. Refresh Media
      if (Array.isArray(mediaItems) && mediaItems.length > 0) {
        db.prepare('DELETE FROM property_media WHERE property_id = ?').run(id);
        const insertMedia = db.prepare(`
          INSERT INTO property_media (
            id, property_id, media_type, category, url, caption, display_order, is_cover, is_verified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        mediaItems.forEach((m: any, idx: number) => {
          insertMedia.run(
            `media-${id}-${idx}`,
            id,
            m.type || 'IMAGE',
            m.category || m.cat || 'EXTERIOR',
            m.url,
            m.caption || null,
            idx,
            m.isCover ? 1 : idx === 0 ? 1 : 0
          );
        });
      }

      // 5. Re-calculate Completeness
      const updatedPrice = db.prepare('SELECT * FROM prices WHERE property_id = ?').get(id) as any;
      const mediaList = db.prepare('SELECT * FROM property_media WHERE property_id = ?').all(id) as any[];
      const amenitiesCount = (db.prepare('SELECT COUNT(*) as count FROM property_amenities WHERE property_id = ?').get(id) as any)?.count || 0;
      const comp = calculateCompleteness(
        { title: title || prop.title, description: description || prop.description, address: address || prop.address, area_id: areaId || prop.area_id, distance_from_campus_km: distanceFromCampusKm || prop.distance_from_campus_km, nearby_landmark: nearbyLandmark || prop.nearby_landmark },
        updatedPrice,
        mediaList,
        amenitiesCount
      );
      db.prepare('UPDATE properties SET completeness_score = ? WHERE id = ?').run(comp.score, id);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'PROVIDER', 'UPDATE_PROPERTY', 'PROPERTY', ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        id,
        JSON.stringify({ updatedFields: Object.keys(req.body), completeness: comp.score })
      );
    })();

    res.json({ message: 'Hostel listing updated successfully' });
  }
);

// GET /api/provider/properties/:id/price-history
router.get(
  '/properties/:id/price-history',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;

    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as any;
    if (!prop) {
      return res.status(404).json({ error: 'Hostel listing not found' });
    }

    if (req.user!.role !== 'ADMIN' && prop.provider_id !== providerId) {
      return res.status(403).json({ error: 'Unauthorized to view price history for this hostel' });
    }

    const history = db.prepare(`
      SELECT * FROM price_history 
      WHERE property_id = ? 
      ORDER BY created_at DESC
    `).all(id) as any[];

    res.json({
      priceHistory: history.map(h => ({
        id: h.id,
        propertyId: h.property_id,
        previousRent: h.previous_rent,
        newRent: h.new_rent,
        previousTotal: h.previous_total_mandatory,
        newTotal: h.new_total_mandatory,
        changeReason: h.change_reason,
        createdAt: h.created_at
      }))
    });
  }
);

// PATCH /api/provider/properties/:id/availability
router.patch(
  '/properties/:id/availability',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;
    const { availabilityStatus } = req.body;

    if (!['AVAILABLE', 'LIMITED', 'UNAVAILABLE'].includes(availabilityStatus)) {
      return res.status(400).json({ error: 'Invalid availability status. Must be AVAILABLE, LIMITED, or UNAVAILABLE' });
    }

    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as any;
    if (!prop) {
      return res.status(404).json({ error: 'Hostel listing not found' });
    }

    if (req.user!.role !== 'ADMIN' && prop.provider_id !== providerId) {
      return res.status(403).json({ error: 'Unauthorized to modify this hostel' });
    }

    db.prepare(`
      UPDATE properties
      SET availability_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(availabilityStatus, id);

    res.json({ message: 'Availability updated successfully', availabilityStatus });
  }
);

// -----------------------------------------------------------------------------
// 4. ROOM & BEDSPACE INVENTORY MANAGEMENT
// -----------------------------------------------------------------------------
router.get(
  '/properties/:id/rooms',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const rooms = db.prepare('SELECT * FROM rooms WHERE property_id = ?').all(id) as any[];

    const roomsWithBedspaces = rooms.map(room => {
      const bedspaces = db.prepare('SELECT * FROM bedspaces WHERE room_id = ?').all(room.id) as any[];
      return {
        id: room.id,
        propertyId: room.property_id,
        roomName: room.room_name,
        roomType: room.room_type,
        maxOccupants: room.max_occupants,
        quantityTotal: room.quantity_total,
        quantityAvailable: room.quantity_available,
        occupiedCount: room.occupied_count,
        isEnsuite: Boolean(room.is_ensuite),
        isFurnished: Boolean(room.is_furnished),
        status: room.status,
        bedspaces: bedspaces.map(b => ({
          id: b.id,
          bedspaceNumber: b.bedspace_number,
          isOccupied: Boolean(b.is_occupied),
          priceOverride: b.price_override,
          status: b.status
        }))
      };
    });

    res.json({ rooms: roomsWithBedspaces });
  }
);

router.post(
  '/properties/:id/rooms',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;
    const { roomName, roomType, maxOccupants, quantityTotal, isEnsuite, isFurnished } = req.body;

    const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as any;
    if (!prop || (req.user!.role !== 'ADMIN' && prop.provider_id !== providerId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const roomId = `room-${id}-${Date.now()}`;
    const total = parseInt(quantityTotal, 10) || 1;
    const occupants = parseInt(maxOccupants, 10) || 1;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'AVAILABLE')
      `).run(
        roomId,
        id,
        roomName || 'New Room',
        roomType || 'SINGLE_ROOM',
        occupants,
        total,
        total,
        isEnsuite ? 1 : 0,
        isFurnished ? 1 : 0
      );

      // Create individual bedspaces for the room
      for (let b = 1; b <= occupants; b++) {
        db.prepare(`
          INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
          VALUES (?, ?, ?, 0, 'AVAILABLE')
        `).run(`bed-${roomId}-${b}`, roomId, `Space ${b}`);
      }

      // Update property total_rooms
      db.prepare(`
        UPDATE properties
        SET total_rooms = (SELECT COUNT(*) FROM rooms WHERE property_id = ?)
        WHERE id = ?
      `).run(id, id);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'PROVIDER', 'ADD_ROOM', 'ROOM', ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        roomId,
        JSON.stringify({ roomName, total, occupants })
      );
    })();

    res.status(201).json({ message: 'Room added successfully', roomId });
  }
);

router.put(
  '/rooms/:roomId',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { roomId } = req.params;
    const providerId = req.user!.id;
    const { roomName, roomType, maxOccupants, quantityTotal, quantityAvailable, isEnsuite, isFurnished, status } = req.body;

    const room = db.prepare(`
      SELECT r.*, p.provider_id FROM rooms r
      JOIN properties p ON p.id = r.property_id
      WHERE r.id = ?
    `).get(roomId) as any;

    if (!room || (req.user!.role !== 'ADMIN' && room.provider_id !== providerId)) {
      return res.status(403).json({ error: 'Unauthorized to modify this room' });
    }

    db.prepare(`
      UPDATE rooms
      SET room_name = COALESCE(?, room_name),
          room_type = COALESCE(?, room_type),
          max_occupants = COALESCE(?, max_occupants),
          quantity_total = COALESCE(?, quantity_total),
          quantity_available = COALESCE(?, quantity_available),
          is_ensuite = CASE WHEN ? IS NOT NULL THEN ? ELSE is_ensuite END,
          is_furnished = CASE WHEN ? IS NOT NULL THEN ? ELSE is_furnished END,
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      roomName,
      roomType,
      maxOccupants,
      quantityTotal,
      quantityAvailable,
      isEnsuite !== undefined ? (isEnsuite ? 1 : 0) : null,
      isEnsuite !== undefined ? (isEnsuite ? 1 : 0) : 0,
      isFurnished !== undefined ? (isFurnished ? 1 : 0) : null,
      isFurnished !== undefined ? (isFurnished ? 1 : 0) : 0,
      status,
      roomId
    );

    res.json({ message: 'Room updated successfully' });
  }
);

router.delete(
  '/rooms/:roomId',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { roomId } = req.params;
    const providerId = req.user!.id;

    const room = db.prepare(`
      SELECT r.*, p.provider_id FROM rooms r
      JOIN properties p ON p.id = r.property_id
      WHERE r.id = ?
    `).get(roomId) as any;

    if (!room || (req.user!.role !== 'ADMIN' && room.provider_id !== providerId)) {
      return res.status(403).json({ error: 'Unauthorized to delete this room' });
    }

    // Check if there are active bookings in this room
    const activeBooking = db.prepare(`
      SELECT id FROM bookings WHERE room_id = ? AND status IN ('PENDING', 'CONFIRMED')
    `).get(roomId);

    if (activeBooking) {
      return res.status(400).json({ error: 'Cannot delete room with active or confirmed student reservations.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM bedspaces WHERE room_id = ?').run(roomId);
      db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
    })();

    res.json({ message: 'Room deleted successfully' });
  }
);

// Toggle Bedspace Status
router.put(
  '/rooms/:roomId/bedspaces/:bedId',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { roomId, bedId } = req.params;
    const providerId = req.user!.id;
    const { status, isOccupied } = req.body;

    const bed = db.prepare(`
      SELECT b.*, p.provider_id, r.property_id
      FROM bedspaces b
      JOIN rooms r ON r.id = b.room_id
      JOIN properties p ON p.id = r.property_id
      WHERE b.id = ? AND r.id = ?
    `).get(bedId, roomId) as any;

    if (!bed || (req.user!.role !== 'ADMIN' && bed.provider_id !== providerId)) {
      return res.status(403).json({ error: 'Unauthorized to manage this bedspace' });
    }

    const newStatus = status || (isOccupied ? 'OCCUPIED' : 'AVAILABLE');
    const newOccupied = newStatus === 'OCCUPIED' ? 1 : 0;

    db.transaction(() => {
      db.prepare(`
        UPDATE bedspaces
        SET status = ?, is_occupied = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newStatus, newOccupied, bedId);

      // Recompute room quantity_available and occupied_count
      const bedCounts = db.prepare(`
        SELECT 
          COUNT(*) as total_beds,
          SUM(CASE WHEN is_occupied = 1 THEN 1 ELSE 0 END) as occupied_beds
        FROM bedspaces WHERE room_id = ?
      `).get(roomId) as any;

      const totalBeds = bedCounts?.total_beds || 1;
      const occupiedBeds = bedCounts?.occupied_beds || 0;
      const availableBeds = Math.max(0, totalBeds - occupiedBeds);

      db.prepare(`
        UPDATE rooms
        SET quantity_available = ?, occupied_count = ?, status = CASE WHEN ? = 0 THEN 'FULL' ELSE 'AVAILABLE' END
        WHERE id = ?
      `).run(availableBeds, occupiedBeds, availableBeds, roomId);

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (?, ?, 'PROVIDER', 'UPDATE_BEDSPACE', 'BEDSPACE', ?, ?)
      `).run(
        crypto.randomUUID(),
        providerId,
        bedId,
        JSON.stringify({ from: bed.status, to: newStatus })
      );
    })();

    res.json({ message: `Bedspace updated to ${newStatus}` });
  }
);

// -----------------------------------------------------------------------------
// 5. UNIFIED AVAILABILITY & CALENDAR FEED
// -----------------------------------------------------------------------------
router.get(
  '/calendar',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { propertyId } = req.query;

    const propFilter = propertyId && propertyId !== 'all' ? 'AND p.id = ?' : '';
    const propParams = propertyId && propertyId !== 'all' ? [providerId, propertyId] : [providerId];

    // 1. Booking Move-ins
    const bookings = db.prepare(`
      SELECT b.id, b.booking_reference, b.move_in_date, b.status, b.payment_status,
             p.title as property_title, u.full_name as student_name, r.room_name
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      JOIN users u ON u.id = b.student_id
      JOIN rooms r ON r.id = b.room_id
      WHERE p.provider_id = ? AND b.status IN ('PENDING', 'CONFIRMED') ${propFilter}
    `).all(...propParams) as any[];

    // 2. Scheduled Inspections
    const inspections = db.prepare(`
      SELECT ir.id, ir.preferred_date, ir.preferred_time, ir.inspection_type, ir.status,
             p.title as property_title, u.full_name as student_name
      FROM inspection_requests ir
      JOIN properties p ON p.id = ir.property_id
      JOIN users u ON u.id = ir.student_id
      WHERE p.provider_id = ? AND ir.status IN ('PENDING', 'CONFIRMED') ${propFilter}
    `).all(...propParams) as any[];

    const events: any[] = [];

    bookings.forEach(b => {
      events.push({
        id: `event-book-${b.id}`,
        type: 'BOOKING_MOVE_IN',
        title: `Move-in: ${b.student_name} (${b.room_name})`,
        date: b.move_in_date,
        propertyTitle: b.property_title,
        status: b.status,
        badgeLabel: b.status === 'CONFIRMED' ? 'Move-in Confirmed' : 'Reservation Pending',
        details: `Ref: ${b.booking_reference} | Payment: ${b.payment_status}`
      });
    });

    inspections.forEach(i => {
      events.push({
        id: `event-insp-${i.id}`,
        type: 'INSPECTION',
        title: `Inspection: ${i.student_name} (${i.inspection_type})`,
        date: i.preferred_date,
        time: i.preferred_time,
        propertyTitle: i.property_title,
        status: i.status,
        badgeLabel: i.status === 'CONFIRMED' ? 'Inspection Confirmed' : 'Inspection Requested',
        details: `${i.preferred_time} - ${i.inspection_type} tour`
      });
    });

    res.json({ events });
  }
);

// -----------------------------------------------------------------------------
// 6. INSPECTION SCHEDULE AVAILABILITY CONFIGURATION
// -----------------------------------------------------------------------------
router.get(
  '/inspections/availability',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const schedules = db.prepare(`
      SELECT * FROM provider_inspection_schedules
      WHERE provider_id = ?
      ORDER BY CASE day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'TUESDAY' THEN 2
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        WHEN 'SUNDAY' THEN 7
      END
    `).all(providerId) as any[];

    // If no schedules configured yet, seed defaults (Mon-Sat 10am-4pm)
    if (schedules.length === 0) {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const defaultSlots = days.map(day => ({
        id: `sched-${crypto.randomUUID()}`,
        provider_id: providerId,
        property_id: null,
        day_of_week: day,
        is_available: day === 'SUNDAY' ? 0 : 1,
        start_time: '10:00 AM',
        end_time: '04:00 PM'
      }));

      const insert = db.prepare(`
        INSERT INTO provider_inspection_schedules (id, provider_id, property_id, day_of_week, is_available, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      defaultSlots.forEach(s => insert.run(s.id, s.provider_id, s.property_id, s.day_of_week, s.is_available, s.start_time, s.end_time));

      return res.json({ schedules: defaultSlots.map(s => ({ ...s, isAvailable: Boolean(s.is_available) })) });
    }

    res.json({
      schedules: schedules.map(s => ({
        id: s.id,
        dayOfWeek: s.day_of_week,
        isAvailable: Boolean(s.is_available),
        startTime: s.start_time,
        endTime: s.end_time,
        propertyId: s.property_id
      }))
    });
  }
);

router.put(
  '/inspections/availability',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { schedules } = req.body;

    if (!Array.isArray(schedules)) {
      return res.status(400).json({ error: 'Schedules array is required' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM provider_inspection_schedules WHERE provider_id = ?').run(providerId);

      const insert = db.prepare(`
        INSERT INTO provider_inspection_schedules (id, provider_id, property_id, day_of_week, is_available, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      schedules.forEach(s => {
        insert.run(
          s.id || `sched-${crypto.randomUUID()}`,
          providerId,
          s.propertyId || null,
          s.dayOfWeek || s.day_of_week,
          s.isAvailable !== undefined ? (s.isAvailable ? 1 : 0) : 1,
          s.startTime || s.start_time || '10:00 AM',
          s.endTime || s.end_time || '04:00 PM'
        );
      });
    })();

    res.json({ message: 'Inspection availability schedules saved successfully' });
  }
);

// -----------------------------------------------------------------------------
// 7. QUICK REPLIES TEMPLATES
// -----------------------------------------------------------------------------
router.get(
  '/quick-replies',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    let replies = db.prepare('SELECT * FROM provider_quick_replies WHERE provider_id = ? ORDER BY usage_count DESC').all(providerId) as any[];

    if (replies.length === 0) {
      const defaultTemplates = [
        { title: 'Availability Confirmed', text: 'Yes, this room/bedspace is currently available and ready for move-in.', category: 'AVAILABILITY' },
        { title: 'Inspection Invite', text: 'You are welcome to inspect tomorrow between 10 AM and 4 PM. Please schedule it on Hostel Ease.', category: 'INSPECTION' },
        { title: 'Campus Proximity', text: 'The hostel is approximately 0.8km from the LAUTECH main gate, about 8 minutes walk.', category: 'LOCATION' },
        { title: 'Water & Light Policy', text: 'We have 24/7 borehole water and a backup generator run every evening between 7 PM and 11 PM.', category: 'FACILITIES' },
        { title: 'Payment Reminder', text: 'Please complete payment securely on Hostel Ease so your room space is officially locked.', category: 'PAYMENT' }
      ];

      const insert = db.prepare(`
        INSERT INTO provider_quick_replies (id, provider_id, title, message_text, category)
        VALUES (?, ?, ?, ?, ?)
      `);

      defaultTemplates.forEach(t => {
        insert.run(`qr-${crypto.randomUUID()}`, providerId, t.title, t.text, t.category);
      });

      replies = db.prepare('SELECT * FROM provider_quick_replies WHERE provider_id = ?').all(providerId) as any[];
    }

    res.json({
      quickReplies: replies.map(r => ({
        id: r.id,
        title: r.title,
        messageText: r.message_text,
        category: r.category,
        usageCount: r.usage_count
      }))
    });
  }
);

router.post(
  '/quick-replies',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { title, messageText, category } = req.body;

    if (!title || !messageText) {
      return res.status(400).json({ error: 'Title and message text are required' });
    }

    const id = `qr-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO provider_quick_replies (id, provider_id, title, message_text, category)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, providerId, title.trim(), messageText.trim(), category || 'GENERAL');

    res.status(201).json({ message: 'Quick reply template created', id });
  }
);

router.delete(
  '/quick-replies/:id',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;

    db.prepare('DELETE FROM provider_quick_replies WHERE id = ? AND provider_id = ?').run(id, providerId);
    res.json({ message: 'Quick reply deleted' });
  }
);

// -----------------------------------------------------------------------------
// 8. PERFORMANCE & CONVERSION FUNNEL
// -----------------------------------------------------------------------------
router.get(
  '/performance',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { propertyId, period } = req.query;

    const propFilter = propertyId && propertyId !== 'all' ? 'AND p.id = ?' : '';
    const propParams = propertyId && propertyId !== 'all' ? [providerId, propertyId] : [providerId];

    // Funnel Stage 1: Views
    let viewsQuery = `
      SELECT COUNT(*) as count
      FROM recently_viewed_hostels rvh
      JOIN properties p ON p.id = rvh.property_id
      WHERE p.provider_id = ? ${propFilter}
    `;
    const viewsCount = (db.prepare(viewsQuery).get(...propParams) as any)?.count || 0;

    // Funnel Stage 2: Shortlist Saves
    let savesQuery = `
      SELECT COUNT(*) as count
      FROM saved_properties sp
      JOIN properties p ON p.id = sp.property_id
      WHERE p.provider_id = ? ${propFilter}
    `;
    const savesCount = (db.prepare(savesQuery).get(...propParams) as any)?.count || 0;

    // Funnel Stage 3: Inspection Requests
    let inspQuery = `
      SELECT COUNT(*) as count
      FROM inspection_requests ir
      JOIN properties p ON p.id = ir.property_id
      WHERE p.provider_id = ? ${propFilter}
    `;
    const inspectionCount = (db.prepare(inspQuery).get(...propParams) as any)?.count || 0;

    // Funnel Stage 4: Booking Requests
    let bookQuery = `
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE p.provider_id = ? ${propFilter}
    `;
    const bookingRequestsCount = (db.prepare(bookQuery).get(...propParams) as any)?.count || 0;

    // Funnel Stage 5: Confirmed / Paid Bookings
    let paidQuery = `
      SELECT COUNT(*) as count
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE p.provider_id = ? AND (b.status = 'CONFIRMED' OR b.payment_status = 'PAID') ${propFilter}
    `;
    const confirmedCount = (db.prepare(paidQuery).get(...propParams) as any)?.count || 0;

    // Student Reviews for Provider
    const reviews = db.prepare(`
      SELECT r.id, r.rating, r.clean_rating, r.security_rating, r.water_rating, r.electricity_rating,
             r.comment, r.created_at, p.title as property_title, u.full_name as student_name
      FROM reviews r
      JOIN properties p ON p.id = r.property_id
      JOIN users u ON u.id = r.student_id
      WHERE p.provider_id = ? ${propFilter}
      ORDER BY r.created_at DESC
      LIMIT 20
    `).all(...propParams) as any[];

    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

    res.json({
      funnel: {
        views: viewsCount,
        saves: savesCount,
        inspections: inspectionCount,
        bookingRequests: bookingRequestsCount,
        confirmedBookings: confirmedCount,
        conversionRate: viewsCount > 0 ? ((confirmedCount / viewsCount) * 100).toFixed(1) + '%' : '0%'
      },
      reviews: {
        totalReviews: reviews.length,
        averageRating: parseFloat(avgRating),
        items: reviews
      }
    });
  }
);

// Report Abusive Student Review
router.post(
  '/reviews/:id/report',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;
    const { reason, description } = req.body;

    const review = db.prepare('SELECT property_id FROM reviews WHERE id = ?').get(id) as any;
    const propId = review?.property_id;

    if (!propId) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const reportId = `rep-rev-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO listing_reports (id, user_id, property_id, reason, description, status)
      VALUES (?, ?, ?, ?, ?, 'OPEN')
    `).run(reportId, providerId, propId, reason || 'INAPPROPRIATE_REVIEW', description || 'Provider reported review for admin moderation');

    res.status(201).json({ message: 'Review reported to admin for investigation', reportId });
  }
);

// -----------------------------------------------------------------------------
// 9. PROVIDER AI ASSISTANT (Domain Intelligence for Landlords)
// -----------------------------------------------------------------------------
router.post(
  '/ai/assist',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { prompt, propertyId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const lower = prompt.toLowerCase();
    let reply = '';
    let structuredData: any = null;

    // 1. Available Spaces Query
    if (lower.includes('available') || lower.includes('space') || lower.includes('vacant') || lower.includes('capacity')) {
      const propFilter = propertyId && propertyId !== 'all' ? 'AND p.id = ?' : '';
      const propParams = propertyId && propertyId !== 'all' ? [providerId, propertyId] : [providerId];

      const rooms = db.prepare(`
        SELECT r.room_name, r.quantity_total, r.quantity_available, r.occupied_count, p.title as property_title
        FROM rooms r
        JOIN properties p ON p.id = r.property_id
        WHERE p.provider_id = ? ${propFilter}
      `).all(...propParams) as any[];

      const totalAvail = rooms.reduce((sum, r) => sum + r.quantity_available, 0);
      const totalCap = rooms.reduce((sum, r) => sum + r.quantity_total, 0);

      reply = `You currently have **${totalAvail} available space${totalAvail === 1 ? '' : 's'}** across **${totalCap} total units** in your registered LAUTECH accommodations.\n\n`;
      rooms.forEach(r => {
        reply += `• **${r.property_title}** (${r.room_name}): ${r.quantity_available} free / ${r.quantity_total} total\n`;
      });

      structuredData = { type: 'SPACE_SUMMARY', totalAvailable: totalAvail, totalCapacity: totalCap, rooms };
    }

    // 2. Pending Bookings Needing Attention
    else if (lower.includes('booking') || lower.includes('attention') || lower.includes('need') || lower.includes('pending')) {
      const pending = db.prepare(`
        SELECT b.id, b.booking_reference, b.move_in_date, b.created_at, b.expires_at,
               p.title as property_title, u.full_name as student_name, r.room_name
        FROM bookings b
        JOIN properties p ON p.id = b.property_id
        JOIN users u ON u.id = b.student_id
        JOIN rooms r ON r.id = b.room_id
        WHERE p.provider_id = ? AND b.status = 'PENDING'
        ORDER BY b.created_at ASC
      `).all(providerId) as any[];

      if (pending.length === 0) {
        reply = `All clear! You currently have **0 pending booking reservations** requiring response. All recent student requests have been processed.`;
      } else {
        reply = `You have **${pending.length} booking reservation${pending.length > 1 ? 's' : ''}** awaiting your confirmation:\n\n`;
        pending.forEach((b, idx) => {
          reply += `${idx + 1}. **${b.student_name}** for ${b.property_title} (${b.room_name}) — Move-in: ${b.move_in_date} (Ref: \`${b.booking_reference}\`)\n`;
        });
        reply += `\nWould you like me to open the Bookings tab so you can confirm or decline them?`;
      }

      structuredData = { type: 'BOOKING_SUMMARY', pendingBookings: pending };
    }

    // 3. Inspections Query
    else if (lower.includes('inspection') || lower.includes('tomorrow') || lower.includes('schedule') || lower.includes('tour')) {
      const inspections = db.prepare(`
        SELECT ir.id, ir.preferred_date, ir.preferred_time, ir.inspection_type, ir.status,
               p.title as property_title, u.full_name as student_name
        FROM inspection_requests ir
        JOIN properties p ON p.id = ir.property_id
        JOIN users u ON u.id = ir.student_id
        WHERE p.provider_id = ? AND ir.status IN ('PENDING', 'CONFIRMED')
        ORDER BY ir.preferred_date ASC
      `).all(providerId) as any[];

      if (inspections.length === 0) {
        reply = `You have no pending or upcoming student inspections scheduled right now.`;
      } else {
        reply = `You have **${inspections.length} upcoming or pending inspection${inspections.length > 1 ? 's' : ''}**:\n\n`;
        inspections.forEach((i, idx) => {
          reply += `${idx + 1}. **${i.student_name}** — ${i.property_title} on **${i.preferred_date} at ${i.preferred_time}** (${i.inspection_type}, Status: ${i.status})\n`;
        });
      }

      structuredData = { type: 'INSPECTION_SUMMARY', inspections };
    }

    // 4. Listing Description Rewrite / Enhancement
    else if (lower.includes('improve') || lower.includes('description') || lower.includes('rewrite') || lower.includes('wording')) {
      let targetProp: any = null;
      if (propertyId && propertyId !== 'all') {
        targetProp = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
      } else {
        targetProp = db.prepare('SELECT * FROM properties WHERE provider_id = ? LIMIT 1').get(providerId);
      }

      if (targetProp) {
        reply = `Here is a professionally structured, student-attractive description for **${targetProp.title}** grounded in your verified property details:\n\n` +
          `**Overview:**\n` +
          `Welcome to ${targetProp.title}, premium student accommodation situated in ${targetProp.address}. Located just ${targetProp.distance_from_campus_km}km from LAUTECH campus gates, it offers an ideal balance of academic focus and convenience.\n\n` +
          `**Key Features & Living Comfort:**\n` +
          `• Reliable water supply with dedicated overhead storage\n` +
          `• Secured gated perimeter wall with night lighting\n` +
          `• Well-ventilated self-contain units\n\n` +
          `**House Rules:**\n` +
          `Quiet hours after 10 PM. No unauthorized subletting. Inspections available Mon–Sat.`;
      } else {
        reply = `Please select or add a hostel first, and I will craft an optimized description for your listing.`;
      }
    }

    // Default Fallback
    else {
      reply = `I am your **Hostel Ease Landlord Assistant**. I can help you check available bedspaces, summarize pending booking reservations, view upcoming student inspection tours, or optimize your hostel descriptions.\n\nTry asking:\n• *"How many spaces are currently available?"*\n• *"Which bookings need my attention?"*\n• *"How many inspections do I have scheduled?"*`;
    }

    res.json({
      response: reply,
      structuredData
    });
  }
);

// -----------------------------------------------------------------------------
// 10. PROVIDER TEAM ROLES & PERMISSIONS
// -----------------------------------------------------------------------------
router.get(
  '/team',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const team = db.prepare(`
      SELECT ptr.id, ptr.role, ptr.created_at, u.id as user_id, u.full_name, u.email, u.phone,
             p.title as property_title
      FROM provider_team_roles ptr
      JOIN users u ON u.id = ptr.user_id
      LEFT JOIN properties p ON p.id = ptr.property_id
      WHERE ptr.provider_id = ?
    `).all(providerId) as any[];

    res.json({ team });
  }
);

router.post(
  '/team',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const { email, role, propertyId } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role (MANAGER / STAFF) are required' });
    }

    const member = db.prepare('SELECT id, full_name FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
    if (!member) {
      return res.status(404).json({ error: 'User with this email was not found. Please ask them to create an account first.' });
    }

    const existing = db.prepare('SELECT id FROM provider_team_roles WHERE provider_id = ? AND user_id = ?').get(providerId, member.id);
    if (existing) {
      return res.status(400).json({ error: 'This user is already a member of your accommodation team.' });
    }

    const id = `ptr-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO provider_team_roles (id, provider_id, user_id, role, property_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, providerId, member.id, role, propertyId || null);

    res.status(201).json({ message: `${member.full_name} added as ${role}`, id });
  }
);

router.delete(
  '/team/:id',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const providerId = req.user!.id;

    db.prepare('DELETE FROM provider_team_roles WHERE id = ? AND provider_id = ?').run(id, providerId);
    res.json({ message: 'Team member removed' });
  }
);

// -----------------------------------------------------------------------------
// 11. PROVIDER ACTIVITY AUDIT LOG
// -----------------------------------------------------------------------------
router.get(
  '/audit-logs',
  authenticate,
  requireRole('PROVIDER', 'ADMIN'),
  (req: AuthenticatedRequest, res: Response) => {
    const providerId = req.user!.id;
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE actor_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(providerId) as any[];

    res.json({ logs });
  }
);

export default router;
