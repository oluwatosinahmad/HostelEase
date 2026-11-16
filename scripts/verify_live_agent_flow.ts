/**
 * VERIFY LIVE AGENT REGISTRATION & AUTHENTICATION ON NETLIFY & CLOUD WORKER
 */

const NETLIFY_URL = 'https://hostele.netlify.app';
const DIRECT_API = 'https://hostelease.oluwatosinahmad.workers.dev/api';

async function runLiveVerification() {
  console.log('\n===============================================================');
  console.log('🚀 LIVE HOSTELEASE AGENT REGISTRATION & AUTHENTICATION AUDIT');
  console.log(`Target Frontend: ${NETLIFY_URL}`);
  console.log(`Direct Cloud API: ${DIRECT_API}`);
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

  // 1. Check Netlify site reachable
  console.log('1. Checking Live Netlify Site Availability & SW Version...');
  try {
    const htmlRes = await fetch(NETLIFY_URL, { cache: 'no-store' });
    assert(htmlRes.status === 200, `Netlify index.html returned HTTP 200 (got ${htmlRes.status})`);
    
    const swRes = await fetch(`${NETLIFY_URL}/sw.js`, { cache: 'no-store' });
    const swText = await swRes.text();
    const hasV11 = swText.includes('hostel-ease-pwa-v11-live');
    console.log(`     Service Worker Cache: ${hasV11 ? 'v11-live (DEPLOYED)' : 'Deploying / Previous version'}`);
  } catch (err: any) {
    assert(false, `Netlify availability check failed: ${err.message}`);
  }

  // 2. Direct Cloudflare Health Check
  console.log('\n2. Checking Direct Cloudflare Worker Health...');
  try {
    const healthRes = await fetch(`${DIRECT_API}/health`);
    const healthData = await healthRes.json() as any;
    assert(healthRes.status === 200 && healthData.status === 'ok', `Direct API /health returned HTTP 200 ok (db: ${healthData.db})`);
  } catch (err: any) {
    assert(false, `Direct API health check failed: ${err.message}`);
  }

  // 3. Test Agent Registration via Direct API (and Netlify proxy if ready)
  console.log('\n3. Testing Agent Registration Flow...');
  const testAgentEmail = `live_agent_${Date.now()}@test.ng`;
  const testAgentPassword = 'Password123!';
  const testAgentName = 'Oluwatosin Properties';
  let agentToken = '';

  try {
    // Attempt registration
    const regPayload = {
      email: testAgentEmail,
      password: testAgentPassword,
      fullName: testAgentName,
      phone: '+2348039876543',
      role: 'PROVIDER',
      providerDetails: {
        businessName: 'Oluwatosin Prime Lodges'
      }
    };

    const regRes = await fetch(`${DIRECT_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });

    const regData = await regRes.json() as any;
    assert(regRes.status === 201, `Agent registration returned HTTP 201 Created (got ${regRes.status})`);
    assert(Boolean(regData.token), `Agent registration response contains JWT token`);
    assert(regData.user?.role === 'PROVIDER', `Agent role correctly mapped to PROVIDER (got ${regData.user?.role})`);
    assert(regData.user?.providerDetails?.businessName === 'Oluwatosin Prime Lodges', `Agent provider details saved properly`);
    agentToken = regData.token;
  } catch (err: any) {
    assert(false, `Agent registration failed: ${err.message}`);
  }

  // 4. Test Immediate Agent Login
  console.log('\n4. Testing Immediate Agent Login with Created Credentials...');
  try {
    const loginRes = await fetch(`${DIRECT_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAgentEmail,
        password: testAgentPassword
      })
    });
    const loginData = await loginRes.json() as any;
    assert(loginRes.status === 200, `Agent login returned HTTP 200 (got ${loginRes.status})`);
    assert(loginData.user?.role === 'PROVIDER', `Logged in user role is PROVIDER (got ${loginData.user?.role})`);
    assert(Boolean(loginData.token), `Agent login returned new valid token`);
  } catch (err: any) {
    assert(false, `Agent login failed: ${err.message}`);
  }

  // 5. Test Duplicate Agent Registration Protection (409 Conflict)
  console.log('\n5. Testing Duplicate Email Protection...');
  try {
    const dupRes = await fetch(`${DIRECT_API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAgentEmail,
        password: testAgentPassword,
        fullName: 'Duplicate Agent',
        role: 'PROVIDER'
      })
    });
    assert(dupRes.status === 409, `Duplicate registration correctly rejected with HTTP 409 (got ${dupRes.status})`);
  } catch (err: any) {
    assert(false, `Duplicate check failed: ${err.message}`);
  }

  // 6. Test Existing Admin and Student Authentication Remains Intact
  console.log('\n6. Verifying Existing Student & Admin Authentication...');
  try {
    // Admin login
    const adminRes = await fetch(`${DIRECT_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hostelease.ng',
        password: 'Admin123!'
      })
    });
    const adminData = await adminRes.json() as any;
    assert(adminRes.status === 200, `Admin login returned HTTP 200 OK`);
    assert(adminData.user?.role === 'ADMIN', `Admin user role verified as ADMIN`);

    // Student login
    const studentRes = await fetch(`${DIRECT_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@lautech.edu.ng',
        password: 'Student123!'
      })
    });
    const studentData = await studentRes.json() as any;
    assert(studentRes.status === 200, `Student login returned HTTP 200 OK`);
    assert(studentData.user?.role === 'STUDENT', `Student user role verified as STUDENT`);
  } catch (err: any) {
    assert(false, `Admin/Student verification failed: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveVerification();
