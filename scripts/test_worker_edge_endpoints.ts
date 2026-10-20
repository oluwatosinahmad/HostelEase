import worker from '../src/worker';

async function runWorkerTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 TESTING CLOUDFLARE WORKER EDGE ENGINE & SYNCHRONIZATION');
  console.log('🧪 ========================================================\n');

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

  const mockEnv: any = {
    ASSETS: {
      fetch: async (req: any) => new Response('Mock Asset', { status: 200 })
    }
  };
  const mockCtx: any = { waitUntil: () => {}, passThroughOnException: () => {} };

  // 1. Health check
  {
    const req = new Request('https://hostelease.workers.dev/api/health', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === 200, 'Health endpoint returns HTTP 200');
    assert(data.status === 'ok', 'Health status is ok');
    assert(data.counts.videos >= 55, `Health reports >= 55 videos (found ${data.counts.videos})`);
    assert(data.counts.users >= 180, `Health reports >= 180 users (found ${data.counts.users})`);
    assert(data.counts.saved >= 20, `Health reports >= 20 saved properties (found ${data.counts.saved})`);
  }

  // 2. 4K Videos Public & Provider Listing
  {
    const req = new Request('https://hostelease.workers.dev/api/videos', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === 200, 'GET /api/videos returns HTTP 200');
    assert(Array.isArray(data.videos) && data.videos.length >= 55, `Videos array returned with length >= 55 (found ${data.videos?.length})`);
    assert(data.counts && data.counts.total >= 55, 'Video counts object returned with total >= 55');
    const firstVid = data.videos[0];
    assert(firstVid && Boolean(firstVid.video_url || firstVid.videoUrl), 'Video has valid video_url');
  }

  // 3. 4K Videos Admin Queue
  {
    const req = new Request('https://hostelease.workers.dev/api/admin/videos?status=ALL', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === 200, 'GET /api/admin/videos returns HTTP 200');
    assert(data.counts && typeof data.counts.verified === 'number', 'Admin video queue has verified count');
  }

  // 4. 4K Video Upload and Verification Workflow
  {
    const uploadReq = new Request('https://hostelease.workers.dev/api/videos/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'PROVIDER', 'x-user-id': 'user-provider-1' },
      body: JSON.stringify({
        propertyId: 'prop-1',
        videoUrl: '/uploads/sample_hostel_tour.mp4',
        width: 3840,
        height: 2160,
        duration: 90
      })
    });
    const uploadRes = await worker.fetch(uploadReq, mockEnv, mockCtx);
    const uploadData = await uploadRes.json() as any;
    assert(uploadRes.status === 201, 'POST /api/videos/upload returns HTTP 201 Created');
    assert(uploadData.success === true, 'Upload returns success: true');
    assert(Boolean(uploadData.video?.id), 'Upload returns generated video ID');

    // Verify the video
    const vidId = uploadData.video.id;
    const verifyReq = new Request(`https://hostelease.workers.dev/api/admin/videos/${vidId}/verify`, {
      method: 'POST',
      headers: { 'x-user-role': 'ADMIN' }
    });
    const verifyRes = await worker.fetch(verifyReq, mockEnv, mockCtx);
    const verifyData = await verifyRes.json() as any;
    assert(verifyRes.status === 200, 'POST /api/admin/videos/:id/verify returns HTTP 200');
    assert(verifyData.status === 'VERIFIED', 'Video status is now VERIFIED');
  }

  // 5. Properties Listing with 4K Video Properties
  {
    const req = new Request('https://hostelease.workers.dev/api/properties', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === 200, 'GET /api/properties returns HTTP 200');
    assert(data.properties && data.properties.length > 0, `Properties returned (found ${data.properties?.length})`);
    
    // Check camelCase and 4K video fields on properties
    const sample = data.properties.find((p: any) => p.has4KVideo);
    assert(Boolean(sample), 'Found property with has4KVideo === true');
    assert(sample.verificationStatus === 'APPROVED', 'Property has verificationStatus === "APPROVED"');
    assert(sample.videoTourUrl === '/uploads/sample_hostel_tour.mp4', 'Property has valid videoTourUrl');
    assert(Boolean(sample.priceSummary), 'Property has priceSummary');
  }

  // 6. Saved Hostels (Shortlist) Flow
  {
    const studentHeaders = {
      'Content-Type': 'application/json',
      'x-user-id': 'test-edge-student-1',
      'x-user-role': 'STUDENT',
      'x-user-email': 'test.student@edge.ng'
    };

    // Save property
    const saveReq = new Request('https://hostelease.workers.dev/api/saved', {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({ propertyId: 'prop-1' })
    });
    const saveRes = await worker.fetch(saveReq, mockEnv, mockCtx);
    const saveData = await saveRes.json() as any;
    assert(saveRes.status === 201, 'POST /api/saved returns HTTP 201');
    assert(saveData.isSaved === true, 'Property marked isSaved: true');

    // Get saved properties
    const getSavedReq = new Request('https://hostelease.workers.dev/api/saved', {
      method: 'GET',
      headers: studentHeaders
    });
    const getSavedRes = await worker.fetch(getSavedReq, mockEnv, mockCtx);
    const getSavedData = await getSavedRes.json() as any;
    assert(getSavedRes.status === 200, 'GET /api/saved returns HTTP 200');
    assert(Array.isArray(getSavedData.savedProperties) && getSavedData.savedProperties.some((p: any) => p.id === 'prop-1'), 'Saved properties contains prop-1');

    // Unsave property
    const unsaveReq = new Request('https://hostelease.workers.dev/api/saved/prop-1', {
      method: 'DELETE',
      headers: studentHeaders
    });
    const unsaveRes = await worker.fetch(unsaveReq, mockEnv, mockCtx);
    const unsaveData = await unsaveRes.json() as any;
    assert(unsaveRes.status === 200, 'DELETE /api/saved/prop-1 returns HTTP 200');
    assert(unsaveData.isSaved === false, 'Property isSaved is now false');
  }

  // 7. Instant No-OTP Student Registration
  {
    const uniqueEmail = `instant.edge.${Date.now()}@lautech.edu.ng`;
    const regReq = new Request('https://hostelease.workers.dev/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Instant Edge Student',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '08123456789',
        role: 'STUDENT'
      })
    });
    const regRes = await worker.fetch(regReq, mockEnv, mockCtx);
    const regData = await regRes.json() as any;
    assert(regRes.status === 201, 'POST /api/auth/register returns HTTP 201 Created');
    assert(regData.success === true, 'Registration returns success: true');
    assert(Boolean(regData.token), 'Valid session token returned immediately');
    assert(regData.verificationRequired === undefined, 'No verificationRequired flag');
    assert(regData.user && regData.user.email === uniqueEmail, 'User created with correct email');
    assert(regData.user.emailVerified === 1, 'emailVerified is 1');

    // Duplicate email registration rejected
    const dupReq = new Request('https://hostelease.workers.dev/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Instant Edge Student',
        email: uniqueEmail,
        password: 'Password123!',
        phone: '08123456789',
        role: 'STUDENT'
      })
    });
    const dupRes = await worker.fetch(dupReq, mockEnv, mockCtx);
    assert(dupRes.status === 409, 'Duplicate registration returns HTTP 409 Conflict');

    // Immediate login with newly registered account
    const loginReq = new Request('https://hostelease.workers.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!'
      })
    });
    const loginRes = await worker.fetch(loginReq, mockEnv, mockCtx);
    const loginData = await loginRes.json() as any;
    assert(loginRes.status === 200, 'POST /api/auth/login returns HTTP 200');
    assert(Boolean(loginData.token), 'Login returns valid token');
  }

  // 8. Admin User Directory & Statistics
  {
    const req = new Request('https://hostelease.workers.dev/api/admin/users', { method: 'GET' });
    const res = await worker.fetch(req, mockEnv, mockCtx);
    const data = await res.json() as any;
    assert(res.status === 200, 'GET /api/admin/users returns HTTP 200');
    assert(data.total >= 180, `Admin users directory returns total >= 180 (found ${data.total})`);

    const dashReq = new Request('https://hostelease.workers.dev/api/admin/dashboard', { method: 'GET' });
    const dashRes = await worker.fetch(dashReq, mockEnv, mockCtx);
    const dashData = await dashRes.json() as any;
    assert(dashRes.status === 200, 'GET /api/admin/dashboard returns HTTP 200');
    assert(dashData.stats.totalStudents >= 100, `Dashboard stats report >= 100 students (found ${dashData.stats.totalStudents})`);
    assert(dashData.stats.totalProviders >= 60, `Dashboard stats report >= 60 providers (found ${dashData.stats.totalProviders})`);
  }

  console.log(`\n========================================================`);
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkerTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
