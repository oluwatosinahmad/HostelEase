import assert from 'node:assert';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function req(url: string, options: RequestInit = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING HOSTEL EASE AGENT PORTAL AUTOMATED TESTS');
  console.log('====================================================\n');

  let studentToken = '';
  let adminToken = '';
  let agentToken = '';
  const newAgentEmail = `testagent_${Date.now()}@example.com`;
  let newAgentId = '';
  let createdRequestId = '';
  let createdLeadId = '';

  // Step 1: Login as Owner/Admin
  console.log('1️⃣ Authenticating as Single Owner/Admin...');
  const adminRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@hostelease.ng',
      password: 'Admin123!',
      role: 'ADMIN'
    })
  });
  assert.strictEqual(adminRes.status, 200, 'Admin login should succeed');
  assert.strictEqual(adminRes.data.user.role, 'ADMIN', 'Role should be ADMIN');
  adminToken = adminRes.data.token;
  console.log('   ✅ Admin authenticated successfully.');

  // Step 2: Login as Student
  console.log('2️⃣ Authenticating as Student...');
  const studentRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@lautech.edu.ng',
      password: 'Student123!',
      role: 'STUDENT'
    })
  });
  assert.strictEqual(studentRes.status, 200, 'Student login should succeed');
  studentToken = studentRes.data.token;
  console.log('   ✅ Student authenticated successfully.');

  // Step 3: Register New Agent
  console.log('3️⃣ Submitting new Agent application (PENDING state)...');
  const agentRegRes = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Kayode Balogun',
      email: newAgentEmail,
      password: 'AgentPassword123!',
      phone: '08123456789',
      role: 'AGENT',
      agentDetails: {
        businessName: 'Balogun Prime Lodges',
        operatingAreas: ['Under G', 'Adenike'],
        experienceYears: 3,
        bio: 'Assisting LAUTECH students since 2023',
        idDocumentType: 'NIN_CARD'
      }
    })
  });
  assert.strictEqual(agentRegRes.status, 201, 'Agent registration should succeed');
  assert.strictEqual(agentRegRes.data.user.role, 'AGENT', 'User role should be AGENT');
  newAgentId = agentRegRes.data.user.id;
  console.log(`   ✅ New agent registered with ID: ${newAgentId}`);

  // Step 4: Verify PENDING Agent cannot log in
  console.log('4️⃣ Testing strict login block for PENDING Agent...');
  const pendingLoginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newAgentEmail,
      password: 'AgentPassword123!',
      role: 'AGENT'
    })
  });
  assert.strictEqual(pendingLoginRes.status, 403, 'Should return 403 Forbidden for pending agent');
  assert.match(pendingLoginRes.data?.message || pendingLoginRes.data?.error || '', /not yet approved/i, 'Error should explain pending approval');
  console.log('   ✅ Pending agent correctly rejected with 403 (Not yet approved).');

  // Step 5: Verify Role mismatch protection
  console.log('5️⃣ Testing Role mismatch protection (Student/Landlord cannot log in as AGENT)...');
  const mismatchRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@lautech.edu.ng',
      password: 'Student123!',
      role: 'AGENT'
    })
  });
  assert.strictEqual(mismatchRes.status, 403, 'Should return 403 Forbidden for role mismatch');
  console.log('   ✅ Role mismatch blocked with 403.');

  // Step 6: Admin approves the new Agent
  console.log('6️⃣ Admin approving pending Agent application...');
  const approveRes = await req(`/admin/agents/${newAgentId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'APPROVED', adminFeedback: 'Identity verified against NIN registry' })
  });
  assert.strictEqual(approveRes.status, 200, 'Admin approval should succeed');
  console.log('   ✅ Admin successfully approved agent.');

  // Step 7: Approved Agent logs in successfully
  console.log('7️⃣ Approved Agent logging in...');
  const agentLoginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: newAgentEmail,
      password: 'AgentPassword123!',
      role: 'AGENT'
    })
  });
  assert.strictEqual(agentLoginRes.status, 200, 'Approved agent login must succeed');
  assert.strictEqual(agentLoginRes.data.user.role, 'AGENT', 'Role must be AGENT');
  agentToken = agentLoginRes.data.token;
  console.log('   ✅ Agent logged in and received JWT token.');

  // Step 8: Agent Dashboard API
  console.log('8️⃣ Fetching Agent Dashboard telemetry...');
  const dashRes = await req('/agent/dashboard', {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert.strictEqual(dashRes.status, 200, 'Agent dashboard should return 200');
  assert.ok(dashRes.data.agent, 'Dashboard should include agent profile');
  assert.strictEqual(dashRes.data.agent.verificationStatus, 'APPROVED', 'Verification status must be APPROVED');
  console.log('   ✅ Agent Dashboard telemetry loaded successfully.');

  // Step 9: Student requests Agent Assistance
  console.log('9️⃣ Student requesting Agent Assistance (₦5,000 transparent fee)...');
  const assistRes = await req('/agent/request-assistance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      preferredAreas: ['Under G', 'Adenike'],
      budgetMin: 180000,
      budgetMax: 250000,
      roomType: 'SELF_CONTAIN',
      moveInDate: '2026-09-15',
      notes: 'Need a self contain with reliable borehole water pumping'
    })
  });
  assert.strictEqual(assistRes.status, 201, 'Assistance request should return 201');
  assert.ok(assistRes.data.requestId, 'Request ID should be returned');
  createdRequestId = assistRes.data.requestId;
  console.log(`   ✅ Assistance request created with ID: ${createdRequestId}`);

  // Step 10: Agent accepts request
  console.log('🔟 Agent accepting and claiming student request...');
  const acceptRes = await req(`/agent/requests/${createdRequestId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert.strictEqual(acceptRes.status, 200, 'Accept request should return 200');
  console.log('   ✅ Agent accepted student request.');

  // Step 11: Agent completes request and earns ₦5,000 fee
  console.log('1️⃣1️⃣ Agent completing student request...');
  const completeRes = await req(`/agent/requests/${createdRequestId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert.strictEqual(completeRes.status, 200, 'Complete request should return 200');
  console.log('   ✅ Request completed. ₦5,000 fee credited to agent balance.');

  // Step 12: Agent submits unverified Hostel Lead
  console.log('1️⃣2️⃣ Agent submitting new Hostel Lead for Admin inspection...');
  const leadRes = await req('/agent/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({
      hostelName: 'Emerald Heights Villa',
      areaId: 'area-under-g',
      landmark: 'Behind Bovas Filling Station',
      estimatedRent: 260000,
      roomTypes: 'Self Contain',
      landlordName: 'Alhaji Rasaq',
      landlordPhone: '08099887766',
      notes: 'Fenced compound with gate security and borehole'
    })
  });
  assert.strictEqual(leadRes.status, 201, 'Submit lead should return 201');
  assert.ok(leadRes.data.leadId, 'Lead ID should be returned');
  createdLeadId = leadRes.data.leadId;
  console.log(`   ✅ Lead submitted with ID: ${createdLeadId}`);

  // Step 13: Admin moderates and approves Hostel Lead
  console.log('1️⃣3️⃣ Admin moderating and approving Hostel Lead...');
  const modLeadRes = await req(`/admin/agent-leads/${createdLeadId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'APPROVED_LISTED', adminFeedback: 'Physical inspection completed' })
  });
  assert.strictEqual(modLeadRes.status, 200, 'Admin lead moderation should return 200');
  console.log('   ✅ Lead approved by Admin for listing.');

  // Step 14: Agent requests Bank Payout
  console.log('1️⃣4️⃣ Agent requesting Bank Payout of earnings...');
  const payoutRes = await req('/agent/payouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({
      amount: 5000,
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'Kayode Balogun'
    })
  });
  assert.strictEqual(payoutRes.status, 201, 'Payout request should return 201');
  assert.ok(payoutRes.data.payoutReference, 'Payout reference should be returned');
  console.log(`   ✅ Payout requested with Reference: ${payoutRes.data.payoutReference}`);

  // Step 15: Admin suspends Agent and verifies immediate access cutoff
  console.log('1️⃣5️⃣ Admin suspending Agent and verifying RBAC security cutoff...');
  const suspendRes = await req(`/admin/agents/${newAgentId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'SUSPENDED', adminFeedback: 'Audit suspension test' })
  });
  assert.strictEqual(suspendRes.status, 200, 'Suspension should return 200');

  const blockedRes = await req('/agent/dashboard', {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert.strictEqual(blockedRes.status, 403, 'Suspended agent access must return 403 Forbidden');
  assert.match(blockedRes.data?.message || blockedRes.data?.error || '', /suspended|not approved|denied/i, 'Error message must reflect suspended state');
  console.log('   ✅ Suspended agent access immediately cut off with 403 Forbidden.');

  console.log('\n====================================================');
  console.log('🎉 ALL 15/15 AGENT PORTAL SECURITY & FUNCTIONAL TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
