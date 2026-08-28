import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper to generate unique booking reference (e.g. HE-2026-081293)
function generateBookingReference(): string {
  const currentYear = new Date().getFullYear();
  let reference = '';
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    reference = `HE-${currentYear}-${randomDigits}`;
    const existing = db.prepare('SELECT id FROM bookings WHERE booking_reference = ?').get(reference);
    if (!existing) {
      isUnique = true;
    }
  }

  return reference;
}

// 1. Get real-time room & bedspace availability for a property
router.get('/availability/properties/:propertyId', (req, res: Response) => {
  const { propertyId } = req.params;

  const property = db.prepare(`
    SELECT id, title, total_rooms, availability_status, provider_id
    FROM properties
    WHERE id = ?
  `).get(propertyId) as any;

  if (!property) {
    return res.status(404).json({ error: 'Hostel property not found' });
  }

  const rooms = db.prepare(`
    SELECT id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status
    FROM rooms
    WHERE property_id = ?
    ORDER BY room_name ASC
  `).all(propertyId) as any[];

  const prices = db.prepare(`
    SELECT id, room_id, rent_amount, service_charge, agency_fee, caution_fee, other_mandatory_charges
    FROM prices
    WHERE property_id = ?
  `).all(propertyId) as any[];

  const defaultPrice = prices.find(p => !p.room_id) || prices[0] || {
    rent_amount: 150000,
    service_charge: 10000,
    agency_fee: 10000,
    caution_fee: 15000,
    other_mandatory_charges: 5000
  };

  const roomsWithBedspaces = rooms.map(room => {
    const bedspaces = db.prepare(`
      SELECT b.id, b.bedspace_number, b.is_occupied, b.price_override, b.gender_preference, b.status,
             (SELECT COUNT(*) FROM bookings bk WHERE bk.bedspace_id = b.id AND bk.status IN ('PENDING', 'CONFIRMED')) as active_booking_count
      FROM bedspaces b
      WHERE b.room_id = ?
      ORDER BY b.bedspace_number ASC
    `).all(room.id) as any[];

    const roomPrice = prices.find(p => p.room_id === room.id) || defaultPrice;

    return {
      id: room.id,
      name: room.room_name,
      type: room.room_type,
      maxOccupants: room.max_occupants,
      quantityTotal: room.quantity_total,
      quantityAvailable: Math.max(0, room.quantity_available),
      occupiedCount: room.occupied_count,
      isEnsuite: Boolean(room.is_ensuite),
      isFurnished: Boolean(room.is_furnished),
      status: room.status,
      pricing: {
        rentAmount: roomPrice.rent_amount,
        serviceCharge: roomPrice.service_charge || 0,
        agencyFee: roomPrice.agency_fee || 0,
        cautionDeposit: roomPrice.caution_fee || 0,
        otherCharges: roomPrice.other_mandatory_charges || 0,
        totalCost: (roomPrice.rent_amount || 0) + 
                   (roomPrice.service_charge || 0) + 
                   (roomPrice.agency_fee || 0) + 
                   (roomPrice.caution_fee || 0) + 
                   (roomPrice.other_mandatory_charges || 0)
      },
      bedspaces: bedspaces.map(b => ({
        id: b.id,
        bedspaceNumber: b.bedspace_number,
        isOccupied: Boolean(b.is_occupied) || b.active_booking_count > 0,
        priceOverride: b.price_override,
        genderPreference: b.gender_preference,
        status: b.active_booking_count > 0 ? 'RESERVED' : (b.is_occupied ? 'OCCUPIED' : b.status)
      }))
    };
  });

  res.json({
    propertyId: property.id,
    title: property.title,
    availabilityStatus: property.availability_status,
    rooms: roomsWithBedspaces
  });
});

