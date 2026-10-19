import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/hostel_ease.db');
const BASE_URL = 'http://localhost:5000/api/auth';

console.log('================================================================');
console.log('HOSTEL EASE — SUPABASE AUTH & RESEND SMTP INTEGRATION VERIFICATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${title}`);
    passed++;
  } else {
    console.error(`[FAIL] ${title}${detail ? `: ${detail}` : ''}`);
    failed++;
  }
}

async function runVerification() {
  const db = new Database(DB_PATH);

  try {
    // 1. Email Service Status & Diagnostic Endpoint
    console.log('--- TEST 1: EMAIL CONFIGURATION STATUS ENDPOINT ---');
    const statusRes = await fetch(`${BASE_URL}/email-status`);
    const statusData = await statusRes.json() as any;
    assert(statusRes.status === 200, 'GET /api/auth/email-status returns 200 OK');
    assert(typeof statusData.isConfigured === 'boolean', 'Returns boolean configured status flag');
    assert(statusData.activeProvider !== undefined, 'Returns delivery mode (RESEND_API, RESEND_SMTP, or NONE)');
    assert(typeof statusData.hasResendApiKey === 'boolean', 'Diagnostics track RESEND_API_KEY presence');
    assert(typeof statusData.hasSmtpHost === 'boolean', 'Diagnostics track SMTP credentials presence');
    console.log('  -> Status response:', JSON.stringify(statusData, null, 2));

    // 2. Student Sign Up - Field Validation (matricNo, level, department removed)
    console.log('\n--- TEST 2: STUDENT SIGN UP MINIMAL REQUIRED FIELDS ---');
    const uniqueStudentEmail = `verify.student.${Date.now()}@lautech.edu.ng`;
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueStudentEmail,
        password: 'StudentStrongPass2026!',
        fullName: 'Babatunde Fashola',
        phone: '08123456789',
        role: 'STUDENT',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      })
    });
    const regData = await regRes.json() as any;
    assert(regRes.status === 200, 'Student registered successfully without matricNo, level, or department');
    assert(regData.verificationRequired === true, 'Registration immediately requires OTP email verification');
    assert(regData.email.toLowerCase() === uniqueStudentEmail.toLowerCase(), 'Email address is normalized');

    // 3. Retrieve OTP from DB and Verify Account Activation
    console.log('\n--- TEST 3: 6-DIGIT OTP RECOVERY & VERIFICATION ---');
    const verifRecord = db.prepare(`
      SELECT otp_hash FROM email_verifications 
      WHERE email = ? 
      ORDER BY last_sent_at DESC LIMIT 1
    `).get(uniqueStudentEmail.toLowerCase()) as { otp_hash: string } | undefined;

    assert(Boolean(verifRecord && verifRecord.otp_hash), 'Pending verification OTP hash found in database');

    let foundOtpCode = '';
    if (verifRecord) {
      for (let i = 0; i < 1000000; i++) {
        const codeStr = i.toString().padStart(6, '0');
        if (crypto.createHash('sha256').update(codeStr).digest('hex') === verifRecord.otp_hash) {
          foundOtpCode = codeStr;
          break;
        }
      }
    }

    assert(foundOtpCode.length === 6, `Successfully recovered 6-digit OTP code (${foundOtpCode})`);

    // Test invalid code first
    const badVerifyRes = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueStudentEmail,
        code: '000000'
      })
    });
    assert(badVerifyRes.status === 400, 'Rejects incorrect OTP code with 400 Bad Request');

    // Test valid code
    const goodVerifyRes = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueStudentEmail,
        code: foundOtpCode
      })
    });
    const goodVerifyData = await goodVerifyRes.json() as any;
    assert(goodVerifyRes.status === 200, 'Verifies valid OTP with 200 OK');
    assert(goodVerifyData.token !== undefined, 'Returns authenticated JWT session token');
    assert(goodVerifyData.user.emailVerified === true, 'User profile marked as emailVerified: true');

    // 4. Normalized Duplicate Email Prevention (Uppercase, Trimming, and Cross-Role)
    console.log('\n--- TEST 4: ATOMIC DUPLICATE EMAIL PREVENTION ---');
    const duplicateRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `   ${uniqueStudentEmail.toUpperCase()}   `,
        password: 'AnotherPassword123!',
        fullName: 'Imposter Babatunde',
        phone: '08099887766',
        role: 'STUDENT'
      })
    });
    const dupJson = await duplicateRes.json() as any;
    assert(duplicateRes.status === 409, 'Blocks uppercase/padded duplicate email with 409 Conflict');
    assert(dupJson.message.toLowerCase().includes('already registered'), 'Provides clear guidance that email already exists');

    // Cross-role attempt (agent trying to register same email)
    const crossRoleRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueStudentEmail,
        password: 'AgentPassword123!',
        fullName: 'Agent Duplicate',
        phone: '08011223344',
        role: 'PROVIDER',
        businessName: 'LAUTECH Properties'
      })
    });
    assert(crossRoleRes.status === 409, 'Blocks agent registration with existing student email (409 Conflict)');

    // 5. Forgot Password & Recovery Flow
    console.log('\n--- TEST 5: FORGOT PASSWORD 6-DIGIT OTP & PASSWORD RESET ---');
    const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueStudentEmail
      })
    });
    const forgotData = await forgotRes.json() as any;
    assert(forgotRes.status === 200, 'Forgot password triggers recovery email with 200 OK');

    const resetRow = db.prepare(`
      SELECT * FROM password_resets 
      WHERE email = ? 
      ORDER BY created_at DESC LIMIT 1
    `).get(uniqueStudentEmail.toLowerCase()) as { otp_code_hash: string; expires_at: string } | undefined;

    assert(Boolean(resetRow && resetRow.otp_code_hash), 'Password recovery 6-digit OTP hash stored');

    let foundResetCode = '';
    if (resetRow) {
      for (let i = 0; i < 1000000; i++) {
        const codeStr = i.toString().padStart(6, '0');
        if (crypto.createHash('sha256').update(codeStr).digest('hex') === resetRow.otp_code_hash) {
          foundResetCode = codeStr;
          break;
        }
      }
    }

    assert(foundResetCode.length === 6, `Successfully recovered 6-digit reset code (${foundResetCode})`);

    if (foundResetCode) {
      const newPassword = 'BrandNewSecurePassword2026!';
      const resetRes = await fetch(`${BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueStudentEmail,
          code: foundResetCode,
          newPassword
        })
      });
      assert(resetRes.status === 200, 'Password reset succeeded using 6-digit recovery OTP');

      // 6. Login with new password
      console.log('\n--- TEST 6: AUTHENTICATION WITH NEW PASSWORD ---');
      const loginOldRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueStudentEmail,
          password: 'StudentStrongPass2026!'
        })
      });
      assert(loginOldRes.status === 401, 'Old password rejected after password reset (401 Unauthorized)');

      const loginNewRes = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueStudentEmail,
          password: newPassword
        })
      });
      const loginNewData = await loginNewRes.json() as any;
      assert(loginNewRes.status === 200, 'New password successfully logs in user (200 OK)');
      assert(loginNewData.user.email === uniqueStudentEmail.toLowerCase(), 'Authenticated user matches registered email');
      assert(loginNewData.user.role === 'STUDENT', 'User role preserved as STUDENT');
    }

    // 7. Agent Registration with Business Details
    console.log('\n--- TEST 7: AGENT REGISTRATION PRESERVING BUSINESS WORKFLOW ---');
    const uniqueAgentEmail = `verify.agent.${Date.now()}@realestate.ng`;
    const agentRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueAgentEmail,
        password: 'AgentPass2026!',
        fullName: 'Chief Kolawole Balogun',
        phone: '08033445566',
        role: 'PROVIDER',
        businessName: 'Kolawole & Sons Real Estate Under-G'
      })
    });
    const agentData = await agentRes.json() as any;
    assert(agentRes.status === 200, 'Agent registration accepted with businessName');
    assert(agentData.verificationRequired === true, 'Agent registration requires OTP verification');

    console.log('\n================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    if (failed > 0) process.exit(1);

  } catch (error: any) {
    console.error('Test run error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

runVerification();
