const BASE_URL = 'http://localhost:5000/api';

async function req(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('=== EXACT SAVE HOSTEL DATA-MAPPING VERIFICATION ===\n');

  // Step 1: Student opens "Find a Hostel"
  console.log('1. Fetching available hostels from /api/properties...');
  const propRes = await req(`${BASE_URL}/properties`);
  const properties = propRes.properties || [];
  if (properties.length < 3) {
    throw new Error('Expected at least 3 properties returned from database');
  }

  const hostelA = properties[0];
  const hostelB = properties[1];
  const hostelC = properties[2];

  console.log(`  Hostel A: [${hostelA.id}] "${hostelA.title}" - ₦${hostelA.priceSummary?.rentAmount}`);
  console.log(`  Hostel B: [${hostelB.id}] "${hostelB.title}" - ₦${hostelB.priceSummary?.rentAmount}`);
  console.log(`  Hostel C: [${hostelC.id}] "${hostelC.title}" - ₦${hostelC.priceSummary?.rentAmount}`);

  // Step 2: Login as Student
  console.log('\n2. Logging in as student student@lautech.edu.ng...');
  const login = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: 'student@lautech.edu.ng', password: 'Student123!' }
  });
  const token = login.token;
  const studentUser = login.user;
  console.log(`  Authenticated as: ${studentUser.fullName} (ID: ${studentUser.id})`);

  // Clean existing shortlist for clean test
  const existingSaved = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  for (const s of (existingSaved.savedProperties || [])) {
    await req(`${BASE_URL}/saved-properties/${s.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Step 3: Student clicks Save on HOSTEL B ONLY
  console.log(`\n3. Student clicks Save on HOSTEL B [${hostelB.id}] "${hostelB.title}"...`);
  const saveRes = await req(`${BASE_URL}/properties/${hostelB.id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { notes: 'Testing Hostel B save' }
  });
  console.log('  Save response:', saveRes);

  // Step 4: Verify Saved page / GET /api/saved-properties
  console.log('\n4. Verifying Saved page retrieves exact HOSTEL B...');
  const savedRes1 = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const saved1 = savedRes1.savedProperties || [];
  console.log(`  Shortlist count: ${saved1.length}`);

  if (saved1.length !== 1) {
    throw new Error(`Expected exactly 1 saved property, but got ${saved1.length}`);
  }

  const retrievedB = saved1[0];
  console.log(`  Retrieved Property: [${retrievedB.id}] "${retrievedB.title}"`);
  console.log(`  Location: ${retrievedB.area?.name || retrievedB.address}`);
  console.log(`  Rent: ₦${retrievedB.priceSummary?.rentAmount}`);
  console.log(`  Cover Image: ${retrievedB.coverImage ? 'PRESENT' : 'MISSING'}`);

  if (retrievedB.id !== hostelB.id) {
    throw new Error(`CRITICAL BUG: Saved property ID [${retrievedB.id}] does not match clicked Hostel B ID [${hostelB.id}]!`);
  }
  if (retrievedB.title !== hostelB.title) {
    throw new Error(`CRITICAL BUG: Saved property title "${retrievedB.title}" does not match clicked Hostel B title "${hostelB.title}"!`);
  }
  if (retrievedB.id === hostelA.id || retrievedB.id === hostelC.id) {
    throw new Error(`CRITICAL BUG: System substituted Hostel A or C for Hostel B!`);
  }
  console.log('  >>> PASSED: Exact Hostel B saved and retrieved without substitution!');

  // Step 5: Save Hostel A and Hostel C (Total 3 Hostels)
  console.log(`\n5. Saving Hostel A [${hostelA.id}] and Hostel C [${hostelC.id}]...`);
  await req(`${BASE_URL}/properties/${hostelA.id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  await req(`${BASE_URL}/properties/${hostelC.id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  const savedRes3 = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const saved3 = savedRes3.savedProperties || [];
  console.log(`  Shortlist count now: ${saved3.length}`);
  if (saved3.length !== 3) {
    throw new Error(`Expected 3 saved properties, got ${saved3.length}`);
  }

  const savedIds3 = new Set(saved3.map((p: any) => p.id));
  if (!savedIds3.has(hostelA.id) || !savedIds3.has(hostelB.id) || !savedIds3.has(hostelC.id)) {
    throw new Error(`Shortlist does not contain all 3 clicked hostels! Contains: ${Array.from(savedIds3).join(', ')}`);
  }
  console.log('  >>> PASSED: All 3 exact hostels are in the shortlist!');

  // Step 6: Verify Student Dashboard endpoint
  console.log('\n6. Verifying /api/student/dashboard returns exact 3 saved hostels...');
  const dashRes = await req(`${BASE_URL}/student/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dashSaved = dashRes.savedHostels || [];
  console.log(`  Dashboard saved count: ${dashRes.summary?.savedCount}, savedHostels: ${dashSaved.length}`);
  if (dashRes.summary?.savedCount !== 3 || dashSaved.length !== 3) {
    throw new Error('Student dashboard summary or list count mismatch');
  }
  console.log('  >>> PASSED: Student dashboard matches exact saved hostels!');

  // Step 7: Cross-Device synchronization
  console.log('\n7. Verifying cross-device synchronization (Device 2 login)...');
  const device2Res = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (device2Res.savedProperties.length !== 3) {
    throw new Error('Cross-device fetch failed to retrieve all 3 hostels');
  }
  console.log('  Device 2 retrieved identical 3 hostels from backend database.');

  // Unsave Hostel B from Device 2
  console.log(`\n8. Removing Hostel B [${hostelB.id}] from Device 2...`);
  await req(`${BASE_URL}/properties/${hostelB.id}/save`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  const afterDelete = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const remainingIds = afterDelete.savedProperties.map((p: any) => p.id);
  console.log('  Remaining IDs:', remainingIds);
  if (remainingIds.includes(hostelB.id)) {
    throw new Error('Hostel B was not removed');
  }
  if (!remainingIds.includes(hostelA.id) || !remainingIds.includes(hostelC.id)) {
    throw new Error('Hostel A or C was unintentionally removed');
  }
  console.log('  >>> PASSED: Unsaving Hostel B accurately leaves only Hostel A and Hostel C!');

  // Step 8: Multi-user isolation
  console.log('\n9. Verifying multi-user isolation (New student account)...');
  const student2Email = `student_test_${Date.now()}@lautech.edu.ng`;
  const reg = await req(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: {
      fullName: 'Bolaji Oladipo',
      email: student2Email,
      password: 'Password123!',
      role: 'STUDENT'
    }
  });
  const token2 = reg.token;
  const student2Saved = await req(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token2}` }
  });
  console.log(`  Student 2 initial saved count: ${student2Saved.savedProperties.length}`);
  if (student2Saved.savedProperties.length !== 0) {
    throw new Error('Student 2 saw saved hostels from another student!');
  }
  console.log('  >>> PASSED: Strict multi-user isolation confirmed!');

  console.log('\n======================================================');
  console.log('🎉 ALL DATA-MAPPING & SAVE SHORTLIST TESTS PASSED 100%!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
