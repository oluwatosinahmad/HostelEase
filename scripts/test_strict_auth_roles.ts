const BASE_URL = 'http://127.0.0.1:5000/api';

async function runStrictAuthRoleTests() {
  console.log('\n================================================================');
  console.log('🔒 HOSTEL EASE V1 — STRICT LOGIN ROLE SELECTION & SECURITY AUDIT');
  console.log('📍 Focus: Database as Source of Truth & Zero Unauthorized Admin Access');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testStudentEmail = `student_auth_${timestamp}@student.lautech.edu.ng`;
  const testLandlordEmail = `landlord_auth_${timestamp}@hostelease.ng`;
  const testAdminEmail = `admin_auth_${timestamp}@hostelease.lautech.edu.ng`;
  const testPassword = 'Password123!';

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC ADMIN REGISTRATION PREVENTION
    // -------------------------------------------------------------------------
    console.log('--- 1. PUBLIC ADMIN REGISTRATION PREVENTION ---');
    const publicAdminAttempt = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker Admin Attempt',
        email: `hacker_${timestamp}@test.com`,
        password: testPassword,
        role: 'ADMIN'
      })
    });
    assert(
      publicAdminAttempt.status === 403,
      'Public Admin Registration is STRICTLY FORBIDDEN (403 Forbidden)'
    );

    // -------------------------------------------------------------------------
    // 2. LEGITIMATE STUDENT & LANDLORD REGISTRATION
    // -------------------------------------------------------------------------
    console.log('\n--- 2. STUDENT & LANDLORD REGISTRATION ---');
    const studentReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bolanle Olamide',
        email: testStudentEmail,
        password: testPassword,
        role: 'STUDENT',
        phone: '08011223344',
        studentDetails: { department: 'Mechanical Engineering', level: '300L' }
      })
    });
    const studentRegData = await studentReg.json() as any;
    assert(studentReg.status === 201 && studentRegData.user.role === 'STUDENT', 'Student registers successfully with database role STUDENT');

    const landlordReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alhaji Kareem Adeleke',
        email: testLandlordEmail,
        password: testPassword,
        role: 'PROVIDER',
        phone: '08055667788',
        providerDetails: { businessName: 'Adeleke Student Suites Under G' }
      })
    });
    const landlordRegData = await landlordReg.json() as any;
    assert(landlordReg.status === 201 && landlordRegData.user.role === 'PROVIDER', 'Landlord registers successfully with database role PROVIDER');

    // -------------------------------------------------------------------------
    // 3. AUTHORIZED SUPER ADMIN PROVISIONS NEW ADMIN ACCOUNT
    // -------------------------------------------------------------------------
    console.log('\n--- 3. AUTHORIZED ADMIN PROVISIONING ---');
    // Login as default super admin
    const superAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hostelease.ng',
        password: 'Admin123!',
        requestedRole: 'ADMIN'
      })
    });
    const superAdminData = await superAdminLogin.json() as any;
    const superAdminToken = superAdminData.token;
    assert(Boolean(superAdminToken), 'Super Admin authenticates with database role ADMIN');

    // Super Admin creates a new admin account
    const createAdminRes = await fetch(`${BASE_URL}/admin/create-admin-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        fullName: 'Ahmad Platform Manager',
        email: testAdminEmail,
        password: testPassword,
        adminRole: 'ADMIN'
      })
    });
    const createAdminData = await createAdminRes.json() as any;
    assert(createAdminRes.status === 201 && createAdminData?.admin?.role === 'ADMIN', 'Super Admin creates verified Admin account in database');

    // Student attempts to call /api/admin/create-admin-account -> Blocked 403
    const studentUnauthorizedCall = await fetch(`${BASE_URL}/admin/create-admin-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentRegData.token}` },
      body: JSON.stringify({
        fullName: 'Student Fake Admin',
        email: `fake_${timestamp}@test.com`,
        password: testPassword
      })
    });
    assert(studentUnauthorizedCall.status === 403, 'Student cannot call /api/admin/create-admin-account (403 Forbidden)');

    // -------------------------------------------------------------------------
    // 4. STRICT ROLE LOGIN SELECTION MATRIX (9 PERMUTATIONS)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. STRICT ROLE LOGIN SELECTION MATRIX ---');

    // A. Student credentials
    const studStud = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: testPassword, requestedRole: 'STUDENT' })
    });
    assert(studStud.status === 200, 'Student credentials + Student login → ALLOWED ✅');

    const studAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: testPassword, requestedRole: 'ADMIN' })
    });
    const studAdminData = await studAdmin.json() as any;
    assert(
      studAdmin.status === 403 && studAdminData.message.includes('not authorized to access the Admin Portal'),
      'Student credentials + Admin login → DENIED ❌ (403: "This account is not authorized to access the Admin Portal.")'
    );

    const studLand = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testStudentEmail, password: testPassword, requestedRole: 'PROVIDER' })
    });
    assert(studLand.status === 403, 'Student credentials + Landlord login → DENIED ❌ (403 Forbidden)');

    // B. Landlord credentials
    const landLand = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testLandlordEmail, password: testPassword, requestedRole: 'PROVIDER' })
    });
    assert(landLand.status === 200, 'Landlord credentials + Landlord login → ALLOWED ✅');

    const landAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testLandlordEmail, password: testPassword, requestedRole: 'ADMIN' })
    });
    const landAdminData = await landAdmin.json() as any;
    assert(
      landAdmin.status === 403 && landAdminData.message.includes('not authorized to access the Admin Portal'),
      'Landlord credentials + Admin login → DENIED ❌ (403: "This account is not authorized to access the Admin Portal.")'
    );

    const landStud = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testLandlordEmail, password: testPassword, requestedRole: 'STUDENT' })
    });
    assert(landStud.status === 403, 'Landlord credentials + Student login → DENIED ❌ (403 Forbidden)');

    // C. Admin credentials
    const adminAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testPassword, requestedRole: 'ADMIN' })
    });
    assert(adminAdmin.status === 200, 'Admin credentials + Admin login → ALLOWED ✅');

    const adminStud = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testPassword, requestedRole: 'STUDENT' })
    });
    assert(adminStud.status === 403, 'Admin credentials + Student login → DENIED ❌ (403 Forbidden)');

    const adminLand = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testPassword, requestedRole: 'PROVIDER' })
    });
    assert(adminLand.status === 403, 'Admin credentials + Landlord login → DENIED ❌ (403 Forbidden)');

    // -------------------------------------------------------------------------
    // 5. DIRECT ADMIN API PROTECTION WITH ROLE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. DIRECT ADMIN API PROTECTION ---');
    const studentApiCall = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${studentRegData.token}` }
    });
    assert(studentApiCall.status === 403, 'Student token calling GET /api/admin/dashboard → 403 Forbidden');

    const landlordApiCall = await fetch(`${BASE_URL}/admin/revenue/overview`, {
      headers: { Authorization: `Bearer ${landlordRegData.token}` }
    });
    assert(landlordApiCall.status === 403, 'Landlord token calling GET /api/admin/revenue/overview → 403 Forbidden');

    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: testPassword, requestedRole: 'ADMIN' })
    });
    const adminLoginData = await adminLoginRes.json() as any;
    const adminToken = adminLoginData.token;

    const adminDashCall = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDashCall.status === 200, 'Admin token calling GET /api/admin/dashboard → 200 OK');

    const adminRevenueCall = await fetch(`${BASE_URL}/admin/revenue/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminRevenueCall.status === 200, 'Admin token calling GET /api/admin/revenue/overview → 200 OK');

  } catch (err: any) {
    console.error('Audit execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`📊 STRICT AUTH AUDIT SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log('================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 17 STRICT LOGIN ROLE SELECTION AUDITS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error(`⚠️ ${failed} tests failed.`);
    process.exit(1);
  }
}

runStrictAuthRoleTests();
