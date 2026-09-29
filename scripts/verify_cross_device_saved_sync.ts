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
    const error: any = new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return { status: res.status, data };
}

async function runCrossDeviceVerification() {
  console.log('=====================================================');
  console.log('HOSTEL EASE: CROSS-DEVICE SAVED PROPERTIES SYNC TEST');
  console.log('=====================================================\n');

  try {
    // 0. Fetch initial properties to get valid property IDs
    const propsRes = await request(`${BASE_URL}/properties`);
    const allProperties = propsRes.data.properties || propsRes.data;
    if (!allProperties || allProperties.length < 4) {
      throw new Error('Not enough properties seeded in database');
    }
    const prop1 = allProperties[0].id;
    const prop2 = allProperties[1].id;
    const prop3 = allProperties[2].id;
    const prop4 = allProperties[3].id;
    console.log(`[Setup] Target Property IDs: ${prop1}, ${prop2}, ${prop3}, ${prop4}`);

    // Scenario 1: Phone (Device 1) logs in as User A
    console.log('\n--- SCENARIO 1: Phone (Device 1) Logs In as User A ---');
    const userALogin = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        email: 'student@lautech.edu.ng',
        password: 'Student123!'
      }
    });
    const device1Token = userALogin.data.token;
    const userAId = userALogin.data.user.id;
    console.log(`✅ Phone logged in as User A: ${userALogin.data.user.email} (ID: ${userAId})`);

    // Reset User A's saved properties for a clean test run
    const currentSaved = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device1Token}` }
    });
    for (const item of (currentSaved.data.savedProperties || [])) {
      await request(`${BASE_URL}/saved-properties/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${device1Token}` }
      });
    }
    console.log('🧹 Cleaned up existing saved items for fresh state verification.');

    // Save 3 Hostels on Phone
    console.log(`📱 Phone: Saving Hostel 1 (${prop1}), Hostel 2 (${prop2}), Hostel 3 (${prop3})...`);
    await request(`${BASE_URL}/saved-properties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${device1Token}` },
      body: { propertyId: prop1 }
    });
    await request(`${BASE_URL}/saved-properties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${device1Token}` },
      body: { propertyId: prop2 }
    });
    await request(`${BASE_URL}/saved-properties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${device1Token}` },
      body: { propertyId: prop3 }
    });

    const phoneSaved = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device1Token}` }
    });
    console.log(`📱 Phone: Saved items count = ${phoneSaved.data.savedProperties.length}`);
    if (phoneSaved.data.savedProperties.length !== 3) {
      throw new Error(`Expected 3 saved properties on Phone, got ${phoneSaved.data.savedProperties.length}`);
    }
    console.log('✅ Scenario 1 Passed: Phone saved 3 hostels and backend stored them.');

    // Scenario 2: Desktop (Device 2) logs into SAME account (fresh session, no shared local storage)
    console.log('\n--- SCENARIO 2: Laptop/Desktop (Device 2) Logs In as User A ---');
    const desktopLogin = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: {
        email: 'student@lautech.edu.ng',
        password: 'Student123!'
      }
    });
    const device2Token = desktopLogin.data.token; // Independent new token
    console.log('💻 Desktop: Logged in independently with fresh token.');

    const desktopSaved = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device2Token}` }
    });
    console.log(`💻 Desktop: Retrieved saved count = ${desktopSaved.data.savedProperties.length}`);
    const desktopIds = desktopSaved.data.savedProperties.map((p: any) => p.id);
    console.log(`💻 Desktop: Property IDs = ${desktopIds.join(', ')}`);
    if (desktopSaved.data.savedProperties.length !== 3) {
      throw new Error(`Expected 3 saved properties on Desktop, got ${desktopSaved.data.savedProperties.length}`);
    }
    console.log('✅ Scenario 2 Passed: Desktop automatically synchronized 3 saved hostels from backend.');

    // Scenario 3: Desktop saves Hostel 4 -> Phone refetches
    console.log('\n--- SCENARIO 3: Desktop Saves Hostel 4 -> Phone Refetches ---');
    console.log(`💻 Desktop: Saving Hostel 4 (${prop4})...`);
    await request(`${BASE_URL}/saved-properties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${device2Token}` },
      body: { propertyId: prop4 }
    });

    console.log('📱 Phone: Refetching saved hostels from backend...');
    const phoneAfterDesktopSave = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device1Token}` }
    });
    console.log(`📱 Phone: Saved count is now = ${phoneAfterDesktopSave.data.savedProperties.length}`);
    if (phoneAfterDesktopSave.data.savedProperties.length !== 4) {
      throw new Error(`Expected 4 saved properties on Phone after Desktop save, got ${phoneAfterDesktopSave.data.savedProperties.length}`);
    }
    console.log('✅ Scenario 3 Passed: Action performed on Desktop immediately synchronized to Phone.');

    // Scenario 4: Phone unsaves Hostel 2 -> Desktop refetches
    console.log('\n--- SCENARIO 4: Phone Unsaves Hostel 2 -> Desktop Refetches ---');
    console.log(`📱 Phone: Unsaving Hostel 2 (${prop2})...`);
    await request(`${BASE_URL}/saved-properties/${prop2}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${device1Token}` }
    });

    console.log('💻 Desktop: Refetching saved hostels from backend...');
    const desktopAfterPhoneUnsave = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device2Token}` }
    });
    console.log(`💻 Desktop: Saved count is now = ${desktopAfterPhoneUnsave.data.savedProperties.length}`);
    const remainingIds = desktopAfterPhoneUnsave.data.savedProperties.map((p: any) => p.id);
    console.log(`💻 Desktop: Remaining Property IDs = ${remainingIds.join(', ')}`);
    if (desktopAfterPhoneUnsave.data.savedProperties.length !== 3 || remainingIds.includes(prop2)) {
      throw new Error(`Expected 3 saved properties on Desktop without prop2, got ${desktopAfterPhoneUnsave.data.savedProperties.length}`);
    }
    console.log('✅ Scenario 4 Passed: Unsave on Phone immediately reflected on Desktop.');

    // Scenario 5: User Isolation (User B logs in)
    console.log('\n--- SCENARIO 5: Account Switching / Multi-User Isolation ---');
    const userBEmail = 'test.student.b@lautech.edu.ng';
    const userBPassword = 'Student456!';
    let device3Token: string;

    try {
      const bLogin = await request(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: {
          email: userBEmail,
          password: userBPassword
        }
      });
      device3Token = bLogin.data.token;
      console.log(`👤 User B logged in: ${userBEmail}`);
    } catch {
      console.log(`👤 Registering User B: ${userBEmail}...`);
      const bReg = await request(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: {
          email: userBEmail,
          password: userBPassword,
          fullName: 'Folake Adeleke',
          phone: '+2348099887766',
          role: 'STUDENT'
        }
      });
      device3Token = bReg.data.token;
      console.log(`👤 Registered & logged in User B: ${userBEmail}`);
    }

    // Clean User B's saved list
    const bSavedInitial = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device3Token}` }
    });
    for (const item of (bSavedInitial.data.savedProperties || [])) {
      await request(`${BASE_URL}/saved-properties/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${device3Token}` }
      });
    }

    const bSavedClean = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device3Token}` }
    });
    console.log(`👤 User B initial saved count = ${bSavedClean.data.savedProperties.length}`);
    if (bSavedClean.data.savedProperties.length !== 0) {
      throw new Error('User B must not see any of User A saved properties!');
    }
    console.log('🔒 Verified: User B has 0 saved properties (cannot see User A\'s saved hostels).');

    // User B saves only prop1
    console.log(`👤 User B: Saving Property ${prop1}...`);
    await request(`${BASE_URL}/saved-properties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${device3Token}` },
      body: { propertyId: prop1 }
    });

    const bSavedFinal = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device3Token}` }
    });
    console.log(`👤 User B saved count = ${bSavedFinal.data.savedProperties.length}`);

    // Re-verify User A still has 3
    const userACheck = await request(`${BASE_URL}/saved-properties`, {
      headers: { Authorization: `Bearer ${device1Token}` }
    });
    console.log(`📱 User A still has saved count = ${userACheck.data.savedProperties.length}`);
    if (userACheck.data.savedProperties.length !== 3) {
      throw new Error(`User A count corrupted: expected 3, got ${userACheck.data.savedProperties.length}`);
    }
    console.log('✅ Scenario 5 Passed: Perfect account isolation and zero cross-contamination.');

    // Scenario 6: Test /api/saved alias
    console.log('\n--- SCENARIO 6: Route Aliasing (/api/saved) Check ---');
    const aliasCheck = await request(`${BASE_URL}/saved`, {
      headers: { Authorization: `Bearer ${device1Token}` }
    });
    console.log(`🔗 /api/saved returns count = ${aliasCheck.data.savedProperties.length}`);
    if (aliasCheck.data.savedProperties.length !== 3) {
      throw new Error('Route alias /api/saved did not return expected saved properties');
    }
    console.log('✅ Scenario 6 Passed: /api/saved and /api/saved-properties are fully equivalent.');

    console.log('\n=====================================================');
    console.log('🎉 ALL CROSS-DEVICE SYNCHRONIZATION TESTS PASSED! 🎉');
    console.log('=====================================================');
  } catch (error: any) {
    console.error('❌ Verification failed:', error.data || error.message);
    process.exit(1);
  }
}

runCrossDeviceVerification();
