/**
 * HOSTEL EASE — APEX LEVEL PLATFORM VERIFICATION TEST SUITE
 * 
 * Verifies:
 * 1. Windowed Carousel Pagination (1, 5, 10, 50, 1000 items - strictly capped to 5-7 visual indicators)
 * 2. Cross-Device Saved Hostels Sync (Authoritative DB Source of Truth, Device 1 <-> Device 2)
 * 3. Notification System DB Integrity (Unread count accuracy, idempotent welcome, single mark-read, mark-all-read)
 * 4. Agent Hostel Deletion & Cross-Agent Ownership Validation (403 on foreign deletion)
 * 5. Agent Save Draft Isolation (strictly DRAFT, never exposed on student public homepage)
 */

import { strict as assert } from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function post(endpoint: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function get(endpoint: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function patch(endpoint: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function del(endpoint: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Windowing calculation function under test
function computeWindow(totalItems: number, currentIndex: number, maxVisible: number = 5): number[] {
  if (totalItems <= 1) return [];
  const windowSize = Math.min(Math.max(3, maxVisible), 7, totalItems);
  const halfWindow = Math.floor(windowSize / 2);

  let startIndex = currentIndex - halfWindow;
  if (startIndex < 0) {
    startIndex = 0;
  } else if (startIndex + windowSize > totalItems) {
    startIndex = Math.max(0, totalItems - windowSize);
  }

  const visibleIndices: number[] = [];
  for (let i = 0; i < windowSize; i++) {
    visibleIndices.push(startIndex + i);
  }
  return visibleIndices;
}

async function runApexPlatformTests() {
  console.log('================================================================');
  console.log('🚀 HOSTEL EASE APEX-LEVEL PLATFORM VERIFICATION TEST RUNNER');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.then(() => {
          console.log(`  ✅ [PASS] ${name}`);
          passed++;
        }).catch(err => {
          console.error(`  ❌ [FAIL] ${name}:`, err.message);
          throw err;
        });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // SUITE 1: Windowed Carousel Pagination Rule
  // ---------------------------------------------------------------------------
  console.log('--- SUITE 1: Windowed Carousel Pagination & Sliding Window ---');

  test('Pagination: 0 or 1 item yields 0 indicators (no clutter)', () => {
    assert.deepEqual(computeWindow(0, 0, 5), []);
    assert.deepEqual(computeWindow(1, 0, 5), []);
  });

  test('Pagination: 5 items yields exactly 5 indicators [0, 1, 2, 3, 4]', () => {
    const w = computeWindow(5, 2, 5);
    assert.equal(w.length, 5);
    assert.deepEqual(w, [0, 1, 2, 3, 4]);
  });

  test('Pagination: 10 items strictly caps to 5 indicators (never 10 dots)', () => {
    const wStart = computeWindow(10, 0, 5);
    assert.equal(wStart.length, 5);
    assert.deepEqual(wStart, [0, 1, 2, 3, 4]);

    const wMid = computeWindow(10, 5, 5);
    assert.equal(wMid.length, 5);
    assert.deepEqual(wMid, [3, 4, 5, 6, 7]); // centered on 5

    const wEnd = computeWindow(10, 9, 5);
    assert.equal(wEnd.length, 5);
    assert.deepEqual(wEnd, [5, 6, 7, 8, 9]); // pinned to end
  });

  test('Pagination: 50 items strictly caps to 5 indicators (sliding window centers active)', () => {
    const w25 = computeWindow(50, 25, 5);
    assert.equal(w25.length, 5);
    assert.deepEqual(w25, [23, 24, 25, 26, 27]);
  });

  test('Pagination: 1000 items strictly caps to 5-7 indicators (never exceeds 7)', () => {
    const w1000 = computeWindow(1000, 500, 5);
    assert.equal(w1000.length, 5);
    assert.ok(w1000.length <= 7);
    assert.deepEqual(w1000, [498, 499, 500, 501, 502]);

    const w7Max = computeWindow(1000, 500, 7);
    assert.equal(w7Max.length, 7);
    assert.deepEqual(w7Max, [497, 498, 499, 500, 501, 502, 503]);
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Cross-Device Account Data & Saved Hostels / Shortlist
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Cross-Device Saved Hostels Sync & Database Truth ---');

  const ts = Date.now();
  const studentEmail = `student.apex.${ts}@lautech.edu.ng`;
  const studentEmailB = `student.other.${ts}@lautech.edu.ng`;

  let studentTokenA: string = '';
  let studentIdA: string = '';
  let studentTokenB: string = '';
  let studentIdB: string = '';

  await test('Register Student A for cross-device testing', async () => {
    const reg = await post('/auth/register', {
      email: studentEmail,
      password: 'ApexPassword123!',
      fullName: 'Aisha Alabi',
      role: 'STUDENT',
      phone: '08023456789'
    });
    assert.equal(reg.status, 201);
    studentTokenA = reg.data.token;
    studentIdA = reg.data.user.id;
    assert.ok(studentTokenA);
    assert.ok(studentIdA);
  });

  await test('Register Student B for user isolation verification', async () => {
    const reg = await post('/auth/register', {
      email: studentEmailB,
      password: 'ApexPassword123!',
      fullName: 'Chinedu Eze',
      role: 'STUDENT',
      phone: '08034567890'
    });
    assert.equal(reg.status, 201);
    studentTokenB = reg.data.token;
    studentIdB = reg.data.user.id;
    assert.ok(studentTokenB);
    assert.ok(studentIdB);
  });

  // Fetch available hostel properties to save
  let testPropId1 = '';
  let testPropId2 = '';
  await test('Query properties to obtain target hostels for testing', async () => {
    const res = await get('/properties');
    assert.equal(res.status, 200);
    assert.ok(res.data.properties && res.data.properties.length >= 2);
    testPropId1 = res.data.properties[0].id;
    testPropId2 = res.data.properties[1].id;
    assert.ok(testPropId1);
    assert.ok(testPropId2);
  });

  await test('Device 1 (Student A) saves Hostel 1 -> Database persists saved relationship', async () => {
    const saveRes = await post(`/properties/${testPropId1}/save`, {}, studentTokenA);
    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.data.isSaved, true);
  });

  await test('Device 2 (Student A) queries saved hostels -> Immediately shows Hostel 1', async () => {
    // Simulating Device 2 querying backend with same account token
    const savedRes = await get('/saved-properties', studentTokenA);
    assert.equal(savedRes.status, 200);
    assert.ok(Array.isArray(savedRes.data.savedProperties));
    const savedIds = savedRes.data.savedProperties.map((p: any) => p.id);
    assert.ok(savedIds.includes(testPropId1));
  });

  await test('Device 2 (Student A) saves Hostel 2 -> Device 1 immediately shows both [Hostel 1, Hostel 2]', async () => {
    const saveRes = await post(`/properties/${testPropId2}/save`, {}, studentTokenA);
    assert.equal(saveRes.status, 200);

    // Device 1 fetches saved properties from backend
    const savedResDevice1 = await get('/saved-properties', studentTokenA);
    assert.equal(savedResDevice1.status, 200);
    const savedIds = savedResDevice1.data.savedProperties.map((p: any) => p.id);
    assert.ok(savedIds.includes(testPropId1));
    assert.ok(savedIds.includes(testPropId2));
  });

  await test('Device 1 (Student A) unsaves Hostel 1 -> Device 2 immediately shows ONLY Hostel 2', async () => {
    const unsaveRes = await del(`/properties/${testPropId1}/save`, studentTokenA);
    assert.equal(unsaveRes.status, 200);
    assert.equal(unsaveRes.data.isSaved, false);

    // Device 2 fetches saved properties from backend
    const savedResDevice2 = await get('/saved-properties', studentTokenA);
    assert.equal(savedResDevice2.status, 200);
    const savedIds = savedResDevice2.data.savedProperties.map((p: any) => p.id);
    assert.ok(!savedIds.includes(testPropId1), 'Hostel 1 must be removed');
    assert.ok(savedIds.includes(testPropId2), 'Hostel 2 must still be present');
  });

  await test('User Isolation: Student B saved list is completely isolated from Student A', async () => {
    const savedResB = await get('/saved-properties', studentTokenB);
    assert.equal(savedResB.status, 200);
    const savedIdsB = savedResB.data.savedProperties.map((p: any) => p.id);
    assert.ok(!savedIdsB.includes(testPropId2), "Student B must NOT see Student A's saved hostels");
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Notification System (Database Source of Truth & Unread Count)
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Unified Notification System & Unread Counts ---');

  await test('Signup automatically generated idempotent welcome notification in DB', async () => {
    const notifsRes = await get('/notifications', studentTokenA);
    assert.equal(notifsRes.status, 200);
    assert.ok(Array.isArray(notifsRes.data.notifications));
    const welcome = notifsRes.data.notifications.find((n: any) => n.type === 'WELCOME');
    assert.ok(welcome, 'Student should have a WELCOME notification created upon signup');
    assert.ok(notifsRes.data.unreadCount >= 1);
  });

  await test('Subsequent login within 6h deduplicates welcome notifications (idempotent)', async () => {
    // Re-login Student A
    const loginRes = await post('/auth/login', {
      email: studentEmail,
      password: 'ApexPassword123!'
    });
    assert.equal(loginRes.status, 200);

    // Wait a brief moment for any background setImmediate execution
    await new Promise(r => setTimeout(r, 100));

    const notifsRes = await get('/notifications', studentTokenA);
    assert.equal(notifsRes.status, 200);
    const welcomeCount = notifsRes.data.notifications.filter((n: any) => n.type === 'WELCOME').length;
    assert.equal(welcomeCount, 1, 'Rapid login must not spam multiple welcome notifications');
  });

  let notifToMark = '';
  await test('GET /notifications/unread-count matches DB count exactly', async () => {
    const unreadRes = await get('/notifications/unread-count', studentTokenA);
    assert.equal(unreadRes.status, 200);
    const notifsRes = await get('/notifications', studentTokenA);
    assert.equal(unreadRes.data.unreadCount, notifsRes.data.unreadCount);

    const firstUnread = notifsRes.data.notifications.find((n: any) => !n.isRead);
    assert.ok(firstUnread);
    notifToMark = firstUnread.id;
  });

  await test('Mark single notification read updates DB and decrements count by exactly 1', async () => {
    const initialUnread = (await get('/notifications/unread-count', studentTokenA)).data.unreadCount;
    
    // Mark one notification as read
    const markRes = await patch(`/notifications/${notifToMark}/read`, {}, studentTokenA);
    assert.equal(markRes.status, 200);
    assert.equal(markRes.data.success, true);
    assert.equal(markRes.data.unreadCount, initialUnread - 1);

    // Re-verify from separate GET unread-count endpoint
    const afterUnread = (await get('/notifications/unread-count', studentTokenA)).data.unreadCount;
    assert.equal(afterUnread, initialUnread - 1);
  });

  await test('Mark all notifications read sets unreadCount to 0 in DB and persists across refresh', async () => {
    // Add two test notifications to ensure unreadCount > 0
    await post('/notifications', { title: 'Test 1', message: 'Inspection confirmed', type: 'INSPECTION' }, studentTokenA);
    await post('/notifications', { title: 'Test 2', message: 'Booking verified', type: 'BOOKING' }, studentTokenA);

    const midCount = (await get('/notifications/unread-count', studentTokenA)).data.unreadCount;
    assert.ok(midCount >= 2);

    // Mark all as read
    const markAll = await patch('/notifications/read-all', {}, studentTokenA);
    assert.equal(markAll.status, 200);
    assert.equal(markAll.data.unreadCount, 0);

    // Verify unread count is strictly 0 in DB
    const finalUnread = (await get('/notifications/unread-count', studentTokenA)).data.unreadCount;
    assert.equal(finalUnread, 0);

    // Verify notifications list confirms isRead = true on all items
    const listRes = await get('/notifications', studentTokenA);
    assert.equal(listRes.data.unreadCount, 0);
    for (const n of listRes.data.notifications) {
      assert.equal(n.isRead, true);
      assert.ok(n.readAt !== null, 'readAt timestamp must be recorded in DB');
    }
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Agent Hostel Deletion & Ownership Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Agent Hostel Deletion & Ownership Validation ---');

  const agentEmail1 = `agent.alpha.${ts}@hostelease.ng`;
  const agentEmail2 = `agent.beta.${ts}@hostelease.ng`;

  let agentToken1 = '';
  let agentId1 = '';
  let agentToken2 = '';
  let agentId2 = '';

  await test('Register Agent 1 and Agent 2', async () => {
    const a1 = await post('/auth/register', {
      email: agentEmail1,
      password: 'ApexPassword123!',
      fullName: 'Agent Alpha Adeleke',
      role: 'PROVIDER',
      phone: '08099887766'
    });
    assert.equal(a1.status, 201);
    agentToken1 = a1.data.token;
    agentId1 = a1.data.user.id;

    const a2 = await post('/auth/register', {
      email: agentEmail2,
      password: 'ApexPassword123!',
      fullName: 'Agent Beta Balogun',
      role: 'PROVIDER',
      phone: '08088776655'
    });
    assert.equal(a2.status, 201);
    agentToken2 = a2.data.token;
    agentId2 = a2.data.user.id;
  });

  let createdHostelId = '';
  await test('Agent 1 creates a new hostel listing', async () => {
    const createRes = await post('/provider/properties', {
      title: `Apex Alpha Lodge ${ts}`,
      address: `10 Adenike Street, LAUTECH ${ts}`,
      propertyType: 'SELF_CONTAIN',
      distanceFromCampusKm: 0.8,
      pricing: { rentAmount: 220000, serviceCharge: 15000 },
      isDraft: false
    }, agentToken1);

    assert.equal(createRes.status, 201);
    createdHostelId = createRes.data.propertyId;
    assert.ok(createdHostelId);
  });

  await test('Security: Agent 2 CANNOT delete Agent 1 hostel (Strict 403 Forbidden)', async () => {
    const badDelete = await del(`/provider/properties/${createdHostelId}`, agentToken2);
    assert.equal(badDelete.status, 403, 'Foreign agent deletion must return HTTP 403');
  });

  await test('Agent 1 successfully deletes own hostel (Cascade DB Deletion)', async () => {
    const goodDelete = await del(`/provider/properties/${createdHostelId}`, agentToken1);
    assert.equal(goodDelete.status, 200);

    // Verify property is permanently deleted from database
    const verifyDel = await get(`/properties/${createdHostelId}`);
    assert.equal(verifyDel.status, 404, 'Deleted hostel must not exist in properties table');
  });

  // ---------------------------------------------------------------------------
  // SUITE 5: Agent Save Draft Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Agent Save Draft Isolation ---');

  let draftHostelId = '';
  await test('Agent 1 saves a hostel as DRAFT (isDraft: true)', async () => {
    const draftRes = await post('/provider/properties', {
      title: `Apex Draft Sanctuary ${ts}`,
      address: `25 Aroje Road, LAUTECH ${ts}`,
      propertyType: 'SINGLE_ROOM',
      distanceFromCampusKm: 1.2,
      pricing: { rentAmount: 140000 },
      isDraft: true
    }, agentToken1);

    assert.equal(draftRes.status, 201);
    assert.equal(draftRes.data.message, 'Listing draft saved successfully');
    draftHostelId = draftRes.data.propertyId;
    assert.ok(draftHostelId);
  });

  await test('Public Student Search NEVER returns draft hostels (Privacy & Safety)', async () => {
    const publicRes = await get('/properties');
    assert.equal(publicRes.status, 200);
    const publicIds = publicRes.data.properties.map((p: any) => p.id);
    assert.ok(!publicIds.includes(draftHostelId), 'Draft hostel must never appear on public student listing');
  });

  await test('Agent Dashboard shows draft under Drafts count', async () => {
    const dashRes = await get('/provider/dashboard', agentToken1);
    assert.equal(dashRes.status, 200);
    assert.ok(dashRes.data.stats.drafts >= 1);
    const draftItem = dashRes.data.properties.find((p: any) => p.id === draftHostelId);
    assert.ok(draftItem, 'Draft must be present in Agent portal properties');
    assert.equal(draftItem.verification_status, 'DRAFT');
  });

  // Clean up test draft
  await del(`/provider/properties/${draftHostelId}`, agentToken1);

  console.log('\n================================================================');
  console.log(`🎉 ALL APEX TESTS COMPLETED: ${passed}/${total} PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runApexPlatformTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
