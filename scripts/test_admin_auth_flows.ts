import worker from '../src/worker';

async function runTests() {
  console.log('🔒 ========================================================');
  console.log('🔒 TESTING HOSTELEASE ADMIN & MULTI-ROLE AUTHENTICATION');
  console.log('🔒 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  const mockEnv: any = {
    ASSETS: {
      fetch: async () => new Response('Mock Asset', { status: 200 })
    }
  };
  const mockCtx: any = { waitUntil: () => {}, passThroughOnException: () => {} };

  async function testLogin(body: any, expectedStatus: number, expectedRole?: string | null) {
    const req = new Request('https://hostelease.workers.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === expectedStatus, `Login (${JSON.stringify(body.username || body.email)}) returns HTTP ${expectedStatus}`);
    if (expectedRole) {
      assert(data?.user?.role === expectedRole, `User role is ${expectedRole} (got ${data?.user?.role})`);
    }
    return data;
  }

  // 1. Admin login with username 'admin' and 'Admin123!'
  const a1 = await testLogin({ username: 'admin', password: 'Admin123!', requestedRole: 'ADMIN' }, 200, 'ADMIN');
  assert(Boolean(a1.token), 'Admin token returned');

  // 2. Admin login with username 'admin' and 'admin123'
  const a2 = await testLogin({ username: 'admin', password: 'admin123' }, 200, 'ADMIN');
  assert(Boolean(a2.token), 'Admin token returned for admin123');

  // 3. Admin login with email 'admin@hostelease.ng'
  const a3 = await testLogin({ email: 'admin@hostelease.ng', password: 'Admin123!' }, 200, 'ADMIN');
  assert(Boolean(a3.token), 'Admin token returned for admin@hostelease.ng');

  // 4. Admin login with email 'master.admin@hostelease.ng'
  const a4 = await testLogin({ email: 'master.admin@hostelease.ng', password: 'Admin123!' }, 200, 'ADMIN');
  assert(Boolean(a4.token), 'Admin token returned for master.admin');

  // 5. Test Bearer Token parsing on /api/auth/me
  {
    const meReq = new Request('https://hostelease.workers.dev/api/auth/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${a1.token}` }
    });
    const meRes = await worker.fetch(meReq, mockEnv, mockCtx);
    const meData = await meRes.json() as any;
    assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returns HTTP 200');
    assert(meData?.user?.email === 'admin@hostelease.ng', 'User matches admin email');
    assert(meData?.user?.role === 'ADMIN', 'User role is ADMIN');
  }

  // 6. Test Admin Dashboard access with Bearer Token
  {
    const dashReq = new Request('https://hostelease.workers.dev/api/admin/dashboard', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${a1.token}` }
    });
    const dashRes = await worker.fetch(dashReq, mockEnv, mockCtx);
    const dashData = await dashRes.json() as any;
    assert(dashRes.status === 200, 'GET /api/admin/dashboard returns HTTP 200');
    assert(dashData?.admin?.email === 'admin@hostelease.ng', 'Dashboard reports correct admin email');
    assert(dashData?.stats?.totalStudents >= 100, `Dashboard stats have students (found ${dashData?.stats?.totalStudents})`);
  }

  // 7. Student login
  await testLogin({ email: 'student@lautech.edu.ng', password: 'Student123!' }, 200, 'STUDENT');

  // 8. Agent / Landlord login
  await testLogin({ email: 'landlord@hostelease.ng', password: 'Agent123!' }, 200, 'PROVIDER');

  // 9. Student trying to access Admin Portal (requestedRole: 'ADMIN')
  await testLogin({ email: 'student@lautech.edu.ng', password: 'Student123!', requestedRole: 'ADMIN' }, 403, null);

  // 10. Invalid password
  await testLogin({ email: 'admin@hostelease.ng', password: 'WrongPassword999!' }, 401, null);

  console.log('\n========================================================');
  console.log(`🏁 AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
