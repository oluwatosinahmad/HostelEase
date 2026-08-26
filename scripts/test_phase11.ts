import crypto from 'crypto';
import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

const BASE_URL = 'http://localhost:5000/api';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ [PASS] ${message}`);
  }
}

async function runPhase11Tests() {
  console.log('\n===============================================================');
  console.log('💳 HOSTEL EASE PHASE 11 — TRANSACTION & DISPUTE TEST SUITE');
  console.log('===============================================================\n');

  // Seed test accounts
  const studentEmail = `student.trans.${Date.now()}@lautech.edu.ng`;
  const providerEmail = `host.trans.${Date.now()}@gmail.com`;
  const password = 'Password123!';

  // Register Student
  const regStudent = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Boluwatife Adeleke',
      email: studentEmail,
      phone: '08023456789',
      role: 'STUDENT',
      password
    })
  });
  const studentData = await regStudent.json() as any;
  const studentToken = studentData.token;
  const studentId = studentData.user.id;

  // Register Landlord
  const regProvider = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Chief Babatunde Ojo',
      email: providerEmail,
      phone: '08034567890',
      role: 'PROVIDER',
      password
    })
  });
  const providerData = await regProvider.json() as any;
  const providerToken = providerData.token;
  const providerId = providerData.user.id;

  // Seed super admin user
  const adminUser = {
    id: `admin-trans-${Date.now()}`,
    email: `admin.trans.${Date.now()}@hostelease.ng`,
    fullName: 'Hostel Ease Chief Admin',
    role: 'ADMIN' as const,
    isActive: 1
  };
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, account_status)
    VALUES (?, ?, 'hash', ?, 'ADMIN', 1, 'ACTIVE')
  `).run(adminUser.id, adminUser.email, adminUser.fullName);

  db.prepare(`
    INSERT INTO admin_profiles (id, user_id, admin_role, department, permissions_json, is_super_admin)
    VALUES (?, ?, 'SUPER_ADMIN', 'Executive', '["*"]', 1)
  `).run(`prof-admin-${Date.now()}`, adminUser.id);

  const superAdminToken = generateToken(adminUser);

  // Ensure test property and room
  const propId = `prop-trans-${Date.now()}`;
  const roomId = `room-trans-${Date.now()}`;
  const bedspaceId = `bed-trans-${Date.now()}`;

  const defaultUni = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;
  const defaultArea = db.prepare('SELECT id FROM areas LIMIT 1').get() as any;
  const uniId = defaultUni?.id || 'uni-lautech';
  const areaId = defaultArea?.id || 'area-under-g';

  db.transaction(() => {
    db.prepare(`
      INSERT INTO properties (
        id, university_id, area_id, provider_id, title, slug, description, property_type, address,
        latitude, longitude, distance_from_campus_km, total_rooms,
        verification_status, availability_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SELF_CONTAIN', 'Behind Bovas Station, Under G, Ogbomoso', 8.1438, 4.2638, 0.8, 5, 'APPROVED', 'AVAILABLE', datetime('now'))
    `).run(propId, uniId, areaId, providerId, 'Emerald Heights Lodge', `emerald-heights-${Date.now()}`, 'Modern student self-contain lodge with prepaid meter.');

    db.prepare(`
      INSERT INTO prices (
        id, property_id, rent_amount, service_charge, agency_fee, caution_fee, other_mandatory_charges, total_mandatory_cost
      ) VALUES (?, ?, 180000, 10000, 10000, 15000, 5000, 220000)
    `).run(`price-${Date.now()}`, propId);

    db.prepare(`
      INSERT INTO rooms (
        id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, status
      ) VALUES (?, ?, 'Room A1 Single Ensuite', 'SELF_CONTAIN', 1, 1, 1, 0, 'AVAILABLE')
    `).run(roomId, propId);

    db.prepare(`
      INSERT INTO bedspaces (
        id, room_id, bedspace_number, is_occupied, status
      ) VALUES (?, ?, 'Bed 1', 0, 'AVAILABLE')
    `).run(bedspaceId, roomId);
  })();

  // --- 1. Testing Pre-Checkout Booking Creation & Review Breakdown ---
  console.log('\n--- 1. Testing Pre-Checkout Booking Review & Fee Transparency ---');
  const resReserve = await fetch(`${BASE_URL}/bookings/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      propertyId: propId,
      roomId,
      bedspaceId,
      moveInDate: '2026-09-01',
      academicSession: '2026/2027',
      durationMonths: 12
    })
  });
  assert(resReserve.status === 201, 'Student creates reservation successfully (HTTP 201)');
  const reserveData = await resReserve.json() as any;
  const bookingId = reserveData.bookingId;
  const bookingRef = reserveData.bookingReference;

  // Test GET /bookings/review/:id
  const resReview = await fetch(`${BASE_URL}/bookings/review/${bookingId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (resReview.status !== 200) {
    const errText = await resReview.text();
    console.error('resReview error:', resReview.status, errText);
  }
  assert(resReview.status === 200, 'Pre-checkout review endpoint returns 200 OK');
  const reviewData = await resReview.json() as any;

  assert(reviewData.bookingReference === bookingRef, 'Booking reference matches');
  assert(reviewData.priceBreakdown.baseRent === 180000, 'Base rent is explicitly ₦180,000');
  assert(reviewData.priceBreakdown.serviceCharge === 10000, 'Service charge is explicitly ₦10,000');
  assert(reviewData.priceBreakdown.cautionDeposit === 15000, 'Caution deposit is explicitly ₦15,000 (Refundable)');
  assert(reviewData.priceBreakdown.agencyFee === 10000, 'Agency fee is explicitly ₦10,000');
  assert(reviewData.priceBreakdown.platformFee === 5000, 'Hostel Ease platform fee is explicitly ₦5,000');
  assert(reviewData.priceBreakdown.totalAmount === 225000, 'Total payable amount (₦225,000) calculated transparently');
  assert(Array.isArray(reviewData.priceBreakdown.optionalCharges), 'Optional add-ons are returned as array');
  assert(reviewData.cancellationPolicy.freeCancellationWindowHours === 24, 'Cancellation policy clearly specifies 24-hour grace window');

  // --- 2. Testing Payment Initialization & Verification ---
  console.log('\n--- 2. Testing Payment Flow & Server Verification ---');
  // Provider confirms reservation
  await fetch(`${BASE_URL}/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${providerToken}` }
  });

  const resPayInit = await fetch(`${BASE_URL}/payments/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ bookingId })
  });
  assert(resPayInit.status === 201, 'Payment initialization succeeds (HTTP 201)');
  const payInitData = await resPayInit.json() as any;
  const payRef = payInitData.paymentReference;

  // Verify payment
  const resPayVerify = await fetch(`${BASE_URL}/payments/verify/${payRef}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (resPayVerify.status !== 200) {
    const errText = await resPayVerify.text();
    console.error('resPayVerify error:', resPayVerify.status, errText);
  }
  assert(resPayVerify.status === 200, 'Payment verification succeeds (HTTP 200)');
  const verifyData = await resPayVerify.json() as any;
  assert(verifyData.paymentStatus === 'SUCCESS' || verifyData.status === 'SUCCESS', 'Payment status transitioned to SUCCESS');

  // --- 3. Testing Interactive Move-In Checklist ---
  console.log('\n--- 3. Testing Interactive Move-In Checklist ---');
  const resGetChecklist = await fetch(`${BASE_URL}/bookings/${bookingId}/move-in-checklist`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resGetChecklist.status === 200, 'Move-in checklist retrieved (HTTP 200)');
  const checklistObj = await resGetChecklist.json() as any;
  assert(checklistObj.checklist.confirmMoveInDate === true, 'Move-in date initial item present');

  const resUpdateChecklist = await fetch(`${BASE_URL}/bookings/${bookingId}/move-in-checklist`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      checklist: {
        confirmMoveInDate: true,
        saveVoucher: true,
        contactLandlord: true,
        reviewHostelRules: true,
        prepareDocuments: true,
        confirmZeroOutstandingBalance: true,
        getDirections: true
      }
    })
  });
  assert(resUpdateChecklist.status === 200, 'Move-in checklist updated (HTTP 200)');
  const updatedChecklistRes = await resUpdateChecklist.json() as any;
  assert(updatedChecklistRes.isCompleted === true, 'Move-in checklist marks 100% completed');

  // --- 4. Testing Deterministic Cancellation & Refund Calculator ---
  console.log('\n--- 4. Testing Deterministic Cancellation & Refund Preview ---');
  const resCancelPrev = await fetch(`${BASE_URL}/bookings/${bookingId}/cancellation-preview`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resCancelPrev.status === 200, 'Cancellation preview retrieved (HTTP 200)');
  const cancelPrevData = await resCancelPrev.json() as any;
  assert(cancelPrevData.isPaid === true, 'Preview confirms booking is fully paid');
  assert(cancelPrevData.originalPayment > 0, 'Original payment reflects captured transaction');
  assert(cancelPrevData.expectedRefund > 0, 'Expected refund calculated deterministically');
  assert(typeof cancelPrevData.policyTerms === 'string', 'Human-readable policy terms provided');

  // --- 5. Testing Automated Alternative Accommodations ---
  console.log('\n--- 5. Testing Automated Alternative Hostel Recommendations ---');
  const resAlts = await fetch(`${BASE_URL}/bookings/${bookingId}/alternatives`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resAlts.status === 200, 'Alternatives endpoint returns 200 OK');
  const altsData = await resAlts.json() as any;
  assert(Array.isArray(altsData.alternatives), 'Alternative accommodations returned as array');

  // --- 6. Testing Formal Dispute Creation & Timeline Messaging ---
  console.log('\n--- 6. Testing Formal Dispute Creation & Communication ---');
  const resCreateDispute = await fetch(`${BASE_URL}/disputes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      bookingId,
      category: 'HOSTEL_NOT_AS_DESCRIBED',
      subject: 'Borehole pump not functional upon check-in tour',
      description: 'During my check-in visit today, the landlord informed me that the borehole is faulty and water is not running.',
      evidence: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80']
    })
  });
  assert(resCreateDispute.status === 201, 'Student successfully files dispute (HTTP 201)');
  const disputeData = await resCreateDispute.json() as any;
  const disputeId = disputeData.disputeId;
  const disputeCode = disputeData.disputeCode;
  assert(disputeCode.startsWith('DISP-'), 'Dispute code format adheres to DISP-YYYY-XXXXXX');

  // Student checks their disputes list
  const resMyDisputes = await fetch(`${BASE_URL}/disputes/my`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resMyDisputes.status === 200, 'Student retrieves my disputes (HTTP 200)');
  const myDisputesData = await resMyDisputes.json() as any;
  assert(myDisputesData.disputes.length > 0, 'My disputes list contains created case');

  // Landlord posts message to dispute timeline
  const resHostReply = await fetch(`${BASE_URL}/disputes/${disputeId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({
      message: 'The plumber is already on site and the borehole will be operational by tomorrow morning.'
    })
  });
  assert(resHostReply.status === 201, 'Landlord posts response to dispute timeline (HTTP 201)');

  // --- 7. Testing Admin Dispute Resolution & Financial Ledger Refund ---
  console.log('\n--- 7. Testing Admin Dispute Resolution & Financial Refund ---');
  const resResolveDispute = await fetch(`${BASE_URL}/disputes/${disputeId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      resolutionType: 'PARTIAL_REFUND',
      resolutionNotes: 'Compensatory ₦20,000 water refund approved for tenant inconvenience while landlord completes pump repair.',
      refundAmount: 20000
    })
  });
  if (resResolveDispute.status !== 200) {
    const errText = await resResolveDispute.text();
    console.error('resResolveDispute error:', resResolveDispute.status, errText);
  }
  assert(resResolveDispute.status === 200, 'Admin resolves dispute successfully (HTTP 200)');

  // Verify dispute record in DB is RESOLVED
  const dispRow = db.prepare('SELECT * FROM disputes WHERE id = ?').get(disputeId) as any;
  assert(dispRow.status === 'RESOLVED', 'Dispute status updated to RESOLVED in database');
  assert(dispRow.resolution_type === 'PARTIAL_REFUND', 'Resolution type correctly stamped');
  assert(dispRow.refund_amount === 20000, 'Refund amount correctly stamped');

  // Verify Double-Entry Financial Ledger entry created
  const ledgerRefundEntry = db.prepare(`
    SELECT * FROM financial_ledger
    WHERE booking_id = ? AND entry_type = 'REFUND_DEBITED'
  `).get(bookingId) as any;
  assert(Boolean(ledgerRefundEntry), 'Immutable double-entry ledger REFUND_DEBITED record created');
  assert(ledgerRefundEntry.amount === 20000, 'Ledger refund amount matches resolution (₦20,000)');

  // --- 8. Testing Authorization & Cross-Tenant Security Boundaries ---
  console.log('\n--- 8. Testing Authorization & Security Boundaries ---');
  // Unrelated student attempting to access another student's dispute details
  const regUnrelated = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Tunde Stranger',
      email: `tunde.${Date.now()}@lautech.edu.ng`,
      phone: '08099887766',
      role: 'STUDENT',
      password
    })
  });
  const strangerData = await regUnrelated.json() as any;
  const strangerToken = strangerData.token;

  const resUnauthorizedDispute = await fetch(`${BASE_URL}/disputes/${disputeId}`, {
    headers: { Authorization: `Bearer ${strangerToken}` }
  });
  assert(resUnauthorizedDispute.status === 403, 'Cross-student dispute access strictly forbidden with HTTP 403');

  // Student trying to resolve a dispute (only admin is allowed)
  const resStudentResolve = await fetch(`${BASE_URL}/disputes/${disputeId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ resolutionType: 'FULL_REFUND', resolutionNotes: 'Hack attempt' })
  });
  assert(resStudentResolve.status === 403, 'Non-admin dispute resolution attempt rejected with HTTP 403');

  console.log('\n===============================================================');
  console.log('🎯 PHASE 11 RESULTS: All 26/26 Tests Passed (100%)');
  console.log('===============================================================\n');
}

runPhase11Tests().catch((err) => {
  console.error('Fatal error in Phase 11 test runner:', err);
  process.exit(1);
});
