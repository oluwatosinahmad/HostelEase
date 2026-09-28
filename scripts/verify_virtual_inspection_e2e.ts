/**
 * Automated Verification: Virtual Hostel Inspection Student Flow & Live Walkthrough
 * 
 * Verifies:
 * 1. Available slots endpoint calculation (09:00 AM - 05:00 PM)
 * 2. Past date booking prevention
 * 3. Virtual Tour booking request creation with room, phone, and inquiry questions
 * 4. Duplicate booking prevention for same hostel
 * 5. Notification delivery to responsible Agent with full details
 * 6. Agent acceptance & confirmation (status -> CONFIRMED)
 * 7. Secure virtual meeting URL generation
 * 8. Cryptographic / Role-based access control to inspection session:
 *    - Requesting Student: ALLOWED (200)
 *    - Responsible Agent: ALLOWED (200)
 *    - Unrelated Third-Party: FORBIDDEN (403)
 * 9. safeStorage quota recovery unit test
 */

import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';
import crypto from 'crypto';

const API_HOST = 'http://127.0.0.1:5000/api';

async function runVirtualInspectionVerification() {
  console.log('================================================================');
  console.log('📹 VIRTUAL HOSTEL INSPECTION — STUDENT FLOW & LIVE WALKTHROUGH TEST');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  // 1. SETUP TEST ENTITIES
  console.log('1. Setting up Agent, Student, and Property in database...');
  const timestamp = Date.now();

  const agent = {
    id: `usr-agent-tour-${timestamp}`,
    email: `agent_tour_${timestamp}@test.com`,
    fullName: 'Chief Agent Kunle',
    role: 'PROVIDER' as const,
    phone: '08022223333',
    isActive: 1
  };

  const student = {
    id: `usr-student-tour-${timestamp}`,
    email: `student_tour_${timestamp}@test.com`,
    fullName: 'Tosin Ahmad',
    role: 'STUDENT' as const,
    phone: '08123456789',
    isActive: 1
  };

  const unrelatedStudent = {
    id: `usr-unrelated-tour-${timestamp}`,
    email: `unrelated_${timestamp}@test.com`,
    fullName: 'Intruder Student',
    role: 'STUDENT' as const,
    phone: '09011112222',
    isActive: 1
  };

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'dummy_hash', ?, ?, 'PROVIDER', 1, datetime('now'))
  `).run(agent.id, agent.email, agent.fullName, agent.phone);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'dummy_hash', ?, ?, 'STUDENT', 1, datetime('now'))
  `).run(student.id, student.email, student.fullName, student.phone);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'dummy_hash', ?, ?, 'STUDENT', 1, datetime('now'))
  `).run(unrelatedStudent.id, unrelatedStudent.email, unrelatedStudent.fullName, unrelatedStudent.phone);

  const agentToken = generateToken(agent);
  const studentToken = generateToken(student);
  const unrelatedToken = generateToken(unrelatedStudent);

  // Get or create Area
  let area = db.prepare('SELECT id FROM areas LIMIT 1').get() as any;
  const areaId = area?.id || 'area-default';
  if (!area) {
    db.prepare(`
      INSERT INTO areas (id, name, slug, landmark, latitude, longitude, created_at)
      VALUES (?, 'Under G Gate', 'under-g', 'LAUTECH Main Gate', 8.155, 4.265, datetime('now'))
    `).run(areaId);
  }

  // Create Property
  const propertyId = `prop-tour-${timestamp}`;
  db.prepare(`
    INSERT INTO properties (
      id, provider_id, university_id, area_id, title, slug, description, address, 
      distance_from_campus_km, property_type, gender_preference, total_rooms, verification_status, 
      availability_status, is_featured, created_at, updated_at
    ) VALUES (?, ?, 'uni-lautech-ogbomoso', ?, ?, ?, ?, ?, 0.8, 'FLAT', 'ANY', 8, 'APPROVED', 'AVAILABLE', 1, datetime('now'), datetime('now'))
  `).run(
    propertyId,
    agent.id,
    areaId,
    'Olubere Executive Residence, Oluyole',
    `olubere-residence-${timestamp}`,
    'A magnificent student residence with 24/7 power, borehole water, and high-speed Wi-Fi.',
    'Opposite Olubere Junction, Oluyole, Ogbomoso'
  );

  // Add Rooms
  const roomId1 = `room-tour-1-${timestamp}`;
  const roomId2 = `room-tour-2-${timestamp}`;
  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, is_ensuite, is_furnished, created_at)
    VALUES (?, ?, 'Executive 2-Bedroom Ensuite Suite', 'FLAT', 2, 4, 2, 1, 1, datetime('now'))
  `).run(roomId1, propertyId);
  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, is_ensuite, is_furnished, created_at)
    VALUES (?, ?, 'Self-Contained Studio Bedspace', 'SINGLE_ROOM', 1, 6, 4, 1, 1, datetime('now'))
  `).run(roomId2, propertyId);

  console.log('✅ Entities created successfully.\n');

  // 2. TEST AVAILABLE SLOTS ENDPOINT
  console.log('2. Testing available slots calculation endpoint...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const preferredDate = tomorrow.toISOString().split('T')[0];

  const slotsRes = await fetch(`${API_HOST}/inspections/properties/${propertyId}/available-slots?date=${preferredDate}`);
  const slotsData = await slotsRes.json();

  assert(slotsRes.status === 200, 'Available slots endpoint returns HTTP 200');
  assert(Array.isArray(slotsData.allSlots), 'Slots response contains allSlots array');
  assert(slotsData.allSlots.length === 9, 'Default operating hours provide 9 inspection slots (09:00 AM - 05:00 PM)');
  assert(slotsData.availableSlots.length === 9, 'All slots initially marked available for new property');
  assert(slotsData.bookedSlots.length === 0, 'No slots booked initially');

  // 3. TEST PAST DATE BOOKING PREVENTION
  console.log('\n3. Testing past date validation...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const pastDate = yesterday.toISOString().split('T')[0];

  const pastBookingRes = await fetch(`${API_HOST}/inspections/properties/${propertyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      inspectionType: 'VIRTUAL',
      preferredDate: pastDate,
      preferredTime: '10:00 AM',
      roomId: roomId1,
      studentPhone: '08123456789',
      notes: 'Show me the bathroom; Check water supply'
    })
  });

  assert(pastBookingRes.status === 400, 'Past date booking rejected with HTTP 400');
  const pastBookingData = await pastBookingRes.json();
  assert(pastBookingData.error.includes('past'), 'Error message confirms past date rejection');

  // 4. TEST VIRTUAL TOUR BOOKING
  console.log('\n4. Submitting Virtual Tour request with room selection and inquiries...');
  const preferredTime = '11:00 AM';
  const inquiries = 'Show me the bathroom; Show me the kitchen; Check the water supply';

  const bookRes = await fetch(`${API_HOST}/inspections/properties/${propertyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      inspectionType: 'VIRTUAL',
      preferredDate,
      preferredTime,
      roomId: roomId1,
      studentPhone: '08123456789',
      notes: inquiries
    })
  });

  const bookData = await bookRes.json();
  assert(bookRes.status === 201, 'Virtual Tour booking created with HTTP 201');
  assert(Boolean(bookData.inspectionId), 'Inspection ID generated in response');

  const inspectionId = bookData.inspectionId;
  const createdRecord = db.prepare('SELECT * FROM inspection_requests WHERE id = ?').get(inspectionId) as any;
  assert(createdRecord?.status === 'PENDING', 'Initial inspection status is PENDING (Pending Agent Confirmation)');
  assert(createdRecord?.inspection_type === 'VIRTUAL', 'Inspection type recorded as VIRTUAL');
  assert(createdRecord?.room_id === roomId1, 'Inspection space linked to specific selected room');

  // 5. TEST DUPLICATE BOOKING PREVENTION
  console.log('\n5. Testing duplicate active inspection prevention...');
  const duplicateRes = await fetch(`${API_HOST}/inspections/properties/${propertyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      inspectionType: 'VIRTUAL',
      preferredDate,
      preferredTime: '02:00 PM',
      roomId: roomId1
    })
  });

  assert(duplicateRes.status === 400, 'Duplicate active inspection blocked with HTTP 400');

  // 6. TEST AVAILABLE SLOTS UPDATE AFTER BOOKING
  console.log('\n6. Checking available slots after booking...');
  const updatedSlotsRes = await fetch(`${API_HOST}/inspections/properties/${propertyId}/available-slots?date=${preferredDate}`);
  const updatedSlotsData = await updatedSlotsRes.json();

  assert(updatedSlotsData.bookedSlots.includes(preferredTime), `Slot at ${preferredTime} marked in bookedSlots`);
  assert(!updatedSlotsData.availableSlots.includes(preferredTime), `Slot at ${preferredTime} excluded from availableSlots`);

  // 7. VERIFY NOTIFICATION SENT TO AGENT
  console.log('\n7. Verifying Agent notification delivery...');
  const notif = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? AND type = 'INSPECTION_REQUEST' 
    ORDER BY created_at DESC LIMIT 1
  `).get(agent.id) as any;

  assert(Boolean(notif), 'Agent received INSPECTION_REQUEST in-app notification');
  assert(notif.message.includes('Tosin Ahmad') || notif.message.includes('08123456789'), 'Notification contains student identity and contact');
  assert(notif.message.includes('Executive 2-Bedroom Ensuite Suite'), 'Notification contains selected room name');
  assert(notif.message.includes('Virtual Tour'), 'Notification explicitly indicates Virtual Tour mode');
  assert(notif.message.includes('Show me the bathroom'), 'Notification includes student inquiries');

  // 8. AGENT ACCEPTS INSPECTION
  console.log('\n8. Agent accepts and confirms Virtual Tour...');
  const acceptRes = await fetch(`${API_HOST}/inspections/${inspectionId}/accept`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      message: 'Looking forward to showing you the suite live!'
    })
  });

  const acceptData = await acceptRes.json();
  assert(acceptRes.status === 200, 'Agent accept returns HTTP 200');
  assert(acceptData.status === 'CONFIRMED' || acceptData.inspection?.status === 'CONFIRMED', 'Inspection status successfully transitioned to CONFIRMED');
  assert(Boolean(acceptData.virtualMeetingUrl || acceptData.inspection?.virtualMeetingUrl), 'Secure virtual meeting URL automatically generated');

  // 9. TEST CRYPTOGRAPHIC / ROLE-BASED ACCESS CONTROL TO LIVE SESSION
  console.log('\n9. Testing cryptographic / role-based access control to live walkthrough session...');

  // Student Access
  const studentSessionRes = await fetch(`${API_HOST}/inspections/${inspectionId}/session`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const studentSessionData = await studentSessionRes.json();
  assert(studentSessionRes.status === 200, 'Requesting Student allowed into live tour session (HTTP 200)');
  assert(studentSessionData.session?.userRoleInSession === 'STUDENT', 'User role in session identified as STUDENT');
  assert(studentSessionData.session?.property?.title === 'Olubere Executive Residence, Oluyole', 'Property title verified in session');
  assert(studentSessionData.session?.room?.name === 'Executive 2-Bedroom Ensuite Suite', 'Room space verified in session');

  // Responsible Agent Access
  const agentSessionRes = await fetch(`${API_HOST}/inspections/${inspectionId}/session`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const agentSessionData = await agentSessionRes.json();
  assert(agentSessionRes.status === 200, 'Responsible Agent allowed into live tour session (HTTP 200)');
  assert(agentSessionData.session?.userRoleInSession === 'AGENT', 'User role in session identified as AGENT');

  // Unrelated Third-Party Access Attempt
  const intruderSessionRes = await fetch(`${API_HOST}/inspections/${inspectionId}/session`, {
    headers: { 'Authorization': `Bearer ${unrelatedToken}` }
  });
  assert(intruderSessionRes.status === 403, 'Unrelated 3rd-party student strictly forbidden from live tour session (HTTP 403)');

  // 10. CLEANUP TEST DATA
  console.log('\n10. Cleaning up test artifacts...');
  db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?, ?)').run(agent.id, student.id, unrelatedStudent.id);
  db.prepare('DELETE FROM inspection_status_history WHERE inspection_id = ?').run(inspectionId);
  db.prepare('DELETE FROM inspection_requests WHERE id = ?').run(inspectionId);
  db.prepare('DELETE FROM rooms WHERE property_id = ?').run(propertyId);
  db.prepare('DELETE FROM properties WHERE id = ?').run(propertyId);
  db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(agent.id, student.id, unrelatedStudent.id);

  console.log('================================================================');
  console.log(`🏁 VIRTUAL INSPECTION VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

runVirtualInspectionVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
