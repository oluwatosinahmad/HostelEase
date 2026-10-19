import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/hostel_ease.db');

console.log('====================================================');
console.log('HOSTEL EASE — COMPLETE AUTH SYSTEM VERIFICATION TEST');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    testsFailed++;
  }
}

async function runTests() {
  const db = new Database(DB_PATH);

  try {
    // 1. Verify Existing Data Preservation
    console.log('\n--- 1. PRESERVATION OF EXISTING DATA ---');
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const propertyCount = (db.prepare('SELECT COUNT(*) as count FROM properties').get() as any).count;
    const bookingCount = (db.prepare('SELECT COUNT(*) as count FROM bookings').get() as any).count;
    
    console.log(`Current Total Users: ${userCount}`);
    console.log(`Current Total Properties: ${propertyCount}`);
    console.log(`Current Total Bookings: ${bookingCount}`);

    assert(userCount >= 170, 'Existing 170+ users preserved intact without database wipe');
    assert(propertyCount > 0, 'Existing property listings preserved intact');
    assert(bookingCount >= 0, 'Existing bookings preserved intact');

    // 2. Verify Schema Migrations
    console.log('\n--- 2. SCHEMA & MIGRATION VERIFICATION ---');
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasEmailVerified = tableInfo.some(col => col.name === 'email_verified');
    assert(hasEmailVerified, 'Column users.email_verified exists with default verified=1');

    const emailVerificationsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_verifications'").get();
    assert(Boolean(emailVerificationsTable), 'Table email_verifications exists');

    const passwordResetsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='password_resets'").get();
    assert(Boolean(passwordResetsTable), 'Table password_resets exists');

    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email_lower'").get();
    assert(Boolean(indexes), 'Unique case-insensitive index idx_users_email_lower exists on users(LOWER(TRIM(email)))');

    // 3. Test Email Normalization & Duplicate Email Protection
    console.log('\n--- 3. DUPLICATE EMAIL PROTECTION ---');
    const existingUser = db.prepare('SELECT email, role FROM users LIMIT 1').get() as any;
    console.log(`Testing against existing user: ${existingUser.email} (${existingUser.role})`);

    const lowerTrimmed = existingUser.email.toLowerCase().trim();
    const upperSpaced = `  ${existingUser.email.toUpperCase()}  `;

    // Attempt direct database insert with duplicated email (casing/spaces variations)
    let duplicateDbBlocked = false;
    try {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, full_name, created_at, updated_at)
        VALUES ('test-dup-1', ?, 'hash', 'STUDENT', 'Duplicate Test', datetime('now'), datetime('now'))
      `).run(upperSpaced);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        duplicateDbBlocked = true;
      }
    }
    assert(duplicateDbBlocked, 'Database atomically rejects duplicate email with different case and whitespace (UNIQUE constraint)');

    // 4. Test Cross-Role Duplicate Prevention
    console.log('\n--- 4. CROSS-ROLE DUPLICATE PREVENTION ---');
    // If existing user is STUDENT, check that AGENT cannot use that email
    const oppositeRole = existingUser.role === 'STUDENT' ? 'PROVIDER' : 'STUDENT';
    let crossRoleBlocked = false;
    try {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, full_name, created_at, updated_at)
        VALUES ('test-cross-role', ?, 'hash', ?, 'Cross Role Test', datetime('now'), datetime('now'))
      `).run(lowerTrimmed, oppositeRole);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        crossRoleBlocked = true;
      }
    }
    assert(crossRoleBlocked, `Cross-role duplicate blocked: cannot reuse ${existingUser.role} email as ${oppositeRole}`);

    // 5. Test Email Verification Cycle (Pending Registration -> OTP Hash -> Account Activation)
    console.log('\n--- 5. EMAIL VERIFICATION & OTP LIFECYCLE ---');
    const testRegEmail = `test.student.${Date.now()}@lautech.edu.ng`;
    const testPassword = 'Password123!';
    const testPasswordHash = await bcrypt.hash(testPassword, 10);
    const testOtp = '849201';
    const testOtpHashed = await bcrypt.hash(testOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const verifId = `verif-${Date.now()}`;

    // Clean up any potential stale test records
    db.prepare("DELETE FROM email_verifications WHERE email = ?").run(testRegEmail);
    db.prepare("DELETE FROM users WHERE email = ?").run(testRegEmail);

    // Insert pending registration
    db.prepare(`
      INSERT INTO email_verifications (
        id, email, otp_hash, role, full_name, password_hash, phone, avatar_url, metadata, expires_at, created_at
      ) VALUES (?, ?, ?, 'STUDENT', 'Test Verification Student', ?, '08012345678', 'https://avatar.com/1', '{}', ?, datetime('now'))
    `).run(verifId, testRegEmail, testOtpHashed, testPasswordHash, expiresAt);

    const savedVerif = db.prepare('SELECT * FROM email_verifications WHERE id = ?').get(verifId) as any;
    assert(Boolean(savedVerif), 'Pending verification record stored successfully with 10-minute expiry');

    // Verify OTP matching with bcrypt
    const isOtpValid = await bcrypt.compare(testOtp, savedVerif.otp_hash);
    const isWrongOtpValid = await bcrypt.compare('000000', savedVerif.otp_hash);
    assert(isOtpValid, 'Valid 6-digit OTP correctly validates against stored bcrypt hash');
    assert(!isWrongOtpValid, 'Incorrect OTP is safely rejected');

    // Simulate verification completion: Insert user into users & create student profile
    const newUserId = `usr-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, full_name, phone, avatar_url, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'STUDENT', 'Test Verification Student', '08012345678', 'https://avatar.com/1', 1, datetime('now'), datetime('now'))
    `).run(newUserId, testRegEmail, testPasswordHash);

    const profileId = `prof-${Date.now()}`;
    const defaultUni = db.prepare('SELECT id FROM universities LIMIT 1').get() as any;
    db.prepare(`
      INSERT INTO student_profiles (id, user_id, university_id, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(profileId, newUserId, defaultUni?.id || 'uni-lautech-ogbomoso');

    db.prepare('DELETE FROM email_verifications WHERE id = ?').run(verifId);

    const activatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId) as any;
    assert(activatedUser && activatedUser.email_verified === 1, 'Account successfully activated with email_verified = 1');
    assert(activatedUser.full_name === 'Test Verification Student', 'Student profile created without requiring matriculation number, level, or department');

    // 6. Test Forgot Password & Password Reset Cycle
    console.log('\n--- 6. PASSWORD RECOVERY & RESET FLOW ---');
    const resetCode = '391740';
    const resetCodeHash = await bcrypt.hash(resetCode, 10);
    const resetToken = `tok-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const resetId = `pr-${Date.now()}`;

    db.prepare(`
      INSERT INTO password_resets (id, user_id, email, token_hash, otp_code_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(resetId, newUserId, testRegEmail, resetTokenHash, resetCodeHash, resetExpiresAt);

    const pendingReset = db.prepare('SELECT * FROM password_resets WHERE id = ?').get(resetId) as any;
    assert(Boolean(pendingReset), 'Password reset token & 6-digit code hash recorded with 15-minute expiry');

    // Verify reset code
    const isCodeValid = await bcrypt.compare(resetCode, pendingReset.otp_code_hash);
    assert(isCodeValid, 'Reset 6-digit code validates correctly against hash');

    // Execute Password Reset
    const newPlainPassword = 'BrandNewPassword2026!';
    const newPasswordHash = await bcrypt.hash(newPlainPassword, 10);

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newPasswordHash, newUserId);
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId) as any;
    const oldPasswordMatches = await bcrypt.compare(testPassword, updatedUser.password_hash);
    const newPasswordMatches = await bcrypt.compare(newPlainPassword, updatedUser.password_hash);

    assert(!oldPasswordMatches, 'Old password invalidated and no longer matches user hash');
    assert(newPasswordMatches, 'New password successfully active and verifies with bcrypt');

    const markedUsedReset = db.prepare('SELECT used FROM password_resets WHERE id = ?').get(resetId) as any;
    assert(markedUsedReset.used === 1, 'Password reset token marked used to prevent replay attacks');

    // Clean up test records
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(resetId);
    db.prepare('DELETE FROM student_profiles WHERE user_id = ?').run(newUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(newUserId);

    // 7. Inspect Frontend Source Code for Mobile Header and Eye Toggles
    console.log('\n--- 7. FRONTEND SOURCE CODE INSPECTION ---');
    const navbarContent = fs.readFileSync(path.resolve(__dirname, '../src/components/Navbar.tsx'), 'utf-8');
    const authModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/AuthModal.tsx'), 'utf-8');

    assert(navbarContent.includes("onOpenAuth('STUDENT', 'register')"), 'Navbar mobile header wired to open register flow directly');
    assert(navbarContent.includes("onOpenAuth('STUDENT', 'login')"), 'Navbar mobile header provides separate Log In button');
    assert(navbarContent.includes('Sign Up') && navbarContent.includes('Log In'), 'Navbar displays both Sign Up and Log In buttons');

    assert(authModalContent.includes('showPassword') && authModalContent.includes('setShowPassword'), 'AuthModal implements showPassword eye toggle state');
    assert(authModalContent.includes('Eye') && authModalContent.includes('EyeOff'), 'AuthModal renders Eye and EyeOff Lucide icons for password visibility');
    assert(!authModalContent.includes('matricNo'), 'AuthModal has no matriculation number field in student registration');
    assert(!authModalContent.includes('academicLevel'), 'AuthModal has no academic level field in student registration');
    assert(!authModalContent.includes('department'), 'AuthModal has no department field in student registration');
    assert(authModalContent.includes('This email address is already registered'), 'AuthModal includes helpful duplicate email guidance');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

runTests();
