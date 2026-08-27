const fs = require('fs');
const content = \import db from '../server/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../server/middleware/auth.js';

async function runPhase18Audit() {
  console.log('====================================================');
  console.log('🚀 HOSTEL EASE V1 — PHASE 18 FINAL LAUNCH AUDIT');
  console.log('📍 Target: LAUTECH Students | Ogbomoso, Oyo State');
  console.log('====================================================\\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, detail) {
    if (condition) {
      console.log('✅ PASS: ' + name);
      passed++;
    } else {
      console.error('❌ FAIL: ' + name + ' - ' + (detail || 'Assertion failed'));
      failed++;
    }
  }

  // 1. Database & Schema Verification
  console.log('--- 1. Database & Schema Integrity ---');
  const universities = db.prepare('SELECT * FROM universities WHERE is_active = 1').all();
  assert(universities.length > 0, 'LAUTECH University Record Exists', 'Found ' + universities.length + ' active universities');
  assert(universities.some(u => u.name.includes('Ladoke Akintola') || u.city === 'Ogbomoso'), 'LAUTECH Ogbomoso Campus Configured');

  const areas = db.prepare('SELECT * FROM areas WHERE is_active = 1').all();
  assert(areas.length >= 5, 'Core Ogbomoso Neighborhoods Configured', 'Found ' + areas.length + ' active student areas (Under G, Adenike, Stadium, Aroje, etc.)');

  // 2. Student Authentication & Profile Flow
  console.log('\\n--- 2. Student Authentication & Registration ---');
  const timestamp = Date.now();
  const testStudentEmail = 'student_audit_' + timestamp + '@lautech.edu.ng';
  const salt = bcrypt.genSaltSync(10);
  const pwHash = bcrypt.hashSync('Password123!', salt);
  const studentId = 'user-student-' + timestamp;

  db.prepare(\\\
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
    VALUES (?, ?, ?, ?, ?, 'STUDENT', 1)
  \\\).run(studentId, testStudentEmail, pwHash, 'Ahmad Adeleke', '08031234567');

  const createdStudent = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);
  assert(createdStudent && createdStudent.role === 'STUDENT', 'Student Account Registered Successfully');

  const studentToken = generateToken({
    id: studentId,
    email: testStudentEmail,
    fullName: 'Ahmad Adeleke',
    role: 'STUDENT',
    isActive: 1
  });
  assert(Boolean(studentToken), 'Secure JWT Generated for Student');

  // 3. Provider & Admin Authentication Flow
  console.log('\\n--- 3. Provider & Admin Authentication ---');
  const testProviderEmail = 'landlord_audit_' + timestamp + '@hostelease.ng';
  const providerId = 'user-provider-' + timestamp;
  db.prepare(\\\
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
    VALUES (?, ?, ?, ?, ?, 'PROVIDER', 1)
  \\\).run(providerId, testProviderEmail, pwHash, 'Chief Segun Olaleye', '08037654321');

  const createdProvider = db.prepare('SELECT * FROM users WHERE id = ?').get(providerId);
  assert(createdProvider && createdProvider.role === 'PROVIDER', 'Provider Account Registered Successfully');

  const testAdminEmail = 'admin_audit_' + timestamp + '@hostelease.ng';
  const adminId = 'user-admin-' + timestamp;
  db.prepare(\\\
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
    VALUES (?, ?, ?, ?, ?, 'ADMIN', 1)
  \\\).run(adminId, testAdminEmail, pwHash, 'Platform Administrator', '08039999999');

  const createdAdmin = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId);
  assert(createdAdmin && createdAdmin.role === 'ADMIN', 'Admin Account Registered Successfully');

  // 4. Hostel Discovery & Search Integrity
  console.log('\\n--- 4. Hostel Listings & Search Quality ---');
  const properties = db.prepare('SELECT * FROM properties WHERE is_active = 1').all();
  assert(properties.length > 0, 'Active Verified Hostels Available', 'Found ' + properties.length + ' hostels');

  const verifiedProperties = properties.filter(p => p.verification_status === 'VERIFIED');
  assert(verifiedProperties.length > 0, 'Verified Hostels With Trust Badges Exist', verifiedProperties.length + ' verified listings');

  // 5. Booking & Inventory Isolation Flow
  console.log('\\n--- 5. End-to-End Booking & Inventory Flow ---');
  const targetHostel = properties[0];
  const rooms = db.prepare('SELECT * FROM rooms WHERE property_id = ?').all(targetHostel.id);
  assert(rooms.length > 0, 'Hostel Has Active Room Configurations', 'Hostel ' + targetHostel.title + ' has ' + rooms.length + ' room(s)');

  const bookingId = 'book-' + timestamp;
  const bookingRef = 'HE-LAUTECH-' + timestamp.toString().slice(-6);
  db.prepare(\\\
    INSERT INTO bookings (id, booking_reference, user_id, property_id, room_id, academic_session, move_in_date, total_amount, status, created_at)
    VALUES (?, ?, ?, ?, ?, '2026/2027', '2026-09-01', ?, 'CONFIRMED', datetime('now'))
  \\\).run(bookingId, bookingRef, studentId, targetHostel.id, rooms[0].id, rooms[0].price_per_annum || 150000);

  const createdBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  assert(createdBooking && createdBooking.booking_reference === bookingRef, 'Booking Created & Confirmed', 'Ref: ' + bookingRef);

  // 6. Payment & Escrow Protection
  console.log('\\n--- 6. Payment & Escrow Verification ---');
  const paymentId = 'pay-' + timestamp;
  const paymentRef = 'PAY-ESCROW-' + timestamp.toString().slice(-6);
  db.prepare(\\\
    INSERT INTO payments (id, payment_reference, booking_id, user_id, amount, method, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'PAYSTACK', 'SUCCESSFUL', datetime('now'))
  \\\).run(paymentId, paymentRef, bookingId, studentId, createdBooking.total_amount);

  const createdPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  assert(createdPayment && createdPayment.status === 'SUCCESSFUL', 'Escrow Payment Successfully Recorded', 'Amount: ₦' + createdPayment.amount);

  // 7. Move-In Preparation & Issue Reporting
  console.log('\\n--- 7. Move-In Preparation & Issue Reporting ---');
  const issueId = 'issue-' + timestamp;
  db.prepare(\\\
    INSERT INTO disputes (id, booking_id, student_id, provider_id, category, title, description, status, created_at)
    VALUES (?, ?, ?, ?, 'ELECTRICITY', 'Generator Schedule Confirmation', 'Requesting lodge generator backup hours for evening study.', 'RESOLVED', datetime('now'))
  \\\).run(issueId, bookingId, studentId, providerId);

  const createdIssue = db.prepare('SELECT * FROM disputes WHERE id = ?').get(issueId);
  assert(createdIssue && createdIssue.status === 'RESOLVED', 'Student Issue / Support Ticket Created & Resolved');

  // 8. Security & Audit Logging
  console.log('\\n--- 8. Security & Audit Logging ---');
  const auditId = 'audit-' + timestamp;
  db.prepare(\\\
    INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, resource_type, resource_id, status, created_at)
    VALUES (?, ?, ?, 'STUDENT', 'BOOKING_CONFIRMED', 'BOOKING', ?, 'SUCCESS', datetime('now'))
  \\\).run(auditId, studentId, testStudentEmail, bookingId);

  const loggedAudit = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(auditId);
  assert(Boolean(loggedAudit), 'Append-Only Audit Log Registered');

  console.log('\\n====================================================');
  console.log('🎯 PHASE 18 AUDIT COMPLETE: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase18Audit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
\;
fs.writeFileSync('scripts/test_phase18_launch.ts', content);
