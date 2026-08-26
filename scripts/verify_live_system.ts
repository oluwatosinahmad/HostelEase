const BASE_URL = 'http://localhost:5000/api';

async function verifyAllApis() {
  console.log('\n===============================================================');
  console.log('🌐 FULL SYSTEM HEALTH & LIVE API VERIFICATION CHECK');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function check(name: string, fn: () => Promise<boolean>) {
    total++;
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ [LIVE & OK] ${name}`);
        passed++;
      } else {
        console.error(`  ❌ [FAILED] ${name}`);
      }
    } catch (err: any) {
      console.error(`  ❌ [ERROR] ${name}:`, err.message);
    }
  }

  // 1. Health check
  await check('GET /api/health (Core Backend Health)', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json() as any;
    return res.status === 200 && data.status === 'ok';
  });

  // 2. Properties & Search
  await check('GET /api/properties (Verified LAUTECH Hostels)', async () => {
    const res = await fetch(`${BASE_URL}/properties`);
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.properties) && data.properties.length > 0;
  });

  // 3. Areas
  await check('GET /api/areas (LAUTECH Campus Neighborhoods)', async () => {
    const res = await fetch(`${BASE_URL}/areas`);
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.areas) && data.areas.length >= 8;
  });

  // 4. Auth System
  let studentToken = '';
  let adminToken = '';
  await check('POST /api/auth/login (Student & Admin Auth)', async () => {
    const sRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    const sData = await sRes.json() as any;
    studentToken = sData.token;

    const aRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    const aData = await aRes.json() as any;
    adminToken = aData.token;

    return Boolean(studentToken) && Boolean(adminToken);
  });

  // 5. Student Hub
  await check('GET /api/student/dashboard (Student Command Center)', async () => {
    const res = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Boolean(data.summary);
  });

  // 6. Move-In Hub (Phase 12)
  await check('GET /api/move-in/student/current (Phase 12 Move-In Hub)', async () => {
    const res = await fetch(`${BASE_URL}/move-in/student/current`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 200;
  });

  // 7. AI Assistant (Phase 8)
  await check('POST /api/ai/chat (Hostel Ease AI Assistant)', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({ message: 'Find hostels under 200k in Under G' })
    });
    const data = await res.json() as any;
    return res.status === 200 && Boolean(data.response);
  });

  // 8. Dispute Center (Phase 11)
  await check('GET /api/disputes/my (Phase 11 Dispute Center)', async () => {
    const res = await fetch(`${BASE_URL}/disputes/my`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 200;
  });

  // 9. Payment Engine (Phase 6)
  await check('GET /api/payments/platform-fee (Double-Entry Financial Ledger)', async () => {
    const res = await fetch(`${BASE_URL}/payments/platform-fee`);
    const data = await res.json() as any;
    return res.status === 200 && data.feeAmount > 0;
  });

  // 10. Admin Control Center (Phase 10)
  await check('GET /api/admin/system-health (Phase 10 System Telemetry)', async () => {
    const res = await fetch(`${BASE_URL}/admin/system-health`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && (data.overallStatus === 'HEALTHY' || data.status === 'HEALTHY');
  });

  console.log('\n===============================================================');
  console.log(`📊 LIVE API CHECK RESULTS: ${passed}/${total} APIS FULLY OPERATIONAL`);
  console.log('===============================================================\n');

  if (passed === total) {
    console.log('🚀 ALL HOSTEL EASE BACKEND APIS & SERVICES ARE 100% ONLINE & HEALTHY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyAllApis();
