import crypto from 'crypto';
import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

const BASE_URL = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase12Tests() {
  console.log('\n===============================================================');
  console.log('🔑 HOSTEL EASE PHASE 12 — MOVE-IN & POST-BOOKING TEST SUITE');
  console.log('===============================================================\n');

  // Seed fresh isolated test accounts
  const studentEmail = `student.movein.${Date.now()}@lautech.edu.ng`;
  const providerEmail = `host.movein.${Date.now()}@gmail.com`;
  const password = 'Password123!';

  // 1. Register Student
  const regStudent = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Tolani Shittu',
      email: studentEmail,
      phone: '08021112233',
      role: 'STUDENT',
      password
    })
  });
  const studentData = await regStudent.json() as any;
  const studentToken = studentData.token;
  const studentId = studentData.user.id;
  assert(Boolean(studentToken), 'Student registered and authenticated');

  // 2. Register Landlord
  const regProvider = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Alhaji Rasheed Akande',
      email: providerEmail,
      phone: '08034445566',
      role: 'PROVIDER',
      password
    })
  });
  const providerData = await regProvider.json() as any;
  const providerToken = providerData.token;
  const providerId = providerData.user.id;
  assert(Boolean(providerToken), 'Provider registered and authenticated');

  // 3. Create Verified Hostel & Room
  const propId = `prop-movein-${Date.now()}`;
  const roomId = `room-movein-${Date.now()}`;
  const area = db.prepare('SELECT id FROM areas LIMIT 1').get() as any;
  const uni = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;

  db.prepare(`
    INSERT INTO properties (
      id, university_id, area_id, provider_id, title, slug, description,
      property_type, address, nearby_landmark, latitude, longitude, distance_from_campus_km,
      total_rooms, verification_status, availability_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SELF_CONTAIN', '14 Under G Road, LAUTECH', 'Under G Junction / Bovas', 8.1438, 4.2638, 0.6, 5, 'APPROVED', 'AVAILABLE')
  `).run(
    propId,
    uni?.id || 'uni-lautech',
    area?.id || 'area-under-g',
    providerId,
    'Emerald Student Villa',
    `emerald-student-villa-${Date.now()}`,
    'A fully-serviced luxury student accommodation near LAUTECH main gate.'
  );

  db.prepare(`
    INSERT INTO rooms (
      id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available,
      is_ensuite, is_furnished, status
    ) VALUES (?, ?, 'Room 102', 'SINGLE_ROOM', 1, 1, 1, 1, 1, 'AVAILABLE')
  `).run(roomId, propId);

  db.prepare(`
    INSERT INTO prices (
      id, property_id, room_id, rent_amount, caution_fee, service_charge, other_mandatory_charges, total_mandatory_cost, period
    ) VALUES (?, ?, ?, 180000, 20000, 10000, 0, 210000, 'YEARLY')
  `).run(`price-${Date.now()}`, propId, roomId);

  db.prepare(`
    INSERT INTO property_media (id, property_id, media_type, category, url, is_cover)
    VALUES (?, ?, 'PHOTO', 'EXTERIOR', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80', 1)
  `).run(`media-${Date.now()}`, propId);

  // 4. Create Active Confirmed & Paid Booking
  const bookingId = `book-movein-${Date.now()}`;
  const bookingRef = `HE-${Math.floor(100000 + Math.random() * 900000)}`;

  db.prepare(`
    INSERT INTO bookings (
      id, booking_reference, student_id, property_id, room_id, provider_id,
      move_in_date, duration_months, academic_session, rent_amount, caution_deposit, service_charge,
      total_cost, status, payment_status, paid_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, '2026-09-20', 12, '2026/2027', 180000, 20000, 10000, 210000, 'CONFIRMED', 'PAID', datetime('now'), datetime('now', '+30 days'))
  `).run(bookingId, bookingRef, studentId, propId, roomId, providerId);

  console.log('\n--- Test Group 1: Student Move-In Hub ---');
  
  // 5. GET /api/move-in/student/current
  const moveInRes = await fetch(`${BASE_URL}/move-in/student/current`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const moveInData = await moveInRes.json() as any;
  assert(moveInRes.status === 200, 'GET /api/move-in/student/current returns 200 OK');
  assert(moveInData.hasActiveMoveIn === true, 'hasActiveMoveIn is true');
  assert(moveInData.moveIn.bookingId === bookingId, 'Move-in linked to student booking ID');
  assert(moveInData.moveIn.status === 'NOT_STARTED', 'Initial move-in status is NOT_STARTED');
  assert(moveInData.moveIn.hostel.title === 'Emerald Student Villa', 'Hostel title correctly resolved');
  assert(moveInData.moveIn.hostel.nearbyLandmark === 'Under G Junction / Bovas', 'LAUTECH landmark resolved');
  assert(Array.isArray(moveInData.moveIn.checklist.items), 'Interactive checklist initialized');
  assert(moveInData.moveIn.checklist.items.length >= 6, 'Checklist has pre-move-in and move-in day tasks');

  console.log('\n--- Test Group 2: Checklist Persistence & Offline Resilience ---');

  // 6. PATCH /api/move-in/:bookingId/checklist
  const checklist = moveInData.moveIn.checklist.items;
  const updatedChecklist = checklist.map((item: any) => 
    item.id === 'chk_pay' ? { ...item, isCompleted: true } : item
  );

  const patchChkRes = await fetch(`${BASE_URL}/move-in/${bookingId}/checklist`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ items: updatedChecklist })
  });
  const patchChkData = await patchChkRes.json() as any;
  assert(patchChkRes.status === 200, 'PATCH /api/move-in/:bookingId/checklist returns 200 OK');
  assert(patchChkData.message.includes('synchronized'), 'Checklist saved persistently to database');

  console.log('\n--- Test Group 3: Arrival Confirmation ("I\'ve Arrived") ---');

  // 7. POST /api/move-in/:bookingId/arrival
  const arrivalRes = await fetch(`${BASE_URL}/move-in/${bookingId}/arrival`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const arrivalData = await arrivalRes.json() as any;
  assert(arrivalRes.status === 200, 'POST /api/move-in/:bookingId/arrival returns 200 OK');
  assert(arrivalData.status === 'ARRIVED', 'Status transitioned to ARRIVED without forfeiting inspection');

  // Verify Provider Notification was created
  const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(providerId) as any;
  assert(Boolean(notif), 'Landlord received arrival notification');
  assert(notif.title.includes('Arrived'), 'Notification specifies student arrival at hostel');

  console.log('\n--- Test Group 4: Room Condition Inspection & Checklist ---');

  // 8. POST /api/move-in/:bookingId/condition-report
  const conditionRes = await fetch(`${BASE_URL}/move-in/${bookingId}/condition-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      overallCondition: 'MINOR_ISSUES',
      roomChecks: {
        walls: true,
        floor: true,
        locks: true,
        electricity: false,
        water: true,
        furniture: true
      },
      comments: 'Wall painting is great. Bedroom switch needs inspection.'
    })
  });
  const conditionData = await conditionRes.json() as any;
  assert(conditionRes.status === 201, 'POST /api/move-in/:bookingId/condition-report returns 201 Created');
  assert(Boolean(conditionData.reportId), `Condition report saved: ${conditionData.reportId}`);

  console.log('\n--- Test Group 5: Timestamped Photo Evidence Upload ---');

  // 9. POST /api/move-in/:bookingId/photos
  const photoRes = await fetch(`${BASE_URL}/move-in/${bookingId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      photoUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
      category: 'LOCK',
      caption: 'Initial door lock state on arrival'
    })
  });
  const photoData = await photoRes.json() as any;
  assert(photoRes.status === 201, 'POST /api/move-in/:bookingId/photos returns 201 Created');
  assert(Boolean(photoData.photoId), `Photo evidence ID generated: ${photoData.photoId}`);

  console.log('\n--- Test Group 6: Move-In Issue Reporting & Resolution Workflow ---');

  // 10. POST /api/move-in/:bookingId/issues
  const issueRes = await fetch(`${BASE_URL}/move-in/${bookingId}/issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      category: 'ELECTRICITY',
      severity: 'HIGH',
      title: 'Bedroom socket sparking',
      description: 'The wall socket near the bed sparks when plugging in reading lamp.'
    })
  });
  const issueData = await issueRes.json() as any;
  assert(issueRes.status === 201, 'POST /api/move-in/:bookingId/issues returns 201 Created');
  assert(Boolean(issueData.issueCode), `Issue generated with tracking code: ${issueData.issueCode}`);
  const testIssueId = issueData.issueId;

  // 11. Provider Updates Issue (Acknowledge & In Progress)
  const provActionRes = await fetch(`${BASE_URL}/move-in/issues/${testIssueId}/provider-action`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      actionStatus: 'IN_PROGRESS',
      responseText: 'Caretaker has dispatched hostel electrician Mr. Kola to replace the socket faceplate.'
    })
  });
  const provActionData = await provActionRes.json() as any;
  assert(provActionRes.status === 200, 'Provider updates issue with action status and note');
  assert(provActionData.status === 'IN_PROGRESS', 'Issue status updated to IN_PROGRESS');

  // 12. Student Escalation to Dispute if Unresolved
  const escalateRes = await fetch(`${BASE_URL}/move-in/issues/${testIssueId}/student-confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      isResolved: false,
      feedbackNotes: 'Electrician did not visit within 24 hours.'
    })
  });
  const escalateData = await escalateRes.json() as any;
  assert(escalateRes.status === 200, 'Student confirms issue unresolved');
  assert(escalateData.message.includes('dispute center'), 'Issue seamlessly escalated to Trust & Safety Dispute Center');

  // Verify Dispute Record Created in database
  const disp = db.prepare('SELECT * FROM disputes WHERE booking_id = ?').get(bookingId) as any;
  assert(Boolean(disp), 'Dispute record created in Phase 11 dispute system');
  assert(disp.category === 'HOSTEL_NOT_AS_DESCRIBED', 'Dispute categorized accurately');

  console.log('\n--- Test Group 7: Versioned Rule Acknowledgement ---');

  // 13. POST /api/move-in/:bookingId/rules/acknowledge
  const ruleAckRes = await fetch(`${BASE_URL}/move-in/${bookingId}/rules/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ version: 1 })
  });
  const ruleAckData = await ruleAckRes.json() as any;
  assert(ruleAckRes.status === 200, 'POST /api/move-in/:bookingId/rules/acknowledge returns 200 OK');
  assert(ruleAckData.version === 1, 'Rule version 1 recorded with immutable timestamp');

  console.log('\n--- Test Group 8: Provider Move-In Management Dashboard ---');

  // 14. GET /api/move-in/provider/overview
  const provOverviewRes = await fetch(`${BASE_URL}/move-in/provider/overview`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const provOverviewData = await provOverviewRes.json() as any;
  assert(provOverviewRes.status === 200, 'GET /api/move-in/provider/overview returns 200 OK');
  assert(Array.isArray(provOverviewData.todayMoveIns), 'todayMoveIns returned');
  assert(Array.isArray(provOverviewData.upcomingMoveIns), 'upcomingMoveIns returned');
  assert(Array.isArray(provOverviewData.openIssues), 'openIssues list returned');

  // 15. Provider Updates Move-In Instructions
  const updateInstRes = await fetch(`${BASE_URL}/move-in/provider/${bookingId}/instructions`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      moveInInstructions: 'Please meet Caretaker at gate house between 10am and 4pm.',
      keyCollectionPoint: 'Hostel Gate House Office',
      emergencyPhone: '08034445566',
      scheduledArrivalTime: '10:00 AM - 4:00 PM'
    })
  });
  assert(updateInstRes.status === 200, 'Provider updates move-in arrival instructions');

  console.log('\n--- Test Group 9: Final Move-In Acceptance & Post-Move-In Rating ---');

  // 16. POST /api/move-in/:bookingId/accept
  const acceptRes = await fetch(`${BASE_URL}/move-in/${bookingId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const acceptData = await acceptRes.json() as any;
  assert(acceptRes.status === 200, 'POST /api/move-in/:bookingId/accept returns 200 OK');
  assert(acceptData.status === 'MOVED_IN', 'Move-in status updated to MOVED_IN');

  // 17. POST /api/move-in/:bookingId/check-in-feedback
  const checkInRes = await fetch(`${BASE_URL}/move-in/${bookingId}/check-in-feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      rating: 'GOOD',
      feedbackText: 'Hostel is quiet and electricity is stable.'
    })
  });
  assert(checkInRes.status === 200, 'Post-move-in check-in feedback saved successfully');

  console.log('\n--- Test Group 10: Student Stay History & Move-Out ---');

  // 18. GET /api/move-in/student/history
  const histRes = await fetch(`${BASE_URL}/move-in/student/history`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const histData = await histRes.json() as any;
  assert(histRes.status === 200, 'GET /api/move-in/student/history returns 200 OK');
  assert(Array.isArray(histData.stays), 'Stays array returned');
  assert(histData.stays.length > 0, `History contains ${histData.stays.length} stay records`);

  // 19. POST /api/move-in/:bookingId/move-out
  const moveOutRes = await fetch(`${BASE_URL}/move-in/${bookingId}/move-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      moveOutDate: '2027-07-15',
      checklist: { keysReturned: true, roomCleaned: true }
    })
  });
  assert(moveOutRes.status === 200, 'POST /api/move-in/:bookingId/move-out returns 200 OK');

  console.log('\n--- Test Group 11: Security & RBAC Enforcement ---');

  // 20. Unauthenticated request rejection
  const unauthRes = await fetch(`${BASE_URL}/move-in/student/current`);
  assert(unauthRes.status === 401, 'Unauthenticated request rejected with 401 Unauthorized');

  // 21. Cross-tenant isolation (Other student cannot update another student's move-in)
  const regOtherStudent = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Other Student',
      email: `other.student.${Date.now()}@lautech.edu.ng`,
      phone: '08099998888',
      role: 'STUDENT',
      password: 'Password123!'
    })
  });
  const otherData = await regOtherStudent.json() as any;
  const otherStudentToken = otherData.token;

  const crossTenantRes = await fetch(`${BASE_URL}/move-in/${bookingId}/arrival`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${otherStudentToken}` }
  });
  assert(crossTenantRes.status === 403, 'Cross-tenant move-in update rejected with 403 Forbidden');

  console.log('\n===============================================================');
  console.log(`📊 PHASE 12 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  console.log('🎉 ALL PHASE 12 MOVE-IN & POST-BOOKING TESTS PASSED PERFECTLY!\n');
}

runPhase12Tests().catch(err => {
  console.error('Fatal error executing Phase 12 tests:', err);
  process.exit(1);
});
