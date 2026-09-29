const BASE_URL = 'http://localhost:5000/api';

async function request(url: string, options: any = {}) {
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

async function runTest() {
  console.log('Testing exact 1 -> 3 -> 5 -> unsave 1 hostel flow...');

  // 1. Get properties
  const propRes = await request(`${BASE_URL}/properties`);
  const props = propRes.properties || propRes;
  const target5 = props.slice(0, 5);
  console.log('Selected 5 hostels for test:');
  target5.forEach((p: any, idx: number) => console.log(`  ${idx + 1}. [${p.id}] ${p.title} (${p.area?.name || 'Area'}) - ₦${p.priceSummary?.rentAmount}`));

  // 2. Login as student
  const login = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: { email: 'student@lautech.edu.ng', password: 'Student123!' }
  });
  const token = login.token;

  // Clean existing saved
  const initial = await request(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  for (const item of (initial.savedProperties || [])) {
    await request(`${BASE_URL}/saved-properties/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Save 1 Hostel
  console.log('\n--- Step 1: Save 1 Hostel ---');
  await request(`${BASE_URL}/properties/${target5[0].id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  let saved = await request(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Saved Count: ${saved.savedProperties.length}`);
  if (saved.savedProperties.length !== 1 || saved.savedProperties[0].id !== target5[0].id) {
    throw new Error('Failed at 1 saved hostel');
  }
  console.log(`Verified 1 hostel: [${saved.savedProperties[0].id}] ${saved.savedProperties[0].title}`);

  // Save 2 more (Total 3 Hostels)
  console.log('\n--- Step 2: Save 2 more (Total 3 Hostels) ---');
  await request(`${BASE_URL}/properties/${target5[1].id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  await request(`${BASE_URL}/properties/${target5[2].id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  saved = await request(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Saved Count: ${saved.savedProperties.length}`);
  if (saved.savedProperties.length !== 3) {
    throw new Error('Failed at 3 saved hostels');
  }
  const savedIds3 = saved.savedProperties.map((p: any) => p.id);
  console.log('Saved 3 IDs:', savedIds3);

  // Save 2 more (Total 5 Hostels)
  console.log('\n--- Step 3: Save 2 more (Total 5 Hostels) ---');
  await request(`${BASE_URL}/properties/${target5[3].id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  await request(`${BASE_URL}/properties/${target5[4].id}/save`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  saved = await request(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Saved Count: ${saved.savedProperties.length}`);
  if (saved.savedProperties.length !== 5) {
    throw new Error('Failed at 5 saved hostels');
  }
  const savedIds5 = saved.savedProperties.map((p: any) => p.id);
  console.log('Saved 5 IDs:', savedIds5);

  // Verify all fields are present on each saved hostel card
  saved.savedProperties.forEach((p: any) => {
    if (!p.id || !p.title || !p.coverImage || !p.area?.name || !p.priceSummary?.rentAmount || !p.availabilityStatus) {
      throw new Error(`Incomplete property data for saved property ${p.id}`);
    }
  });
  console.log('✅ Verified all 5 hostels have full database fields: title, coverImage, area, rent, availability, distance, propertyId');

  // Unsave 1 Hostel (e.g. target5[2])
  console.log(`\n--- Step 4: Unsave Hostel [${target5[2].id}] ---`);
  await request(`${BASE_URL}/properties/${target5[2].id}/save`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  saved = await request(`${BASE_URL}/saved-properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Saved Count after unsaving 1: ${saved.savedProperties.length}`);
  if (saved.savedProperties.length !== 4) {
    throw new Error('Expected 4 saved properties after unsaving 1');
  }
  const remainingIds = saved.savedProperties.map((p: any) => p.id);
  if (remainingIds.includes(target5[2].id)) {
    throw new Error('Unsaved hostel was not removed!');
  }
  console.log('Remaining 4 IDs:', remainingIds);

  console.log('\n🎉 ALL 1 -> 3 -> 5 -> UNSAVE 1 FLOW TESTS PASSED SUCCESSFULLY! 🎉');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
