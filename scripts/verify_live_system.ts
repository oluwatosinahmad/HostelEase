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

  // 4b. Provider Auth
  let providerToken = '';
  await check('POST /api/auth/login (Provider Auth)', async () => {
    const pRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'landlord@hostelease.ng', password: 'Provider123!' })
    });
    const pData = await pRes.json() as any;
    providerToken = pData.token;
    return Boolean(providerToken);
  });

  // 5. Student Hub
  await check('GET /api/student/dashboard (Student Command Center)', async () => {
    const res = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Boolean(data.summary);
  });

  // 6. Inspections Hub
  await check('GET /api/inspections/my-inspections & /api/inspections', async () => {
    const res1 = await fetch(`${BASE_URL}/inspections/my-inspections`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/inspections`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 7. Bookings Hub
  await check('GET /api/bookings/my-bookings & /api/bookings', async () => {
    const res1 = await fetch(`${BASE_URL}/bookings/my-bookings`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/bookings`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 8. Provider Portal Listings & Financials
  await check('GET /api/provider/my-listings & /api/provider/financials', async () => {
    const res1 = await fetch(`${BASE_URL}/provider/my-listings`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/provider/financials`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 9. Move-In Hub (Phase 12)
  await check('GET /api/move-in/student/current (Phase 12 Move-In Hub)', async () => {
    const res = await fetch(`${BASE_URL}/move-in/student/current`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 200;
  });

  // 10. AI Assistant (Phase 8)
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

  // 11. Dispute Center (Phase 11)
  await check('GET /api/disputes & /api/disputes/my (Dispute Center)', async () => {
    const res1 = await fetch(`${BASE_URL}/disputes`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/disputes/my`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 12. Payment Engine & Ledger
  await check('GET /api/payments/platform-fee & /api/payments/provider/financials', async () => {
    const res1 = await fetch(`${BASE_URL}/payments/platform-fee`);
    const res2 = await fetch(`${BASE_URL}/payments/provider/financials`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 13. Admin Operations & Dashboard
  await check('GET /api/admin/operations/dashboard & /api/admin/operations', async () => {
    const res1 = await fetch(`${BASE_URL}/admin/operations/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/admin/operations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 14. Admin Reconciliation Hub
  await check('GET /api/admin/reconciliation & /api/admin/payments/reconciliation', async () => {
    const res1 = await fetch(`${BASE_URL}/admin/reconciliation`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/admin/payments/reconciliation`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 15. Admin Support Tickets
  await check('GET /api/admin/support-tickets & /api/admin/support/tickets', async () => {
    const res1 = await fetch(`${BASE_URL}/admin/support-tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const res2 = await fetch(`${BASE_URL}/admin/support/tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res1.status === 200 && res2.status === 200;
  });

  // 16. Public Verified Providers
  await check('GET /api/public/providers (Verified Provider Public Directory)', async () => {
    const res = await fetch(`${BASE_URL}/public/providers`);
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.providers);
  });

  // 17. Roommates Discovery
  await check('GET /api/roommates/discover (Student Roommate Matching)', async () => {
    const res = await fetch(`${BASE_URL}/roommates/discover`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 200;
  });

  // 18. Community Questions & Experiences
  await check('GET /api/community/questions (Student Community Forum)', async () => {
    const res = await fetch(`${BASE_URL}/community/questions`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 200;
  });

  // 19. Admin Control Center & System Telemetry
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