// 2. Create a Reservation Request (STUDENT only)
const createReservationHandler = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Only registered students can reserve hostel accommodation' });
  }

  const {
    propertyId,
    roomId,
    bedspaceId,
    moveInDate,
    academicSession = '2026/2027',
    durationMonths = 12,
    specialRequests
  } = req.body;

  if (!propertyId || !roomId || !moveInDate) {
    return res.status(400).json({ error: 'Property, room type, and move-in date are required' });
  }

  // Validate Move-in date is not in the past
  const targetDate = new Date(moveInDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(targetDate.getTime()) || targetDate < today) {
    return res.status(400).json({ error: 'Move-in date must be a valid future date' });
  }

  try {
    const result = db.transaction(() => {
      // 1. Fetch Property
      const property = db.prepare(`
        SELECT id, title, provider_id, area_id, availability_status
        FROM properties
        WHERE id = ?
      `).get(propertyId) as any;

      if (!property) {
        throw new Error('Hostel property not found');
      }

      if (property.availability_status === 'FULL') {
        throw new Error('This hostel is currently fully occupied');
      }

      // 2. Fetch Room
      const room = db.prepare(`
        SELECT id, room_name, room_type, quantity_total, quantity_available, occupied_count
        FROM rooms
        WHERE id = ? AND property_id = ?
      `).get(roomId, propertyId) as any;

      if (!room) {
        throw new Error('Selected room type not found in this hostel');
      }

      // 3. Check if student already has an active booking for this property
      const existingStudentBooking = db.prepare(`
        SELECT id, booking_reference, status
        FROM bookings
        WHERE student_id = ? AND property_id = ? AND status IN ('PENDING', 'CONFIRMED')
      `).get(req.user!.id, propertyId) as any;

      if (existingStudentBooking) {
        throw new Error(`You already have an active reservation (${existingStudentBooking.booking_reference} - ${existingStudentBooking.status}) for this hostel.`);
      }

      // 4. Bedspace Level Check & Lock (if bedspaceId provided)
      let selectedBedspace: any = null;
      if (bedspaceId) {
        selectedBedspace = db.prepare(`
          SELECT id, bedspace_number, is_occupied, status
          FROM bedspaces
          WHERE id = ? AND room_id = ?
        `).get(bedspaceId, roomId) as any;

        if (!selectedBedspace) {
          throw new Error('Selected bedspace not found in this room');
        }

        // Check if bedspace is currently occupied or actively held
        const activeBedspaceBooking = db.prepare(`
          SELECT id, booking_reference
          FROM bookings
          WHERE bedspace_id = ? AND status IN ('PENDING', 'CONFIRMED')
        `).get(bedspaceId) as any;

        if (selectedBedspace.is_occupied || activeBedspaceBooking) {
          const err: any = new Error('Sorry, this bedspace is no longer available. Another student may have just reserved it.');
          err.statusCode = 409;
          throw err;
        }

        // Mark bedspace as occupied/held
        db.prepare(`
          UPDATE bedspaces
          SET is_occupied = 1, status = 'RESERVED', updated_at = datetime('now')
          WHERE id = ?
        `).run(bedspaceId);
      }

      // 5. Room Level Capacity Check & Decrement
      if (room.quantity_available <= 0) {
        const err: any = new Error('Sorry, all spaces in this room type are currently booked.');
        err.statusCode = 409;
        throw err;
      }

      db.prepare(`
        UPDATE rooms
        SET quantity_available = quantity_available - 1,
            occupied_count = occupied_count + 1
        WHERE id = ?
      `).run(roomId);

      // 6. Calculate Price Server-Side (NEVER trust frontend)
      const prices = db.prepare(`
        SELECT rent_amount, service_charge, agency_fee, caution_fee, other_mandatory_charges
        FROM prices
        WHERE property_id = ? AND (room_id = ? OR room_id IS NULL)
        ORDER BY room_id DESC
        LIMIT 1
      `).get(propertyId, roomId) as any;

      const rentAmount = prices?.rent_amount || 150000;
      const serviceCharge = prices?.service_charge || 0;
      const agencyFee = prices?.agency_fee || 0;
      const cautionDeposit = prices?.caution_fee || 0;
      const otherCharges = prices?.other_mandatory_charges || 0;
      const totalCost = rentAmount + serviceCharge + agencyFee + cautionDeposit + otherCharges;

      // 7. Generate Reference & Expiration (48 hours response window)
      const bookingId = `book-${crypto.randomUUID()}`;
      const bookingReference = generateBookingReference();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      // 8. Insert Booking Record
      db.prepare(`
        INSERT INTO bookings (
          id, booking_reference, student_id, provider_id, property_id, room_id, bedspace_id,
          move_in_date, academic_session, duration_months,
          rent_amount, service_charge, agency_fee, caution_deposit, other_charges, total_cost,
          status, expires_at, special_requests
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          'PENDING', ?, ?
        )
      `).run(
        bookingId,
        bookingReference,
        req.user!.id,
        property.provider_id,
        propertyId,
        roomId,
        bedspaceId || null,
        moveInDate,
        academicSession,
        durationMonths,
        rentAmount,
        serviceCharge,
        agencyFee,
        cautionDeposit,
        otherCharges,
        totalCost,
        expiresAt,
        specialRequests || null
      );

      // 9. Record Initial Status History
      db.prepare(`
        INSERT INTO booking_status_history (id, booking_id, actor_id, actor_role, previous_status, new_status, reason, notes)
        VALUES (?, ?, ?, 'STUDENT', NULL, 'PENDING', NULL, 'Reservation created by student')
      `).run(`bhist-${crypto.randomUUID()}`, bookingId, req.user!.id);

      // 10. Send In-App Notification to Provider
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'BOOKING_REQUEST', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        property.provider_id,
        'New Hostel Reservation Request',
        `A student requested to reserve a space in ${property.title} (Ref: ${bookingReference}). Please review and confirm within 48 hours.`,
        `/provider/bookings`
      );

      // 11. Connect or create conversation and record milestone message
      let conv = db.prepare(`
        SELECT id FROM conversations
        WHERE property_id = ? AND student_id = ? AND provider_id = ?
      `).get(propertyId, req.user!.id, property.provider_id) as any;

      if (!conv) {
        const convId = `conv-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at, status)
          VALUES (?, ?, ?, ?, ?, datetime('now'), 'ACTIVE')
        `).run(convId, propertyId, req.user!.id, property.provider_id, `Reservation request created: ${bookingReference}`);
        conv = { id: convId };
      }

      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
        VALUES (?, ?, ?, 'STUDENT', 'SYSTEM_EVENT', ?, 0)
      `).run(
        `msg-${crypto.randomUUID()}`,
        conv.id,
        req.user!.id,
        `📋 Reservation Request Created (${bookingReference}) for ${room.room_name}${selectedBedspace ? ` - ${selectedBedspace.bedspace_number}` : ''}. Move-in: ${moveInDate}. Total: ₦${totalCost.toLocaleString()}`
      );

      return {
        bookingId,
        bookingReference,
        status: 'PENDING',
        expiresAt,
        totalCost,
        breakdown: {
          rentAmount,
          serviceCharge,
          agencyFee,
          cautionDeposit,
          otherCharges
        }
      };
    })();

    res.status(201).json({
      message: 'Reservation request successfully created and submitted to landlord',
      ...result
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    res.status(statusCode).json({ error: err.message || 'Failed to create reservation' });
  }
};

router.post('/reserve', authenticate, createReservationHandler);
router.post('/', authenticate, createReservationHandler);

// 3. Get Bookings List (Student or Provider)
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { status } = req.query;

  let query = `
    SELECT 
      b.id,
      b.booking_reference as bookingReference,
      b.property_id as propertyId,
      p.title as propertyTitle,
      COALESCE(
        (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
        (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1),
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
      ) as propertyCoverImage,
      p.distance_from_campus_km as distanceFromCampusKm,
      a.name as areaName,
      b.room_id as roomId,
      r.room_name as roomName,
      r.room_type as roomType,
      b.bedspace_id as bedspaceId,
      bs.bedspace_number as bedspaceNumber,
      b.move_in_date as moveInDate,
      b.academic_session as academicSession,
      b.duration_months as durationMonths,
      b.rent_amount as rentAmount,
      b.service_charge as serviceCharge,
      b.agency_fee as agencyFee,
      b.caution_deposit as cautionDeposit,
      b.other_charges as otherCharges,
      b.total_cost as totalCost,
      b.status,
      b.expires_at as expiresAt,
      b.cancellation_reason as cancellationReason,
      b.decline_reason as declineReason,
      b.special_requests as specialRequests,
      b.created_at as createdAt,
      b.updated_at as updatedAt,
      u_student.full_name as studentName,
      u_student.email as studentEmail,
      u_student.phone as studentPhone,
      u_student.avatar_url as studentAvatarUrl,
      sp.matric_no as studentMatricNumber,
      sp.matric_no as studentMatricNo,
      sp.department as studentDepartment,
      sp.level as studentLevel,
      sp.gender as studentGender,
      u_provider.full_name as providerName,
      u_provider.email as providerEmail,
      u_provider.phone as providerPhone
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN areas a ON p.area_id = a.id
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
    JOIN users u_student ON b.student_id = u_student.id
    LEFT JOIN student_profiles sp ON u_student.id = sp.user_id
    JOIN users u_provider ON b.provider_id = u_provider.id
  `;

  const params: any[] = [];
  const whereClauses: string[] = [];

  if (userRole === 'STUDENT') {
    whereClauses.push('b.student_id = ?');
    params.push(userId);
  } else if (userRole === 'PROVIDER') {
    whereClauses.push('b.provider_id = ?');
    params.push(userId);
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    whereClauses.push('b.status = ?');
    params.push(status);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY b.created_at DESC';

  const bookings = db.prepare(query).all(...params);
  res.json({ bookings });
});

// Helper for booking review
const handleBookingReview = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const booking = db.prepare(`
    SELECT b.*,
           p.title as propertyTitle, p.address as propertyAddress,
           (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as propertyCoverImage,
           p.verification_status as propertyVerificationStatus, p.distance_from_campus_km as distanceFromCampusKm,
           p.rules_json as propertyRulesJson,
           a.name as areaName,
           r.room_name as roomName, r.room_type as roomType, r.is_ensuite as isEnsuite, r.is_furnished as isFurnished,
           r.max_occupants as maxOccupants,
           bed.bedspace_number as bedspaceNumber,
           prov.full_name as providerName, prov.phone as providerPhone, prov.email as providerEmail,
           pp.verification_status as providerVerificationStatus, pp.management_type as managementType,
           pay.status as paymentStatus, pay.amount as paidAmount, pay.paid_at as paidAt
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    LEFT JOIN areas a ON p.area_id = a.id
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN bedspaces bed ON b.bedspace_id = bed.id
    JOIN users prov ON b.provider_id = prov.id
    LEFT JOIN provider_profiles pp ON prov.id = pp.user_id
    LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'SUCCESS'
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Permission Check
  if (req.user!.role !== 'ADMIN' && booking.student_id !== userId && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized to review this booking' });
  }

  const platformFee = 5000;
  const baseRent = booking.rent_amount || 0;
  const serviceCharge = booking.service_charge || 0;
  const agencyFee = booking.agency_fee || 0;
  const cautionDeposit = booking.caution_deposit || 0;
  const otherCharges = booking.other_charges || 0;

  const totalMandatory = baseRent + serviceCharge + agencyFee + cautionDeposit + otherCharges;
  const totalWithPlatform = totalMandatory + platformFee;

  let rules: string[] = [];
  try {
    rules = JSON.parse(booking.propertyRulesJson || '[]');
  } catch (e) {
    rules = ['No smoking inside rooms', 'Quiet hours after 10 PM', 'Keep common areas clean'];
  }

  res.json({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    status: booking.status,
    paymentStatus: booking.paymentStatus || 'UNPAID',
    isPaid: Boolean(booking.paidAmount),
    paidAt: booking.paidAt,
    expiresAt: booking.expires_at,
    moveInDate: booking.move_in_date,
    durationMonths: booking.duration_months,
    academicSession: booking.academic_session,
    hostel: {
      id: booking.property_id,
      title: booking.propertyTitle,
      address: booking.propertyAddress,
      coverImage: booking.propertyCoverImage,
      areaName: booking.areaName || 'LAUTECH Off-Campus',
      distanceFromCampusKm: booking.distanceFromCampusKm,
      verificationStatus: booking.propertyVerificationStatus,
      isVerified: booking.propertyVerificationStatus === 'APPROVED',
      rules
    },
    room: {
      id: booking.room_id,
      name: booking.roomName,
      type: booking.roomType,
      maxOccupants: booking.maxOccupants,
      isEnsuite: Boolean(booking.isEnsuite),
      isFurnished: Boolean(booking.isFurnished),
      bedspace: booking.bedspaceNumber ? `Bedspace ${booking.bedspaceNumber}` : 'Full Room'
    },
    provider: {
      id: booking.provider_id,
      name: booking.providerName,
      phone: booking.providerPhone,
      email: booking.providerEmail,
      managementType: booking.managementType || 'DIRECT_OWNER',
      isVerified: booking.providerVerificationStatus === 'APPROVED' || booking.providerVerificationStatus === 'VERIFIED'
    },
    priceBreakdown: {
      baseRent,
      serviceCharge,
      agencyFee,
      cautionDeposit,
      otherCharges,
      platformFee,
      totalMandatory,
      totalAmount: totalWithPlatform,
      optionalCharges: [
        { id: 'opt_bedding', title: 'Pre-washed Bedding & Pillow Set', amount: 5000, isSelected: false },
        { id: 'opt_cleaning', title: 'Bi-Weekly Move-In Cleaning Service', amount: 8000, isSelected: false }
      ]
    },
    cancellationPolicy: {
      policyType: 'STANDARD_FLEXIBLE',
      summary: 'Free 100% refund within 24 hours of booking or if landlord cancels before move-in. 10% platform processing fee applies if cancelled by student after 24 hours.',
      freeCancellationWindowHours: 24,
      refundableCautionDeposit: true
    }
  });
};

router.get('/review/:id', authenticate, handleBookingReview);
router.get('/:id/review', authenticate, handleBookingReview);

// 4. Get Booking Details by ID
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare(`
    SELECT 
      b.*,
      p.title as propertyTitle,
      p.address as propertyAddress,
      COALESCE(
        (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1),
        (SELECT url FROM property_media WHERE property_id = p.id LIMIT 1),
        'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
      ) as propertyCoverImage,
      p.nearby_landmark as nearbyLandmark,
      p.distance_from_campus_km as distanceFromCampusKm,
      a.name as areaName,
      r.room_name as roomName,
      r.room_type as roomType,
      r.is_ensuite as isEnsuite,
      bs.bedspace_number as bedspaceNumber,
      u_student.full_name as studentName,
      u_student.email as studentEmail,
      u_student.phone as studentPhone,
      u_student.avatar_url as studentAvatarUrl,
      sp.matric_no as studentMatricNumber,
      sp.department as studentDepartment,
      sp.level as studentLevel,
      sp.gender as studentGender,
      u_provider.full_name as providerName,
      u_provider.email as providerEmail,
      u_provider.phone as providerPhone
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN areas a ON p.area_id = a.id
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN bedspaces bs ON b.bedspace_id = bs.id
    JOIN users u_student ON b.student_id = u_student.id
    LEFT JOIN student_profiles sp ON u_student.id = sp.user_id
    JOIN users u_provider ON b.provider_id = u_provider.id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking reservation not found' });
  }

  // Authorization Check
  if (userRole !== 'ADMIN' && booking.student_id !== userId && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'You are not authorized to view this booking reservation' });
  }

  // History timeline
  const history = db.prepare(`
    SELECT h.id, h.actor_id, h.actor_role, h.previous_status, h.new_status, h.reason, h.notes, h.created_at,
           u.full_name as actorName
    FROM booking_status_history h
    JOIN users u ON h.actor_id = u.id
    WHERE h.booking_id = ?
    ORDER BY h.created_at ASC
  `).all(booking.id);

  res.json({
    booking: {
      id: booking.id,
      bookingReference: booking.booking_reference,
      property: {
        id: booking.property_id,
        title: booking.propertyTitle,
        address: booking.propertyAddress,
        coverImage: booking.propertyCoverImage,
        areaName: booking.areaName,
        nearbyLandmark: booking.nearbyLandmark,
        distanceFromCampusKm: booking.distanceFromCampusKm
      },
      room: {
        id: booking.room_id,
        name: booking.roomName,
        type: booking.roomType,
        isEnsuite: Boolean(booking.isEnsuite)
      },
      bedspace: booking.bedspace_id ? {
        id: booking.bedspace_id,
        number: booking.bedspaceNumber
      } : null,
      student: {
        id: booking.student_id,
        name: booking.studentName,
        email: booking.studentEmail,
        phone: booking.studentPhone,
        avatarUrl: booking.studentAvatarUrl,
        matricNo: booking.studentMatricNumber,
        matricNumber: booking.studentMatricNumber,
        department: booking.studentDepartment,
        level: booking.studentLevel,
        gender: booking.studentGender
      },
      provider: {
        id: booking.provider_id,
        name: booking.providerName,
        email: booking.providerEmail,
        phone: booking.providerPhone
      },
      pricing: {
        rentAmount: booking.rent_amount,
        serviceCharge: booking.service_charge,
        agencyFee: booking.agency_fee,
        cautionDeposit: booking.caution_deposit,
        otherCharges: booking.other_charges,
        totalCost: booking.total_cost
      },
      moveInDate: booking.move_in_date,
      academicSession: booking.academic_session,
      durationMonths: booking.duration_months,
      status: booking.status,
      expiresAt: booking.expires_at,
      cancellationReason: booking.cancellation_reason,
      declineReason: booking.decline_reason,
      specialRequests: booking.special_requests,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at
    },
    history
  });
});

// 5. Provider Confirms Reservation
router.patch('/:id/confirm', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle, u_student.id as studentId, u_student.full_name as studentName
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN users u_student ON b.student_id = u_student.id
    WHERE b.id = ?
  `).get(id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking reservation not found' });
  }

  if (userRole !== 'ADMIN' && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'You are not authorized to confirm bookings for this property' });
  }

  if (booking.status !== 'PENDING') {
    return res.status(400).json({ error: `Cannot confirm a booking with status ${booking.status}` });
  }

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE bookings
        SET status = 'CONFIRMED', updated_at = datetime('now')
        WHERE id = ?
      `).run(id);

      db.prepare(`
        INSERT INTO booking_status_history (id, booking_id, actor_id, actor_role, previous_status, new_status, notes)
        VALUES (?, ?, ?, ?, 'PENDING', 'CONFIRMED', 'Reservation confirmed by landlord')
      `).run(`bhist-${crypto.randomUUID()}`, id, userId, userRole);

      // Send notification to student
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'BOOKING_CONFIRMED', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        booking.student_id,
        '🎉 Reservation Confirmed!',
        `Your reservation for ${booking.propertyTitle} (Ref: ${booking.booking_reference}) has been confirmed by the landlord.`,
        `/bookings/${booking.id}`
      );

      // Record in conversation
      const conv = db.prepare(`
        SELECT id FROM conversations
        WHERE property_id = ? AND student_id = ? AND provider_id = ?
      `).get(booking.property_id, booking.student_id, booking.provider_id) as any;

      if (conv) {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, 'PROVIDER', 'SYSTEM_EVENT', ?, 0)
        `).run(
          `msg-${crypto.randomUUID()}`,
          conv.id,
          userId,
          `✅ Reservation ${booking.booking_reference} has been CONFIRMED by the landlord!`
        );
      }
    })();

    res.json({ message: 'Reservation confirmed successfully', status: 'CONFIRMED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to confirm reservation' });
  }
});

