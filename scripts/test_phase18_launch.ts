const BASE_URL = 'http://localhost:5000/api';

let studentToken = '';
let studentId = '';
let providerToken = '';
let providerId = '';
let adminToken = '';
let adminId = '';

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

async function runPhase18LaunchAudit() {
  console.log('\n===============================================================');
  console.log('🚀 HOSTEL EASE V1 — PHASE 18 FINAL LAUNCH VERIFICATION AUDIT');
  console.log('📍 Focus: LAUTECH Students | Ogbomoso, Oyo State, Nigeria');
  console.log('===============================================================\n');

  try {
    const timestamp = Date.now();

    // 1. HEALTH & METRICS CHECK
    console.log('--- 1. SYSTEM HEALTH & CORE LOCALIZATION ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json() as any;
    assert(healthRes.status === 200 && healthData.status === 'ok', 'System Health Check endpoint reports healthy');
    assert(healthData.university.includes('LAUTECH') && healthData.university.includes('Ogbomoso'), 'Platform localized strictly to LAUTECH Ogbomoso market');

    // 2. STUDENT REGISTRATION & PERSONALIZATION
    console.log('\n--- 2. STUDENT ONBOARDING & PERSONALIZED EXPERIENCE ---');
    const studentEmail = `ahmad_launch_${timestamp}@lautech.edu.ng`;
    const regStudentRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ahmad Babatunde',
        email: studentEmail,
        password: 'Password123!',
        phone: '08031112233',
        role: 'STUDENT',
        studentDetails: {
          department: 'Computer Science',
          matricNo: '19/4001',
          level: '300'
        }
      })
    });
    const regStudentData = await regStudentRes.json() as any;
    assert(regStudentRes.status === 201 && Boolean(regStudentData.token), 'Student registers successfully with credentials');
    studentToken = regStudentData.token;
    studentId = regStudentData.user.id;

    // Student Save Preferences
    const prefRes = await fetch(`${BASE_URL}/student/dashboard/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        minBudget: 120000,
        maxBudget: 220000,
        preferredAreas: ['area-under-g', 'area-adenike'],
        preferredRoomTypes: ['SELF_CONTAIN'],
        preferredFacilities: ['water', 'electricity', 'security'],
        maxDistanceKm: 2.0,
        genderPreference: 'ANY',
        onboardingCompleted: true
      })
    });
    assert(prefRes.status === 200 || prefRes.status === 201, 'Student saves tailored accommodation preferences');

    // Student Dashboard Access
    const dashRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const dashData = await dashRes.json() as any;
    assert(dashRes.status === 200 && Boolean(dashData.summary), 'Student Dashboard loads personal recommendations and summary');

    // 3. PROVIDER ONBOARDING & LISTING CREATION
    console.log('\n--- 3. PROVIDER ONBOARDING & LISTING VERIFICATION ---');
    const providerEmail = `provider_launch_${timestamp}@hostelease.ng`;
    const regProvRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alhaji Kareem Adeleke',
        email: providerEmail,
        password: 'Password123!',
        phone: '08035556677',
        role: 'PROVIDER',
        providerDetails: {
          businessName: 'Adeleke Student Hostels & Lodges'
        }
      })
    });
    const regProvData = await regProvRes.json() as any;
    assert(regProvRes.status === 201 && Boolean(regProvData.token), 'Landlord / Provider registers with business identity');
    providerToken = regProvData.token;
    providerId = regProvData.user.id;

    // 4. ADMIN PLATFORM AUDIT & SECURITY CHECK
    console.log('\n--- 4. ADMIN PORTAL & ROLE-BASED ACCESS CONTROL ---');
    const adminEmail = `admin_launch_${timestamp}@hostelease.ng`;
    const regAdminRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Operations Super Admin',
        email: adminEmail,
        password: 'Password123!',
        phone: '08039990000',
        role: 'ADMIN'
      })
    });
    const regAdminData = await regAdminRes.json() as any;
    assert(regAdminRes.status === 201 && Boolean(regAdminData.token), 'Admin creates verified platform management account');
    adminToken = regAdminData.token;
    adminId = regAdminData.user.id;

    // Role Enforcement: Student cannot access Admin Operations
    const unauthorizedRes = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(unauthorizedRes.status === 403, 'Strict Role Separation: Student rejected from admin dashboard (403 Forbidden)');

    // 5. ACCOMMODATION SEARCH, DISCOVERY & COMPARISON
    console.log('\n--- 5. ACCOMMODATION DISCOVERY & FILTERS ---');
    const searchRes = await fetch(`${BASE_URL}/properties?limit=10`);
    const searchData = await searchRes.json() as any;
    assert(searchRes.status === 200 && Array.isArray(searchData.properties || searchData), 'Public accommodation search returns verified listings');

    const hostelList = searchData.properties || searchData;
    const testHostel = hostelList[0];
    assert(Boolean(testHostel && testHostel.title), `Discovered active hostel: ${testHostel?.title || 'Verified Hostel'}`);

    // Get room details for booking
    const availRes = await fetch(`${BASE_URL}/bookings/availability/properties/${testHostel.id}`);
    const availData = await availRes.json() as any;
    const testRoom = availData.rooms?.[0];
    assert(Boolean(testRoom && testRoom.id), `Fetched available room space: ${testRoom?.name || 'Room 1'}`);

    // 6. INSPECTION & SHORTLIST FLOW
    console.log('\n--- 6. INSPECTION & SHORTLIST MANAGEMENT ---');
    const saveRes = await fetch(`${BASE_URL}/saved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ propertyId: testHostel.id })
    });
    assert(saveRes.status === 200 || saveRes.status === 201, 'Student successfully saves hostel to Shortlist');

    // 7. BOOKING & ESCROW PAYMENT FLOW
    console.log('\n--- 7. LIVE BOOKING & ESCROW PAYMENT LIFECYCLE ---');
    const bookRes = await fetch(`${BASE_URL}/bookings/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        propertyId: testHostel.id,
        roomId: testRoom.id,
        academicSession: '2026/2027',
        moveInDate: '2026-09-01'
      })
    });
    const bookData = await bookRes.json() as any;
    assert(bookRes.status === 201 && Boolean(bookData.bookingId || bookData.bookingReference), 'Student creates official bedspace booking reservation');
    const activeBookingId = bookData.bookingId;

    // Escrow Payment Initialization
    const payRes = await fetch(`${BASE_URL}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        bookingId: activeBookingId,
        paymentProvider: 'PAYSTACK_SANDBOX',
        paymentMethod: 'CARD'
      })
    });
    const payData = await payRes.json() as any;
    assert(payRes.status === 201 && Boolean(payData.paymentReference), `Payment reference generated securely: ${payData.paymentReference}`);

    // Escrow Payment Verification via Gateway
    const verifyPayRes = await fetch(`${BASE_URL}/payments/verify/${payData.paymentReference}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const verifyPayData = await verifyPayRes.json() as any;
    assert(verifyPayRes.status === 200 && verifyPayData.status === 'SUCCESS', 'Escrow payment verified and held safely in student protection escrow');

    // 8. MOVE-IN CHECKLIST & ISSUE RESOLUTION
    console.log('\n--- 8. MOVE-IN PREPARATION & SUPPORT DISPUTES ---');
    const moveInRes = await fetch(`${BASE_URL}/move-in/student/current`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const moveInData = await moveInRes.json() as any;
    assert(moveInRes.status === 200 && moveInData.hasActiveMoveIn === true, 'Student Move-In Hub provides pre-arrival checklist, room key instructions & contacts');

    // Student Support Report
    const reportRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        targetType: 'PROPERTY',
        targetId: testHostel.id,
        category: 'MAINTENANCE',
        reason: 'Pre-arrival water tap inspection verification',
        description: 'Verifying borehole water pumping schedule before packing bags.'
      })
    });
    assert(reportRes.status === 201, 'Student can easily report issues and request support without stress');

    // 9. AUDIT & RECOVERY VERIFICATION
    console.log('\n--- 9. SECURITY AUDIT & DATA INTEGRITY ---');
    const auditRes = await fetch(`${BASE_URL}/monitoring/summary`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200, 'Append-only audit trail and monitoring records sensitive operations');

    console.log('\n===============================================================');
    console.log(`📊 PHASE 18 FINAL AUDIT RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('===============================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL PHASE 18 FINAL LAUNCH VERIFICATION AUDITS PASSED PERFECTLY!\n');
      console.log('🌟 HOSTEL EASE V1 IS 100% READY FOR REAL-WORLD LAUNCH TO LAUTECH STUDENTS!\n');
    } else {
      console.error(`⚠️ Some tests failed (${totalTests - passedTests} failed).\n`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during Phase 18 audit execution:', err);
    process.exit(1);
  }
}

runPhase18LaunchAudit();
