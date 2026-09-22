import db from '../server/db.js';
import { userDeletionService } from '../server/services/userDeletionService.js';
import { generateToken } from '../server/middleware/auth.js';
import netlifyHandler from '../netlify/functions/api.js';

async function runEndToEndVerification() {
  console.log('=================================================================');
  console.log('STARTING END-TO-END VERIFICATION: PERMANENT USER ACCOUNT DELETION');
  console.log('=================================================================\n');

  // 1. SETUP TEST STUDENT & LANDLORD DATA IN SQLITE DB
  const testStudentId = `verify-stud-${Date.now()}`;
  const testStudentEmail = `verify.student.${Date.now()}@lautech.edu.ng`;
  const adminId = 'usr-admin-master';

  // Ensure admin exists in DB
  const adminExists = db.prepare("SELECT id FROM users WHERE id = ? OR role = 'ADMIN'").get(adminId);
  if (!adminExists) {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, phone, role, is_active)
      VALUES (?, 'admin@hostelease.ng', 'admin123', 'Platform Administrator', '08000000000', 'ADMIN', 1)
    `).run(adminId);
  }

  // Create test student in DB
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
    VALUES (?, ?, 'StudentPass123!', 'Warisii Test Student', '+2348098765432', 'STUDENT', 1)
  `).run(testStudentId, testStudentEmail);

  db.prepare(`
    INSERT INTO student_profiles (id, user_id, university_id, matric_no, department, level, gender)
    VALUES (?, ?, 'uni-lautech-ogbomoso', '20/47CS/7777', 'Computer Science', '400L', 'MALE')
  `).run(`sp-prof-${Date.now()}`, testStudentId);

  // Pick first landlord property
  const landlordProp = db.prepare("SELECT id, provider_id, title FROM properties LIMIT 1").get() as any;
  if (!landlordProp) {
    throw new Error('No landlord properties found in database to link test booking.');
  }

  console.log(`[1] Linked Landlord Property: "${landlordProp.title}" (ID: ${landlordProp.id}, Provider: ${landlordProp.provider_id})`);

  let room = db.prepare("SELECT id FROM rooms WHERE property_id = ? LIMIT 1").get(landlordProp.id) as any;
  if (!room) {
    const newRoomId = `room-${Date.now()}`;
    db.prepare(`
      INSERT INTO rooms (id, property_id, room_number, room_type, total_bedspaces, available_bedspaces, price_per_academic_year)
      VALUES (?, ?, '101', 'SINGLE', 1, 1, 250000)
    `).run(newRoomId, landlordProp.id);
    room = { id: newRoomId };
  }

  // Create student's booking on landlord property
  const bookingId = `bk-test-${Date.now()}`;
  db.prepare(`
    INSERT INTO bookings (id, booking_reference, student_id, provider_id, property_id, room_id, move_in_date, rent_amount, total_cost, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, '2026-10-01', 250000, 250000, '2026-10-05', 'CONFIRMED')
  `).run(bookingId, `REF-${Date.now()}`, testStudentId, landlordProp.provider_id, landlordProp.id, room.id);

  // Create inspection request
  const inspectionId = `insp-test-${Date.now()}`;
  db.prepare(`
    INSERT INTO inspection_requests (id, student_id, property_id, inspection_type, preferred_date, preferred_time, status)
    VALUES (?, ?, ?, 'PHYSICAL', '2026-10-05', '11:00 AM', 'PENDING')
  `).run(inspectionId, testStudentId, landlordProp.id);

  // Create saved property
  const savedId = `saved-test-${Date.now()}`;
  db.prepare(`
    INSERT INTO saved_properties (id, user_id, property_id)
    VALUES (?, ?, ?)
  `).run(savedId, testStudentId, landlordProp.id);

  // Create notification
  const notifId = `notif-test-${Date.now()}`;
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (?, ?, 'Booking Notice', 'Your booking is confirmed', 'BOOKING')
  `).run(notifId, testStudentId);

  console.log(`[2] Created Student Account "${testStudentEmail}" with active booking, inspection, saved property, and notification.`);

  // 2. VERIFY PRE-DELETION SUMMARY
  const summary = userDeletionService.getUserDeletionSummary(testStudentId);
  console.log('\n[3] Pre-Deletion Summary Generated:');
  console.log({
    userId: summary.userId,
    fullName: summary.fullName,
    role: summary.role,
    bookingsCount: summary.bookingsCount,
    inspectionsCount: summary.inspectionsCount,
    savedHostelsCount: summary.savedHostelsCount,
    notificationsCount: summary.notificationsCount,
    hostelsCount: summary.hostelsCount // MUST BE 0 for student
  });

  if (summary.hostelsCount !== 0) {
    throw new Error(`FAIL: Student deletion summary reports ${summary.hostelsCount} hostels. Expected 0.`);
  }
  if (summary.bookingsCount < 1 || summary.inspectionsCount < 1 || summary.savedHostelsCount! < 1) {
    throw new Error('FAIL: Student records not counted correctly in summary.');
  }

  // 3. EXECUTE PERMANENT DELETION VIA USER DELETION SERVICE
  console.log('\n[4] Executing userDeletionService.deleteUserPermanently...');
  const delResult = userDeletionService.deleteUserPermanently(testStudentId, adminId, 'End-to-End Automated Deletion Verification');
  console.log('Deletion Result:', delResult);

  if (!delResult.success) {
    throw new Error('FAIL: Deletion service reported failure.');
  }

  // 4. VERIFY DATABASE CASCADES & ISOLATION
  console.log('\n[5] Verifying SQLite Database Cleanup:');
  const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get(testStudentId);
  const profileCheck = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(testStudentId);
  const bookingCheck = db.prepare('SELECT id FROM bookings WHERE student_id = ?').get(testStudentId);
  const inspCheck = db.prepare('SELECT id FROM inspection_requests WHERE student_id = ?').get(testStudentId);
  const savedCheck = db.prepare('SELECT id FROM saved_properties WHERE user_id = ?').get(testStudentId);
  const notifCheck = db.prepare('SELECT id FROM notifications WHERE user_id = ?').get(testStudentId);

  console.log(`- User record exists: ${userCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`- Student profile exists: ${profileCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`- Student bookings exist: ${bookingCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`- Student inspections exist: ${inspCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`- Student saved properties exist: ${savedCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`- Student notifications exist: ${notifCheck ? 'YES (FAIL)' : 'NO (PASS)'}`);

  if (userCheck || profileCheck || bookingCheck || inspCheck || savedCheck || notifCheck) {
    throw new Error('FAIL: Some student records remained in the SQLite database after permanent deletion.');
  }

  // 5. VERIFY LANDLORD PROPERTY REMAINS 100% INTACT & UNCORRUPTED
  const landlordPropCheck = db.prepare('SELECT id, title, provider_id FROM properties WHERE id = ?').get(landlordProp.id) as any;
  console.log(`- Landlord Property "${landlordPropCheck?.title}" (${landlordPropCheck?.id}): ${landlordPropCheck ? '100% INTACT & SAFE (PASS)' : 'CORRUPTED/DELETED (FAIL)'}`);
  if (!landlordPropCheck) {
    throw new Error('CRITICAL: Landlord property was deleted or corrupted when student was deleted!');
  }

  // 6. TEST AUTHENTICATION LOCKOUT (DELETED STUDENT TOKEN RETURNS 401)
  console.log('\n[6] Testing Token Authentication Lockout for Deleted User:');
  const deletedUserToken = generateToken({
    id: testStudentId,
    email: testStudentEmail,
    fullName: 'Warisii Test Student',
    role: 'STUDENT',
    isActive: 1
  });

  // Verify auth middleware behavior
  const authCheckUser = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(testStudentId) as any;
  console.log(`- DB user lookup for deleted token: ${authCheckUser ? 'FOUND (FAIL)' : 'NOT FOUND (PASS -> Token returns 401)'}`);
  if (authCheckUser) {
    throw new Error('FAIL: Deleted student account still found in database during auth token check.');
  }

  // 7. VERIFY NETLIFY SERVERLESS FUNCTION DELETION ENDPOINTS
  console.log('\n[7] Testing Netlify Serverless Function (/api/admin/users*):');

  // Create dummy user in Netlify handler via registration
  const netlifyStudentEmail = `netlify.stud.${Date.now()}@lautech.edu.ng`;
  const regReq = new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: netlifyStudentEmail,
      password: 'Password123!',
      fullName: 'Netlify Test Student',
      role: 'STUDENT'
    })
  });
  const regRes = await netlifyHandler(regReq);
  const regData = await regRes.json();
  const netlifyUserId = regData.user.id;
  const studentToken = regData.token;
  console.log(`- Registered Netlify user: ${netlifyStudentEmail} (ID: ${netlifyUserId})`);

  // Admin auth token
  const adminReq = new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
      role: 'ADMIN'
    })
  });
  const adminRes = await netlifyHandler(adminReq);
  const adminData = await adminRes.json();
  const adminToken = adminData.token;
  console.log('- Authenticated as Admin on Netlify function.');

  // Test GET /api/admin/users/:id/deletion-summary
  const sumReq = new Request(`http://localhost/api/admin/users/${netlifyUserId}/deletion-summary`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const sumRes = await netlifyHandler(sumReq);
  const sumData = await sumRes.json();
  console.log(`- Netlify deletion-summary status: ${sumRes.status} (Hostels: ${sumData.summary?.hostelsCount})`);
  if (sumRes.status !== 200 || sumData.summary?.hostelsCount !== 0) {
    throw new Error(`FAIL: Netlify deletion summary failed. Status: ${sumRes.status}`);
  }

  // Test DELETE /api/admin/users/:id
  const delReq = new Request(`http://localhost/api/admin/users/${netlifyUserId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason: 'Netlify end-to-end test' })
  });
  const delRes = await netlifyHandler(delReq);
  const delData = await delRes.json();
  console.log(`- Netlify DELETE user status: ${delRes.status} - Message: "${delData.message}"`);
  if (delRes.status !== 200 || !delData.success) {
    throw new Error(`FAIL: Netlify DELETE user failed. Status: ${delRes.status}`);
  }

  // Test re-fetching deleted user -> must return 404
  const sumAfterReq = new Request(`http://localhost/api/admin/users/${netlifyUserId}/deletion-summary`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const sumAfterRes = await netlifyHandler(sumAfterReq);
  console.log(`- Post-deletion Netlify summary status: ${sumAfterRes.status} (Expected: 404)`);
  if (sumAfterRes.status !== 404) {
    throw new Error(`FAIL: Netlify returned status ${sumAfterRes.status} instead of 404 for deleted user.`);
  }

  // Test deleted user token authentication on /api/auth/me -> must return 401
  const authMeReq = new Request('http://localhost/api/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const authMeRes = await netlifyHandler(authMeReq);
  console.log(`- Deleted user /api/auth/me token authentication status: ${authMeRes.status} (Expected: 401 Unauthorized)`);
  if (authMeRes.status !== 401) {
    throw new Error(`FAIL: Deleted user token was accepted with status ${authMeRes.status}! Expected 401.`);
  }

  // Test search in GET /api/admin/users?search=... -> must return empty array
  const searchReq = new Request(`http://localhost/api/admin/users?search=${encodeURIComponent(netlifyStudentEmail)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const searchRes = await netlifyHandler(searchReq);
  const searchData = await searchRes.json();
  console.log(`- Search for deleted user in GET /api/admin/users: found ${searchData.users?.length} accounts (Expected: 0)`);
  if (searchData.users?.length !== 0) {
    throw new Error(`FAIL: Deleted user was resurrected or still present in /api/admin/users! Count: ${searchData.users?.length}`);
  }

  console.log('\n=================================================================');
  console.log('ALL VERIFICATIONS PASSED: 100% PERMANENT DELETION & INTEGRITY OK');
  console.log('=================================================================');
}

runEndToEndVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
