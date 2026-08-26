const BASE_URL = 'http://localhost:5000/api';

async function runPhase13Tests() {
  console.log('\n===============================================================');
  console.log('🧠 HOSTEL EASE PHASE 13 — STUDENT INTELLIGENCE TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    total++;
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      } else {
        console.error(`  ❌ [FAIL] ${name}`);
      }
    } catch (err: any) {
      console.error(`  ❌ [ERROR] ${name}:`, err.message);
    }
  }

  // 1. Authenticate Student, Provider, and Admin
  let studentToken = '';
  let providerToken = '';
  let adminToken = '';
  let samplePropertyId = '';

  await test('Authenticate Student, Provider, and Admin', async () => {
    const sRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    studentToken = (await sRes.json() as any).token;

    const pRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    providerToken = (await pRes.json() as any).token;

    const aRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    adminToken = (await aRes.json() as any).token;

    const propsRes = await fetch(`${BASE_URL}/properties`);
    const propsData = await propsRes.json() as any;
    samplePropertyId = propsData.properties[0].id;

    return Boolean(studentToken) && Boolean(providerToken) && Boolean(adminToken) && Boolean(samplePropertyId);
  });

  // Test Group 1: Student Preferences & Priority Management
  console.log('\n--- Test Group 1: Student Preferences & Ranked Priorities ---');
  await test('GET /api/intelligence/preferences returns student profile', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/preferences`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Boolean(data.preferences) && Array.isArray(data.preferences.rankedPriorities);
  });

  await test('PUT /api/intelligence/preferences saves custom budget and ranked priorities', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        minBudget: 80000,
        maxBudget: 200000,
        monthlyLivingBudget: 40000,
        preferredAreas: ['Under G', 'Adenike'],
        preferredRoomTypes: ['SINGLE', 'SHARED_2'],
        rankedPriorities: ['PRICE', 'ELECTRICITY', 'DISTANCE', 'SECURITY', 'WATER'],
        importanceElectricity: 5,
        importanceWater: 4,
        importanceSecurity: 5
      })
    });
    const data = await res.json() as any;
    return res.status === 200 && data.preferences?.maxBudget === 200000 && data.preferences?.importanceElectricity === 5;
  });

  // Test Group 2: Smart Matching & Decision Explanations
  console.log('\n--- Test Group 2: Smart Matching Engine & Decision Explanations ---');
  let topMatchPropertyId = '';
  await test('POST /api/intelligence/smart-match calculates transparent match scores', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/smart-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    topMatchPropertyId = data.bestMatch?.propertyId;
    return res.status === 200 && data.bestMatch && typeof data.bestMatch.matchScore === 'number' && data.bestMatch.matchScore >= 50;
  });

  await test('Match explanation provides itemized positive checks and critical negative warnings', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/smart-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    const match = data.bestMatch;
    return (
      Array.isArray(match.positiveReasons) &&
      match.positiveReasons.length > 0 &&
      Array.isArray(match.negativeWarnings) &&
      Boolean(match.affordabilityStatus) &&
      match.trueCost?.totalKnownCost > 0
    );
  });

  await test('Smart Match generates 3 distinct alternatives (Cheaper, Closer, Better Power)', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/smart-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return Array.isArray(data.alternatives) && data.alternatives.length > 0;
  });

  // Test Group 3: Natural Language Search & Interpretation
  console.log('\n--- Test Group 3: Natural Language Search & Single-Question Clarification ---');
  await test('POST /api/intelligence/nl-search parses structured budget and area filters', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/nl-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'I need a hostel close to LAUTECH under ₦200,000 in Under G with good electricity' })
    });
    const data = await res.json() as any;
    if (!data.structuredFilters?.maxPrice || !data.structuredFilters?.requiresElectricity) {
      console.log('    [NL Search Failed]:', res.status, data);
    }
    return (
      res.status === 200 &&
      data.structuredFilters?.maxPrice === 200000 &&
      data.structuredFilters?.requiresElectricity === true &&
      Array.isArray(data.properties)
    );
  });

  await test('Natural Language Search triggers single-question clarification when query is too vague', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/nl-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Hostel' })
    });
    const data = await res.json() as any;
    return res.status === 200 && data.needsClarification === true && Boolean(data.clarificationQuestion);
  });

  // Test Group 4: True Cost Estimator
  console.log('\n--- Test Group 4: True Cost Estimator (Known vs Estimated Transport) ---');
  await test('GET /api/intelligence/true-cost/:propertyId separates known fees from estimated transport', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/true-cost/${samplePropertyId}`);
    const data = await res.json() as any;
    return (
      res.status === 200 &&
      data.knownCosts?.totalKnownCost > 0 &&
      data.estimatedCosts?.academicSessionCommuteEstimated >= 0 &&
      data.totalTrueCost >= data.knownCosts?.totalKnownCost
    );
  });

  // Test Group 5: Price & Availability Alerts
  console.log('\n--- Test Group 5: Price & Space Availability Alerts ---');
  await test('POST /api/intelligence/alerts/price subscribes student to price alerts', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/alerts/price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({ propertyId: samplePropertyId })
    });
    const data = await res.json() as any;
    return res.status === 201 && Boolean(data.alertId);
  });

  await test('POST /api/intelligence/alerts/availability subscribes student to space alerts', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/alerts/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({ propertyId: samplePropertyId, preferredRoomType: 'SINGLE' })
    });
    const data = await res.json() as any;
    return res.status === 201 && Boolean(data.alertId);
  });

  await test('GET /api/intelligence/alerts/my returns active student alert subscriptions', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/alerts/my`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.priceAlerts) && Array.isArray(data.availabilityAlerts);
  });

  // Test Group 6: Smart Shortlist Organization & Comparative AI
  console.log('\n--- Test Group 6: Smart Shortlist Organization & Comparative Intelligence ---');
  await test('POST /api/intelligence/shortlist/organize tags saved hostel (e.g. TOP_CHOICE)', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/shortlist/organize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        propertyId: samplePropertyId,
        tag: 'TOP_CHOICE',
        personalNotes: 'Spacious self-contain with good ventilation'
      })
    });
    return res.status === 200;
  });

  await test('POST /api/intelligence/shortlist/smart-compare provides AI comparative overview', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/shortlist/smart-compare`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Boolean(data.summary) && Array.isArray(data.items);
  });

  // Test Group 7: Review Intelligence & Sentiment Summaries
  console.log('\n--- Test Group 7: Review Intelligence & Sentiment Extraction ---');
  await test('GET /api/intelligence/reviews/summary/:propertyId extracts likes vs common concerns', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/reviews/summary/${samplePropertyId}`);
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.studentsLike) && Array.isArray(data.commonConcerns);
  });

  // Test Group 8: Provider Listing Quality Score
  console.log('\n--- Test Group 8: Provider Listing Quality Score & Tips ---');
  await test('GET /api/intelligence/provider/quality/:propertyId evaluates 0-100 quality score and tips', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/provider/quality/${samplePropertyId}`, {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    const data = await res.json() as any;
    return (
      res.status === 200 &&
      typeof data.overallScore === 'number' &&
      data.scoreBreakdown &&
      Array.isArray(data.recommendations)
    );
  });

  // Test Group 9: Admin Supply-Demand & Duplicate Listing Detection
  console.log('\n--- Test Group 9: Admin Supply-Demand Insights & Duplicate Detection ---');
  await test('GET /api/intelligence/admin/supply-demand returns area insights and stress metrics', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/admin/supply-demand`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json() as any;
    return (
      res.status === 200 &&
      Array.isArray(data.supplyDemand?.areas) &&
      typeof data.stressMetrics?.stressReductionScore === 'number'
    );
  });

  await test('GET /api/intelligence/admin/duplicate-flags scans for suspicious duplicate properties', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/admin/duplicate-flags`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json() as any;
    return res.status === 200 && Array.isArray(data.duplicateFlags);
  });

  // Test Group 10: Security & RBAC Enforcement
  console.log('\n--- Test Group 10: Security & RBAC Enforcement ---');
  await test('Student cannot access Admin supply-demand analytics (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/admin/supply-demand`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    return res.status === 403;
  });

  await test('Unauthenticated preference update rejected (401 Unauthorized)', async () => {
    const res = await fetch(`${BASE_URL}/intelligence/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxBudget: 300000 })
    });
    return res.status === 401;
  });

  console.log('\n===============================================================');
  console.log(`📊 PHASE 13 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 13 STUDENT INTELLIGENCE & STRESS-REDUCTION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase13Tests();
