import { configureSingleOwner } from './setup_single_owner.js';

const BASE_URL = 'http://localhost:3000/api';

async function runSingleOwnerSecurityAudit() {
  console.log('\n===============================================================');
  console.log('🔒 HOSTEL EASE V1 — SINGLE OWNER ADMIN SECURITY AUDIT');
  console.log('📍 10-Point Verification: Exactly ONE Owner Admin Allowed');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      failed++;
    }
  }

  // 0. Ensure single owner setup in DB
  const ownerEmail = 'admin@hostelease.ng';
  const ownerPassword = 'Admin123!';
  configureSingleOwner({ name: 'Oluwatosin Ahmad', email: ownerEmail, password: ownerPassword });

  // Prepare test users
  const studentEmail = `student.audit.${Date.now()}@lautech.edu.ng`;
  const studentPassword = 'Student123!';
  const landlordEmail = `landlord.audit.${Date.now()}@hostelease.ng`;
  const landlordPassword = 'Landlord123!';

  // Register student
  const studentRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      fullName: 'Audit Student User',
      role: 'STUDENT'
    })
  });
  const studentRegData = await studentRegRes.json();
  const studentToken = studentRegData.token;

  // Register landlord
  const landlordRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: landlordEmail,
      password: landlordPassword,
      fullName: 'Audit Landlord User',
      role: 'PROVIDER'
    })
  });
  const landlordRegData = await landlordRegRes.json();
  const landlordToken = landlordRegData.token;

  // =========================================================================
  // TEST 1: Correct Owner email + correct password → ADMIN ACCESS ✅
  // =========================================================================
  console.log('\n--- 1. AUTHORIZED OWNER AUTHENTICATION ---');
  const ownerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: ownerPassword,
      requestedRole: 'ADMIN'
    })
  });
  const ownerLoginData = await ownerLoginRes.json();
  assert(
    ownerLoginRes.status === 200 && ownerLoginData.user?.role === 'ADMIN' && !!ownerLoginData.token,
    'Correct Owner email + correct password → ADMIN ACCESS GRANTED ✅'
  );
  const ownerToken = ownerLoginData.token;

  // =========================================================================
  // TEST 2: Correct Owner email + wrong password → DENIED ❌
  // =========================================================================
  console.log('\n--- 2. OWNER WRONG PASSWORD PROTECTION ---');
  const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: 'WrongPassword999!',
      requestedRole: 'ADMIN'
    })
  });
  assert(
    wrongPassRes.status === 401,
    'Correct Owner email + wrong password → DENIED ❌ (401 Unauthorized)'
  );

  // =========================================================================
  // TEST 3: Student email + student password + Admin selected → DENIED ❌
  // =========================================================================
  console.log('\n--- 3. STUDENT ADMIN SELECTION ATTEMPT ---');
  const studentAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentEmail,
      password: studentPassword,
      requestedRole: 'ADMIN'
    })
  });
  const studentAdminData = await studentAdminRes.json();
  assert(
    studentAdminRes.status === 403 &&
    (studentAdminData.code === 'UNAUTHORIZED_ADMIN_ACCESS' || studentAdminData.error?.includes('not authorized')),
    'Student credentials + Admin selected → ACCESS RESTRICTED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 4: Landlord email + landlord password + Admin selected → DENIED ❌
  // =========================================================================
  console.log('\n--- 4. LANDLORD ADMIN SELECTION ATTEMPT ---');
  const landlordAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: landlordEmail,
      password: landlordPassword,
      requestedRole: 'ADMIN'
    })
  });
  const landlordAdminData = await landlordAdminRes.json();
  assert(
    landlordAdminRes.status === 403 &&
    (landlordAdminData.code === 'UNAUTHORIZED_ADMIN_ACCESS' || landlordAdminData.error?.includes('not authorized')),
    'Landlord credentials + Admin selected → ACCESS RESTRICTED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 5: Random non-existent email + password + Admin selected → DENIED ❌
  // =========================================================================
  console.log('\n--- 5. RANDOM CREDENTIALS ADMIN ATTEMPT ---');
  const randomAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `stranger.${Date.now()}@gmail.com`,
      password: 'SomeRandomPassword!',
      requestedRole: 'ADMIN'
    })
  });
  assert(
    randomAdminRes.status === 401 || randomAdminRes.status === 403,
    'Random non-existent account + Admin selected → DENIED ❌'
  );

  // =========================================================================
  // TEST 6: Student manually accessing Admin Dashboard / Route → DENIED ❌
  // =========================================================================
  console.log('\n--- 6. DIRECT ADMIN DASHBOARD PROTECTION ---');
  const studentDashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    studentDashRes.status === 403,
    'Student token accessing GET /api/admin/dashboard → DENIED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 7: Landlord manually accessing Admin Dashboard / Route → DENIED ❌
  // =========================================================================
  console.log('\n--- 7. LANDLORD DIRECT ADMIN DASHBOARD PROTECTION ---');
  const landlordDashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${landlordToken}` }
  });
  assert(
    landlordDashRes.status === 403,
    'Landlord token accessing GET /api/admin/dashboard → DENIED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 8: Student attempting Admin Revenue API → DENIED ❌
  // =========================================================================
  console.log('\n--- 8. DIRECT ADMIN REVENUE API PROTECTION (STUDENT) ---');
  const studentRevenueRes = await fetch(`${BASE_URL}/admin/revenue/overview`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    studentRevenueRes.status === 403,
    'Student token accessing GET /api/admin/revenue/overview → DENIED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 9: Landlord attempting Admin Revenue API → DENIED ❌
  // =========================================================================
  console.log('\n--- 9. DIRECT ADMIN REVENUE API PROTECTION (LANDLORD) ---');
  const landlordRevenueRes = await fetch(`${BASE_URL}/admin/revenue/overview`, {
    headers: { Authorization: `Bearer ${landlordToken}` }
  });
  assert(
    landlordRevenueRes.status === 403,
    'Landlord token accessing GET /api/admin/revenue/overview → DENIED ❌ (403 Forbidden)'
  );

  // =========================================================================
  // TEST 10: Attempting to create or register another Admin → NOT AVAILABLE / 403 ❌
  // =========================================================================
  console.log('\n--- 10. NO PUBLIC OR SECONDARY ADMIN CREATION ---');
  // Attempt 10a: Public registration as ADMIN
  const publicAdminRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `rogue.admin.${Date.now()}@gmail.com`,
      password: 'Password123!',
      fullName: 'Rogue Admin',
      role: 'ADMIN'
    })
  });
  assert(
    publicAdminRegRes.status === 403,
    'Public registration with role ADMIN → STRICTLY FORBIDDEN ❌ (403 Forbidden)'
  );

  // Attempt 10b: Calling /api/admin/create-admin-account
  const createAdminApiRes = await fetch(`${BASE_URL}/admin/create-admin-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`
    },
    body: JSON.stringify({
      email: `second.admin.${Date.now()}@hostelease.ng`,
      password: 'Password123!',
      fullName: 'Second Admin'
    })
  });
  assert(
    createAdminApiRes.status === 404 || createAdminApiRes.status === 403,
    'POST /api/admin/create-admin-account endpoint → NOT FOUND / NOT AVAILABLE ❌ (404/403)'
  );

  console.log('\n===============================================================');
  console.log(`📊 SINGLE OWNER AUDIT SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    console.error(`❌ Audit finished with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('🎉 ALL 10 SINGLE OWNER ADMIN SECURITY AUDITS PASSED WITH 100% SUCCESS!');
  }
}

runSingleOwnerSecurityAudit().catch(err => {
  console.error('Fatal error during single owner audit:', err);
  process.exit(1);
});
