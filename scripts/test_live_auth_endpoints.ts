import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/hostel_ease.db');
const BASE_URL = 'http://localhost:5000/api/auth';

console.log('====================================================');
console.log('HOSTEL EASE — LIVE HTTP AUTH API INTEGRATION TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${detail ? `: ${detail}` : ''}`);
    failed++;
  }
}

async function runLiveTests() {
  const db = new Database(DB_PATH);

  try {
    // 1. Health check
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthData = await healthRes.json() as any;
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Server health check returns 200 OK');

    // 2. Register with invalid email
    console.log('\n--- 1. INVALID EMAIL REJECTION ---');
    const invalidEmailRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-address',
        password: 'Password123!',
        fullName: 'Invalid Email User',
        role: 'STUDENT',
        phone: '08012345678'
      })
    });
    const invalidEmailData = await invalidEmailRes.json() as any;
    assert(invalidEmailRes.status === 400, 'Rejects malformed email with 400 Bad Request', invalidEmailData.message);

    // 3. Register with duplicate email
    console.log('\n--- 2. DUPLICATE EMAIL PREVENTION ---');
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '  STUDENT@LAUTECH.EDU.NG  ',
        password: 'Password123!',
        fullName: 'Duplicate User',
        role: 'STUDENT',
        phone: '08012345678'
      })
    });
    const dupData = await dupRes.json() as any;
    assert(dupRes.status === 409, 'Returns 409 Conflict when email is already registered', dupData.message);
    assert(dupData.message && dupData.message.includes('already registered'), 'Provides user-friendly guidance to log in or use Forgot Password');

    // 4. Cross-role duplicate registration prevention
    console.log('\n--- 3. CROSS-ROLE DUPLICATE PREVENTION ---');
    const crossRoleRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@lautech.edu.ng',
        password: 'Password123!',
        fullName: 'Agent Impersonator',
        role: 'PROVIDER',
        phone: '08012345678',
        businessName: 'Fake Realty'
      })
    });
    assert(crossRoleRes.status === 409, 'Blocks student email from registering as agent (409 Conflict)');

    // 5. Successful Student Registration (Verification Required)
    console.log('\n--- 4. SIMPLIFIED STUDENT REGISTRATION & OTP DISPATCH ---');
    const testStudentEmail = `real.student.${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'SecurePassword123!',
        fullName: 'Ayomide Adeyemi',
        role: 'STUDENT',
        phone: '08098765432',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      })
    });
    const regData = await regRes.json() as any;
    assert(regRes.status === 200, 'Student registration accepted without matricNo, level, or department');
    assert(regData.verificationRequired === true, 'Response requires email verification with OTP');

    // 6. Resend Cooldown Enforcement
    console.log('\n--- 5. RESEND COOLDOWN ENFORCEMENT ---');
    const cooldownRes = await fetch(`${BASE_URL}/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail })
    });
    const cooldownData = await cooldownRes.json() as any;
    assert(cooldownRes.status === 429, 'Blocks immediate OTP resend with 429 Too Many Requests (60s cooldown)', cooldownData.message);

    // 7. Verification with Invalid Code
    console.log('\n--- 6. VERIFICATION CODE VALIDATION ---');
    const wrongCodeRes = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, code: '000000' })
    });
    assert(wrongCodeRes.status === 400, 'Rejects invalid 6-digit OTP code with 400 Bad Request');

    // 8. Fetch stored OTP from DB and complete email verification
    const pendingVerif = db.prepare('SELECT * FROM email_verifications WHERE email = ?').get(testStudentEmail) as any;
    assert(Boolean(pendingVerif), 'Pending verification record found in SQLite database');

    // In our authRoutes.ts, otp_hash is stored as sha256 of the 6-digit code.
    // Let's brute-check or extract the 6-digit code (since it's a 6-digit number, 000000-999999).
    const crypto = await import('crypto');
    let foundCode = '';
    for (let i = 0; i < 1000000; i++) {
      const codeStr = i.toString().padStart(6, '0');
      const hash = crypto.createHash('sha256').update(codeStr).digest('hex');
      if (hash === pendingVerif.otp_hash) {
        foundCode = codeStr;
        break;
      }
    }
    assert(foundCode.length === 6, `Successfully recovered 6-digit OTP code for test verification`);

    // Verify with recovered valid code
    const validVerifRes = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, code: foundCode })
    });
    const validVerifData = await validVerifRes.json() as any;
    assert(validVerifRes.status === 200, 'Valid OTP verifies email and activates user account');
    assert(Boolean(validVerifData.token), 'Verification response includes active JWT session token');
    assert(validVerifData.user?.emailVerified === true, 'User profile reports emailVerified: true');

    // 9. Login with verified account (Cross-Device Access)
    console.log('\n--- 7. CROSS-DEVICE LOGIN ---');
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: 'SecurePassword123!' })
    });
    const loginData = await loginRes.json() as any;
    assert(loginRes.status === 200, 'Cross-device login succeeds with valid credentials');
    assert(loginData.user?.fullName === 'Ayomide Adeyemi', 'Authenticated user matches registered details');

    // 10. Forgot Password & Recovery Flow
    console.log('\n--- 8. FORGOT PASSWORD & RECOVERY FLOW ---');
    const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail })
    });
    const forgotData = await forgotRes.json() as any;
    assert(forgotRes.status === 200, 'Forgot password request succeeds');

    // Find the password reset record in DB
    const resetRecord = db.prepare('SELECT * FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1').get(testStudentEmail) as any;
    assert(Boolean(resetRecord), 'Password reset record created in database');

    let foundResetCode = '';
    for (let i = 0; i < 1000000; i++) {
      const codeStr = i.toString().padStart(6, '0');
      const hash = crypto.createHash('sha256').update(codeStr).digest('hex');
      if (hash === resetRecord.otp_code_hash) {
        foundResetCode = codeStr;
        break;
      }
    }
    assert(foundResetCode.length === 6, 'Successfully recovered 6-digit password reset code');

    // Reset password with recovered code
    const resetRes = await fetch(`${BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        code: foundResetCode,
        newPassword: 'SuperUpdatedPassword2026!'
      })
    });
    const resetData = await resetRes.json() as any;
    assert(resetRes.status === 200, 'Password reset succeeded with 6-digit code');

    // Old password must fail
    const oldLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: 'SecurePassword123!' })
    });
    assert(oldLoginRes.status === 401, 'Old password fails authentication after password reset (401 Unauthorized)');

    // New password must succeed
    const newLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: 'SuperUpdatedPassword2026!' })
    });
    assert(newLoginRes.status === 200, 'New password successfully authenticates user');

    // Clean up test account
    db.prepare('DELETE FROM password_resets WHERE email = ?').run(testStudentEmail);
    db.prepare('DELETE FROM student_profiles WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(testStudentEmail);
    db.prepare('DELETE FROM users WHERE email = ?').run(testStudentEmail);

    console.log('\n====================================================');
    console.log(`LIVE HTTP TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Error running live tests:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

runLiveTests();
