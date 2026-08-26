const API_BASE = 'http://localhost:5000/api';

interface TestResult {
  title: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, title: string, details?: any) {
  if (condition) {
    results.push({ title, passed: true, details });
    console.log(`  ✅ PASS: ${title}`);
  } else {
    results.push({ title, passed: false, details });
    console.error(`  ❌ FAIL: ${title}`, details || '');
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('  🧪 HOSTEL EASE PHASE 4 AUTOMATED TEST SUITE');
  console.log('  Testing Inspection Workflow, State Machine, Virtual Links, Messaging & Security');
  console.log('==================================================\n');

  try {
    // ----------------------------------------------------
    // STEP 1: AUTHENTICATION (Student, Provider, Attacker)
    // ----------------------------------------------------
    console.log('📌 Test Group 1: User Authentication & Role Setup');

    // 1.1 Login Student
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    const studentData = await studentLoginRes.json() as any;
    assert(studentLoginRes.status === 200 && !!studentData.token, 'Student login successful', { role: studentData.user?.role });
    const studentToken = studentData.token;
    const studentId = studentData.user.id;

    // 1.2 Login Provider
    const providerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    const providerData = await providerLoginRes.json() as any;
    assert(providerLoginRes.status === 200 && !!providerData.token, 'Provider login successful', { role: providerData.user?.role });
    const providerToken = providerData.token;
    const providerId = providerData.user.id;

    // 1.3 Register / Login a 2nd Student (for isolation testing)
    const randomSuffix = Math.floor(Math.random() * 100000);
    const attackerEmail = `privacy_test_student_${randomSuffix}@lautech.edu.ng`;
    const attackerRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Amina Bello',
        email: attackerEmail,
        password: 'Password123!',
        role: 'STUDENT',
        phone: '+2348099887766'
      })
    });
    const attackerData = await attackerRegRes.json() as any;
    assert(attackerRegRes.status === 201 && !!attackerData.token, 'Second student registered for isolation test');
    const attackerToken = attackerData.token;

    // ----------------------------------------------------
    // STEP 2: DISCOVER HOSTEL & CREATE INSPECTION REQUESTS
    // ----------------------------------------------------
    console.log('\n📌 Test Group 2: Inspection Request Creation & Anti-Duplicate Validation');

    // 2.1 Fetch provider's properties
    const propRes = await fetch(`${API_BASE}/properties`);
    const propData = await propRes.json() as any;
    const allProps = propData.properties || [];
    
    // Pick property owned by our logged-in provider
    const testProperty = allProps.find((p: any) => p.provider?.id === providerId || p.provider_id === providerId) || allProps[0];
    assert(!!testProperty && !!testProperty.id, 'Retrieved active property for inspection test', { title: testProperty?.title, id: testProperty?.id });

    // Cancel any previous active inspection for clean test state
    const existingInspectionsRes = await fetch(`${API_BASE}/inspections`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const existingInspections = await existingInspectionsRes.json() as any;
    for (const insp of (existingInspections.inspections || [])) {
      if (insp.propertyId === testProperty.id && ['PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(insp.status)) {
        await fetch(`${API_BASE}/inspections/${insp.id}/cancel`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
          body: JSON.stringify({ reason: 'Automated test suite reset' })
        });
      }
    }

    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    const testDateStr = testDate.toISOString().split('T')[0];

    // 2.2 Submit physical inspection request
    const createInspRes = await fetch(`${API_BASE}/inspections/properties/${testProperty.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        inspectionType: 'PHYSICAL',
        preferredDate: testDateStr,
        preferredTime: '10:00 AM',
        studentPhone: '+2348012345678',
        notes: 'I would like to check the water pressure and power backup.'
      })
    });
    const createInspData = await createInspRes.json() as any;
    assert(createInspRes.status === 201 && !!createInspData.inspectionId, 'Student submitted physical inspection request', createInspData);
    const inspectionId = createInspData.inspectionId;

    // 2.3 Duplicate request rejection
    const duplicateRes = await fetch(`${API_BASE}/inspections/properties/${testProperty.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        inspectionType: 'PHYSICAL',
        preferredDate: testDateStr,
        preferredTime: '10:00 AM'
      })
    });
    assert(duplicateRes.status === 400, 'Duplicate active inspection request correctly rejected with 400 Bad Request');

    // 2.4 Past date rejection
    const pastDateRes = await fetch(`${API_BASE}/inspections/properties/${testProperty.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${attackerToken}`
      },
      body: JSON.stringify({
        inspectionType: 'PHYSICAL',
        preferredDate: '2020-01-01',
        preferredTime: '10:00 AM'
      })
    });
    assert(pastDateRes.status === 400, 'Past date inspection request correctly rejected with 400 Bad Request');

    // ----------------------------------------------------
    // STEP 3: PROVIDER INSPECTION STATE MACHINE
    // ----------------------------------------------------
    console.log('\n📌 Test Group 3: Inspection Workflow & State Transitions');

    // 3.1 Provider suggests reschedule
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 3);
    const altDate = nextDay.toISOString().split('T')[0];

    const rescheduleRes = await fetch(`${API_BASE}/inspections/${inspectionId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        alternativeDate: altDate,
        alternativeTime: '02:00 PM',
        message: 'I have lectures in the morning, afternoon works best.'
      })
    });
    const rescheduleData = await rescheduleRes.json() as any;
    assert(rescheduleRes.status === 200, 'Provider proposed reschedule to student', rescheduleData);

    // 3.2 Student confirms reschedule
    const confirmRescheduleRes = await fetch(`${API_BASE}/inspections/${inspectionId}/confirm-reschedule`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });
    assert(confirmRescheduleRes.status === 200, 'Student accepted and confirmed reschedule');

    // Verify inspection is now confirmed
    const getInspRes = await fetch(`${API_BASE}/inspections`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const getInspData = await getInspRes.json() as any;
    const confirmedInsp = getInspData.inspections?.find((i: any) => i.id === inspectionId);
    assert(confirmedInsp?.status === 'CONFIRMED', 'Inspection transitioned to CONFIRMED state');

    // 3.4 Create a VIRTUAL inspection to test secure meeting room generation
    const virtualDate = new Date();
    virtualDate.setDate(virtualDate.getDate() + 4);
    const virtualDateStr = virtualDate.toISOString().split('T')[0];

    const createVirtualRes = await fetch(`${API_BASE}/inspections/properties/${testProperty.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${attackerToken}`
      },
      body: JSON.stringify({
        inspectionType: 'VIRTUAL',
        preferredDate: virtualDateStr,
        preferredTime: '11:00 AM',
        notes: 'Live video walkthrough request'
      })
    });
    const virtualData = await createVirtualRes.json() as any;
    const virtualInspId = virtualData.inspectionId;

    // Provider accepts virtual inspection
    const acceptVirtualRes = await fetch(`${API_BASE}/inspections/${virtualInspId}/accept`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({ message: 'Virtual tour confirmed.' })
    });
    const acceptVirtualData = await acceptVirtualRes.json() as any;
    assert(acceptVirtualRes.status === 200 && !!acceptVirtualData.virtualMeetingUrl, 'Virtual meeting link generated upon confirmation', {
      link: acceptVirtualData.virtualMeetingUrl
    });

    // 3.5 Virtual meeting link access security
    // Attacker (authorized student) can access
    const virtualAccessOk = await fetch(`${API_BASE}/inspections/${virtualInspId}/virtual-link`, {
      headers: { 'Authorization': `Bearer ${attackerToken}` }
    });
    assert(virtualAccessOk.status === 200, 'Authorized student accessed private virtual meeting link');

    // Student 1 (unauthorized) cannot access attacker's virtual link
    const virtualAccessDenied = await fetch(`${API_BASE}/inspections/${virtualInspId}/virtual-link`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(virtualAccessDenied.status === 403, 'Unauthorized student blocked from accessing private meeting link (403 Forbidden)');

    // ----------------------------------------------------
    // STEP 4: PRIVATE NOTES & EXPERIENCE FEEDBACK
    // ----------------------------------------------------
    console.log('\n📌 Test Group 4: Private Notes & Inspection Feedback');

    // 4.1 Save private student notes
    const saveNotesRes = await fetch(`${API_BASE}/inspections/${inspectionId}/private-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        notes: 'Water runs smoothly, compound is clean and fenced, room tiles are intact.'
      })
    });
    assert(saveNotesRes.status === 200, 'Student saved private inspection notes');

    // 4.2 Complete the inspection
    const completeRes = await fetch(`${API_BASE}/inspections/${inspectionId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${providerToken}`
      }
    });
    assert(completeRes.status === 200, 'Inspection marked as completed');

    // 4.3 Student submits 5-star experience rating
    const feedbackRes = await fetch(`${API_BASE}/inspections/${inspectionId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Landlord was punctual and showed all facilities accurately.'
      })
    });
    assert(feedbackRes.status === 200, 'Student submitted inspection experience feedback (5 stars)');

    // 4.4 Provider Calendar Aggregation
    const calRes = await fetch(`${API_BASE}/inspections/calendar`, {
      headers: { 'Authorization': `Bearer ${providerToken}` }
    });
    const calData = await calRes.json() as any;
    assert(calRes.status === 200 && Array.isArray(calData.completed), 'Provider calendar loaded grouped inspection data', {
      completedCount: calData.completed?.length
    });

    // ----------------------------------------------------
    // STEP 5: ACCOMMODATION IN-APP MESSAGING
    // ----------------------------------------------------
    console.log('\n📌 Test Group 5: In-App Messaging & Accommodation Chat');

    // 5.1 Student starts conversation
    const startConvRes = await fetch(`${API_BASE}/messages/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        propertyId: testProperty.id,
        initialMessage: 'Good afternoon, is the self-contained room on the first floor still available?'
      })
    });
    const startConvData = await startConvRes.json() as any;
    assert(startConvRes.status === 200 && !!startConvData.conversationId, 'Conversation initiated anchored to hostel', {
      conversationId: startConvData.conversationId
    });
    const conversationId = startConvData.conversationId;

    // 5.2 Provider checks conversations list
    const provConvsRes = await fetch(`${API_BASE}/messages/conversations`, {
      headers: { 'Authorization': `Bearer ${providerToken}` }
    });
    const provConvsData = await provConvsRes.json() as any;
    const foundConv = provConvsData.conversations?.find((c: any) => c.id === conversationId);
    assert(!!foundConv, 'Provider found active hostel conversation in conversation list');

    // 5.3 Provider replies to message
    const sendReplyRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        content: 'Yes, it is available. It has prepaid meter and borehole water.'
      })
    });
    assert(sendReplyRes.status === 201, 'Provider replied to student in conversation');

    // 5.4 Student opens conversation (marks read)
    const readConvRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const readConvData = await readConvRes.json() as any;
    assert(readConvRes.status === 200 && readConvData.messages?.length >= 2, 'Student retrieved conversation message thread', {
      messageCount: readConvData.messages?.length
    });

    // 5.5 Global Unread Messages Count
    const unreadRes = await fetch(`${API_BASE}/messages/unread-count`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const unreadData = await unreadRes.json() as any;
    assert(unreadRes.status === 200 && typeof unreadData.unreadCount === 'number', 'Global unread messages counter endpoint functional', unreadData);

    // ----------------------------------------------------
    // STEP 6: SECURITY ISOLATION & USER MODERATION
    // ----------------------------------------------------
    console.log('\n📌 Test Group 6: Security Isolation & User Moderation');

    // 6.1 Unauthorized student access to conversation
    const eavesdropRes = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${attackerToken}` }
    });
    assert(eavesdropRes.status === 403, 'Unauthorized third-party student blocked from reading private chat (403 Forbidden)');

    // 6.2 Submit Safety / Abuse Report
    const reportRes = await fetch(`${API_BASE}/messages/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        reportedUserId: providerId,
        conversationId,
        reason: 'SUSPICIOUS_BEHAVIOR',
        description: 'Testing safety moderation reporting system.'
      })
    });
    assert(reportRes.status === 201, 'Student submitted user safety moderation report');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log('\n==================================================');
    console.log(`  📊 PHASE 4 TEST RESULTS: ${passedCount}/${totalCount} Passed (${Math.round((passedCount/totalCount)*100)}%)`);
    console.log('==================================================\n');

    if (passedCount === totalCount) {
      console.log('🎉 ALL PHASE 4 TESTS PASSED! Ready for production.');
      process.exit(0);
    } else {
      console.error('⚠️ Some tests failed. Please review the output above.');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error running Phase 4 tests:', err);
    process.exit(1);
  }
}

runTests();
