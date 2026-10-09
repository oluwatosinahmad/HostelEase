import db from '../server/db';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function loginUser(email: string, role: string, fullName: string) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    const id = `usr-test-${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
      VALUES (?, ?, 'hash123', ?, '08012345678', ?, 1)
    `).run(id, email, fullName, role);
    user = { id, email, role, full_name: fullName };
  }

  const jwt = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'hostel-ease-jwt-secret-dev-2026';
  const token = jwt.default.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    secret,
    { expiresIn: '7d' }
  );
  return { token, user };
}

async function runAllTests() {
  console.log('======================================================================');
  console.log('🚀 RUNNING AUTHORITATIVE HOSTEL AVAILABILITY VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Setup test users
  const student1 = await loginUser('test_student1@lautech.edu.ng', 'STUDENT', 'Adebayo Test');
  const student2 = await loginUser('test_student2@lautech.edu.ng', 'STUDENT', 'Chioma Test');
  const provider = await loginUser('test_agent@hostelease.ng', 'PROVIDER', 'Alhaji Agent');
  const admin = await loginUser('test_admin@hostelease.ng', 'ADMIN', 'Super Admin');

  const existingArea = db.prepare('SELECT id FROM areas LIMIT 1').get() as any;
  const areaId = existingArea?.id || 'area-1';

  const propertyId = `prop-test-${crypto.randomUUID()}`;
  const roomId = `room-test-${crypto.randomUUID()}`;
  
  const uni = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;
  const universityId = uni?.id || 'uni-lautech';

  db.prepare(`
    INSERT INTO properties (
      id, university_id, title, slug, description, address, nearby_landmark,
      distance_from_campus_km, property_type, gender_preference, total_rooms,
      verification_status, availability_status, provider_id, area_id
    ) VALUES (
      ?, ?, 'Royal Palms Luxury Lodge', ?, 'Premium ensuite hostel', 'Under G, Ogbomoso', 'Beside Stadium',
      0.8, 'SELF_CONTAIN', 'ANY', 5,
      'APPROVED', 'AVAILABLE', ?, ?
    )
  `).run(propertyId, universityId, `royal-palms-test-${crypto.randomUUID().slice(0, 8)}`, provider.user.id, areaId);

  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, status)
    VALUES (?, ?, 'Room A101', 'SELF_CONTAIN', 1, 1, 1, 0, 'AVAILABLE')
  `).run(roomId, propertyId);

  db.prepare(`
    INSERT INTO prices (id, property_id, rent_amount, service_charge, agency_fee, caution_fee, other_mandatory_charges, total_mandatory_cost)
    VALUES (?, ?, 250000, 20000, 15000, 10000, 0, 295000)
  `).run(`price-test-${crypto.randomUUID()}`, propertyId);

  console.log(`✅ Test Property Initialized: ${propertyId} ("Royal Palms Luxury Lodge")`);
  console.log(`Initial Status in DB: AVAILABLE\n`);

  // -------------------------------------------------------------------------
  // TEST 1: Normal booking & state transition (Pending vs Confirmed)
  // -------------------------------------------------------------------------
  console.log('▶ TEST 1: Creation of PENDING Reservation & Availability Check');
  const createRes = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student1.token}` },
    body: JSON.stringify({
      propertyId,
      roomId,
      academicSession: '2025/2026',
      leaseDurationMonths: 12,
      moveInDate: '2026-10-15'
    })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create reservation: ${JSON.stringify(createRes.data)}`);
  }
  const booking1Id = createRes.data.bookingId || createRes.data.booking?.id || createRes.data.id;
  const booking1Status = createRes.data.status || createRes.data.booking?.status || 'PENDING';
  console.log(`  Reservation created: ${booking1Id} (Status: ${booking1Status})`);

  // Verify property is STILL AVAILABLE while reservation is PENDING
  const propCheck1 = await request(`/properties/${propertyId}`);
  if (propCheck1.data.property.availabilityStatus !== 'AVAILABLE') {
    throw new Error(`FAIL: Property prematurely marked as ${propCheck1.data.property.availabilityStatus} on PENDING reservation!`);
  }
  console.log(`  ✓ State while PENDING: ${propCheck1.data.property.availabilityStatus} (Correct: Not prematurely booked)`);

  // Confirm booking
  const confirmRes = await request(`/bookings/${booking1Id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${provider.token}` }
  });
  if (!confirmRes.ok) {
    throw new Error(`Failed to confirm booking: ${JSON.stringify(confirmRes.data)}`);
  }
  console.log(`  Reservation confirmed by provider.`);

  // Verify DB and API now authoritative BOOKED
  const dbPropAfterConfirm = db.prepare('SELECT availability_status FROM properties WHERE id = ?').get(propertyId) as any;
  if (dbPropAfterConfirm.availability_status !== 'BOOKED') {
    throw new Error(`FAIL: Database availability_status is ${dbPropAfterConfirm.availability_status}, expected BOOKED`);
  }
  const propCheckAfterConfirm = await request(`/properties/${propertyId}`);
  if (propCheckAfterConfirm.data.property.availabilityStatus !== 'BOOKED' || !propCheckAfterConfirm.data.property.isBooked) {
    throw new Error(`FAIL: API availabilityStatus is ${propCheckAfterConfirm.data.property.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ DB availability_status: ${dbPropAfterConfirm.availability_status}`);
  console.log(`  ✓ API availabilityStatus: ${propCheckAfterConfirm.data.property.availabilityStatus}`);
  console.log('✅ TEST 1 PASSED: Only transitioned from AVAILABLE to BOOKED upon authoritative confirmation.\n');

  // -------------------------------------------------------------------------
  // TEST 2: Find Hostel / Search Page Status
  // -------------------------------------------------------------------------
  console.log('▶ TEST 2: Find Hostel / Search Catalog Returns BOOKED');
  const searchRes = await request(`/properties?search=Royal+Palms`);
  const foundInSearch = (searchRes.data.properties || []).find((p: any) => p.id === propertyId);
  if (!foundInSearch) {
    throw new Error(`Property not found in search results`);
  }
  if (foundInSearch.availabilityStatus !== 'BOOKED' || !foundInSearch.isBooked) {
    throw new Error(`FAIL: Search catalog shows ${foundInSearch.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ Search Catalog availabilityStatus: ${foundInSearch.availabilityStatus}`);
  console.log(`  ✓ Search Catalog isBooked flag: ${foundInSearch.isBooked}`);
  console.log('✅ TEST 2 PASSED: Search catalog correctly displays BOOKED.\n');

  // -------------------------------------------------------------------------
  // TEST 3: Hostel Details Page & Disabled Booking
  // -------------------------------------------------------------------------
  console.log('▶ TEST 3: Hostel Details Page Details & Booking Guard');
  const detailRes = await request(`/properties/${propertyId}`);
  if (detailRes.data.property.availabilityStatus !== 'BOOKED' || !detailRes.data.property.isBooked) {
    throw new Error(`FAIL: Details page shows ${detailRes.data.property.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ Details page shows: availabilityStatus: ${detailRes.data.property.availabilityStatus}, bookingStatus: ${detailRes.data.property.bookingStatus}`);
  console.log('✅ TEST 3 PASSED: Single property details authoritative BOOKED.\n');

  // -------------------------------------------------------------------------
  // TEST 4: Saved Hostels Retention with BOOKED Status
  // -------------------------------------------------------------------------
  console.log('▶ TEST 4: Saved Hostels List Reflects Authoritative BOOKED');
  // Student 1 saves property
  await request('/saved', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student1.token}` },
    body: JSON.stringify({ propertyId })
  });

  const savedRes = await request('/saved', {
    headers: { Authorization: `Bearer ${student1.token}` }
  });
  const savedProp = (savedRes.data.savedProperties || []).find((p: any) => p.id === propertyId);
  if (!savedProp) {
    throw new Error(`FAIL: Property not found in saved properties`);
  }
  if (savedProp.availabilityStatus !== 'BOOKED' || !savedProp.isBooked) {
    throw new Error(`FAIL: Saved property shows ${savedProp.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ Saved hostel retains item with availabilityStatus: ${savedProp.availabilityStatus}, isBooked: ${savedProp.isBooked}`);
  console.log('✅ TEST 4 PASSED: Saved hostels list reflects authoritative BOOKED.\n');

  // -------------------------------------------------------------------------
  // TEST 5: Hostel Owner / Provider Portal Status
  // -------------------------------------------------------------------------
  console.log('▶ TEST 5: Provider Portal Reflects BOOKED');
  const providerListings = await request('/provider/my-listings', {
    headers: { Authorization: `Bearer ${provider.token}` }
  });
  const providerProp = (providerListings.data.properties || []).find((p: any) => p.id === propertyId);
  if (!providerProp) {
    throw new Error(`FAIL: Property not found in provider listings`);
  }
  if (providerProp.availabilityStatus !== 'BOOKED') {
    throw new Error(`FAIL: Provider portal shows ${providerProp.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ Provider Portal property shows: availabilityStatus: ${providerProp.availabilityStatus}`);
  console.log('✅ TEST 5 PASSED: Provider portal reflects authoritative BOOKED.\n');

  // -------------------------------------------------------------------------
  // TEST 6: Admin Portal View Status
  // -------------------------------------------------------------------------
  console.log('▶ TEST 6: Admin Management Reflects BOOKED');
  const adminHostels = await request('/admin/hostels', {
    headers: { Authorization: `Bearer ${admin.token}` }
  });
  const adminProp = (adminHostels.data.hostels || []).find((p: any) => p.id === propertyId);
  if (!adminProp) {
    throw new Error(`FAIL: Property not found in admin hostels`);
  }
  if (adminProp.availabilityStatus !== 'BOOKED') {
    throw new Error(`FAIL: Admin portal shows ${adminProp.availabilityStatus}, expected BOOKED`);
  }
  console.log(`  ✓ Admin Portal hostel shows: availabilityStatus: ${adminProp.availabilityStatus}`);
  console.log('✅ TEST 6 PASSED: Admin portal reflects authoritative BOOKED.\n');

  // -------------------------------------------------------------------------
  // TEST 7: Second Student Attempt Rejected (409 Conflict)
  // -------------------------------------------------------------------------
  console.log('▶ TEST 7: Second Student Booking Attempt Rejected with 409');
  const attemptRes = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student2.token}` },
    body: JSON.stringify({
      propertyId,
      roomId,
      academicSession: '2025/2026',
      leaseDurationMonths: 12,
      moveInDate: '2026-10-15'
    })
  });

  if (attemptRes.status !== 409) {
    throw new Error(`FAIL: Second student attempt returned status ${attemptRes.status}, expected 409 Conflict! Body: ${JSON.stringify(attemptRes.data)}`);
  }
  console.log(`  ✓ Second student attempt blocked with Status: ${attemptRes.status}`);
  console.log(`  ✓ Error message: "${attemptRes.data.error}"`);
  console.log('✅ TEST 7 PASSED: Second student booking strictly prevented.\n');

  // -------------------------------------------------------------------------
  // TEST 8: Cross-Device & Multi-Client Consistency
  // -------------------------------------------------------------------------
  console.log('▶ TEST 8: Cross-Device Client Simulation Consistency');
  // Simulate 3 separate client requests with different auth states and client headers
  const [clientA, clientB, clientC] = await Promise.all([
    request(`/properties/${propertyId}`, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } }),
    request(`/properties/${propertyId}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }),
    request(`/properties/${propertyId}`, { headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X)' } })
  ]);

  if (clientA.data.property.availabilityStatus !== 'BOOKED' ||
      clientB.data.property.availabilityStatus !== 'BOOKED' ||
      clientC.data.property.availabilityStatus !== 'BOOKED') {
    throw new Error(`FAIL: Inconsistent cross-device state`);
  }
  console.log(`  ✓ Mobile Client (iPhone): ${clientA.data.property.availabilityStatus}`);
  console.log(`  ✓ Desktop Client (Windows PC): ${clientB.data.property.availabilityStatus}`);
  console.log(`  ✓ Tablet Client (iPad): ${clientC.data.property.availabilityStatus}`);
  console.log('✅ TEST 8 PASSED: 100% cross-device state consistency.\n');

  // -------------------------------------------------------------------------
  // TEST 9: Cancellation Automatically Reverts to AVAILABLE
  // -------------------------------------------------------------------------
  console.log('▶ TEST 9: Cancellation Reverts Property to AVAILABLE');
  const cancelRes = await request(`/bookings/${booking1Id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${student1.token}` },
    body: JSON.stringify({ reason: 'Found alternative accommodation with room-mate' })
  });
  if (!cancelRes.ok) {
    throw new Error(`Failed to cancel booking: ${JSON.stringify(cancelRes.data)}`);
  }
  console.log(`  Booking cancelled by student: status: ${cancelRes.data.status}`);

  // Verify DB and API reverted to AVAILABLE
  const dbPropAfterCancel = db.prepare('SELECT availability_status FROM properties WHERE id = ?').get(propertyId) as any;
  if (dbPropAfterCancel.availability_status !== 'AVAILABLE') {
    throw new Error(`FAIL: Database availability_status is ${dbPropAfterCancel.availability_status}, expected AVAILABLE`);
  }
  const propAfterCancel = await request(`/properties/${propertyId}`);
  if (propAfterCancel.data.property.availabilityStatus !== 'AVAILABLE' || propAfterCancel.data.property.isBooked) {
    throw new Error(`FAIL: API availabilityStatus is ${propAfterCancel.data.property.availabilityStatus}, expected AVAILABLE`);
  }
  console.log(`  ✓ DB availability_status: ${dbPropAfterCancel.availability_status}`);
  console.log(`  ✓ API availabilityStatus: ${propAfterCancel.data.property.availabilityStatus}`);
  console.log('✅ TEST 9 PASSED: Cancellation cleanly reverts status back to AVAILABLE.\n');

  // -------------------------------------------------------------------------
  // TEST 10: Concurrency Race Condition Protection
  // -------------------------------------------------------------------------
  console.log('▶ TEST 10: Concurrency Race Condition Protection');
  // Ensure room has 2 available spaces so both pending reservations can be created
  db.prepare(`UPDATE rooms SET quantity_available = 2, quantity_total = 2 WHERE id = ?`).run(roomId);

  // Create two pending reservations for student1 and student2
  const r1 = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student1.token}` },
    body: JSON.stringify({ propertyId, roomId, academicSession: '2025/2026', leaseDurationMonths: 12, moveInDate: '2026-10-15' })
  });
  const r2 = await request('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${student2.token}` },
    body: JSON.stringify({ propertyId, roomId, academicSession: '2025/2026', leaseDurationMonths: 12, moveInDate: '2026-10-15' })
  });

  const b1Id = r1.data.bookingId || r1.data.booking?.id || r1.data.id;
  const b2Id = r2.data.bookingId || r2.data.booking?.id || r2.data.id;
  console.log(`  Created two parallel reservations: ${b1Id} and ${b2Id}`);

  // Now simulate simultaneous confirmation / payment verification race
  const [race1, race2] = await Promise.all([
    request(`/bookings/${b1Id}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${provider.token}` }
    }),
    request(`/bookings/${b2Id}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${provider.token}` }
    })
  ]);

  const outcomes = [race1, race2];
  const successCount = outcomes.filter(o => o.ok).length;
  const conflictCount = outcomes.filter(o => o.status === 409 || !o.ok).length;

  console.log(`  Race outcomes: Successes = ${successCount}, Rejected = ${conflictCount}`);
  if (successCount !== 1) {
    throw new Error(`FAIL: Atomic race condition violated! Expected exactly 1 success, got ${successCount}`);
  }

  // Ensure property is BOOKED and exactly 1 booking is CONFIRMED
  const confirmedCount = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE property_id = ? AND status = 'CONFIRMED'").get(propertyId) as any;
  if (confirmedCount.count !== 1) {
    throw new Error(`FAIL: Confirmed bookings count in DB is ${confirmedCount.count}, expected 1`);
  }
  console.log(`  ✓ DB confirmed bookings count: ${confirmedCount.count}`);
  console.log('✅ TEST 10 PASSED: Atomic concurrency guard prevents double-booking.\n');

  console.log('======================================================================');
  console.log('🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================================');
}

runAllTests().catch(err => {
  console.error('❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
