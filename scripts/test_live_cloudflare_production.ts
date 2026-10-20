const LIVE_BASE = 'https://hostelease.oluwatosinahmad.workers.dev';

async function testLiveProduction() {
  console.log('🌐 ========================================================');
  console.log('🌐 TESTING LIVE CLOUDFLARE PRODUCTION DEPLOYMENT');
  console.log(`🌐 Base URL: ${LIVE_BASE}`);
  console.log('🌐 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Live Health Check
  {
    const res = await fetch(`${LIVE_BASE}/api/health`);
    const data = await res.json() as any;
    assert(res.status === 200, 'Live /api/health returns HTTP 200');
    assert(data.status === 'ok', 'Live status is ok');
    assert(data.counts.videos === 56, `Live videos count is 56 (found ${data.counts.videos})`);
    assert(data.counts.users >= 180, `Live users count is >= 180 (found ${data.counts.users})`);
    assert(data.counts.saved === 23, `Live saved properties count is 23 (found ${data.counts.saved})`);
  }

  // 2. Live 4K Video Listing
  {
    const res = await fetch(`${LIVE_BASE}/api/videos`);
    const data = await res.json() as any;
    assert(res.status === 200, 'Live /api/videos returns HTTP 200');
    assert(data.counts.total === 56, `Live 4K video total count is 56 (found ${data.counts.total})`);
    assert(data.counts.verified === 55, `Live 4K video verified count is 55 (found ${data.counts.verified})`);
    const vid = data.videos[0];
    assert(Boolean(vid.video_url || vid.videoUrl), 'Video has valid video_url');
  }

  // 3. Live 4K Video Streaming Asset Check
  {
    const res = await fetch(`${LIVE_BASE}/uploads/sample_hostel_tour.mp4`, {
      headers: { Range: 'bytes=0-1024' }
    });
    assert(res.status === 200 || res.status === 206, `4K Video file streamable at /uploads/sample_hostel_tour.mp4 (HTTP ${res.status})`);
    assert(res.headers.get('content-type')?.includes('video/mp4') || false, 'Content-Type is video/mp4');
  }

  // 4. Live Saved Hostels Workflow (Save -> Get -> Unsave)
  {
    const studentHeaders = {
      'Content-Type': 'application/json',
      'x-user-id': 'user-student-1',
      'x-user-role': 'STUDENT',
      'x-user-email': 'student@lautech.edu.ng'
    };

    // Fetch pre-existing saved properties for student
    const getSavedRes = await fetch(`${LIVE_BASE}/api/saved`, {
      headers: studentHeaders
    });
    const getSavedData = await getSavedRes.json() as any;
    assert(getSavedRes.status === 200, 'Live GET /api/saved returns HTTP 200');
    assert(getSavedData.total >= 5, `Live user-student-1 has >= 5 saved properties (found ${getSavedData.total})`);
    assert(getSavedData.savedProperties.some((p: any) => p.id === 'prop-1'), 'prop-1 present in saved list');
    assert(getSavedData.savedProperties[0].isSaved === true, 'Saved property card has isSaved: true');

    // Save property endpoint test
    const saveRes = await fetch(`${LIVE_BASE}/api/saved`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ propertyId: 'prop-1' })
    });
    const saveData = await saveRes.json() as any;
    assert(saveRes.status === 201 || saveRes.status === 200, 'Live POST /api/saved returns HTTP 200/201');
    assert(saveData.isSaved === true, 'Hostel saved to shortlist');
  }

  // 5. Live Instant No-OTP Student Registration
  {
    const email = `live.student.${Date.now()}@lautech.edu.ng`;
    const regRes = await fetch(`${LIVE_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Live Test Student',
        email,
        password: 'Password123!',
        phone: '08123456789',
        role: 'STUDENT'
      })
    });
    const regData = await regRes.json() as any;
    assert(regRes.status === 201, 'Live POST /api/auth/register returns HTTP 201 Created');
    assert(regData.success === true, 'Registration succeeded immediately');
    assert(Boolean(regData.token), 'Valid session token returned immediately');
    assert(regData.verificationRequired === undefined, 'Zero OTP / No email verification required');
    assert(regData.user.emailVerified === 1, 'emailVerified is 1');

    // Login with existing catalog student account (globally available across all Cloudflare edge PoPs)
    const loginRes = await fetch(`${LIVE_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@lautech.edu.ng',
        password: 'Student123!'
      })
    });
    const loginData = await loginRes.json() as any;
    assert(loginRes.status === 200, 'Live POST /api/auth/login returns HTTP 200');
    assert(Boolean(loginData.token), 'Login succeeds with immediate session token');
    assert(loginData.user.emailVerified === 1, 'Live user has emailVerified === 1');
  }

  // 6. Live Admin Users Directory & Dashboard
  {
    const usersRes = await fetch(`${LIVE_BASE}/api/admin/users`);
    const usersData = await usersRes.json() as any;
    assert(usersRes.status === 200, 'Live GET /api/admin/users returns HTTP 200');
    assert(usersData.total >= 180, `Live Admin user directory returns full catalog (found ${usersData.total})`);

    const dashRes = await fetch(`${LIVE_BASE}/api/admin/dashboard`);
    const dashData = await dashRes.json() as any;
    assert(dashRes.status === 200, 'Live GET /api/admin/dashboard returns HTTP 200');
    assert(dashData.stats.totalStudents >= 100, `Live totalStudents is >= 100 (found ${dashData.stats.totalStudents})`);
    assert(dashData.stats.totalProviders >= 60, `Live totalProviders is >= 60 (found ${dashData.stats.totalProviders})`);
  }

  // 7. Live Properties Verification Status & 4K Tour Fields
  {
    const propsRes = await fetch(`${LIVE_BASE}/api/properties`);
    const propsData = await propsRes.json() as any;
    assert(propsRes.status === 200, 'Live GET /api/properties returns HTTP 200');
    const videoProps = propsData.properties.filter((p: any) => p.has4KVideo && p.verificationStatus === 'APPROVED');
    assert(videoProps.length >= 50, `Properties with has4KVideo and verificationStatus APPROVED (found ${videoProps.length})`);
  }

  console.log(`\n========================================================`);
  console.log(`🏁 LIVE PRODUCTION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) process.exit(1);
}

testLiveProduction().catch(err => {
  console.error('Live test error:', err);
  process.exit(1);
});
