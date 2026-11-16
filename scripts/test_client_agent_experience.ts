/**
 * Comprehensive Browser-Environment Verification for Agent Registration & Multi-Role Auth
 */

// Setup mock browser DOM and localStorage environment BEFORE module loads
const storageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storageStore[k] || null,
  setItem: (k: string, v: string) => { storageStore[k] = String(v); },
  removeItem: (k: string) => { delete storageStore[k]; },
  clear: () => { for (const k in storageStore) delete storageStore[k]; }
};

(global as any).window = {
  location: {
    hostname: 'hostele.netlify.app',
    href: 'https://hostele.netlify.app',
    origin: 'https://hostele.netlify.app'
  },
  localStorage: mockLocalStorage,
  sessionStorage: mockLocalStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};
(global as any).localStorage = mockLocalStorage;
(global as any).sessionStorage = mockLocalStorage;

async function runTest() {
  const { api, API_BASE, DIRECT_CLOUD_API } = await import('../src/services/api');

  console.log('\n===============================================================');
  console.log('🧪 VERIFYING CLIENT-SIDE AGENT REGISTRATION & PORTAL ACCESS');
  console.log(`Detected API Base on Netlify: ${API_BASE}`);
  console.log(`Direct Cloud API: ${DIRECT_CLOUD_API}`);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Verify API_BASE correctly routed directly to Cloudflare Worker on Netlify
  assert(API_BASE === 'https://hostelease.oluwatosinahmad.workers.dev/api', 'API_BASE directly points to Cloudflare Edge API on Netlify');

  // 2. Perform Agent Registration through api.auth.register
  const uniqueAgentEmail = `agent_prod_${Date.now()}@test.ng`;
  console.log(`\nTesting registration with email: ${uniqueAgentEmail}`);
  
  try {
    const regResult = await api.auth.register({
      fullName: 'Chief Adeleke Properties',
      email: uniqueAgentEmail,
      phone: '+2348039998888',
      password: 'SecurePassword123!',
      role: 'PROVIDER',
      providerDetails: {
        businessName: 'Adeleke Royal Suites Ogbomoso'
      }
    });

    assert(Boolean(regResult.token), 'Registration returned session token');
    assert(regResult.user?.role === 'PROVIDER', `User role is PROVIDER (got ${regResult.user?.role})`);
    assert(regResult.user?.email === uniqueAgentEmail, 'User email matches registered email');
    assert(regResult.user?.providerDetails?.businessName === 'Adeleke Royal Suites Ogbomoso', 'Provider business name saved');

    // Check localStorage persistence
    const savedToken = mockLocalStorage.getItem('hostel_ease_token');
    const savedUser = JSON.parse(mockLocalStorage.getItem('hostel_ease_user') || '{}');
    assert(Boolean(savedToken), 'Token stored in localStorage');
    assert(savedUser.role === 'PROVIDER', 'User role stored in localStorage');

    // 3. Test Agent Login with Registered Account
    console.log('\nTesting login with newly registered Agent...');
    const loginResult = await api.auth.login({
      email: uniqueAgentEmail,
      password: 'SecurePassword123!',
      requestedRole: 'PROVIDER'
    });

    assert(Boolean(loginResult.token), 'Agent login returned valid auth token');
    assert(loginResult.user?.role === 'PROVIDER', 'Logged in user role confirmed as PROVIDER');

    // 4. Test Student Login
    console.log('\nTesting existing Student Login...');
    const studentLogin = await api.auth.login({
      email: 'student@lautech.edu.ng',
      password: 'Student123!'
    });
    assert(studentLogin.user?.role === 'STUDENT', 'Existing Student login returned HTTP 200 with role STUDENT');

    // 5. Test Admin Login
    console.log('\nTesting existing Admin Login...');
    const adminLogin = await api.auth.login({
      email: 'admin@hostelease.ng',
      password: 'Admin123!',
      requestedRole: 'ADMIN'
    });
    assert(adminLogin.user?.role === 'ADMIN', 'Admin login returned HTTP 200 with role ADMIN');

    // 6. Test Public Properties & Areas API
    console.log('\nTesting Property & Area Queries via API Base...');
    const propertiesRes = await api.properties.search({});
    assert(Boolean(propertiesRes && Array.isArray(propertiesRes.properties) && propertiesRes.properties.length > 0), `Properties loaded successfully (${propertiesRes.properties.length} hostels)`);

    const areasRes = await api.areas.getAll();
    assert(Boolean(areasRes && Array.isArray(areasRes.areas) && areasRes.areas.length > 0), `Areas loaded successfully (${areasRes.areas.length} campus zones)`);

  } catch (err: any) {
    console.error('Fatal error in test:', err);
    assert(false, `Unexpected failure: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(`🏁 TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runTest();
