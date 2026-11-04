import db from '../server/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_ease_jwt_secret_lautech_2026';

async function runTests() {
  console.log('--- STARTING ADMIN CLEARANCE SYSTEM INTEGRATION TESTS ---');

  // 1. Generate Admin JWT token
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get() as any;
  if (!adminUser) {
    throw new Error('Admin user not found in database!');
  }
  console.log(`[TEST 1] Found Admin User: ${adminUser.email} (${adminUser.id})`);

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. Test Non-Admin Token
  const studentUser = db.prepare("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1").get() as any;
  let studentToken = '';
  if (studentUser) {
    studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: 'STUDENT' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  // Helper fetch function
  const API_HOST = 'http://localhost:5000/api';

  // 3. Security test: Student accessing clearance estimate -> Must get 403 Forbidden
  if (studentToken) {
    const resForbidden = await fetch(`${API_HOST}/admin/clearance/estimate?scope=all`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    console.log(`[TEST 2] Security check (Student auth to clearance): HTTP ${resForbidden.status}`);
    if (resForbidden.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin, got ${resForbidden.status}`);
    }
    console.log('✓ Security verified: Non-admin strictly forbidden (403)');
  }

  // 4. Test GET /api/admin/clearance/estimate?scope=all with Admin
  const resEstAll = await fetch(`${API_HOST}/admin/clearance/estimate?scope=all`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`[TEST 3] GET /admin/clearance/estimate?scope=all: HTTP ${resEstAll.status}`);
  const dataEstAll = await resEstAll.json();
  console.log('  Estimate All result:', JSON.stringify(dataEstAll.estimate, null, 2));
  if (!dataEstAll.success || !dataEstAll.estimate) {
    throw new Error('Failed to fetch estimate for scope: all');
  }
  console.log(`✓ Estimate for scope:all returned ${dataEstAll.estimate.estimatedRecords} records, ${dataEstAll.estimate.estimatedFiles} files.`);

  // 5. Test GET /api/admin/clearance/estimate for individual scopes
  const testScopes = ['hostels', 'videos', 'pending', 'users', 'providers', 'bookings', 'verification', 'video_tours', 'disputes'];
  for (const sc of testScopes) {
    const resEst = await fetch(`${API_HOST}/admin/clearance/estimate?scope=${sc}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const d = await resEst.json();
    if (!d.success) throw new Error(`Estimate failed for scope: ${sc}`);
    console.log(`✓ Scope '${sc}': ${d.estimate.estimatedRecords} records, ${d.estimate.estimatedFiles} files (${d.estimate.scopeLabel})`);
  }

  // 6. Test Confirmation Gate: POST /execute with scope='all' without phrase -> Must fail with 400
  const resGate = await fetch(`${API_HOST}/admin/clearance/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ scope: 'all', confirmPhrase: 'wrong phrase' })
  });
  console.log(`[TEST 4] Confirmation gate test (wrong phrase): HTTP ${resGate.status}`);
  if (resGate.status !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid confirmation phrase, got ${resGate.status}`);
  }
  const gateData = await resGate.json();
  console.log(`✓ Confirmation gate properly blocked execution: "${gateData.error}"`);

  // 7. Test scoped execution on disputes
  console.log('[TEST 5] Testing scoped clearance execution on disputes...');
  const resExecDisputes = await fetch(`${API_HOST}/admin/clearance/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ scope: 'disputes', adminReason: 'Automated test of dispute clearance' })
  });
  const execDisputesData = await resExecDisputes.json();
  console.log(`Execution status: HTTP ${resExecDisputes.status}`, execDisputesData);
  if (!execDisputesData.success) {
    throw new Error('Dispute clearance execution failed');
  }
  console.log('✓ Dispute clearance successfully executed and audited.');

  // Verify DB disputes count is 0
  const remainingDisputes = db.prepare("SELECT count(*) as count FROM disputes").get() as any;
  console.log(`Disputes remaining in DB: ${remainingDisputes.count}`);
  if (remainingDisputes.count !== 0) {
    throw new Error(`Expected 0 disputes remaining, found ${remainingDisputes.count}`);
  }

  // 8. Test auto-seed lock flag in system_settings
  const autoSeedSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'auto_seed_disabled'").get() as any;
  console.log(`[TEST 6] Auto-seed disabled setting:`, autoSeedSetting);
  if (autoSeedSetting?.value !== 'true') {
    throw new Error(`Expected auto_seed_disabled = 'true', got '${autoSeedSetting?.value}'`);
  }
  console.log('✓ Auto-seed lock successfully verified in system_settings.');

  // 9. Verify Admin account remains fully intact
  const verifyAdmin = db.prepare("SELECT id, email, role FROM users WHERE role = 'ADMIN'").all();
  console.log(`[TEST 7] Preserved Admin Accounts:`, verifyAdmin);
  if (verifyAdmin.length === 0) {
    throw new Error('CRITICAL: Admin account was deleted!');
  }
  console.log('✓ Super Admin account preserved intact.');

  console.log('\n======================================================');
  console.log('ALL CLEARANCE SYSTEM BACKEND & SECURITY TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
