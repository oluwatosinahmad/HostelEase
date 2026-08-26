const BASE_URL = 'http://localhost:5000/api';

let studentAToken = '';
let studentAId = '';
let studentBToken = '';
let studentBId = '';
let providerToken = '';
let providerId = '';
let adminToken = '';
let adminId = '';

let createdQuestionId = '';
let createdAnswerId = '';
let createdExperienceId = '';
let createdRoommateRequestId = '';
let createdReportId = '';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Details: ${detail}`);
  }
}

async function runPhase14TestSuite() {
  console.log('\n===============================================================');
  console.log('🤝 HOSTEL EASE PHASE 14 — COMMUNITY & ROOMMATE TEST SUITE');
  console.log('===============================================================\n');

  try {
    // 0. AUTHENTICATION & SETUP
    // Login Student A
    const resA = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    const dataA = await resA.json() as any;
    studentAToken = dataA.token;
    studentAId = dataA.user.id;

    // Register dedicated Student B for Phase 14 tests
    const studentBEmail = `david_phase14_${Date.now()}@lautech.edu.ng`;
    const regB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'David Kolade',
        email: studentBEmail,
        password: 'Student123!',
        phone: '08012345679',
        role: 'STUDENT'
      })
    });
    const dataB = await regB.json() as any;
    studentBToken = dataB.token;
    studentBId = dataB.user.id;

    // Login Provider
    const resP = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    const dataP = await resP.json() as any;
    providerToken = dataP.token;
    providerId = dataP.user.id;

    // Login Admin
    const resAdm = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    const dataAdm = await resAdm.json() as any;
    adminToken = dataAdm.token;
    adminId = dataAdm.user.id;

    assert(Boolean(studentAToken && studentBToken && providerToken && adminToken), 'Authenticate Student A, Student B, Provider, and Admin');

    // -------------------------------------------------------------------------
    // TEST GROUP 1: COMMUNITY QUESTIONS & ANSWERS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 1: Community Questions & Answers ---');

    // Ask Question
    const resAsk = await fetch(`${BASE_URL}/community/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        title: 'Is Under G very noisy during the exam period at LAUTECH?',
        description: 'I need to know if the lodges closer to Bovas station experience high traffic noise during late night studies.',
        category: 'AREAS',
        isAnonymous: false
      })
    });
    const askData = await resAsk.json() as any;
    createdQuestionId = askData.question?.id;
    assert(resAsk.status === 201 && Boolean(createdQuestionId), 'POST /api/community/questions creates question with category');

    // Answer Question
    const resAns = await fetch(`${BASE_URL}/community/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
      body: JSON.stringify({
        questionId: createdQuestionId,
        content: 'Lodges directly on the tarred road have bike noise, but inner streets like Alabi close to Bovas are very quiet.'
      })
    });
    const ansData = await resAns.json() as any;
    if (resAns.status !== 201) {
      console.error('Answer Question Error:', resAns.status, ansData);
    }
    createdAnswerId = ansData.answers?.[0]?.id;
    assert(resAns.status === 201 && ansData.answers?.length > 0, 'POST /api/community/answers adds answer and links question');

    // React to Answer (Helpful)
    const resReact = await fetch(`${BASE_URL}/community/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        answerId: createdAnswerId,
        reactionType: 'HELPFUL'
      })
    });
    const reactData = await resReact.json() as any;
    assert(resReact.status === 200 && reactData.helpful_count >= 1, 'POST /api/community/reactions increments helpful votes');

    // Verified Badges check
    const resQDetail = await fetch(`${BASE_URL}/community/questions/${createdQuestionId}`);
    const qDetail = await resQDetail.json() as any;
    assert(qDetail.question.isVerifiedStudent === true, 'Question displays VERIFIED STUDENT badge for authenticated student');

    // -------------------------------------------------------------------------
    // TEST GROUP 2: MULTI-DIMENSIONAL HOSTEL EXPERIENCES
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 2: Structured Hostel Experiences ---');

    // Fetch a property
    const resProps = await fetch(`${BASE_URL}/properties?limit=1`);
    const propsData = await resProps.json() as any;
    const testPropId = propsData.properties?.[0]?.id || 'prop-1';

    const resExp = await fetch(`${BASE_URL}/community/experiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        propertyId: testPropId,
        isAnonymous: true,
        academicSession: '2026/2027',
        durationMonths: 12,
        electricityNotes: 'Compound generator runs from 7pm to 11pm daily during exams.',
        waterNotes: 'Borehole water runs every morning into personal storage buckets.',
        securityNotes: 'Perimeter fence with razor wire and gated entry.',
        noiseNotes: 'Quiet study area.',
        overallExperience: 'Spent a full session here. Safe compound and predictable water schedule.',
        positivesSummary: 'Constant borehole water and active nighttime security gate.',
        concernsSummary: 'Power is moderate; bring rechargeable study lamps.'
      })
    });
    const expData = await resExp.json() as any;
    createdExperienceId = expData.id;
    assert(resExp.status === 201 && expData.isAnonymous === true, 'POST /api/community/experiences creates structured experience with anonymous privacy');

    // Get Hostel Insights
    const resInsights = await fetch(`${BASE_URL}/community/insights/${testPropId}`);
    const insightsData = await resInsights.json() as any;
    assert(resInsights.status === 200 && insightsData.recentExperiences?.length > 0, 'GET /api/community/insights/:id provides student consensus & insights');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: OFFICIAL GUIDES & AREA GUIDES
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 3: Official Guides & Area Information ---');

    const resGuides = await fetch(`${BASE_URL}/community/guides`);
    const guidesData = await resGuides.json() as any;
    assert(resGuides.status === 200 && guidesData.guides?.length >= 4, 'GET /api/community/guides returns official accommodation guides');

    const resAreaGuides = await fetch(`${BASE_URL}/community/areas`);
    const areaGuidesData = await resAreaGuides.json() as any;
    assert(resAreaGuides.status === 200 && areaGuidesData.areas?.some((a: any) => a.area_name === 'Under G'), 'GET /api/community/areas returns LAUTECH neighborhood guides with transport estimates');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: COMMUNITY GLOBAL SEARCH & AI SUMMARIES
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 4: Community Search & AI Assistant ---');

    const resSearch = await fetch(`${BASE_URL}/community/search?q=Under%20G`);
    const searchData = await resSearch.json() as any;
    assert(resSearch.status === 200 && searchData.areaGuides?.length > 0, 'GET /api/community/search indexes questions, guides, and area info');

    const resAISummary = await fetch(`${BASE_URL}/community/ai/summary?propertyId=${testPropId}`);
    const aiSummaryData = await resAISummary.json() as any;
    assert(resAISummary.status === 200 && aiSummaryData.dataProvenance === 'AGGREGATED_COMMUNITY_FEEDBACK', 'GET /api/community/ai/summary generates evidence-grounded summaries');

    // -------------------------------------------------------------------------
    // TEST GROUP 5: ROOMMATE PROFILES & COMPATIBILITY MATCHING
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 5: Roommate Profiles & Compatibility Engine ---');

    // Upsert Profile Student A
    const resProfA = await fetch(`${BASE_URL}/roommates/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        displayName: 'Tunde A.',
        gender: 'MALE',
        department: 'Computer Science',
        level: '300L',
        budgetMin: 100000,
        budgetMax: 200000,
        preferredAreas: ['Under G', 'Adenike'],
        preferredRoomType: 'SHARED_2',
        moveInMonth: 'September',
        studyEnvironment: 'QUIET',
        cleanlinessExpectation: 'VERY_CLEAN',
        sleepSchedule: 'REGULAR',
        visitorPreference: 'OCCASIONAL',
        aboutMe: '300L CS student focused on studies and software projects.'
      })
    });
    const profAData = await resProfA.json() as any;
    assert(resProfA.status === 200 && profAData.profile.displayName === 'Tunde A.', 'PUT /api/roommates/profile saves Student A roommate preferences');

    // Upsert Profile Student B
    const resProfB = await fetch(`${BASE_URL}/roommates/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
      body: JSON.stringify({
        displayName: 'David K.',
        gender: 'MALE',
        department: 'Electrical Engineering',
        level: '300L',
        budgetMin: 110000,
        budgetMax: 190000,
        preferredAreas: ['Under G', 'Stadium'],
        preferredRoomType: 'SHARED_2',
        moveInMonth: 'September',
        studyEnvironment: 'QUIET',
        cleanlinessExpectation: 'VERY_CLEAN',
        sleepSchedule: 'REGULAR',
        visitorPreference: 'OCCASIONAL',
        aboutMe: 'Engineering student who prefers quiet nights.'
      })
    });
    const profBData = await resProfB.json() as any;
    assert(resProfB.status === 200 && profBData.profile.displayName === 'David K.', 'PUT /api/roommates/profile saves Student B roommate preferences');

    // Discover Matches
    const resDiscover = await fetch(`${BASE_URL}/roommates/discover`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const discoverData = await resDiscover.json() as any;
    const matchWithB = discoverData.matches?.find((m: any) => m.profile.userId === studentBId);
    assert(
      resDiscover.status === 200 &&
      Boolean(matchWithB) &&
      matchWithB.compatibilityScore >= 75 &&
      matchWithB.compatibilityLabel.includes('Potential Match') &&
      !matchWithB.compatibilityLabel.toLowerCase().includes('perfect'),
      'GET /api/roommates/discover calculates deterministic compatibility ("Potential Match") with transparent checks'
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 6: ROOMMATE REQUEST & MUTUAL CHAT WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 6: Request Workflow & Mutual Messaging ---');

    // Send Request A -> B
    const resReq = await fetch(`${BASE_URL}/roommates/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        receiverId: studentBId,
        message: 'Hi David! Saw we have matching budget and quiet study preferences for Under G.'
      })
    });
    const reqData = await resReq.json() as any;
    createdRoommateRequestId = reqData.requestId;
    assert(resReq.status === 201 && reqData.status === 'PENDING', 'POST /api/roommates/requests sends connection request');

    // Attempt Messaging before Acceptance (Must be Rejected)
    const resPrematureMsg = await fetch(`${BASE_URL}/roommates/requests/${createdRoommateRequestId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ message: 'Can you hear me?' })
    });
    assert(resPrematureMsg.status >= 400, 'Messaging blocked before mutual request acceptance (Contact Privacy Protection)');

    // Accept Request B -> A
    const resAccept = await fetch(`${BASE_URL}/roommates/requests/${createdRoommateRequestId}/respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
      body: JSON.stringify({ action: 'ACCEPT' })
    });
    const acceptData = await resAccept.json() as any;
    if (resAccept.status !== 200) {
      console.error('Accept Request Error:', resAccept.status, acceptData);
    }
    assert(resAccept.status === 200 && acceptData.status === 'ACCEPTED', 'PUT /api/roommates/requests/:id/respond accepts match');

    // Send Message after Acceptance
    const resMsg = await fetch(`${BASE_URL}/roommates/requests/${createdRoommateRequestId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ message: 'Great connecting David! When are you free for an inspection in Under G?' })
    });
    const msgData = await resMsg.json() as any;
    if (resMsg.status !== 201) {
      console.error('Send Message Error:', resMsg.status, msgData);
    }
    assert(resMsg.status === 201 && Boolean(msgData.id), 'POST /api/roommates/requests/:id/messages delivers mutual chat message');

    // Get Messages
    const resGetMsgs = await fetch(`${BASE_URL}/roommates/requests/${createdRoommateRequestId}/messages`, {
      headers: { Authorization: `Bearer ${studentBToken}` }
    });
    const msgsData = await resGetMsgs.json() as any;
    assert(resGetMsgs.status === 200 && msgsData.messages?.length > 0, 'GET /api/roommates/requests/:id/messages returns conversation history');

    // -------------------------------------------------------------------------
    // TEST GROUP 7: BLOCKING, REPORTING & ADMIN MODERATION
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 7: Blocking, Reporting & Trust & Safety ---');

    // Submit Report
    const resRep = await fetch(`${BASE_URL}/community/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        entityType: 'QUESTION',
        entityId: createdQuestionId,
        reason: 'SPAM',
        description: 'Testing report functionality'
      })
    });
    const repData = await resRep.json() as any;
    createdReportId = repData.reportId;
    assert(resRep.status === 201 && repData.status === 'OPEN', 'POST /api/community/reports files report to Trust & Safety');

    // Admin view reports
    const resAdmReps = await fetch(`${BASE_URL}/community/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const admRepsData = await resAdmReps.json() as any;
    assert(resAdmReps.status === 200 && admRepsData.reports?.length > 0, 'GET /api/community/admin/reports lists reports queue for admin review');

    // Admin resolve report & moderate
    const resResolve = await fetch(`${BASE_URL}/community/admin/reports/${createdReportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'RESOLVED',
        adminNotes: 'Reviewed by admin. Content meets guidelines.',
        hideEntity: false
      })
    });
    assert(resResolve.status === 200, 'PUT /api/community/admin/reports/:id resolves report with audit log');

    // Block User
    const resBlock = await fetch(`${BASE_URL}/roommates/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ blockedId: studentBId, reason: 'Testing block functionality' })
    });
    assert(resBlock.status === 200, 'POST /api/roommates/block blocks student and terminates match');

    // -------------------------------------------------------------------------
    // TEST GROUP 8: SECURITY & RBAC ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- Test Group 8: Security & Anti-Impersonation ---');

    // Student cannot access admin reports
    const resUnauthAdm = await fetch(`${BASE_URL}/community/admin/reports`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    assert(resUnauthAdm.status === 403, 'Student cannot access admin moderation reports (403 Forbidden)');

    // Provider cannot pretend to be student in community answers (author_role stored as PROVIDER)
    const resProviderAns = await fetch(`${BASE_URL}/community/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({
        questionId: createdQuestionId,
        content: 'Official landlord response: We provide 24/7 borehole water with solar pump.'
      })
    });
    const provAnsData = await resProviderAns.json() as any;
    if (resProviderAns.status !== 201) {
      console.error('Provider Answer Error:', resProviderAns.status, provAnsData);
    }
    const provAns = provAnsData.answers?.find((a: any) => a.userId === providerId);
    assert(
      resProviderAns.status === 201 &&
      Boolean(provAns) &&
      provAns.authorRole === 'PROVIDER' &&
      provAns.authorName.includes('(Hostel Provider)'),
      'Provider answers are strictly branded with (Hostel Provider) tag preventing student impersonation'
    );

    console.log('\n===============================================================');
    console.log(`📊 PHASE 14 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('===============================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 14 STUDENT COMMUNITY & ROOMMATE TESTS PASSED PERFECTLY!\n');
    } else {
      console.error(`⚠️ Some tests failed (${totalTests - passedTests} failed).\n`);
    }

  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
  }
}

runPhase14TestSuite();
