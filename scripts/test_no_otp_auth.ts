import db from '../server/db.js';
import bcrypt from 'bcryptjs';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Hostel Ease OTP Removal & Immediate Auth Verification Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || '');
      failed++;
    }
  }

  // 1. Verify Existing Data Preservation
  const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
  const propertyCount = (db.prepare('SELECT count(*) as count FROM properties').get() as any).count;
  const bookingCount = (db.prepare('SELECT count(*) as count FROM bookings').get() as any).count;
  
  assert(userCount >= 180, `Data preservation: Total users count is ${userCount} (expected >= 180)`);
  assert(propertyCount >= 85, `Data preservation: Total properties count is ${propertyCount} (expected >= 85)`);
  assert(bookingCount >= 18, `Data preservation: Total bookings count is ${bookingCount} (expected >= 18)`);

  // 2. Verify all existing users are email-verified
  const unverifiedCount = (db.prepare('SELECT count(*) as count FROM users WHERE email_verified = 0').get() as any).count;
  assert(unverifiedCount === 0, `All existing users are verified: ${unverifiedCount} unverified users remain`);

  // 3. Test Immediate Student Registration (No OTP, Immediate Token & Session)
  const testStudentEmail = `student.test.${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  const testFullName = 'Ayodeji Balogun';
  const testPhone = '08023456789';

  console.log(`\nTesting student registration for: ${testStudentEmail}...`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: testFullName,
      email: testStudentEmail,
      password: testPassword,
      phone: testPhone,
      role: 'STUDENT'
    })
  });

  const regData = await regRes.json();
  assert(regRes.status === 201, `Student registration HTTP 201 Created (got ${regRes.status})`);
  assert(Boolean(regData.token), 'Valid session token immediately returned on registration');
  assert(regData.user?.role === 'STUDENT', 'User role correctly assigned as STUDENT');
  assert(regData.user?.emailVerified === true || regData.user?.emailVerified === 1, 'User email_verified is active immediately');

  // Verify DB record
  const dbUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testStudentEmail) as any;
  assert(Boolean(dbUser), 'User record persisted in database');
  assert(dbUser?.email_verified === 1, 'Database email_verified column is set to 1');
  
  const studentProfile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(dbUser.id) as any;
  assert(Boolean(studentProfile), 'Student profile created and linked to user ID');

  // 4. Test Student Login (Email & Password, immediate authentication)
  console.log('\nTesting login with registered credentials...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: testPassword,
      role: 'STUDENT'
    })
  });

  const loginData = await loginRes.json();
  assert(loginRes.status === 200, `Student login HTTP 200 OK (got ${loginRes.status})`);
  assert(Boolean(loginData.token), 'Login returns valid authentication token');
  assert(loginData.user?.email === testStudentEmail, 'Login user object matches registered email');

  // 5. Test Duplicate Registration Prevention (Returns 409 Conflict)
  console.log('\nTesting duplicate registration prevention...');
  const dupRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Duplicate User',
      email: testStudentEmail,
      password: 'AnotherPassword123!',
      role: 'STUDENT'
    })
  });
  assert(dupRes.status === 409, `Duplicate registration rejected with HTTP 409 (got ${dupRes.status})`);

  // 6. Test Password Recovery (Link/Token based, No OTP requirement)
  console.log('\nTesting password recovery without OTP...');
  const forgotRes = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testStudentEmail })
  });
  const forgotData = await forgotRes.json();
  assert(forgotRes.status === 200, `Forgot password HTTP 200 OK (got ${forgotRes.status})`);
  assert(forgotData.success === true, 'Forgot password response reports success');

  // Retrieve token from password_resets table
  const resetRecord = db.prepare('SELECT * FROM password_resets WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1').get(testStudentEmail) as any;
  assert(Boolean(resetRecord), 'Password reset record created in database');

  // Test reset password with new password
  const newPassword = 'NewSecretPassword456!';
  // In the real link flow, the raw token is in the email link, which hashes to token_hash.
  // Let's create a known token to test the reset endpoint
  const testResetToken = 'test-token-1234567890abcdef';
  const crypto = await import('crypto');
  const knownHash = crypto.createHash('sha256').update(testResetToken).digest('hex');
  
  db.prepare('UPDATE password_resets SET token_hash = ? WHERE id = ?').run(knownHash, resetRecord.id);

  const resetRes = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      token: testResetToken,
      newPassword
    })
  });

  const resetData = await resetRes.json();
  assert(resetRes.status === 200, `Reset password HTTP 200 OK (got ${resetRes.status})`);
  assert(resetData.success === true, 'Password reset confirmed');

  // Test login with the newly reset password
  const newLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testStudentEmail,
      password: newPassword,
      role: 'STUDENT'
    })
  });
  assert(newLoginRes.status === 200, 'Login with new password succeeded immediately');

  // 7. Cleanup test user
  db.prepare('DELETE FROM password_resets WHERE email = ?').run(testStudentEmail);
  db.prepare('DELETE FROM student_profiles WHERE user_id = ?').run(dbUser.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(dbUser.id);
  console.log('\n🧹 Test user cleaned up.');

  console.log(`\n========================================`);
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
