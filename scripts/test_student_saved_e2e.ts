import db from '../server/db.js';
// @ts-ignore
import netlifyHandler from '../netlify/functions/api.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'hostel-ease-jwt-secure-secret-key-2026';

function generateStudentToken(user: { id: string; email: string; fullName: string; role: string }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

const studentA = {
  id: 'usr-student-e2e-a',
  email: 'student_a@lautech.edu.ng',
  fullName: 'Tunde Adeyemi (Student A)',
  role: 'STUDENT'
};

const studentB = {
  id: 'usr-student-e2e-b',
  email: 'student_b@lautech.edu.ng',
  fullName: 'Blessing Okafor (Student B)',
  role: 'STUDENT'
};

const tokenA = generateStudentToken(studentA);
const tokenB = generateStudentToken(studentB);

// Ensure test users exist in SQLite
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_active)
  VALUES (?, ?, 'hash123', ?, 'STUDENT', 1)
`).run(studentA.id, studentA.email, studentA.fullName);

db.prepare(`
  INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_active)
  VALUES (?, ?, 'hash123', ?, 'STUDENT', 1)
`).run(studentB.id, studentB.email, studentB.fullName);

async function runExpressE2ETests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING EXPRESS SQLITE SAVED PROPERTIES E2E TESTS');
  console.log('======================================================');

  // Clean test rows before starting
  db.prepare('DELETE FROM saved_properties WHERE user_id IN (?, ?)').run(studentA.id, studentB.id);

  const hostel1 = 'prop-1'; // Under G Royal Self-Contain Suites
  const hostel2 = 'prop-2'; // Under G Comfort Single Lodge

  // TEST 1: Unauthenticated save attempt rejected with 401
  console.log('\n--- TEST 1: Unauthenticated Save Attempt ---');
  const unauthRes = await fetch('http://localhost:5000/api/saved-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId: hostel1 })
  });
  console.log(`Status: ${unauthRes.status} (Expected: 401)`);
  const unauthJson = await unauthRes.json();
  console.log('Response:', unauthJson);
  if (unauthRes.status !== 401) throw new Error('Unauthenticated save was not rejected with 401');

  // TEST 2: Student A saves Hostel 1
  console.log('\n--- TEST 2: Student A Saves Hostel 1 ---');
  const saveResA = await fetch('http://localhost:5000/api/saved-properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ propertyId: hostel1, notes: 'Close to Under-G gate' })
  });
  console.log(`Status: ${saveResA.status} (Expected: 201)`);
  const saveJsonA = await saveResA.json();
  console.log('Response:', saveJsonA);
  if (saveResA.status !== 201 || !saveJsonA.isSaved) throw new Error('Student A save failed');

  // TEST 3: Verify SQLite database row directly
  console.log('\n--- TEST 3: Direct SQLite DB Verification for Student A ---');
  const dbRowA = db.prepare('SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ?').get(studentA.id, hostel1) as any;
  console.log('Database row found:', dbRowA);
  if (!dbRowA || dbRowA.property_id !== hostel1 || dbRowA.user_id !== studentA.id) {
    throw new Error('SQLite database row was NOT created or has invalid user_id/property_id');
  }

  // TEST 4: Duplicate save attempt handles idempotently without error
  console.log('\n--- TEST 4: Duplicate Save Attempt (Idempotent) ---');
  const dupRes = await fetch('http://localhost:5000/api/saved-properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ propertyId: hostel1 })
  });
  console.log(`Status: ${dupRes.status} (Expected: 200)`);
  const dupJson = await dupRes.json();
  console.log('Response:', dupJson);
  if (dupRes.status !== 200 || !dupJson.isSaved) throw new Error('Duplicate save was not handled gracefully');

  // Verify only 1 row exists in DB for (studentA.id, hostel1)
  const countRowA = db.prepare('SELECT COUNT(*) as c FROM saved_properties WHERE user_id = ? AND property_id = ?').get(studentA.id, hostel1) as any;
  console.log(`Row count in DB for (studentA, hostel1): ${countRowA.c} (Expected: 1)`);
  if (countRowA.c !== 1) throw new Error('Duplicate rows created in database!');

  // TEST 5: Fetch Saved Hostels for Student A (Refresh persistence)
  console.log('\n--- TEST 5: Fetch Saved Hostels for Student A ---');
  const listResA = await fetch('http://localhost:5000/api/saved-properties', {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const listJsonA = await listResA.json();
  console.log(`Student A Saved Hostels count: ${listJsonA.savedProperties.length} (Expected: 1)`);
  console.log('First saved hostel details:', {
    id: listJsonA.savedProperties[0]?.id,
    title: listJsonA.savedProperties[0]?.title,
    area: listJsonA.savedProperties[0]?.area?.name,
    priceSummary: listJsonA.savedProperties[0]?.priceSummary,
    coverImage: listJsonA.savedProperties[0]?.coverImage?.substring(0, 40) + '...'
  });
  if (listJsonA.savedProperties.length !== 1 || listJsonA.savedProperties[0].id !== hostel1) {
    throw new Error('Saved Hostels list did not return Student A saved property');
  }

  // TEST 6: Multi-Student Isolation
  console.log('\n--- TEST 6: Multi-Student Isolation (Student B) ---');
  // Student B fetches saved list -> MUST BE 0!
  const listResB = await fetch('http://localhost:5000/api/saved-properties', {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const listJsonB = await listResB.json();
  console.log(`Student B Initial Saved Hostels count: ${listJsonB.savedProperties.length} (Expected: 0)`);
  if (listJsonB.savedProperties.length !== 0) {
    throw new Error('ISOLATION BREACH: Student B can see Student A saved hostels!');
  }

  // Student B saves Hostel 2
  console.log('Student B saving Hostel 2...');
  const saveResB = await fetch('http://localhost:5000/api/saved-properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ propertyId: hostel2 })
  });
  console.log(`Status: ${saveResB.status} (Expected: 201)`);
  if (saveResB.status !== 201) throw new Error('Student B save failed');

  // Verify separate records exist in DB
  const rowsInDb = db.prepare('SELECT id, user_id, property_id FROM saved_properties WHERE user_id IN (?, ?)').all(studentA.id, studentB.id) as any[];
  console.log('Database rows for Student A and B:', rowsInDb);
  if (rowsInDb.length !== 2) throw new Error('Database does not have separate records for both students');

  // TEST 7: Unsave / Remove
  console.log('\n--- TEST 7: Unsave Hostel 1 for Student A ---');
  const unsaveResA = await fetch(`http://localhost:5000/api/saved-properties/${hostel1}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`Status: ${unsaveResA.status} (Expected: 200)`);
  const unsaveJsonA = await unsaveResA.json();
  console.log('Response:', unsaveJsonA);
  if (unsaveResA.status !== 200 || unsaveJsonA.isSaved !== false) throw new Error('Unsave failed');

  // Verify DB row deleted
  const checkDeletedA = db.prepare('SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ?').get(studentA.id, hostel1);
  console.log('Database row after unsave (Expected undefined):', checkDeletedA);
  if (checkDeletedA) throw new Error('Record was NOT deleted from SQLite database');

  // Verify Student B still has Hostel 2 saved
  const checkKeptB = db.prepare('SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ?').get(studentB.id, hostel2);
  console.log('Student B database row still intact:', checkKeptB);
  if (!checkKeptB) throw new Error('Student B saved hostel was unintentionally modified');

  console.log('\n✅ ALL EXPRESS SQLITE E2E TESTS PASSED!');
}

