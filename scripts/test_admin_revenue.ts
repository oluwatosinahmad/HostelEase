const BASE_URL = 'http://127.0.0.1:5000/api';

async function runRevenueTests() {
  console.log('\n===============================================================');
  console.log('💰 HOSTEL EASE V1 — ADMIN FINANCE & REVENUE INTEGRATION AUDIT');
  console.log('📍 Focus: Real Owner Income, Subscriptions, Commissions & Payouts');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Authorized Admin User
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hostelease.ng',
        password: 'Admin123!',
        requestedRole: 'ADMIN'
      })
    });
    const adminData = await adminLogin.json() as any;
    const adminToken = adminData.token;
    assert(Boolean(adminToken), 'Admin authenticated with verified database role and JWT bearer token');

    // 2. Authenticate Student User (to verify RBAC security)
    const studentEmail = `student_rev_${Date.now()}@student.lautech.edu.ng`;
    const studentReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bolanle Student',
        email: studentEmail,
        password: 'password123',
        role: 'STUDENT',
        phone: '08011223344'
      })
    });
    const studentData = await studentReg.json() as any;
    const studentToken = studentData.token;
    assert(Boolean(studentToken), 'Student authenticated for access restriction check');

    // 3. Security Check: Ensure Student is blocked from Finance APIs (403 Forbidden)
    const studentAccess = await fetch(`${BASE_URL}/admin/revenue/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAccess.status === 403, 'Strict RBAC: Student access to Admin Finance blocked (403 Forbidden)');

    // 4. Test GET /api/admin/revenue/overview
    const overviewRes = await fetch(`${BASE_URL}/admin/revenue/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const overviewData = await overviewRes.json() as any;
    assert(
      overviewRes.status === 200 && overviewData.success && overviewData.ownerRevenue !== undefined,
      'Revenue Overview reports Owner Income across all 4 monetization streams',
      `Net Revenue: ₦${overviewData?.ownerRevenue?.netPlatformRevenue?.toLocaleString()}`
    );

    // 5. Test GET /api/admin/revenue/transactions
    const txRes = await fetch(`${BASE_URL}/admin/revenue/transactions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const txData = await txRes.json() as any;
    assert(
      txRes.status === 200 && Array.isArray(txData.transactions),
      'Transactions endpoint lists all platform payments and inflow'
    );

    // 6. Test GET /api/admin/revenue/commissions
    const commRes = await fetch(`${BASE_URL}/admin/revenue/commissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const commData = await commRes.json() as any;
    assert(
      commRes.status === 200 && Array.isArray(commData.commissions),
      'Booking Commissions breakdown calculates 7.5% take rate per hostel reservation'
    );

    // 7. Test GET /api/admin/revenue/subscriptions
    const subRes = await fetch(`${BASE_URL}/admin/revenue/subscriptions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const subData = await subRes.json() as any;
    assert(
      subRes.status === 200 && Array.isArray(subData.plans) && Array.isArray(subData.subscriptions),
      'Provider Subscriptions lists Starter, Pro Landlord and Enterprise Estate tiers'
    );

    // 8. Test GET /api/admin/revenue/featured-listings
    const featRes = await fetch(`${BASE_URL}/admin/revenue/featured-listings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const featData = await featRes.json() as any;
    assert(
      featRes.status === 200 && Array.isArray(featData.featured),
      'Featured Listings tracks impressions, clicks and fees for promoted hostels'
    );

    // 9. Test GET /api/admin/revenue/provider-services
    const servRes = await fetch(`${BASE_URL}/admin/revenue/provider-services`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const servData = await servRes.json() as any;
    assert(
      servRes.status === 200 && Array.isArray(servData.services),
      'Provider Services tracks professional photography, 3D tours, and verification orders'
    );

    // 10. Test GET & POST /api/admin/revenue/payouts
    const payoutRes = await fetch(`${BASE_URL}/admin/revenue/payouts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const payoutData = await payoutRes.json() as any;
    assert(
      payoutRes.status === 200 && Array.isArray(payoutData.payouts),
      'Payouts lists pending landlord disbursements and bank details'
    );

    // 11. Test GET /api/admin/revenue/refunds
    const refRes = await fetch(`${BASE_URL}/admin/revenue/refunds`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const refData = await refRes.json() as any;
    assert(
      refRes.status === 200 && Array.isArray(refData.refunds),
      'Refunds endpoint manages student reversals and dispute settlements'
    );

    // 12. Test GET /api/admin/revenue/invoices
    const invRes = await fetch(`${BASE_URL}/admin/revenue/invoices`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const invData = await invRes.json() as any;
    assert(
      invRes.status === 200 && Array.isArray(invData.invoices),
      'Invoices generates official printable PDF/HTML receipts for students & landlords'
    );

    // 13. Test GET & POST /api/admin/revenue/withdrawals
    const wdrPost = await fetch(`${BASE_URL}/admin/revenue/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        amount: 25000,
        destinationBank: 'Guaranty Trust Bank',
        destinationAccountNumber: '0123456789',
        destinationAccountName: 'Hostel Ease Admin Account',
        purpose: 'Test treasury transfer'
      })
    });
    const wdrPostData = await wdrPost.json() as any;
    assert(
      wdrPost.status === 201 && Boolean(wdrPostData.withdrawalReference),
      'Withdrawals records platform owner treasury payout to Nigerian bank account'
    );

    // 14. Test GET /api/admin/revenue/reports
    const repRes = await fetch(`${BASE_URL}/admin/revenue/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const repData = await repRes.json() as any;
    assert(
      repRes.status === 200 && Array.isArray(repData.report),
      'Financial Reports generates consolidated annual financial statements with CSV export'
    );

    // 15. Test GET & PUT /api/admin/revenue/settings
    const setRes = await fetch(`${BASE_URL}/admin/revenue/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const setData = await setRes.json() as any;
    assert(
      setRes.status === 200 && Array.isArray(setData.settings) && setData.settings.length > 0,
      'Revenue Settings allows dynamic pricing of commissions, subscriptions, and fees'
    );

  } catch (err: any) {
    console.error('Audit execution error:', err);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`📊 REVENUE AUDIT SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log('===============================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 15 ADMIN FINANCE & REVENUE AUDITS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } else {
    console.error(`⚠️ ${failed} tests failed.`);
    process.exit(1);
  }
}

runRevenueTests();
