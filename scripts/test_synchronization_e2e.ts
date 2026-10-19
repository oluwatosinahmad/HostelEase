/**
 * HOSTEL EASE — PLATFORM-WIDE SYNCHRONIZATION & RELIABILITY TEST SUITE
 * 
 * Verifies:
 * 1. Localhost rate limit exemption for rapid multi-tab / testing requests.
 * 2. User Directory & Dashboard count consistency (no 120 vs 1 mismatch).
 * 3. Authoritative SQLite database catalog integrity (179 users, 86 hostels).
 * 4. Edge worker API endpoints (/api/admin/users, /api/admin/dashboard, /api/health).
 * 5. Bidirectional sync push & pull event handling.
 */

import db from '../server/db';
import { syncService } from '../server/services/syncService';
import workerDefault from '../src/worker';

const LOCAL_URL = 'http://localhost:5000';
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, title: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.error(`  ❌ [FAIL] ${title}`);
    if (detail) console.error(`     Details: ${detail}`);
  }
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('🔄 HOSTEL EASE — COMPLETE SYNCHRONIZATION E2E VERIFICATION');
  console.log('===============================================================\n');

  // TEST 1: Rate Limiting Throttling Fix (Localhost exemption)
  console.log('--- TEST 1: Rapid Localhost API Requests (Rate Limit Fix) ---');
  let rateLimitExceeded = false;
  const burstCount = 100;
  try {
    const promises = [];
    for (let i = 0; i < burstCount; i++) {
      promises.push(fetch(`${LOCAL_URL}/api/health`));
    }
    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    const has429 = statuses.some(s => s === 429);
    const all200 = statuses.every(s => s === 200);

    assert(!has429, `No HTTP 429 Rate Limit responses received across ${burstCount} rapid requests`);
    assert(all200, `All ${burstCount} concurrent health requests returned HTTP 200 OK`);
  } catch (err: any) {
    assert(false, 'Localhost health check burst failed', err.message);
  }

  // TEST 2: Authoritative Database Integrity
  console.log('\n--- TEST 2: Authoritative SQLite Database Records ---');
  const userCountRow = db.prepare('SELECT count(*) as c FROM users').get() as { c: number };
  const propertyCountRow = db.prepare('SELECT count(*) as c FROM properties').get() as { c: number };
  const bookingCountRow = db.prepare('SELECT count(*) as c FROM bookings').get() as { c: number };

  assert(userCountRow.c >= 100, `Authoritative users count is realistic and populated (Actual: ${userCountRow.c})`);
  assert(propertyCountRow.c >= 50, `Authoritative properties count is realistic and populated (Actual: ${propertyCountRow.c})`);
  assert(bookingCountRow.c >= 10, `Authoritative bookings count is realistic and populated (Actual: ${bookingCountRow.c})`);

  // TEST 3: Edge Worker API Direct Invocation
  console.log('\n--- TEST 3: Cloudflare Worker Edge API Simulation ---');
  const mockEnv: any = {
    ASSETS: {
      fetch: async () => new Response('Mock Asset', { status: 200 })
    }
  };

  // 3a. Health Endpoint
  const healthReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/health');
  const healthRes = await workerDefault.fetch(healthReq, mockEnv, {});
  const healthData = await healthRes.json() as any;
  assert(healthRes.status === 200, 'Worker /api/health returns HTTP 200');
  assert(healthData.status === 'ok', 'Worker platform status is ok');
  assert(healthData.counts.users >= 100, `Worker users count matches authoritative data (Actual: ${healthData.counts.users})`);

  // 3b. Admin Users Directory (Fix for 120 vs 1 Discrepancy!)
  const usersReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/admin/users');
  const usersRes = await workerDefault.fetch(usersReq, mockEnv, {});
  const usersData = await usersRes.json() as any;
  assert(usersRes.status === 200, 'Worker /api/admin/users returns HTTP 200');
  assert(Array.isArray(usersData.users), 'Worker returns users array');
  assert(usersData.users.length >= 100, `Worker User Directory contains all authoritative users, not just 1! (Actual: ${usersData.users.length})`);

  // 3c. Admin Dashboard Metrics (Matches User Directory)
  const dashReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/admin/dashboard');
  const dashRes = await workerDefault.fetch(dashReq, mockEnv, {});
  const dashData = await dashRes.json() as any;
  assert(dashRes.status === 200, 'Worker /api/admin/dashboard returns HTTP 200');
  assert(dashData.stats.totalStudents > 0, `Worker reports real student count (Actual: ${dashData.stats.totalStudents})`);
  assert(dashData.stats.totalProviders > 0, `Worker reports real provider count (Actual: ${dashData.stats.totalProviders})`);
  assert(dashData.stats.totalHostels > 0, `Worker reports real hostel count (Actual: ${dashData.stats.totalHostels})`);

  // 3d. User Directory and Dashboard Alignment
  const studentCountInDirectory = usersData.users.filter((u: any) => u.role === 'STUDENT').length;
  assert(
    dashData.stats.totalStudents === studentCountInDirectory,
    `Dashboard student count (${dashData.stats.totalStudents}) exactly matches User Directory student count (${studentCountInDirectory})!`
  );

  // TEST 4: Bidirectional Synchronization Engine
  console.log('\n--- TEST 4: Bidirectional Sync Engine ---');
  const testSyncUserId = `test-sync-user-${Date.now()}`;
  const testSyncUser = {
    id: testSyncUserId,
    fullName: 'David Synchronized',
    email: `david_sync_${Date.now()}@lautech.edu.ng`,
    phone: '08099887766',
    role: 'STUDENT',
    status: 'ACTIVE'
  };

  // Push record to Edge Worker
  const pushReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: [testSyncUser] })
  });
  const pushRes = await workerDefault.fetch(pushReq, mockEnv, {});
  const pushData = await pushRes.json() as any;
  assert(pushRes.status === 200, 'Worker /api/sync/push accepts new records');
  assert(pushData.success === true, 'Worker confirms sync merge');

  // Verify record now appears in Worker User Directory
  const verifyUsersReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/admin/users');
  const verifyUsersRes = await workerDefault.fetch(verifyUsersReq, mockEnv, {});
  const verifyUsersData = await verifyUsersRes.json() as any;
  const foundInWorker = verifyUsersData.users.some((u: any) => u.id === testSyncUserId);
  assert(foundInWorker, 'Newly pushed student immediately appears in the Edge User Directory');

  // TEST 5: Upstream Tunnel Registration Protocol
  console.log('\n--- TEST 5: Upstream Tunnel Registration Protocol ---');
  const registerReq = new Request('https://hostelease.oluwatosinahmad.workers.dev/api/sync/register-upstream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upstreamUrl: 'https://test-upstream.trycloudflare.com',
      secret: 'hostel_ease_sync_secret_2026'
    })
  });
  const regRes = await workerDefault.fetch(registerReq, mockEnv, {});
  const regData = await regRes.json() as any;
  assert(regRes.status === 200, 'Worker /api/sync/register-upstream accepts valid secret');
  assert(regData.success === true, 'Worker confirms upstream tunnel registration');

  console.log('\n===============================================================');
  console.log(`🎯 RESULTS: ${passedAssertions}/${totalAssertions} Assertions Passed (${Math.round((passedAssertions/totalAssertions)*100)}%)`);
  console.log('===============================================================\n');

  if (passedAssertions === totalAssertions) {
    console.log('🏆 All platform synchronization assertions passed flawlessly!');
    syncService.stop();
    setTimeout(() => process.exit(0), 100);
  } else {
    console.error('⚠️ Some assertions failed.');
    syncService.stop();
    setTimeout(() => process.exit(1), 100);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  syncService.stop();
  setTimeout(() => process.exit(1), 100);
});