async function runNetlifyE2ETests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING NETLIFY SERVERLESS FUNCTION E2E TESTS');
  console.log('======================================================');

  async function callNetlify(path: string, method: string, token?: string, body?: any) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = new Request(`https://hostelease.ng${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const res = await netlifyHandler(req, {} as any);
    const text = await res.text();
    try {
      return { status: res.status, data: JSON.parse(text) };
    } catch {
      return { status: res.status, raw: text };
    }
  }

  const hostel1 = 'prop-1';
  const hostel2 = 'prop-2';

  // TEST 1: Unauthenticated rejected with 401
  console.log('\n--- NETLIFY TEST 1: Unauthenticated Save ---');
  const res1 = await callNetlify('/api/saved-properties', 'POST', undefined, { propertyId: hostel1 });
  console.log(`Status: ${res1.status} (Expected: 401)`);
  if (res1.status !== 401) throw new Error('Netlify unauth save did not return 401');

  // TEST 2: Student A saves Hostel 1
  console.log('\n--- NETLIFY TEST 2: Student A Saves Hostel 1 ---');
  const res2 = await callNetlify('/api/saved-properties', 'POST', tokenA, { propertyId: hostel1 });
  console.log(`Status: ${res2.status} (Expected: 201 or 200)`, res2.data);
  if (res2.status !== 201 && res2.status !== 200) throw new Error('Netlify save failed');

  // TEST 3: Duplicate save handled gracefully
  console.log('\n--- NETLIFY TEST 3: Duplicate Save ---');
  const res3 = await callNetlify('/api/saved-properties', 'POST', tokenA, { propertyId: hostel1 });
  console.log(`Status: ${res3.status} (Expected: 200)`, res3.data);
  if (res3.status !== 200) throw new Error('Netlify duplicate save failed');

  // TEST 4: Student A gets saved list
  console.log('\n--- NETLIFY TEST 4: Student A Get Saved ---');
  const res4 = await callNetlify('/api/saved-properties', 'GET', tokenA);
  console.log(`Student A Saved count: ${res4.data?.savedProperties?.length}`);
  if (!res4.data?.savedProperties?.some((p: any) => p.id === hostel1)) {
    throw new Error('Hostel 1 not in Student A saved list');
  }

  // TEST 5: Student B isolation
  console.log('\n--- NETLIFY TEST 5: Student B Isolation ---');
  const res5 = await callNetlify('/api/saved-properties', 'GET', tokenB);
  console.log(`Student B Saved count: ${res5.data?.savedProperties?.length}`);
  const hasHostel1 = res5.data?.savedProperties?.some((p: any) => p.id === hostel1);
  if (hasHostel1) throw new Error('Student B sees Student A saved property on Netlify!');

  // TEST 6: Unsave on Netlify
  console.log('\n--- NETLIFY TEST 6: Unsave on Netlify ---');
  const res6 = await callNetlify(`/api/saved-properties/${hostel1}`, 'DELETE', tokenA);
  console.log(`Status: ${res6.status} (Expected: 200)`, res6.data);
  if (res6.status !== 200) throw new Error('Netlify unsave failed');

  const res7 = await callNetlify('/api/saved-properties', 'GET', tokenA);
  console.log(`Student A Saved count after unsave: ${res7.data?.savedProperties?.length}`);
  if (res7.data?.savedProperties?.some((p: any) => p.id === hostel1)) {
    throw new Error('Hostel 1 still in saved list after unsave on Netlify!');
  }

  console.log('\n✅ ALL NETLIFY SERVERLESS E2E TESTS PASSED!');
}

async function main() {
  await runExpressE2ETests();
  await runNetlifyE2ETests();
  console.log('\n🎉 ALL END-TO-END DATABASE & SERVERLESS TESTS COMPLETED SUCCESSFULLY!\n');
}

main().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
