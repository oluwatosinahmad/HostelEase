import db from '../server/db';

const API_BASE = 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}${detail ? ` — ${detail}` : ''}`);
    testsFailed++;
  }
}

async function postJson(url: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function putJson(url: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function patchJson(url: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getJson(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function deleteJson(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runPhase9Tests() {
  console.log('\n========================================================================');
  console.log('🚀 HOSTEL EASE PHASE 9 — PROVIDER PORTAL & HOSTEL MANAGEMENT TEST SUITE');
  console.log('========================================================================\n');

  const ts = Date.now();
  const landlordEmail = `landlord_p9_${ts}@hostelease.ng`;
  const landlordBEmail = `landlord_b_p9_${ts}@hostelease.ng`;
  const staffEmail = `staff_p9_${ts}@hostelease.ng`;
  const studentEmail = `student_p9_${ts}@lautech.edu.ng`;
  const password = 'Password123!';

  // =========================================================================
  // TEST GROUP 1: AUTHENTICATION & PROVIDER ONBOARDING
  // =========================================================================
  console.log('--- TEST GROUP 1: Provider Registration & Onboarding Flow ---');

  // 1. Register Landlord A
  const regRes = await postJson(`${API_BASE}/auth/register`, {
    email: landlordEmail,
    password,
    fullName: 'Chief Adebayo Alabi',
    phone: '08023456789',
    role: 'PROVIDER'
  });
  assert(regRes.status === 201 && !!regRes.data.token, 'Landlord A registered successfully with JWT');
  const landlordToken = regRes.data.token;
  const landlordId = regRes.data.user.id;

  // 2. Register Landlord B (for isolation tests)
  const regBRes = await postJson(`${API_BASE}/auth/register`, {
    email: landlordBEmail,
    password,
    fullName: 'Mrs. Folashade Adeleke',
    phone: '08155443322',
    role: 'PROVIDER'
  });
  const landlordBToken = regBRes.data.token;
  const landlordBId = regBRes.data.user.id;

  // 3. Register Staff user
  const regStaffRes = await postJson(`${API_BASE}/auth/register`, {
    email: staffEmail,
    password,
    fullName: 'Mr. Sunday (Caretaker)',
    phone: '08077665544',
    role: 'PROVIDER'
  });
  const staffId = regStaffRes.data.user.id;

  // 4. Register Student
  const regStudentRes = await postJson(`${API_BASE}/auth/register`, {
    email: studentEmail,
    password,
    fullName: 'Femi Babatunde',
    phone: '08099887766',
    role: 'STUDENT'
  });
  const studentToken = regStudentRes.data.token;
  const studentId = regStudentRes.data.user.id;

  // 5. Get initial onboarding state
  const onbGet = await getJson(`${API_BASE}/provider/onboarding`, landlordToken);
  assert(onbGet.status === 200, 'Fetched initial provider onboarding profile');
  assert(onbGet.data.onboarding.onboardingCompleted === false, 'Initial onboarding state is incomplete');

  // 6. Save & Continue Later (Step 1 -> Step 2)
  const onbSave1 = await putJson(`${API_BASE}/provider/onboarding`, {
    fullName: 'Chief Adebayo Alabi',
    phone: '08023456789',
    businessName: 'Alabi Royal Accommodations',
    managementType: 'DIRECT_OWNER',
    step: 2,
    completed: false
  }, landlordToken);
  assert(onbSave1.status === 200 && onbSave1.data.completed === false, 'Onboarding step 1 saved ("Save & Continue Later")');

  // 7. Complete Onboarding (Step 3 -> Completed)
  const onbSave2 = await putJson(`${API_BASE}/provider/onboarding`, {
    businessRegNo: 'BN-1234567',
    address: '15 High School Road, Under G, Ogbomoso',
    idType: 'NIN_CARD',
    step: 3,
    completed: true
  }, landlordToken);
  assert(onbSave2.status === 200 && onbSave2.data.completed === true, 'Provider onboarding completed successfully');

  // =========================================================================
  // TEST GROUP 2: DASHBOARD STATS & REVENUE AGGREGATION
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Real Provider Dashboard Stats ---');

  const dashRes1 = await getJson(`${API_BASE}/provider/dashboard`, landlordToken);
  assert(dashRes1.status === 200, 'GET /api/provider/dashboard returned HTTP 200');
  assert(dashRes1.data.stats.totalHostels === 0, 'Initial total hostels is 0');
  assert(dashRes1.data.stats.availableSpaces === 0, 'Initial available spaces is 0');

  // =========================================================================
  // TEST GROUP 3: HOSTEL LISTING CRUD & IMMUTABLE PRICE HISTORY
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Property CRUD & Transparent Price History ---');

  // 1. Create a new hostel listing
  const createPropRes = await postJson(`${API_BASE}/provider/properties`, {
    title: `Alabi Prestige Villa ${ts}`,
    areaId: 'area-under-g',
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    description: 'Modern student self-contain lodge with 24/7 borehole water and solar lighting.',
    address: 'Plot 7, Alabi Avenue, Under G, Ogbomoso',
    nearbyLandmark: 'Close to Under G Primary School',
    distanceFromCampusKm: 0.6,
    pricing: {
      period: 'YEARLY',
      rentAmount: 180000,
      serviceCharge: 15000,
      agencyFee: 15000,
      cautionFee: 10000,
      otherMandatoryCharges: 5000,
      notes: 'Includes waste disposal and compound security levy'
    },
    amenityKeys: ['electricity', 'water', 'security', 'kitchen'],
    mediaItems: [
      {
        type: 'IMAGE',
        cat: 'EXTERIOR',
        url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5',
        caption: 'Gate and front compound',
        isCover: true
      }
    ]
  }, landlordToken);

  assert(createPropRes.status === 201 && !!createPropRes.data.propertyId, 'Hostel listing created with transparent mandatory fees');
  const propertyId = createPropRes.data.propertyId;

  // 2. Fetch provider properties
  const myProps = await getJson(`${API_BASE}/provider/properties`, landlordToken);
  assert(myProps.status === 200 && myProps.data.properties.length === 1, 'Provider listings query returns 1 registered hostel');

  // 3. Update property price with audit trail reason
  const updatePriceRes = await putJson(`${API_BASE}/provider/properties/${propertyId}`, {
    title: `Alabi Prestige Villa ${ts}`,
    areaId: 'area-under-g',
    propertyType: 'SELF_CONTAIN',
    genderPreference: 'ANY',
    description: 'Upgraded with brand new solar backup inverters.',
    address: 'Plot 7, Alabi Avenue, Under G, Ogbomoso',
    distanceFromCampusKm: 0.6,
    pricing: {
      rentAmount: 200000,
      serviceCharge: 15000,
      agencyFee: 15000,
      cautionFee: 10000,
      otherMandatoryCharges: 5000,
      reason: 'Upgraded compound with solar inverters and water purification'
    }
  }, landlordToken);

  assert(updatePriceRes.status === 200, 'Hostel details and rent updated');

  // 4. Verify immutable price change history
  const histRes = await getJson(`${API_BASE}/provider/properties/${propertyId}/price-history`, landlordToken);
  assert(histRes.status === 200 && histRes.data.priceHistory.length >= 1, 'Price history retrieved');
  const priceRecord = histRes.data.priceHistory[0];
  assert(priceRecord.previousRent === 180000 && priceRecord.newRent === 200000, 'Price history accurately recorded previous (180k) and new rent (200k)');
  assert(priceRecord.changeReason.includes('solar inverters'), 'Price history contains valid audit reason');

  // 5. Toggle availability status
  const availToggle = await patchJson(`${API_BASE}/provider/properties/${propertyId}/availability`, {
    availabilityStatus: 'UNAVAILABLE'
  }, landlordToken);
  assert(availToggle.status === 200, 'Availability status updated to UNAVAILABLE');

  const availToggle2 = await patchJson(`${API_BASE}/provider/properties/${propertyId}/availability`, {
    availabilityStatus: 'AVAILABLE'
  }, landlordToken);
  assert(availToggle2.status === 200, 'Availability status toggled back to AVAILABLE');

  // =========================================================================
  // TEST GROUP 4: ROOM & BEDSPACE INVENTORY & CONCURRENCY
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Room & Bedspace Inventory Concurrency ---');

  // 1. Add Room 101 with 2 bedspaces
  const addRoomRes = await postJson(`${API_BASE}/provider/properties/${propertyId}/rooms`, {
    roomName: 'Flat 101 Deluxe',
    roomType: 'SINGLE_ROOM',
    maxOccupants: 2,
    quantityTotal: 2,
    isEnsuite: true,
    isFurnished: false
  }, landlordToken);

  assert(addRoomRes.status === 201 && !!addRoomRes.data.roomId, 'Room created with 2 bedspaces');
  const roomId = addRoomRes.data.roomId;

  // 2. Fetch rooms
  const roomsRes = await getJson(`${API_BASE}/provider/properties/${propertyId}/rooms`, landlordToken);
  assert(roomsRes.status === 200 && roomsRes.data.rooms.length >= 1, 'Rooms fetched for property');
  const roomObj = roomsRes.data.rooms.find((r: any) => r.id === roomId);
  assert(roomObj.bedspaces?.length === 2, '2 individual bedspaces auto-generated for room');
  assert(roomObj.quantityAvailable === 2, 'Room initially has 2 available spaces');

  const bedspace1 = roomObj.bedspaces[0];
  const bedspace2 = roomObj.bedspaces[1];

  // 3. Mark Bedspace 1 as OCCUPIED
  const updateBed1 = await putJson(`${API_BASE}/provider/rooms/${roomId}/bedspaces/${bedspace1.id}`, {
    status: 'OCCUPIED',
    isOccupied: true
  }, landlordToken);
  assert(updateBed1.status === 200, 'Bedspace 1 marked as OCCUPIED');

  // 4. Verify room quantityAvailable automatically synchronized to 1
  const roomsRes2 = await getJson(`${API_BASE}/provider/properties/${propertyId}/rooms`, landlordToken);
  const updatedRoom = roomsRes2.data.rooms.find((r: any) => r.id === roomId);
  assert(updatedRoom.quantityAvailable === 1, 'Room quantityAvailable synchronized down to 1');
  assert(updatedRoom.occupiedCount === 1, 'Room occupiedCount synchronized up to 1');

  // 5. Update Room Details
  const updateRoomRes = await putJson(`${API_BASE}/provider/rooms/${roomId}`, {
    roomName: 'Flat 101 Premium Deluxe',
    isFurnished: true
  }, landlordToken);
  assert(updateRoomRes.status === 200, 'Room details updated successfully');

  // =========================================================================
  // TEST GROUP 5: UNIFIED CALENDAR & WEEKLY INSPECTION SCHEDULES
  // =========================================================================
  console.log('\n--- TEST GROUP 5: Unified Calendar & Inspection Time Windows ---');

  // 1. Get unified calendar feed
  const calRes = await getJson(`${API_BASE}/provider/calendar`, landlordToken);
  assert(calRes.status === 200 && Array.isArray(calRes.data.events), 'Unified calendar feed returns events array');

  // 2. Configure weekly inspection schedule (Mon-Sat 09:00 - 17:00, Sun off)
  const schedUpdate = await putJson(`${API_BASE}/provider/inspections/availability`, {
    schedules: [
      { dayOfWeek: 'MONDAY', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'TUESDAY', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'WEDNESDAY', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'THURSDAY', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'FRIDAY', isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'SATURDAY', isAvailable: true, startTime: '10:00', endTime: '15:00' },
      { dayOfWeek: 'SUNDAY', isAvailable: false, startTime: '12:00', endTime: '16:00' }
    ]
  }, landlordToken);
  assert(schedUpdate.status === 200, 'Weekly inspection schedule saved');

  const schedGet = await getJson(`${API_BASE}/provider/inspections/availability`, landlordToken);
  assert(schedGet.status === 200 && schedGet.data.schedules.length === 7, '7 days inspection schedules fetched');
  const sunSlot = schedGet.data.schedules.find((s: any) => s.dayOfWeek === 'SUNDAY');
  assert(sunSlot.isAvailable === false, 'Sunday correctly marked unavailable for tours');

  // =========================================================================
  // TEST GROUP 6: REUSABLE QUICK REPLIES
  // =========================================================================
  console.log('\n--- TEST GROUP 6: Reusable Quick Reply Message Templates ---');

  // 1. Create quick reply
  const qrCreate = await postJson(`${API_BASE}/provider/quick-replies`, {
    title: 'Water & Light Policy',
    messageText: 'Water runs automatically from the borehole morning & evening. Solar power supports lighting 24/7.',
    category: 'UTILITIES'
  }, landlordToken);
  assert(qrCreate.status === 201 && !!qrCreate.data.id, 'Quick reply template created');
  const qrId = qrCreate.data.id;

  // 2. Fetch quick replies
  const qrGet = await getJson(`${API_BASE}/provider/quick-replies`, landlordToken);
  assert(qrGet.status === 200 && qrGet.data.quickReplies.length >= 1, 'Quick replies list retrieved');

  // 3. Delete quick reply
  const qrDel = await deleteJson(`${API_BASE}/provider/quick-replies/${qrId}`, landlordToken);
  assert(qrDel.status === 200, 'Quick reply deleted successfully');

  // =========================================================================
  // TEST GROUP 7: PERFORMANCE CONVERSION FUNNEL & REVIEWS
  // =========================================================================
  console.log('\n--- TEST GROUP 7: Conversion Funnel & Student Reviews ---');

  // 1. Fetch Performance Funnel
  const perfRes = await getJson(`${API_BASE}/provider/performance?propertyId=${propertyId}`, landlordToken);
  assert(perfRes.status === 200 && !!perfRes.data.funnel, 'Performance conversion funnel retrieved');
  assert(typeof perfRes.data.funnel.views === 'number', 'Funnel views is numeric');
  assert(typeof perfRes.data.funnel.saves === 'number', 'Funnel shortlist saves is numeric');

  // 2. Insert verified student review into database
  const revId = 'rev-p9-' + ts;
  db.prepare(`
    INSERT INTO reviews (id, property_id, student_id, rating, clean_rating, security_rating, water_rating, electricity_rating, comment, is_verified_stay, created_at)
    VALUES (?, ?, ?, 5, 5, 5, 5, 4, 'Very clean hostel with constant borehole water near LAUTECH', 1, CURRENT_TIMESTAMP)
  `).run(revId, propertyId, studentId);

  // 3. Re-fetch performance to see review
  const perfRes2 = await getJson(`${API_BASE}/provider/performance?propertyId=${propertyId}`, landlordToken);
  assert(perfRes2.data.reviews.totalReviews >= 1, 'Verified student review included in provider performance');

  // 4. Report Review for moderation
  const repRes = await postJson(`${API_BASE}/provider/reviews/${revId}/report`, {
    reason: 'INAPPROPRIATE_REVIEW',
    description: 'Test moderation flag'
  }, landlordToken);
  assert(repRes.status === 201, 'Review reported to admin moderation team');

  // =========================================================================
  // TEST GROUP 8: PROVIDER AI ASSISTANT (ZERO-HALLUCINATION GROUNDING)
  // =========================================================================
  console.log('\n--- TEST GROUP 8: Landlord AI Assistant Grounding ---');

  const aiRes = await postJson(`${API_BASE}/provider/ai/assist`, {
    prompt: 'How many bedspaces do I currently have available?',
    propertyId
  }, landlordToken);

  assert(aiRes.status === 200 && !!aiRes.data.response, 'Provider AI Assistant returned response');
  assert(aiRes.data.response.toLowerCase().includes('space') || aiRes.data.response.toLowerCase().includes('available'), 'AI grounded in provider bedspace capacity');

  // =========================================================================
  // TEST GROUP 9: TEAM ROLES & MULTI-USER ACCESS
  // =========================================================================
  console.log('\n--- TEST GROUP 9: Team Roles & Management Access ---');

  // 1. Add staff user as MANAGER
  const addTeam = await postJson(`${API_BASE}/provider/team`, {
    email: staffEmail,
    role: 'MANAGER',
    propertyId
  }, landlordToken);
  assert(addTeam.status === 201 && !!addTeam.data.id, 'Team member added with MANAGER role');
  const teamMemberId = addTeam.data.id;

  // 2. Fetch Team list
  const teamGet = await getJson(`${API_BASE}/provider/team`, landlordToken);
  assert(teamGet.status === 200 && teamGet.data.team.length >= 1, 'Team member retrieved in provider roster');

  // 3. Remove Team Member
  const remTeam = await deleteJson(`${API_BASE}/provider/team/${teamMemberId}`, landlordToken);
  assert(remTeam.status === 200, 'Team member removed from provider account');

  // =========================================================================
  // TEST GROUP 10: PROVIDER AUDIT TRAIL LOGS
  // =========================================================================
  console.log('\n--- TEST GROUP 10: Provider Activity Audit Trail ---');

  const auditRes = await getJson(`${API_BASE}/provider/audit-logs`, landlordToken);
  assert(auditRes.status === 200 && Array.isArray(auditRes.data.logs), 'Audit logs endpoint returns array');
  assert(auditRes.data.logs.length > 0, 'Audit entries exist for created property / room modifications');

  // =========================================================================
  // TEST GROUP 11: MULTI-TENANT SECURITY & ISOLATION GUARDS
  // =========================================================================
  console.log('\n--- TEST GROUP 11: Strict Cross-Tenant Security Guards ---');

  // 1. Landlord B attempts to update Landlord A's property -> MUST RETURN HTTP 403
  const hackUpdateProp = await putJson(`${API_BASE}/provider/properties/${propertyId}`, {
    title: 'Hacked Title',
    pricing: { rentAmount: 50000 }
  }, landlordBToken);
  assert(hackUpdateProp.status === 403, 'Cross-tenant protection: Provider B forbidden from updating Provider A property (HTTP 403)');

  // 2. Landlord B attempts to delete Landlord A's room -> MUST RETURN HTTP 403
  const hackDeleteRoom = await deleteJson(`${API_BASE}/provider/rooms/${roomId}`, landlordBToken);
  assert(hackDeleteRoom.status === 403, 'Cross-tenant protection: Provider B forbidden from deleting Provider A room (HTTP 403)');

  // 3. Landlord B attempts to update Landlord A's bedspace -> MUST RETURN HTTP 403
  const hackUpdateBed = await putJson(`${API_BASE}/provider/rooms/${roomId}/bedspaces/${bedspace2.id}`, {
    status: 'OCCUPIED'
  }, landlordBToken);
  assert(hackUpdateBed.status === 403, 'Cross-tenant protection: Provider B forbidden from modifying Provider A bedspace (HTTP 403)');

  // 4. Student attempts to access provider dashboard -> MUST RETURN HTTP 403
  const studentHackDash = await getJson(`${API_BASE}/provider/dashboard`, studentToken);
  assert(studentHackDash.status === 403, 'Role guard: Student forbidden from accessing provider portal endpoints (HTTP 403)');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`  PHASE 9 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('========================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch(err => {
  console.error('Test execution exception:', err);
  process.exit(1);
});
