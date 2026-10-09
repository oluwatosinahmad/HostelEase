import { db } from '../server/db';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'hostel-ease-jwt-secret-key-development-secure-2025';

async function runAudit() {
  console.log('=====================================================');
  console.log('HOSTEL EASE END-TO-END MULTI-PORTAL RELIABILITY AUDIT');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health Endpoint
  await check('GET /api/health (System & Database Status)', async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (data.status !== 'ok') throw new Error(`Health status: ${data.status}`);
  });

  // Query DB directly to find sample accounts for Student, Provider, Admin
  const studentUser: any = db.prepare("SELECT id, email, password_hash, role FROM users WHERE role = 'STUDENT' LIMIT 1").get();
  const providerUser: any = db.prepare("SELECT id, email, password_hash, role FROM users WHERE role IN ('PROVIDER', 'AGENT', 'LANDLORD') LIMIT 1").get();
  const adminUser: any = db.prepare("SELECT id, email, password_hash, role FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN') LIMIT 1").get();

  console.log(`\nSample Test Accounts Located:`);
  console.log(`- Student:  ${studentUser?.email} (${studentUser?.id})`);
  console.log(`- Provider: ${providerUser?.email} (${providerUser?.id})`);
  console.log(`- Admin:    ${adminUser?.email} (${adminUser?.id})\n`);

  function createToken(user: any) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  const studentToken = createToken(studentUser);
  const providerToken = createToken(providerUser);
  const adminToken = createToken(adminUser);

  // 2. Student Portal Endpoints
  console.log('--- TESTING STUDENT PORTAL ENDPOINTS ---');
  await check('Student: Session Restoration (GET /api/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!data.user || data.user.id !== studentUser.id) throw new Error('User mismatch or missing');
  });

  await check('Student: Dashboard Hub (GET /api/student/dashboard)', async () => {
    const res = await fetch(`${API_BASE}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!data.summary) throw new Error('Missing dashboard summary');
  });

  await check('Student: Bookings List (GET /api/bookings)', async () => {
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.bookings)) throw new Error('Bookings must be an array');
  });

  await check('Student: Inspections (GET /api/inspections)', async () => {
    const res = await fetch(`${API_BASE}/inspections`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.inspections)) throw new Error('Inspections must be an array');
  });

  await check('Student: Saved Hostels (GET /api/saved)', async () => {
    const res = await fetch(`${API_BASE}/saved`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.savedProperties || data.properties || data.saved)) throw new Error('Saved hostels invalid');
  });

  await check('Student: Preferences (GET /api/student/preferences)', async () => {
    const res = await fetch(`${API_BASE}/student/preferences`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 3. Provider / Agent Portal Endpoints
  console.log('\n--- TESTING AGENT / PROVIDER PORTAL ENDPOINTS ---');
  await check('Provider: Session Restoration (GET /api/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Provider: Dashboard (GET /api/provider/dashboard)', async () => {
    const res = await fetch(`${API_BASE}/provider/dashboard`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!data.summary) throw new Error('Missing provider dashboard summary');
  });

  await check('Provider: My Listings (GET /api/provider/my-listings)', async () => {
    const res = await fetch(`${API_BASE}/provider/my-listings`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.properties)) throw new Error('Properties must be an array');
  });

  await check('Provider: Bookings List (GET /api/bookings)', async () => {
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.bookings)) throw new Error('Bookings must be an array');
  });

  await check('Provider: Inspection Schedules (GET /api/provider/inspection-schedules)', async () => {
    const res = await fetch(`${API_BASE}/provider/inspection-schedules`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Provider: Financials (GET /api/provider/financials)', async () => {
    const res = await fetch(`${API_BASE}/provider/financials`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 4. Admin Portal Endpoints
  console.log('\n--- TESTING ADMIN COMMAND PORTAL ENDPOINTS ---');
  await check('Admin: Session Restoration (GET /api/auth/me)', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Admin: Dashboard (GET /api/admin/dashboard)', async () => {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!data.stats) throw new Error('Missing admin stats');
  });

  await check('Admin: Users Directory (GET /api/admin/users)', async () => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: any = await res.json();
    if (!Array.isArray(data.users)) throw new Error('Users must be an array');
  });

  await check('Admin: Providers List (GET /api/admin/providers)', async () => {
    const res = await fetch(`${API_BASE}/admin/providers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Admin: Hostels Management (GET /api/admin/hostels)', async () => {
    const res = await fetch(`${API_BASE}/admin/hostels`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Admin: Revenue Overview (GET /api/admin/revenue/overview)', async () => {
    const res = await fetch(`${API_BASE}/admin/revenue/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await check('Admin: System Health (GET /api/admin/system/health)', async () => {
    const res = await fetch(`${API_BASE}/admin/system/health`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // Summary
  console.log('\n=====================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
