import db from '../server/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const API_BASE = 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
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

async function runTests() {
  console.log('\n🚀 STARTING HOSTEL EASE PHASE 7 TEST SUITE (STUDENT DASHBOARD & PERSONALIZATION)...\n');

  // Unique test identifiers
  const timestamp = Date.now();
  const studentEmail = `student_p7_${timestamp}@lautech.edu.ng`;
  const studentBEmail = `student_p7_b_${timestamp}@lautech.edu.ng`;
  const providerEmail = `provider_p7_${timestamp}@lautech.edu.ng`;
  const password = 'Password123!';
  const newPassword = 'NewPassword456!';

  // =========================================================================
  // TEST GROUP 1: AUTHENTICATION & INITIAL DASHBOARD STATE
  // =========================================================================
  console.log('--- TEST GROUP 1: Registration & Initial Dashboard Hub State ---');

  // 1. Register Student A
  const regRes = await postJson(`${API_BASE}/auth/register`, {
    email: studentEmail,
    password,
    fullName: 'David Adeleke',
    phone: '08012345678',
    role: 'STUDENT'
  });
  assert(regRes.status === 201 && !!regRes.data.token, 'Student A registered successfully with JWT');
  const studentToken = regRes.data.token;
  const studentId = regRes.data.user.id;

  // 2. Register Student B
  const regBRes = await postJson(`${API_BASE}/auth/register`, {
    email: studentBEmail,
    password,
    fullName: 'Chioma Chukwu',
    phone: '08098765432',
    role: 'STUDENT'
  });
  const studentBToken = regBRes.data.token;
  const studentBId = regBRes.data.user.id;

  // 3. Register Provider
  const regPRes = await postJson(`${API_BASE}/auth/register`, {
    email: providerEmail,
    password,
    fullName: 'Chief Balogun Landlord',
    phone: '08033334444',
    role: 'PROVIDER'
  });
  const providerToken = regPRes.data.token;
  const providerId = regPRes.data.user.id;

  // 4. Initial Dashboard Hub Query
  const dashRes = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashRes.status === 200, 'GET /api/student/dashboard returns 200 OK');
  assert(dashRes.data.summary.savedCount === 0, 'Initial savedCount is 0');
  assert(dashRes.data.summary.pendingInspectionsCount === 0, 'Initial pendingInspectionsCount is 0');
  assert(dashRes.data.summary.activeBookingsCount === 0, 'Initial activeBookingsCount is 0');
  assert(dashRes.data.summary.pendingPaymentsCount === 0, 'Initial pendingPaymentsCount is 0');
  assert(dashRes.data.summary.unreadMessagesCount === 0, 'Initial unreadMessagesCount is 0');
  assert(dashRes.data.urgentAction.actionType === 'EXPLORE_HOSTELS', 'Default urgent action is EXPLORE_HOSTELS (Priority 7)');
  assert(dashRes.data.profileCompleteness.score < 100, 'Initial profile completeness correctly reflects missing academic fields');

  // =========================================================================
  // TEST GROUP 2: STUDENT PREFERENCES & BUDGET PROFILE
  // =========================================================================
  console.log('\n--- TEST GROUP 2: Accommodation Preferences & Budget Storage ---');

  // Get areas
  const areasRes = await getJson(`${API_BASE}/areas`);
  const area1 = areasRes.data.areas[0]?.id || 'area-under-g';
  const area2 = areasRes.data.areas[1]?.id || 'area-adenike';

  // 1. Save preferences
  const savePrefRes = await putJson(`${API_BASE}/student/preferences`, {
    minBudget: 120000,
    maxBudget: 220000,
    preferredAreas: [area1, area2],
    preferredRoomTypes: ['SELF_CONTAIN', 'SINGLE_ROOM'],
    preferredFacilities: ['water', 'electricity', 'security'],
    maxDistanceKm: 2.0,
    genderPreference: 'ANY',
    preferredMoveInDate: '2026-09-15',
    isMoveInFlexible: true,
    academicSession: '2026/2027'
  }, studentToken);
  assert(savePrefRes.status === 200 && savePrefRes.data.success === true, 'PUT /api/student/preferences updates preferences and marks onboarding completed');

  // 2. Retrieve preferences
  const getPrefRes = await getJson(`${API_BASE}/student/preferences`, studentToken);
  assert(getPrefRes.status === 200, 'GET /api/student/preferences returns 200 OK');
  assert(getPrefRes.data.preferences.minBudget === 120000, 'minBudget matches 120,000');
  assert(getPrefRes.data.preferences.maxBudget === 220000, 'maxBudget matches 220,000');
  assert(getPrefRes.data.preferences.preferredAreas.length === 2, 'preferredAreas contains 2 selected areas');
  assert(getPrefRes.data.preferences.onboardingCompleted === true, 'onboardingCompleted is true');

  // =========================================================================
  // TEST GROUP 3: EXPLAINABLE RULE-BASED RECOMMENDATIONS
  // =========================================================================
  console.log('\n--- TEST GROUP 3: Rule-Based Recommendations with Explainable Reasons ---');

  const recRes = await getJson(`${API_BASE}/student/recommendations`, studentToken);
  assert(recRes.status === 200, 'GET /api/student/recommendations returns 200 OK');
  assert(Array.isArray(recRes.data.recommendations), 'Recommendations return an array of properties');

  if (recRes.data.recommendations.length > 0) {
    const firstRec = recRes.data.recommendations[0];
    assert(Array.isArray(firstRec.explanationReasons) && firstRec.explanationReasons.length > 0, 
      `First recommendation has explanation badges: "${firstRec.explanationReasons.join(' | ')}"`);
    assert(typeof firstRec.matchScore === 'number', 'Recommendation has computed rule match score');
  }

  // =========================================================================
  // TEST GROUP 4: "WHAT'S NEXT?" SMART ACTION PRIORITIZATION HIERARCHY
  // =========================================================================
  console.log('\n--- TEST GROUP 4: Smart Action Prioritization Hierarchy (Urgency Order) ---');

  // Find an available property in db
  const testProp = db.prepare(`
    SELECT p.id, p.title, p.area_id, r.id as room_id, bs.id as bedspace_id, pr.rent_amount, pr.total_mandatory_cost
    FROM properties p
    JOIN rooms r ON r.property_id = p.id
    LEFT JOIN bedspaces bs ON bs.room_id = r.id
    JOIN prices pr ON pr.property_id = p.id
    WHERE p.verification_status = 'APPROVED'
    LIMIT 1
  `).get() as any;

  // Step A: Save 2 properties -> Priority 6 (COMPARE_SAVED)
  const propList = db.prepare(`SELECT id FROM properties WHERE verification_status = 'APPROVED' LIMIT 2`).all() as any[];
  await postJson(`${API_BASE}/properties/${propList[0].id}/save`, {}, studentToken);
  await postJson(`${API_BASE}/properties/${propList[1].id}/save`, {}, studentToken);

  const dashAfterSave = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterSave.data.summary.savedCount === 2, 'savedCount updated to 2');
  assert(dashAfterSave.data.urgentAction.actionType === 'COMPARE_SAVED', 'Urgent action is COMPARE_SAVED when 2+ hostels shortlisted');

  // Step B: Landlord sends a message -> Priority 5 (UNREAD_MESSAGES)
  await postJson(`${API_BASE}/messages/conversations`, {
    propertyId: testProp.id,
    studentId,
    initialMessage: 'Hello! Are you still interested in inspecting this self-contain?'
  }, providerToken);

  const dashAfterMsg = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterMsg.data.summary.unreadMessagesCount >= 1, 'unreadMessagesCount incremented');
  assert(dashAfterMsg.data.urgentAction.actionType === 'VIEW_MESSAGES', 'Urgent action elevated to VIEW_MESSAGES (Priority 5)');

  // Step C: Student requests inspection -> Priority 4 (INSPECTION_PENDING)
  const inspRes = await postJson(`${API_BASE}/inspections/properties/${testProp.id}`, {
    inspectionType: 'PHYSICAL',
    preferredDate: '2026-09-02',
    preferredTime: '11:00 AM',
    notes: 'Please I want to check the water pressure.'
  }, studentToken);
  const inspectionId = inspRes.data.inspectionId;

  const dashAfterInsp = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterInsp.data.summary.pendingInspectionsCount >= 1, 'pendingInspectionsCount incremented');
  assert(dashAfterInsp.data.urgentAction.actionType === 'VIEW_INSPECTIONS', 'Urgent action elevated to VIEW_INSPECTIONS (Priority 4)');

  // Step D: Student creates pending booking -> Priority 3 (BOOKING_PENDING)
  const bookRes = await postJson(`${API_BASE}/bookings/reserve`, {
    propertyId: testProp.id,
    roomId: testProp.room_id,
    bedspaceId: testProp.bedspace_id,
    moveInDate: '2026-09-10',
    academicSession: '2026/2027',
    specialRequests: 'Ground floor preferred'
  }, studentToken);
  const bookingId = bookRes.data.booking?.id || bookRes.data.bookingId;

  const dashAfterBook = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterBook.data.summary.activeBookingsCount >= 1, 'activeBookingsCount incremented');
  assert(dashAfterBook.data.urgentAction.actionType === 'VIEW_BOOKINGS', 'Urgent action elevated to VIEW_BOOKINGS (Priority 3)');

  // Step E: Landlord confirms inspection -> Priority 2 (UPCOMING_INSPECTION)
  db.prepare(`UPDATE inspection_requests SET status = 'CONFIRMED' WHERE id = ?`).run(inspectionId);

  const dashAfterInspConf = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterInspConf.data.urgentAction.actionType === 'VIEW_INSPECTION', 'Urgent action elevated to UPCOMING_INSPECTION (Priority 2)');

  // Step F: Landlord confirms booking (Payment required) -> Priority 1 (PAYMENT_REQUIRED)
  db.prepare(`UPDATE bookings SET status = 'CONFIRMED', payment_status = 'UNPAID' WHERE id = ?`).run(bookingId);

  const dashAfterBookConf = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashAfterBookConf.data.summary.pendingPaymentsCount === 1, 'pendingPaymentsCount is 1');
  assert(dashAfterBookConf.data.urgentAction.actionType === 'PAY_NOW', 'Urgent action elevated to highest priority PAYMENT_REQUIRED (Priority 1)');
  assert(dashAfterBookConf.data.urgentAction.amount > 0, 'Urgent action includes exact payable amount (Rent + Fee)');

  // =========================================================================
  // TEST GROUP 5: LIVE PRICE & AVAILABILITY CHANGE ALERTS
  // =========================================================================
  console.log('\n--- TEST GROUP 5: Live Price Change & Availability Alerts on Shortlist ---');

  // Insert price history update for shortlisted property
  const histId = `ph-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO price_history (id, property_id, provider_id, previous_rent, new_rent, previous_total_mandatory, new_total_mandatory, change_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+1 second'))
  `).run(histId, propList[0].id, providerId, 150000, 165000, 150000, 165000, 'Annual inflation review');

  // Update property availability to LIMITED
  db.prepare(`UPDATE properties SET availability_status = 'LIMITED' WHERE id = ?`).run(propList[0].id);

  const dashPriceAlert = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  const alertedHostel = dashPriceAlert.data.savedHostels.find((h: any) => h.id === propList[0].id);
  assert(alertedHostel.priceChanged === true, 'priceChanged alert flag is true after landlord price edit');
  assert(alertedHostel.availabilityChanged === true, 'availabilityChanged alert flag is true');
  assert(alertedHostel.availabilityAlert === 'Few spaces left!', 'availabilityAlert contains human-friendly warning');

  // =========================================================================
  // TEST GROUP 6: RECENTLY VIEWED HOSTELS TRACKING
  // =========================================================================
  console.log('\n--- TEST GROUP 6: Recently Viewed Hostels Tracking ---');

  // Record view
  const recViewRes = await postJson(`${API_BASE}/student/recently-viewed`, { propertyId: testProp.id }, studentToken);
  assert(recViewRes.status === 200 && recViewRes.data.success === true, 'POST /api/student/recently-viewed logs hostel view');

  // Get recently viewed
  const getViewRes = await getJson(`${API_BASE}/student/recently-viewed`, studentToken);
  assert(getViewRes.status === 200, 'GET /api/student/recently-viewed returns 200 OK');
  assert(getViewRes.data.recentlyViewed.some((h: any) => h.id === testProp.id), 'Recently viewed list includes viewed hostel');

  // =========================================================================
  // TEST GROUP 7: SEARCH HISTORY MANAGEMENT (CRUD)
  // =========================================================================
  console.log('\n--- TEST GROUP 7: Search History Tracking & Management ---');

  // Record 2 searches
  const sh1 = await postJson(`${API_BASE}/student/search-history`, {
    queryText: 'Adenike Self-contain with light',
    filters: { areaId: 'area-adenike', maxPrice: 200000 }
  }, studentToken);
  assert(sh1.status === 201 && !!sh1.data.id, 'POST /api/student/search-history stores search query');

  const sh2 = await postJson(`${API_BASE}/student/search-history`, {
    queryText: 'Under-G solar lodge',
    filters: { areaId: 'area-under-g' }
  }, studentToken);

  // Fetch search history
  const shListRes = await getJson(`${API_BASE}/student/search-history`, studentToken);
  assert(shListRes.status === 200, 'GET /api/student/search-history returns 200 OK');
  assert(shListRes.data.searchHistory.length >= 2, 'searchHistory contains recorded search items');

  // Delete single search item
  const delShRes = await deleteJson(`${API_BASE}/student/search-history/${sh1.data.id}`, studentToken);
  assert(delShRes.status === 200 && delShRes.data.success === true, 'DELETE /api/student/search-history/:id removes search item');

  // Clear all search history
  const clearShRes = await deleteJson(`${API_BASE}/student/search-history`, studentToken);
  assert(clearShRes.status === 200 && clearShRes.data.success === true, 'DELETE /api/student/search-history clears all history');

  const emptyShRes = await getJson(`${API_BASE}/student/search-history`, studentToken);
  assert(emptyShRes.data.searchHistory.length === 0, 'Search history is now empty');

  // =========================================================================
  // TEST GROUP 8: PROFILE UPDATES & COMPLETENESS SCORE
  // =========================================================================
  console.log('\n--- TEST GROUP 8: Student Profile Details & Completeness Score ---');

  const profUpdRes = await putJson(`${API_BASE}/student/profile`, {
    fullName: 'David Adeleke',
    phone: '08012345678',
    department: 'Computer Engineering',
    level: '300',
    matricNo: '2023/LAU/CPE/0456',
    gender: 'MALE'
  }, studentToken);
  assert(profUpdRes.status === 200 && profUpdRes.data.success === true, 'PUT /api/student/profile updates student academic info');

  const profGetRes = await getJson(`${API_BASE}/student/profile`, studentToken);
  assert(profGetRes.data.profile.matric_no === '2023/LAU/CPE/0456', 'Matric number verified');
  assert(profGetRes.data.profile.department === 'Computer Engineering', 'Department verified');
  assert(profGetRes.data.profile.level === '300', 'Level verified');

  const dashFinal = await getJson(`${API_BASE}/student/dashboard`, studentToken);
  assert(dashFinal.data.profileCompleteness.score === 100, 'Profile completeness reaches 100% when all fields and preferences are filled');
  assert(dashFinal.data.profileCompleteness.missingFields.length === 0, 'No missing profile fields reported');

  // =========================================================================
  // TEST GROUP 9: NOTIFICATION PREFERENCES & PASSWORD CHANGE
  // =========================================================================
  console.log('\n--- TEST GROUP 9: Notification Preferences & Account Security ---');

  // 1. Notification preferences
  const notifUpdRes = await putJson(`${API_BASE}/student/notification-preferences`, {
    inspectionReminders: true,
    availabilityAlerts: true,
    priceAlerts: false,
    recommendationAlerts: true
  }, studentToken);
  assert(notifUpdRes.status === 200 && notifUpdRes.data.success === true, 'PUT /api/student/notification-preferences saves notification toggles');

  const notifGetRes = await getJson(`${API_BASE}/student/notification-preferences`, studentToken);
  assert(notifGetRes.data.notificationPreferences.priceAlerts === false, 'priceAlerts preference correctly reflects false');

  // 2. Change password
  const pwRes = await postJson(`${API_BASE}/student/change-password`, {
    currentPassword: password,
    newPassword
  }, studentToken);
  assert(pwRes.status === 200 && pwRes.data.success === true, 'POST /api/student/change-password changes password with bcrypt verification');

  // 3. Login with new password
  const newLoginRes = await postJson(`${API_BASE}/auth/login`, {
    email: studentEmail,
    password: newPassword
  });
  assert(newLoginRes.status === 200 && !!newLoginRes.data.token, 'Student logs in successfully with new password');

  // =========================================================================
  // TEST GROUP 10: CROSS-STUDENT PRIVACY & SECURITY
  // =========================================================================
  console.log('\n--- TEST GROUP 10: Strict Authorization & Cross-Student Privacy ---');

  // Student B accessing dashboard gets Student B's data, not Student A's
  const dashBRes = await getJson(`${API_BASE}/student/dashboard`, studentBToken);
  assert(dashBRes.data.user.email === studentBEmail, 'Student B dashboard returns only Student B profile');
  assert(dashBRes.data.summary.activeBookingsCount === 0, 'Student B sees 0 active bookings (does not leak Student A booking)');

  // Provider accessing student dashboard receives 403 Forbidden
  const provAccessRes = await getJson(`${API_BASE}/student/dashboard`, providerToken);
  assert(provAccessRes.status === 403, 'Provider account is forbidden (403) from accessing student personal hub');

  // Unauthenticated request receives 401 Unauthorized
  const anonAccessRes = await getJson(`${API_BASE}/student/dashboard`);
  assert(anonAccessRes.status === 401, 'Unauthenticated request receives 401 Unauthorized');

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log('\n--- Cleaning up temporary test records ---');
  db.prepare('DELETE FROM student_preferences WHERE user_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM recently_viewed_hostels WHERE user_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM student_search_history WHERE user_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM student_notification_preferences WHERE user_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM messages WHERE sender_id IN (?, ?, ?)').run(studentId, studentBId, providerId);
  db.prepare('DELETE FROM conversations WHERE student_id IN (?, ?) OR provider_id = ?').run(studentId, studentBId, providerId);
  db.prepare('DELETE FROM bookings WHERE student_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM inspection_requests WHERE student_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM saved_properties WHERE user_id IN (?, ?)').run(studentId, studentBId);
  db.prepare('DELETE FROM price_history WHERE id = ?').run(histId);
  db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(studentId, studentBId, providerId);
  console.log('✅ Temporary test records cleaned up.');

  console.log('\n==================================================');
  console.log(`🎉 PHASE 7 TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner execution failed:', err);
  process.exit(1);
});
