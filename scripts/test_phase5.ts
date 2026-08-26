import { db } from '../server/db';

const API_BASE = 'http://localhost:5000/api';

interface TestContext {
  studentToken: string;
  studentId: string;
  student2Token: string;
  student2Id: string;
  providerToken: string;
  providerId: string;
  adminToken: string;
  adminId: string;
  propertyId: string;
  roomId: string;
  bedspaceId: string;
  universityId: string;
  areaId: string;
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

async function request(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function setupTestData(): Promise<TestContext> {
  console.log('\n--- 1. Setting Up Test Accounts & Accommodations ---');

  // Authenticate default student
  const studentRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'student@lautech.edu.ng', password: 'Student123!' }
  });
  const studentToken = studentRes.data.token;
  const studentId = studentRes.data.user.id;
  assert(Boolean(studentToken), 'Student 1 logged in successfully');

  // Create or login Student 2 for concurrency / double-booking tests
  let student2Token = '';
  let student2Id = '';
  const regRes = await request(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: {
      email: 'student2.concurrent@lautech.edu.ng',
      password: 'Student123!',
      fullName: 'Tunde Concurrent Student',
      phone: '+2348022223344',
      role: 'STUDENT'
    }
  });

  if (regRes.ok) {
    student2Token = regRes.data.token;
    student2Id = regRes.data.user.id;
  } else {
    const logRes = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'student2.concurrent@lautech.edu.ng', password: 'Student123!' }
    });
    student2Token = logRes.data.token;
    student2Id = logRes.data.user.id;
  }
  assert(Boolean(student2Token), 'Student 2 (Concurrency test user) authenticated');

  // Authenticate default provider
  const providerRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'provider@hostelease.ng', password: 'Provider123!' }
  });
  const providerToken = providerRes.data.token;
  const providerId = providerRes.data.user.id;
  assert(Boolean(providerToken), 'Provider logged in successfully');

  // Authenticate admin
  const adminRes = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: 'admin@hostelease.ng', password: 'Admin123!' }
  });
  const adminToken = adminRes.data.token;
  const adminId = adminRes.data.user.id;
  assert(Boolean(adminToken), 'Admin logged in successfully');

  // Fetch available property, room, and bedspace for testing
  const propsRes = await request(`${API_BASE}/properties`);
  const property = propsRes.data.properties[0];
  assert(Boolean(property && property.id), 'Loaded test hostel property', property?.title);

  // Clean any previous test bookings and reset room/bedspace capacity for clean testing
  db.prepare('DELETE FROM financial_ledger WHERE booking_id IN (SELECT id FROM bookings WHERE student_id IN (?, ?))').run(studentId, student2Id);
  db.prepare('DELETE FROM refunds WHERE booking_id IN (SELECT id FROM bookings WHERE student_id IN (?, ?))').run(studentId, student2Id);
  db.prepare('DELETE FROM payment_attempts WHERE booking_id IN (SELECT id FROM bookings WHERE student_id IN (?, ?))').run(studentId, student2Id);
  db.prepare('DELETE FROM payments WHERE student_id IN (?, ?)').run(studentId, student2Id);
  db.prepare('DELETE FROM booking_status_history WHERE booking_id IN (SELECT id FROM bookings WHERE student_id IN (?, ?))').run(studentId, student2Id);
  db.prepare('DELETE FROM bookings WHERE student_id IN (?, ?)').run(studentId, student2Id);
  db.prepare("UPDATE bedspaces SET is_occupied = 0, status = 'AVAILABLE'").run();
  db.prepare('UPDATE rooms SET quantity_available = quantity_total, occupied_count = 0').run();

  const propDb = db.prepare('SELECT university_id, area_id FROM properties WHERE id = ?').get(property.id) as any;

  const availRes = await request(`${API_BASE}/bookings/availability/properties/${property.id}`);
  const room = availRes.data.rooms[0];
  const bedspace = room?.bedspaces?.[0];

  assert(Boolean(room && room.id), 'Loaded test room with availability', room?.name);

  return {
    studentToken,
    studentId,
    student2Token,
    student2Id,
    providerToken,
    providerId,
    adminToken,
    adminId,
    propertyId: property.id,
    roomId: room.id,
    bedspaceId: bedspace?.id || '',
    universityId: propDb.university_id,
    areaId: propDb.area_id
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('  HOSTEL EASE PHASE 5 AUTOMATED TEST SUITE');
  console.log('  Testing Booking & Reservation Engine');
  console.log('====================================================');

  const ctx = await setupTestData();

  console.log('\n--- 2. Testing Room & Bedspace Availability Query ---');
  {
    const res = await request(`${API_BASE}/bookings/availability/properties/${ctx.propertyId}`);
    assert(res.status === 200, 'GET availability returns 200 OK');
    assert(Array.isArray(res.data.rooms), 'Rooms returned as array');
    assert(res.data.rooms.length > 0, 'Found at least 1 room type');
    const firstRoom = res.data.rooms[0];
    assert(typeof firstRoom.quantityAvailable === 'number', 'Room has quantityAvailable number');
    assert(typeof firstRoom.pricing.totalCost === 'number', 'Room has server-computed totalCost');
    assert(firstRoom.pricing.totalCost >= firstRoom.pricing.rentAmount, 'Total cost includes rent + mandatory charges');
  }

  console.log('\n--- 3. Testing Reservation Creation & Backend Price Integrity ---');
  let createdBookingId = '';
  let createdBookingRef = '';
  {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Attempt to submit spoofed rent amount (backend should ignore and use DB pricing)
    const reserveRes = await request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        propertyId: ctx.propertyId,
        roomId: ctx.roomId,
        bedspaceId: ctx.bedspaceId || undefined,
        moveInDate: tomorrow,
        academicSession: '2026/2027',
        durationMonths: 12,
        specialRequests: 'Ground floor preferred if possible',
        // Malicious client attempt:
        rentAmount: 100,
        totalCost: 100
      }
    });

    assert(reserveRes.status === 201, 'POST /reserve returns 201 Created');
    assert(reserveRes.data.status === 'PENDING', 'Initial reservation status is PENDING');
    assert(/^HE-2026-[A-Z0-9]{6}$/.test(reserveRes.data.bookingReference), 'Booking reference adheres to format HE-2026-XXXXXX', reserveRes.data.bookingReference);
    assert(reserveRes.data.totalCost > 1000, 'Price integrity enforced: Server computed official total cost', `Total: ₦${reserveRes.data.totalCost}`);
    assert(Boolean(reserveRes.data.expiresAt), '48h expiration timestamp generated');

    createdBookingId = reserveRes.data.bookingId;
    createdBookingRef = reserveRes.data.bookingReference;

    // Verify Notification created for Provider
    const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
      .get(ctx.providerId, 'BOOKING_REQUEST') as any;
    assert(Boolean(notif), 'Landlord received in-app notification for booking request');
  }

  console.log('\n--- 4. Testing Double-Booking Prevention & Concurrency Guard ---');
  {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Student 2 attempts to reserve the EXACT same bedspace that is already held by Student 1
    if (ctx.bedspaceId) {
      const doubleRes = await request(`${API_BASE}/bookings/reserve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.student2Token}` },
        body: {
          propertyId: ctx.propertyId,
          roomId: ctx.roomId,
          bedspaceId: ctx.bedspaceId,
          moveInDate: tomorrow,
          academicSession: '2026/2027',
          durationMonths: 12
        }
      });
      assert(
        doubleRes.status === 409,
        'Double-booking of same bedspace blocked with HTTP 409 Conflict',
        doubleRes.data?.error
      );
    }

    // Test Concurrent Requests Simulation:
    // Create an isolated test property & room with 1 space left, trigger simultaneous requests from two students
    const testPropId = `test-prop-${Date.now()}`;
    const testRoomId = `test-room-${Date.now()}`;

    db.prepare(`
      INSERT INTO properties (
        id, provider_id, university_id, area_id, title, slug, description, address,
        distance_from_campus_km, property_type, gender_preference, total_rooms,
        verification_status, availability_status
      ) VALUES (
        ?, ?, ?, ?, 'Concurrency Test Lodge', ?, 'Test accommodation', 'Near LAUTECH Under-G',
        0.4, 'SELF_CONTAIN', 'ANY', 1,
        'VERIFIED', 'AVAILABLE'
      )
    `).run(testPropId, ctx.providerId, ctx.universityId, ctx.areaId, `concurrency-lodge-${Date.now()}`);

    db.prepare(`
      INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, status)
      VALUES (?, ?, 'Single Test Room', 'SINGLE_ROOM', 1, 1, 1, 'AVAILABLE')
    `).run(testRoomId, testPropId);

    db.prepare(`
      INSERT INTO prices (id, property_id, room_id, rent_amount, service_charge, agency_fee, caution_fee, other_mandatory_charges, total_mandatory_cost)
      VALUES (?, ?, ?, 180000, 20000, 10000, 15000, 5000, 215000)
    `).run(`price-${testRoomId}`, testPropId, testRoomId);

    console.log('  Simulating simultaneous bookings for single remaining room space...');
    const req1 = request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: { propertyId: testPropId, roomId: testRoomId, moveInDate: tomorrow }
    });

    const req2 = request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.student2Token}` },
      body: { propertyId: testPropId, roomId: testRoomId, moveInDate: tomorrow }
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    const oneSuccess = (res1.status === 201 && res2.status === 409) || (res2.status === 201 && res1.status === 409);
    assert(oneSuccess, 'Concurrency Guard: Exactly 1 student booked successfully, 2nd received 409 Conflict');

    // Clean up test records
    db.prepare('DELETE FROM bookings WHERE property_id = ?').run(testPropId);
    db.prepare('DELETE FROM prices WHERE property_id = ?').run(testPropId);
    db.prepare('DELETE FROM rooms WHERE property_id = ?').run(testPropId);
    db.prepare('DELETE FROM properties WHERE id = ?').run(testPropId);
  }

  console.log('\n--- 5. Testing Booking Details & Voucher Query ---');
  {
    const res = await request(`${API_BASE}/bookings/${createdBookingId}`, {
      headers: { Authorization: `Bearer ${ctx.studentToken}` }
    });

    assert(res.status === 200, 'GET /bookings/:id returns 200 OK');
    assert(res.data.booking.bookingReference === createdBookingRef, 'Booking reference matches voucher');
    assert(res.data.booking.student.id === ctx.studentId, 'Student info populated');
    assert(res.data.booking.property.id === ctx.propertyId, 'Property info populated');
    assert(Array.isArray(res.data.history), 'Status history timeline populated');
    assert(res.data.history.length >= 1, 'Found initial creation status entry');
  }

  console.log('\n--- 6. Testing Provider Confirmation State Transition ---');
  {
    const confirmRes = await request(`${API_BASE}/bookings/${createdBookingId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.providerToken}` }
    });

    assert(confirmRes.status === 200, 'Provider confirmed booking (200 OK)');
    assert(confirmRes.data.status === 'CONFIRMED', 'Status transitioned to CONFIRMED');

    // Verify Notification created for Student
    const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
      .get(ctx.studentId, 'BOOKING_CONFIRMED') as any;
    assert(Boolean(notif), 'Student received in-app notification for booking confirmation');
  }

  console.log('\n--- 7. Testing Provider Decline & Capacity Restoration ---');
  {
    // Check quantity before decline
    const roomBefore = db.prepare('SELECT quantity_available FROM rooms WHERE id = ?').get(ctx.roomId) as any;
    const qtyBefore = roomBefore.quantity_available;

    const declineRes = await request(`${API_BASE}/bookings/${createdBookingId}/decline`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.providerToken}` },
      body: { reason: 'Room under annual maintenance' }
    });

    assert(declineRes.status === 200, 'Provider declined booking (200 OK)');
    assert(declineRes.data.status === 'DECLINED', 'Status transitioned to DECLINED');

    // Verify Room quantity restored
    const roomAfter = db.prepare('SELECT quantity_available FROM rooms WHERE id = ?').get(ctx.roomId) as any;
    assert(roomAfter.quantity_available === qtyBefore + 1, 'Room available quantity restored on decline');

    if (ctx.bedspaceId) {
      const bedAfter = db.prepare('SELECT is_occupied FROM bedspaces WHERE id = ?').get(ctx.bedspaceId) as any;
      assert(bedAfter.is_occupied === 0, 'Bedspace occupied status restored to 0 on decline');
    }
  }

  console.log('\n--- 8. Testing Student Cancellation & Capacity Restoration ---');
  {
    // Create fresh booking for cancellation test
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newBookRes = await request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        propertyId: ctx.propertyId,
        roomId: ctx.roomId,
        moveInDate: tomorrow
      }
    });
    const cancelTargetId = newBookRes.data.bookingId;

    const roomBefore = db.prepare('SELECT quantity_available FROM rooms WHERE id = ?').get(ctx.roomId) as any;
    const qtyBefore = roomBefore.quantity_available;

    const cancelRes = await request(`${API_BASE}/bookings/${cancelTargetId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: { reason: 'Decided to stay on campus' }
    });

    assert(cancelRes.status === 200, 'Student cancelled booking (200 OK)');
    assert(cancelRes.data.status === 'CANCELLED_BY_STUDENT', 'Status transitioned to CANCELLED_BY_STUDENT');

    const roomAfter = db.prepare('SELECT quantity_available FROM rooms WHERE id = ?').get(ctx.roomId) as any;
    assert(roomAfter.quantity_available === qtyBefore + 1, 'Room quantity restored on student cancellation');
  }

  console.log('\n--- 9. Testing 48-Hour Auto-Expiration Sweeper ---');
  {
    // Create booking with backdated expiration time
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expBookRes = await request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        propertyId: ctx.propertyId,
        roomId: ctx.roomId,
        moveInDate: tomorrow
      }
    });
    const expTargetId = expBookRes.data.bookingId;

    // Backdate expires_at to 2 days ago
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE bookings SET expires_at = ? WHERE id = ?').run(twoDaysAgo, expTargetId);

    const sweepRes = await request(`${API_BASE}/bookings/check-expirations`, { method: 'POST' });
    assert(sweepRes.status === 200, 'POST /check-expirations executed successfully');
    assert(sweepRes.data.expiredCount >= 1, 'Sweeper expired the stale reservation');

    const checkExp = db.prepare('SELECT status FROM bookings WHERE id = ?').get(expTargetId) as any;
    assert(checkExp.status === 'EXPIRED', 'Booking status transitioned to EXPIRED');
  }

  console.log('\n--- 10. Testing Security & Authorization Boundaries ---');
  {
    // Student 2 tries to confirm Student 1's booking -> Must get 403 Forbidden
    const unauthConfirm = await request(`${API_BASE}/bookings/${createdBookingId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.student2Token}` }
    });
    assert(unauthConfirm.status === 403, 'Unauthorized confirmation blocked with 403 Forbidden');

    // Student 2 tries to cancel Student 1's booking -> Must get 403 Forbidden
    const unauthCancel = await request(`${API_BASE}/bookings/${createdBookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.student2Token}` }
    });
    assert(unauthCancel.status === 403, 'Unauthorized cancellation blocked with 403 Forbidden');
  }

  console.log('\n====================================================');
  console.log(`  PHASE 5 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