// 6. Provider Declines Reservation
router.patch('/:id/decline', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = ?
  `).get(id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking reservation not found' });
  }

  if (userRole !== 'ADMIN' && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'You are not authorized to decline bookings for this property' });
  }

  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot decline a booking with status ${booking.status}` });
  }

  try {
    db.transaction(() => {
      // 1. Update Booking Status
      db.prepare(`
        UPDATE bookings
        SET status = 'DECLINED', decline_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reason || 'Declined by accommodation provider', id);

      // 2. Restore Room Capacity
      db.prepare(`
        UPDATE rooms
        SET quantity_available = quantity_available + 1,
            occupied_count = MAX(0, occupied_count - 1)
        WHERE id = ?
      `).run(booking.room_id);

      // 3. Restore Bedspace (if applicable)
      if (booking.bedspace_id) {
        db.prepare(`
          UPDATE bedspaces
          SET is_occupied = 0, status = 'AVAILABLE', updated_at = datetime('now')
          WHERE id = ?
        `).run(booking.bedspace_id);
      }

      // 4. Record Status History
      db.prepare(`
        INSERT INTO booking_status_history (id, booking_id, actor_id, actor_role, previous_status, new_status, reason, notes)
        VALUES (?, ?, ?, ?, 'PENDING', 'DECLINED', ?, 'Reservation declined by landlord')
      `).run(`bhist-${crypto.randomUUID()}`, id, userId, userRole, reason || null);

      // 5. Send notification to student
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'BOOKING', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        booking.student_id,
        'Reservation Declined',
        `Your reservation request for ${booking.propertyTitle} (Ref: ${booking.booking_reference}) was declined. Reason: ${reason || 'Space unavailable'}.`,
        `/bookings/${booking.id}`
      );

      // 6. Record in conversation
      const conv = db.prepare(`
        SELECT id FROM conversations
        WHERE property_id = ? AND student_id = ? AND provider_id = ?
      `).get(booking.property_id, booking.student_id, booking.provider_id) as any;

      if (conv) {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, 'PROVIDER', 'SYSTEM_EVENT', ?, 0)
        `).run(
          `msg-${crypto.randomUUID()}`,
          conv.id,
          userId,
          `❌ Reservation ${booking.booking_reference} was declined. Reason: ${reason || 'Not specified'}`
        );
      }
    })();

    res.json({ message: 'Reservation declined and capacity restored', status: 'DECLINED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to decline reservation' });
  }
});

