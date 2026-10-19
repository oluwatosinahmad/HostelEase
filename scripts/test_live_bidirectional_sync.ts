import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const LOCAL_URL = 'http://localhost:5000';
const LIVE_URL = 'https://hostelease.oluwatosinahmad.workers.dev';

async function run() {
  console.log('===============================================================');
  console.log('?? HOSTEL EASE LIVE BIDIRECTIONAL SYNCHRONIZATION TEST');
  console.log('===============================================================');

  const testId = Date.now().toString().slice(-6);
  const localStudentEmail = 'sync.local.' + testId + '@lautech.edu.ng';
  const liveStudentEmail = 'sync.live.' + testId + '@lautech.edu.ng';

  // 1. Check Localhost Health & Rate Limits
  console.log('\n--- STEP 1: Verify Localhost Health & Rate Limiting ---');
  const localHealthRes = await fetch(LOCAL_URL + '/api/health');
  const localHealth: any = await localHealthRes.json();
  console.log('? Localhost is healthy (Users in SQLite: ' + (localHealth.counts?.users || localHealth.userCount) + ')');

  let rateLimitErrors = 0;
  for (let i = 0; i < 50; i++) {
    const res = await fetch(LOCAL_URL + '/api/health');
    if (res.status === 429) rateLimitErrors++;
  }
  if (rateLimitErrors === 0) {
    console.log('? 50 rapid requests on localhost passed without HTTP 429 rate limiting!');
  } else {
    console.error('? Encountered ' + rateLimitErrors + ' rate limit errors on localhost!');
  }

  // 2. Check Live Site Health
  console.log('\n--- STEP 2: Verify Live Cloudflare Edge Worker Health ---');
  const liveHealthRes = await fetch(LIVE_URL + '/api/health');
  const liveHealth: any = await liveHealthRes.json();
  console.log('? Live site status: ' + liveHealth.status + ' (Users on Edge: ' + liveHealth.counts?.users + ')');

  // 3. Register user on Localhost (Flow 1: Localhost -> Live)
  console.log('\n--- STEP 3: Register Student on Localhost & Verify Push to Live ---');
  const localRegRes = await fetch(LOCAL_URL + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Ahmad Local ' + testId,
      email: localStudentEmail,
      password: 'Student123!',
      phone: '+2348039990001',
      role: 'STUDENT',
      department: 'Computer Science',
      level: '300L'
    })
  });
  const localReg: any = await localRegRes.json();
  console.log('? Student registered locally (ID: ' + (localReg.user?.id || localReg.id) + ', Email: ' + localStudentEmail + ')');

  // Wait 2 seconds for syncService push
  await new Promise(r => setTimeout(r, 2000));

  // Query Live site for this student
  const liveUsersRes = await fetch(LIVE_URL + '/api/admin/users?search=' + encodeURIComponent(localStudentEmail));
  const liveUsersData: any = await liveUsersRes.json();
  const foundOnLive = (liveUsersData.users || []).find((u: any) => u.email.toLowerCase() === localStudentEmail.toLowerCase());
  if (foundOnLive) {
    console.log('?? SUCCESS: Localhost registered student automatically synchronized to Live site!');
    console.log('   Name on Live: ' + foundOnLive.fullName + ' | Role: ' + foundOnLive.role + ' | Department: ' + foundOnLive.department);
  } else {
    console.error('? Student ' + localStudentEmail + ' was NOT found on Live site!');
  }

  // 4. Register user on Live (Flow 2: Live -> Localhost Pull)
  console.log('\n--- STEP 4: Register Student on Live & Verify Pull to Localhost ---');
  const liveRegRes = await fetch(LIVE_URL + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Khadijah Live ' + testId,
      email: liveStudentEmail,
      password: 'Student123!',
      phone: '+2348039990002',
      role: 'STUDENT',
      department: 'Medicine & Surgery',
      level: '400L'
    })
  });
  const liveReg: any = await liveRegRes.json();
  console.log('? Student registered on Live Edge (ID: ' + liveReg.user?.id + ', Email: ' + liveStudentEmail + ')');

  // Wait 6 seconds for local syncService poll (polls every 5s)
  console.log('? Waiting for local syncService pull cycle (5s interval)...');
  await new Promise(r => setTimeout(r, 6500));

  // Query local SQLite for this student
  const localUsersRes = await fetch(LOCAL_URL + '/api/admin/users?search=' + encodeURIComponent(liveStudentEmail), {
    headers: { 'Authorization': 'Bearer admin-token', 'X-User-Role': 'ADMIN' }
  });
  const localUsersData: any = await localUsersRes.json();
  const foundOnLocal = (localUsersData.users || []).find((u: any) => u.email.toLowerCase() === liveStudentEmail.toLowerCase());
  if (foundOnLocal) {
    console.log('?? SUCCESS: Live site registered student automatically pulled into local SQLite database!');
    console.log('   Name on Localhost: ' + foundOnLocal.fullName + ' | Role: ' + foundOnLocal.role + ' | Department: ' + foundOnLocal.department);
  } else {
    console.error('? Student ' + liveStudentEmail + ' was NOT found in local SQLite database!');
  }

  // 5. Verify User Directory & Dashboard Counts on Live
  console.log('\n--- STEP 5: Verify User Directory & Dashboard Telemetry on Live ---');
  const allLiveUsersRes = await fetch(LIVE_URL + '/api/admin/users');
  const allLiveUsers: any = await allLiveUsersRes.json();
  const liveDashboardRes = await fetch(LIVE_URL + '/api/admin/dashboard');
  const liveDashboard: any = await liveDashboardRes.json();

  const liveTotalUsers = allLiveUsers.total;
  const liveStudentCount = (allLiveUsers.users || []).filter((u: any) => u.role === 'STUDENT').length;
  console.log('?? Live User Directory Total Users: ' + liveTotalUsers);
  console.log('?? Live User Directory Students:    ' + liveStudentCount);
  console.log('?? Live Dashboard Total Students:    ' + liveDashboard.stats?.totalStudents);

  if (liveStudentCount === liveDashboard.stats?.totalStudents) {
    console.log('? Live Dashboard student count perfectly matches Live User Directory!');
  } else {
    console.warn('?? Discrepancy detected between Live Dashboard and User Directory');
  }

  console.log('\n===============================================================');
  console.log('?? ALL BIDIRECTIONAL SYNCHRONIZATION TESTS COMPLETE');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
