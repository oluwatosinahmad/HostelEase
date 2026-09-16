import path from 'path';
import fs from 'fs';
import db from '../server/db.js';
import { userDeletionService } from '../server/services/userDeletionService.js';

async function runTests() {
  console.log('====================================================================');
  console.log('🛡️ HOSTEL EASE — ADMIN ACCOUNT DELETION & DATA CLEANUP TEST SUITE');
  console.log('====================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

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

  const ADMIN_ID = 'test-admin-del-001';
  const LANDLORD_ID = 'test-landlord-del-001';
  const STUDENT_ID = 'test-student-del-001';
  const PRESERVED_LANDLORD_ID = 'test-landlord-preserved-001';

  const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const TEMP_TENANT_ID = 'test-temp-tenant-001';

  // Helper to ensure clean slate for test IDs
  function cleanupTestIds() {
    try {
      db.pragma('foreign_keys = OFF');
      db.prepare("DELETE FROM users WHERE id LIKE 'test-%' OR email LIKE '%@hostelease.ng' AND email LIKE '%del%' OR email LIKE '%tenant%' OR email LIKE '%segun%'").run();
      db.prepare("DELETE FROM properties WHERE id LIKE 'test-%' OR provider_id LIKE 'test-%'").run();
      db.prepare("DELETE FROM provider_profiles WHERE id LIKE 'prof-%' OR user_id LIKE 'test-%'").run();
      db.prepare("DELETE FROM property_media WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM rooms WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM bookings WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM payments WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM inspection_requests WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM notification_logs WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM notifications WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM saved_properties WHERE id LIKE 'test-%'").run();
      db.prepare("DELETE FROM audit_logs WHERE actor_id LIKE 'test-%' OR entity_id LIKE 'test-%'").run();
      db.pragma('foreign_keys = ON');
    } catch (e) {
      console.error('cleanup error:', e);
    }
  }

  cleanupTestIds();

  // Create admin identity
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'hashedpass', 'Chief Security Officer', '08000000000', 'ADMIN', 1, datetime('now'))
  `).run(ADMIN_ID, 'admin_del@hostelease.ng');

  // Create preserved landlord (to verify student deletion does NOT touch this landlord or their hostels)
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'hashedpass', 'Preserved Landlord Enterprise', '08033333333', 'PROVIDER', 1, datetime('now'))
  `).run(PRESERVED_LANDLORD_ID, 'preserved_landlord@hostelease.ng');

  db.prepare(`
    INSERT INTO provider_profiles (id, user_id, business_name, created_at)
    VALUES ('prof-preserved-001', ?, 'Safe Hostels Ltd', datetime('now'))
  `).run(PRESERVED_LANDLORD_ID);

  const preservedHostelId = 'test-preserved-hostel-001';
  db.prepare(`
    INSERT INTO properties (id, provider_id, university_id, title, slug, description, property_type, address, distance_from_campus_km, area_id, latitude, longitude, verification_status, availability_status, created_at)
    VALUES (?, ?, 'uni-lautech-ogbomoso', 'Preserved Royal Palace Lodge', 'preserved-royal-palace', 'Untouched test hostel', 'SELF_CONTAIN', 'Under G Road', 0.5, 'area-under-g', 8.14, 4.26, 'APPROVED', 'AVAILABLE', datetime('now'))
  `).run(preservedHostelId, PRESERVED_LANDLORD_ID);

  const preservedRoomId = 'test-preserved-room-001';
  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, created_at)
    VALUES (?, ?, 'Preserved Suite 1', 'SELF_CONTAIN', datetime('now'))
  `).run(preservedRoomId, preservedHostelId);

  try {
    // =========================================================================
    // SECTION 1: SEED TEST LANDLORD WITH COMPLETE DATA ECOSYSTEM
    // =========================================================================
    console.log('--- TEST SECTION 1: SEED TEST LANDLORD WITH FULL SUITE OF DATA ---');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES (?, ?, 'hashedpass', 'Chief Dele Landlord', '08011111111', 'PROVIDER', 1, datetime('now'))
    `).run(LANDLORD_ID, 'dele_landlord@hostelease.ng');

    db.prepare(`
      INSERT INTO provider_profiles (id, user_id, business_name, created_at)
      VALUES ('prof-dele-001', ?, 'Dele Luxury Accommodations', datetime('now'))
    `).run(LANDLORD_ID);

    // Create 2 test hostels for this landlord
    const hostel1Id = 'test-del-hostel-001';
    const hostel2Id = 'test-del-hostel-002';
    db.prepare(`
      INSERT INTO properties (id, provider_id, university_id, title, slug, description, property_type, address, distance_from_campus_km, area_id, latitude, longitude, verification_status, availability_status, created_at)
      VALUES (?, ?, 'uni-lautech-ogbomoso', 'Dele Crown Villa', 'dele-crown-villa', 'Luxury hostel', 'SELF_CONTAIN', 'Under G, Ogbomoso', 0.8, 'area-under-g', 8.14, 4.26, 'APPROVED', 'AVAILABLE', datetime('now'))
    `).run(hostel1Id, LANDLORD_ID);
    db.prepare(`
      INSERT INTO properties (id, provider_id, university_id, title, slug, description, property_type, address, distance_from_campus_km, area_id, latitude, longitude, verification_status, availability_status, created_at)
      VALUES (?, ?, 'uni-lautech-ogbomoso', 'Dele Executive Studio', 'dele-exec-studio', 'Executive studio', 'SINGLE_ROOM', 'Adenike, Ogbomoso', 1.2, 'area-adenike', 8.15, 4.27, 'APPROVED', 'AVAILABLE', datetime('now'))
    `).run(hostel2Id, LANDLORD_ID);

    // Create rooms
    const room1Id = 'test-del-room-001';
    const room2Id = 'test-del-room-002';
    db.prepare(`
      INSERT INTO rooms (id, property_id, room_name, room_type, created_at)
      VALUES (?, ?, 'Suite A1', 'SELF_CONTAIN', datetime('now'))
    `).run(room1Id, hostel1Id);
    db.prepare(`
      INSERT INTO rooms (id, property_id, room_name, room_type, created_at)
      VALUES (?, ?, 'Standard Room 1', 'SINGLE_ROOM', datetime('now'))
    `).run(room2Id, hostel2Id);

    // Create physical dummy media files
    const testImageFilename = `test_landlord_img_${Date.now()}.jpg`;
    const testVideoFilename = `test_landlord_vid_${Date.now()}.mp4`;
    const testImagePath = path.join(UPLOADS_DIR, testImageFilename);
    const testVideoPath = path.join(UPLOADS_DIR, testVideoFilename);
    fs.writeFileSync(testImagePath, 'FAKE_IMAGE_DATA_BYTES');
    fs.writeFileSync(testVideoPath, 'FAKE_VIDEO_DATA_BYTES');

    // Create property_media rows
    db.prepare(`
      INSERT INTO property_media (id, property_id, media_type, category, url, created_at)
      VALUES (?, ?, 'IMAGE', 'ROOM_PHOTO', ?, datetime('now'))
    `).run('test-media-img-001', hostel1Id, `/uploads/${testImageFilename}`);
    db.prepare(`
      INSERT INTO property_media (id, property_id, media_type, category, url, created_at)
      VALUES (?, ?, 'VIDEO', 'VIDEO_WALKTHROUGH', ?, datetime('now'))
    `).run('test-media-vid-001', hostel1Id, `/uploads/${testVideoFilename}`);

    // Create a temporary tenant student to book landlord's hostel
    const tempStudentId = 'test-temp-tenant-001';
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES (?, ?, 'hashedpass', 'Temporary Tenant', '08022222222', 'STUDENT', 1, datetime('now'))
    `).run(tempStudentId, 'tenant@student.lautech.edu.ng');

    // Create booking for hostel1
    const booking1Id = 'test-del-booking-001';
    db.prepare(`
      INSERT INTO bookings (id, booking_reference, student_id, provider_id, property_id, room_id, move_in_date, status, rent_amount, total_cost, expires_at, created_at)
      VALUES (?, 'BK-DEL-001', ?, ?, ?, ?, '2026-10-01', 'CONFIRMED', 250000, 250000, '2026-10-05', datetime('now'))
    `).run(booking1Id, tempStudentId, LANDLORD_ID, hostel1Id, room1Id);

    // Create payment child record
    db.prepare(`
      INSERT INTO payments (id, payment_reference, booking_id, student_id, provider_id, property_id, amount, platform_fee, provider_amount, currency, status, payment_provider, created_at)
      VALUES ('test-del-pay-001', 'REF-DEL-001', ?, ?, ?, ?, 250000, 12500, 237500, 'NGN', 'SUCCESS', 'PAYSTACK', datetime('now'))
    `).run(booking1Id, tempStudentId, LANDLORD_ID, hostel1Id);

    // Create inspection request for hostel2
    db.prepare(`
      INSERT INTO inspection_requests (id, student_id, property_id, inspection_type, preferred_date, preferred_time, status, created_at)
      VALUES (?, ?, ?, 'PHYSICAL', '2026-09-20', '14:00', 'PENDING', datetime('now'))
    `).run('test-del-insp-001', tempStudentId, hostel2Id);

    // Create notification for landlord
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, created_at)
      VALUES (?, ?, 'New Booking', 'You have a new booking', 'BOOKING_UPDATE', datetime('now'))
    `).run('test-del-notif-001', LANDLORD_ID);

    assert(fs.existsSync(testImagePath), 'Local physical image file created in uploads/');
    assert(fs.existsSync(testVideoPath), 'Local physical video file created in uploads/');

    // =========================================================================
    // SECTION 2: VERIFY PRE-DELETION SUMMARY ACCURACY
    // =========================================================================
    console.log('\n--- TEST SECTION 2: PRE-DELETION AUDIT SUMMARY ACCURACY ---');
    const landlordSummary = userDeletionService.getUserDeletionSummary(LANDLORD_ID);
    assert(landlordSummary.userId === LANDLORD_ID, 'Summary matches landlord user ID');
    assert(landlordSummary.role === 'PROVIDER', 'Summary correctly identifies role as PROVIDER');
    assert(landlordSummary.hostelsCount === 2, `Accurate hostels count: expected 2, got ${landlordSummary.hostelsCount}`);
    assert(landlordSummary.roomsCount === 2, `Accurate rooms count: expected 2, got ${landlordSummary.roomsCount}`);
    assert(landlordSummary.mediaCount === 2, `Accurate media count: expected 2, got ${landlordSummary.mediaCount}`);
    assert(landlordSummary.imagesCount === 1, `Accurate images count: expected 1, got ${landlordSummary.imagesCount}`);
    assert(landlordSummary.videosCount === 1, `Accurate videos count: expected 1, got ${landlordSummary.videosCount}`);
    assert(landlordSummary.bookingsCount === 1, `Accurate bookings count: expected 1, got ${landlordSummary.bookingsCount}`);
    assert(landlordSummary.inspectionsCount === 1, `Accurate inspections count: expected 1, got ${landlordSummary.inspectionsCount}`);
    assert(landlordSummary.notificationsCount === 1, `Accurate notifications count: expected 1, got ${landlordSummary.notificationsCount}`);

    // =========================================================================
    // SECTION 3: EXECUTE PERMANENT LANDLORD DELETION
    // =========================================================================
    console.log('\n--- TEST SECTION 3: EXECUTE PERMANENT LANDLORD DELETION ---');
    const delResult = userDeletionService.deleteUserPermanently(LANDLORD_ID, ADMIN_ID, 'Automated Test Landlord Cleanup');
    assert(delResult.success === true, 'Deletion returned success: true');
    assert(delResult.deletedRole === 'PROVIDER', 'Deletion result confirmed deleted role is PROVIDER');
    assert(delResult.deletedHostelsCount === 2, 'Reported 2 hostels deleted');

    // Verify Landlord records are gone from DB
    const landlordRow = db.prepare('SELECT * FROM users WHERE id = ?').get(LANDLORD_ID);
    assert(landlordRow === undefined, 'Landlord user record completely deleted from users table');

    // Verify Hostels are gone from DB
    const hostelsRemaining = db.prepare('SELECT COUNT(*) as count FROM properties WHERE provider_id = ?').get(LANDLORD_ID) as any;
    assert(hostelsRemaining.count === 0, 'Zero hostels remaining for deleted landlord');

    // Verify Rooms are gone
    const roomsRemaining = db.prepare('SELECT COUNT(*) as count FROM rooms WHERE id IN (?, ?)').get(room1Id, room2Id) as any;
    assert(roomsRemaining.count === 0, 'Rooms owned by landlord hostels completely deleted');

    // Verify Property Media is gone from DB
    const mediaRemaining = db.prepare('SELECT COUNT(*) as count FROM property_media WHERE id IN (?, ?)').get('test-media-img-001', 'test-media-vid-001') as any;
    assert(mediaRemaining.count === 0, 'Property media rows completely deleted');

    // Verify Physical Files are deleted from uploads/
    assert(!fs.existsSync(testImagePath), 'Local physical image was deleted from uploads/ directory');
    assert(!fs.existsSync(testVideoPath), 'Local physical video was deleted from uploads/ directory');

    // Verify Bookings for those hostels are cleaned up
    const bookingsRemaining = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE id = ?').get(booking1Id) as any;
    assert(bookingsRemaining.count === 0, 'Bookings associated with landlord hostels deleted cleanly');

    // Verify Audit Log was recorded
    const auditLog = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE actor_id = ? AND action = 'PERMANENT_DELETE_LANDLORD_ACCOUNT' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(ADMIN_ID, LANDLORD_ID) as any;
    assert(auditLog !== undefined, 'Critical security audit log entry written for Landlord deletion');

    // Clean up temporary student
    db.prepare('DELETE FROM users WHERE id = ?').run(tempStudentId);

    // =========================================================================
    // SECTION 4: SEED STUDENT & TEST STUDENT PERMANENT DELETION
    // =========================================================================
    console.log('\n--- TEST SECTION 4: SEED STUDENT & TEST PERMANENT STUDENT DELETION ---');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES (?, ?, 'hashedpass', 'Segun Student Tester', '08099999999', 'STUDENT', 1, datetime('now'))
    `).run(STUDENT_ID, 'segun@student.lautech.edu.ng');

    // Student creates booking for the PRESERVED landlord's hostel
    const studentBookingId = 'test-student-booking-001';
    db.prepare(`
      INSERT INTO bookings (id, booking_reference, student_id, provider_id, property_id, room_id, move_in_date, status, rent_amount, total_cost, expires_at, created_at)
      VALUES (?, 'BK-STU-001', ?, ?, ?, ?, '2026-10-10', 'PENDING', 200000, 200000, '2026-10-15', datetime('now'))
    `).run(studentBookingId, STUDENT_ID, PRESERVED_LANDLORD_ID, preservedHostelId, preservedRoomId);

    // Student creates inspection request
    const studentInspId = 'test-student-insp-001';
    db.prepare(`
      INSERT INTO inspection_requests (id, student_id, property_id, inspection_type, preferred_date, preferred_time, status, created_at)
      VALUES (?, ?, ?, 'PHYSICAL', '2026-09-25', '10:00', 'PENDING', datetime('now'))
    `).run(studentInspId, STUDENT_ID, preservedHostelId);

    // Student saves hostel
    db.prepare(`
      INSERT INTO saved_properties (id, user_id, property_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run('test-saved-001', STUDENT_ID, preservedHostelId);

    // Student notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, created_at)
      VALUES (?, ?, 'Tour Confirmed', 'Tour confirmed', 'INSPECTION_UPDATE', datetime('now'))
    `).run('test-student-notif-001', STUDENT_ID);

    // Student Pre-deletion summary
    const studentSummary = userDeletionService.getUserDeletionSummary(STUDENT_ID);
    assert(studentSummary.role === 'STUDENT', 'Summary confirms role is STUDENT');
    assert(studentSummary.hostelsCount === 0, 'Summary shows 0 hostels for student');
    assert(studentSummary.bookingsCount === 1, 'Summary shows 1 student booking');
    assert(studentSummary.inspectionsCount === 1, 'Summary shows 1 student inspection request');

    // Execute Student Deletion
    const studentDelResult = userDeletionService.deleteUserPermanently(STUDENT_ID, ADMIN_ID, 'Automated Test Student Cleanup');
    assert(studentDelResult.success === true, 'Student deletion returned success: true');
    assert(studentDelResult.deletedRole === 'STUDENT', 'Student deletion result confirmed role is STUDENT');
    assert(studentDelResult.deletedHostelsCount === 0, 'Zero hostels deleted during student deletion');

    // Verify Student records are gone from DB
    const studentRow = db.prepare('SELECT * FROM users WHERE id = ?').get(STUDENT_ID);
    assert(studentRow === undefined, 'Student user record completely deleted from users table');

    const studentBookingRemaining = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE id = ?').get(studentBookingId) as any;
    assert(studentBookingRemaining.count === 0, 'Student booking record cleanly removed');

    const studentSavedRemaining = db.prepare('SELECT COUNT(*) as count FROM saved_properties WHERE user_id = ?').get(STUDENT_ID) as any;
    assert(studentSavedRemaining.count === 0, 'Student saved properties cleanly removed');

    // CRITICAL: VERIFY PRESERVED LANDLORD AND HOSTEL REMAIN 100% INTACT
    const preservedLandlordRow = db.prepare('SELECT * FROM users WHERE id = ?').get(PRESERVED_LANDLORD_ID);
    assert(preservedLandlordRow !== undefined, 'CRITICAL: Preserved landlord was NOT deleted or corrupted');

    const preservedHostelRow = db.prepare('SELECT * FROM properties WHERE id = ?').get(preservedHostelId);
    assert(preservedHostelRow !== undefined, 'CRITICAL: Preserved landlord hostel remains 100% INTACT in the database');

    // Verify Student Audit Log was recorded
    const studentAuditLog = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE actor_id = ? AND action = 'PERMANENT_DELETE_STUDENT_ACCOUNT' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(ADMIN_ID, STUDENT_ID) as any;
    assert(studentAuditLog !== undefined, 'Security audit log entry written for Student deletion');

    // =========================================================================
    // SECTION 5: SECURITY ENFORCEMENT & SELF-DELETION PREVENTION
    // =========================================================================
    console.log('\n--- TEST SECTION 5: SECURITY ENFORCEMENT & SELF-DELETION PREVENTION ---');
    let selfDeleteBlocked = false;
    try {
      userDeletionService.deleteUserPermanently(ADMIN_ID, ADMIN_ID, 'Attempt self-deletion');
    } catch (err: any) {
      if (err.message.includes('Administrators cannot delete their own account')) {
        selfDeleteBlocked = true;
      }
    }
    assert(selfDeleteBlocked, 'Admin self-deletion strictly blocked with security error');

    // Non-existent user deletion check
    let nonExistentBlocked = false;
    try {
      userDeletionService.deleteUserPermanently('non-existent-uuid-999', ADMIN_ID);
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('does not exist')) {
        nonExistentBlocked = true;
      }
    }
    assert(nonExistentBlocked, 'Deleting non-existent user rejected safely');

    console.log('\n====================================================================');
    console.log(`🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} assertions succeeded!`);
    console.log('====================================================================\n');
  } finally {
    // Final cleanup of test records
    cleanupTestIds();
    try {
      db.prepare('DELETE FROM rooms WHERE id = ?').run(preservedRoomId);
      db.prepare('DELETE FROM properties WHERE id = ?').run(preservedHostelId);
    } catch {}
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