// 7. Cancel Reservation (Student or Provider)
router.patch('/:id/cancel', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = ?
  `).get(id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking reservation not found' });
  }

  const isStudent = booking.student_id === userId;
  const isProvider = booking.provider_id === userId;

  if (userRole !== 'ADMIN' && !isStudent && !isProvider) {
    return res.status(403).json({ error: 'You are not authorized to cancel this booking' });
  }

  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    return res.status(400).json({ error: `Cannot cancel a booking with status ${booking.status}` });
  }

  const newStatus = isStudent ? 'CANCELLED_BY_STUDENT' : 'CANCELLED_BY_PROVIDER';
  const notifyUserId = isStudent ? booking.provider_id : booking.student_id;
  const actorTitle = isStudent ? 'Student' : 'Landlord';

  try {
    db.transaction(() => {
      // 1. Update Booking
      db.prepare(`
        UPDATE bookings
        SET status = ?, cancellation_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newStatus, reason || `Cancelled by ${actorTitle.toLowerCase()}`, id);

      // 2. Restore Room Capacity
      db.prepare(`
        UPDATE rooms
        SET quantity_available = quantity_available + 1,
            occupied_count = MAX(0, occupied_count - 1)
        WHERE id = ?
      `).run(booking.room_id);

      // 3. Restore Bedspace (if applicable)
      if (booking.bedspace_id) {
        db.prepare(`
          UPDATE bedspaces
          SET is_occupied = 0, status = 'AVAILABLE', updated_at = datetime('now')
          WHERE id = ?
        `).run(booking.bedspace_id);
      }

      // 4. Status History
      db.prepare(`
        INSERT INTO booking_status_history (id, booking_id, actor_id, actor_role, previous_status, new_status, reason, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `bhist-${crypto.randomUUID()}`,
        id,
        userId,
        userRole,
        booking.status,
        newStatus,
        reason || null,
        `Reservation cancelled by ${actorTitle}`
      );

      // 5. Send Notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, link_url)
        VALUES (?, ?, ?, ?, 'BOOKING', ?)
      `).run(
        `notif-${crypto.randomUUID()}`,
        notifyUserId,
        `Reservation Cancelled by ${actorTitle}`,
        `Reservation for ${booking.propertyTitle} (Ref: ${booking.booking_reference}) was cancelled. Reason: ${reason || 'None provided'}.`,
        `/bookings/${booking.id}`
      );

      // 6. Record in Conversation
      const conv = db.prepare(`
        SELECT id FROM conversations
        WHERE property_id = ? AND student_id = ? AND provider_id = ?
      `).get(booking.property_id, booking.student_id, booking.provider_id) as any;

      if (conv) {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
          VALUES (?, ?, ?, ?, 'SYSTEM_EVENT', ?, 0)
        `).run(
          `msg-${crypto.randomUUID()}`,
          conv.id,
          userId,
          userRole === 'STUDENT' ? 'STUDENT' : 'PROVIDER',
          `⚠️ Reservation ${booking.booking_reference} was cancelled by ${actorTitle}. Reason: ${reason || 'None provided'}`
        );
      }
    })();

    res.json({ message: 'Reservation cancelled and capacity restored', status: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to cancel reservation' });
  }
});

// 8. Auto Check & Expire Pending Reservations (48h window)
router.post('/check-expirations', (req, res: Response) => {
  try {
    const nowIso = new Date().toISOString();
    const expiredBookings = db.prepare(`
      SELECT b.*, p.title as propertyTitle
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.status = 'PENDING' AND (b.expires_at < ? OR b.expires_at < datetime('now'))
    `).all(nowIso) as any[];

    let count = 0;

    for (const booking of expiredBookings) {
      db.transaction(() => {
        db.prepare(`
          UPDATE bookings
          SET status = 'EXPIRED', updated_at = datetime('now')
          WHERE id = ?
        `).run(booking.id);

        db.prepare(`
          UPDATE rooms
          SET quantity_available = quantity_available + 1,
              occupied_count = MAX(0, occupied_count - 1)
          WHERE id = ?
        `).run(booking.room_id);

        if (booking.bedspace_id) {
          db.prepare(`
            UPDATE bedspaces
            SET is_occupied = 0, status = 'AVAILABLE', updated_at = datetime('now')
            WHERE id = ?
          `).run(booking.bedspace_id);
        }

        db.prepare(`
          INSERT INTO booking_status_history (id, booking_id, actor_id, actor_role, previous_status, new_status, notes)
          VALUES (?, ?, ?, 'SYSTEM', 'PENDING', 'EXPIRED', 'Response window expired (48 hours)')
        `).run(`bhist-${crypto.randomUUID()}`, booking.id, booking.provider_id);

        count++;
      })();
    }

    res.json({ message: `Processed expiration check`, expiredCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check expirations' });
  }
});

// =============================================================================
// PHASE 11: DETERMINISTIC CANCELLATION & REFUND PREVIEW
// =============================================================================

// =============================================================================
// PHASE 11: DETERMINISTIC CANCELLATION & REFUND PREVIEW
// =============================================================================
router.get('/:id/cancellation-preview', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle,
           pay.amount as paidAmount, pay.status as paymentStatus, pay.payment_reference, pay.payment_provider
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'SUCCESS'
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (userRole !== 'ADMIN' && booking.student_id !== userId && booking.provider_id !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const isPaid = Boolean(booking.paidAmount && booking.paymentStatus === 'SUCCESS');
  const paidAmount = isPaid ? booking.paidAmount : 0;

  // Deterministic calculation:
  // If provider cancels: 100% refund, cancellationFee = 0.
  // If student cancels within 24h: 100% refund, fee = 0.
  // If student cancels after 24h: 10% cancellation fee, 90% refund.
  const hoursSinceCreated = (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60);
  const isFreeWindow = hoursSinceCreated <= 24;

  let cancellationFee = 0;
  let expectedRefund = 0;

  if (isPaid) {
    if (userRole === 'PROVIDER' || booking.provider_id === userId) {
      cancellationFee = 0;
      expectedRefund = paidAmount;
    } else if (isFreeWindow) {
      cancellationFee = 0;
      expectedRefund = paidAmount;
    } else {
      cancellationFee = Math.round(paidAmount * 0.10);
      expectedRefund = paidAmount - cancellationFee;
    }
  }

  res.json({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    propertyTitle: booking.propertyTitle,
    currentStatus: booking.status,
    isPaid,
    originalPayment: paidAmount,
    cancellationFee,
    expectedRefund,
    refundMethod: isPaid ? 'Original Paystack / Bank Account Method' : 'N/A (No payment was captured)',
    isFreeWindow,
    hoursSinceCreated: Math.round(hoursSinceCreated),
    policyTerms: isFreeWindow
      ? 'Full 100% refund applies (Within initial 24-hour grace window).'
      : 'Standard 10% processing fee applies for post-grace student cancellations.'
  });
});

// =============================================================================
// PHASE 11: AUTOMATED ALTERNATIVE HOSTEL RECOMMENDATIONS
// =============================================================================
router.get('/:id/alternatives', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const booking = db.prepare(`
    SELECT b.*, p.area_id, p.property_type, pr.rent_amount
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    LEFT JOIN prices pr ON pr.property_id = p.id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Query real alternative hostels near LAUTECH
  const targetRent = booking.rent_amount || 180000;
  const minRent = targetRent * 0.7;
  const maxRent = targetRent * 1.3;

  const alternatives = db.prepare(`
    SELECT p.id, p.title, p.slug, p.address, p.distance_from_campus_km,
           (SELECT url FROM property_media WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
           p.verification_status, p.availability_status,
           pr.rent_amount, pr.total_mandatory_cost,
           a.name as area_name
    FROM properties p
    JOIN prices pr ON pr.property_id = p.id
    LEFT JOIN areas a ON a.id = p.area_id
    WHERE p.id != ? AND p.availability_status = 'AVAILABLE'
      AND pr.rent_amount BETWEEN ? AND ?
    ORDER BY p.verification_status = 'APPROVED' DESC, p.distance_from_campus_km ASC
    LIMIT 4
  `).all(booking.property_id, minRent, maxRent) as any[];

  res.json({
    originalBookingRef: booking.booking_reference,
    message: 'Top alternative hostels around LAUTECH matching your budget and area',
    alternatives: alternatives.map(h => ({
      id: h.id,
      title: h.title,
      slug: h.slug,
      address: h.address,
      distanceFromCampusKm: h.distance_from_campus_km,
      coverImage: h.cover_image,
      rentAmount: h.rent_amount,
      totalMandatoryCost: h.total_mandatory_cost,
      areaName: h.area_name || 'LAUTECH Off-Campus',
      isVerified: h.verification_status === 'APPROVED'
    }))
  });
});

// =============================================================================
// PHASE 11: INTERACTIVE MOVE-IN CHECKLIST
// =============================================================================
router.get('/:id/move-in-checklist', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const booking = db.prepare(`
    SELECT b.*, p.title as propertyTitle, p.address as propertyAddress, p.nearby_landmark,
           prov.full_name as providerName, prov.phone as providerPhone
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN users prov ON b.provider_id = prov.id
    WHERE b.id = ? OR b.booking_reference = ?
  `).get(id, id) as any;

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Fetch or initialize checklist
  let row = db.prepare('SELECT * FROM booking_move_in_checklists WHERE booking_id = ?').get(booking.id) as any;
  let checklist: any = {
    confirmMoveInDate: true,
    saveVoucher: true,
    contactLandlord: false,
    reviewHostelRules: false,
    prepareDocuments: false,
    confirmZeroOutstandingBalance: Boolean(booking.payment_status === 'PAID'),
    getDirections: false
  };

  if (row) {
    try {
      checklist = { ...checklist, ...JSON.parse(row.checklist_json) };
    } catch (e) {}
  } else {
    db.prepare(`
      INSERT OR IGNORE INTO booking_move_in_checklists (id, booking_id, user_id, checklist_json)
      VALUES (?, ?, ?, ?)
    `).run(`chk-${crypto.randomUUID()}`, booking.id, userId, JSON.stringify(checklist));
  }

  res.json({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    propertyTitle: booking.propertyTitle,
    moveInDate: booking.move_in_date,
    providerPhone: booking.providerPhone,
    checklist,
    isCompleted: Boolean(row?.is_completed)
  });
});

router.patch('/:id/move-in-checklist', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { checklist } = req.body;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ? OR booking_reference = ?').get(id, id) as any;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const allDone = Object.values(checklist || {}).every(Boolean);

  db.prepare(`
    INSERT INTO booking_move_in_checklists (id, booking_id, user_id, checklist_json, is_completed, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END, datetime('now'))
    ON CONFLICT(booking_id) DO UPDATE SET
      checklist_json = excluded.checklist_json,
      is_completed = excluded.is_completed,
      completed_at = excluded.completed_at,
      updated_at = datetime('now')
  `).run(
    `chk-${crypto.randomUUID()}`,
    booking.id,
    userId,
    JSON.stringify(checklist || {}),
    allDone ? 1 : 0,
    allDone ? 1 : 0
  );

  res.json({ message: 'Move-in checklist updated', isCompleted: allDone });
});

export default router;

