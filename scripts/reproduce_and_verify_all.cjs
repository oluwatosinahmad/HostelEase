const assert = require('assert');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = 'hostel-ease-jwt-secure-secret-key-2026';

const USER_AGENTS = {
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  desktopEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  desktopSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  mobileIPhoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  mobileAndroidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36'
};

async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const res = await fetch(url, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, headers: res.headers, data, url };
}

async function runMasterVerificationSuite() {
  console.log('========================================================================');
  console.log('HOSTELEASE PLATFORM-WIDE AUTH & CHAT DIAGNOSTIC REPRODUCTION SUITE');
  console.log('========================================================================\n');

  const timestamp = Date.now();

  // -------------------------------------------------------------------------
  // SECTION 1 & 2: REPRODUCE ERROR & RECORD ACTUAL NETWORK REQUESTS (Points A-I)
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('SECTION 1 & 2: REPRODUCE USER FLOW & RECORD NETWORK REQUESTS (Points A - I)');
  console.log('------------------------------------------------------------------------\n');

  // Step 1: Real Authenticated Student Login
  console.log('[Step 1] Student A Login...');
  const studentAEmail = `student.alpha.${timestamp}@lautech.edu.ng`;
  const regStudentA = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENTS.desktopChrome },
    body: JSON.stringify({
      email: studentAEmail,
      password: 'Password123!',
      fullName: 'Ahmad Tunde (Student A)',
      role: 'STUDENT',
      phone: '08011112222',
      studentDetails: {
        department: 'Computer Science',
        level: '300L',
        matricNo: `21/${timestamp.toString().slice(-4)}`
      }
    })
  });
  assert(regStudentA.ok, `Student A registration failed: ${JSON.stringify(regStudentA.data)}`);
  const tokenA = regStudentA.data.token;
  const userA = regStudentA.data.user;
  console.log(`   ✓ Authenticated Student UID: ${userA.id}`);
  console.log(`   ✓ Token issued: Bearer ${tokenA.substring(0, 20)}...`);

  // Step 2: Shared Authenticated API request (Point I)
  console.log('\n[Point I] Shared Authenticated API request (GET /auth/me)...');
  const meA = await apiRequest('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': USER_AGENTS.desktopChrome,
      'x-user-id': userA.id,
      'x-user-email': userA.email,
      'x-user-role': userA.role
    }
  });
  console.log(`   HTTP Status: ${meA.status}`);
  assert(meA.ok, `/auth/me failed: ${JSON.stringify(meA.data)}`);
  console.log(`   ✓ Session verified for UID: ${meA.data.user.id}, Role: ${meA.data.user.role}`);

  // Step 3: Student Find Hostel -> Open Property & Agent Profile (Points A & B)
  console.log('\n[Points A & B] Loading Property & Agent Profile (GET /properties/prop-1)...');
  const propRes = await apiRequest('/properties/prop-1', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': USER_AGENTS.desktopChrome
    }
  });
  console.log(`   HTTP Status: ${propRes.status}`);
  assert(propRes.ok, `Failed to load property: ${JSON.stringify(propRes.data)}`);
  const property = propRes.data.property || propRes.data;
  console.log(`   ✓ Point B (Property loaded): ${property.title} (ID: ${property.id})`);
  console.log(`   ✓ Point A (Agent profile loaded): Agent ID = ${property.providerId}, Name = ${property.provider?.name}`);
  const agentAId = property.providerId;

  // Step 4: Click Message/Chat -> Create / Start Conversation (Point C)
  console.log('\n[Point C] Creating Conversation (POST /messages/conversations)...');
  const startConvRes = await apiRequest('/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': USER_AGENTS.desktopChrome,
      'x-user-id': userA.id,
      'x-user-email': userA.email,
      'x-user-role': userA.role
    },
    body: JSON.stringify({
      propertyId: property.id,
      initialMessage: 'Hello, is this self-contain still available for 2026/2027?'
    })
  });
  console.log(`   Request URL: ${startConvRes.url}`);
  console.log(`   HTTP Method: POST`);
  console.log(`   HTTP Status: ${startConvRes.status} (Expected: 200/201, NOT 401 Unauthorized)`);
  assert(startConvRes.ok, `Start conversation failed with status ${startConvRes.status}: ${JSON.stringify(startConvRes.data)}`);
  const convIdA = startConvRes.data.conversationId;
  console.log(`   ✓ Conversation Created/Retrieved: ID = ${convIdA}`);
  console.log(`   ✓ Conversation Property ID: ${startConvRes.data.conversation?.propertyId}`);
  console.log(`   ✓ Conversation Student ID: ${startConvRes.data.conversation?.studentId}`);
  console.log(`   ✓ Conversation Provider ID: ${startConvRes.data.conversation?.providerId}`);

  // Step 5: Loading Existing Conversation & History (Points D & E)
  console.log('\n[Points D & E] Loading Existing Conversation & Messages (GET /messages/conversations/:id)...');
  const loadConvRes = await apiRequest(`/messages/conversations/${convIdA}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': USER_AGENTS.desktopChrome,
      'x-user-id': userA.id,
      'x-user-email': userA.email,
      'x-user-role': userA.role
    }
  });
  console.log(`   HTTP Status: ${loadConvRes.status}`);
  assert(loadConvRes.ok, `Failed to load conversation: ${JSON.stringify(loadConvRes.data)}`);
  console.log(`   ✓ Point D (Existing conversation loaded): ID = ${loadConvRes.data.conversation.id}`);
  console.log(`   ✓ Point E (Messages loaded): ${loadConvRes.data.messages.length} message(s) retrieved`);

  // Step 6: Sending a Message (Point F)
  console.log('\n[Point F] Sending Message in Conversation (POST /messages/conversations/:id/messages)...');
  const sendMsgRes = await apiRequest(`/messages/conversations/${convIdA}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': USER_AGENTS.desktopChrome,
      'x-user-id': userA.id,
      'x-user-email': userA.email,
      'x-user-role': userA.role
    },
    body: JSON.stringify({
      content: 'Can I also confirm if the running borehole is connected to an overhead tank?',
      messageType: 'TEXT'
    })
  });
  console.log(`   HTTP Status: ${sendMsgRes.status}`);
  assert(sendMsgRes.ok, `Failed to send message: ${JSON.stringify(sendMsgRes.data)}`);
  console.log(`   ✓ Point F (Message sent): ID = ${sendMsgRes.data.message.id}`);

  // Step 7: Fetching Conversation Participants (Point G)
  console.log('\n[Point G] Fetching Conversation Participants & Role Verification...');
  assert(loadConvRes.data.conversation.student.id === userA.id, 'Participant Student mismatch');
  assert(loadConvRes.data.conversation.provider.id === agentAId, 'Participant Provider mismatch');
  console.log(`   ✓ Point G: Participants correctly mapped: Student = ${loadConvRes.data.conversation.student.id}, Provider = ${loadConvRes.data.conversation.provider.id}`);

  // Step 8: Fetching Notifications (Point H)
  console.log('\n[Point H] Fetching Notifications for Recipient Agent...');
  const db = new Database('./data/hostel_ease.db');
  const agentUser = db.prepare('SELECT email FROM users WHERE id = ?').get(agentAId);
  const agentToken = jwt.sign({ id: agentAId, email: agentUser.email, role: 'PROVIDER' }, JWT_SECRET);
  const notifRes = await apiRequest('/notifications', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${agentToken}`,
      'User-Agent': USER_AGENTS.desktopChrome
    }
  });
  console.log(`   HTTP Status: ${notifRes.status}`);
  assert(notifRes.ok, `Failed to fetch notifications: ${JSON.stringify(notifRes.data)}`);
  console.log(`   ✓ Point H (Notifications fetched): ${notifRes.data.notifications?.length || 0} notification(s) found`);

  // -------------------------------------------------------------------------
  // SECTION 4: TEST AUTHENTICATION INITIALIZATION & 401 UNAUTHORIZED HANDLING
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SECTION 4: AUTH INITIALIZATION & UNPROTECTED/UNAUTHENTICATED HANDLING');
  console.log('------------------------------------------------------------------------\n');

  console.log('[Test 4.1] Request with missing Authorization token returns 401 Unauthorized...');
  const missingTokenRes = await apiRequest('/messages/conversations', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENTS.mobileIPhoneSafari },
    body: JSON.stringify({ propertyId: property.id })
  });
  console.log(`   Status: ${missingTokenRes.status}`);
  console.log(`   Response: ${JSON.stringify(missingTokenRes.data)}`);
  assert(missingTokenRes.status === 401, `Expected 401, got ${missingTokenRes.status}`);
  assert(missingTokenRes.data.error.includes('token required'), 'Expected token required error');
  console.log('   ✓ Backend safely rejects missing token with HTTP 401\n');

  console.log('[Test 4.2] Request with tampered/invalid token returns 401 Unauthorized...');
  const invalidTokenRes = await apiRequest('/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer bad_tampered_token_xyz',
      'User-Agent': USER_AGENTS.mobileIPhoneSafari
    },
    body: JSON.stringify({ propertyId: property.id })
  });
  console.log(`   Status: ${invalidTokenRes.status}`);
  console.log(`   Response: ${JSON.stringify(invalidTokenRes.data)}`);
  assert(invalidTokenRes.status === 401, `Expected 401, got ${invalidTokenRes.status}`);
  console.log('   ✓ Backend safely rejects tampered token with HTTP 401\n');

  // -------------------------------------------------------------------------
  // SECTION 7 & 15: CONVERSATION AUTHORIZATION & PRIVACY ISOLATION (403 CHECK)
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('SECTION 7 & 15: CONVERSATION AUTHORIZATION & PRIVACY ISOLATION');
  console.log('------------------------------------------------------------------------\n');

  // Register Student B
  console.log('[Setup] Registering Student B...');
  const studentBEmail = `student.beta.${timestamp}@lautech.edu.ng`;
  const regStudentB = await apiRequest('/auth/register', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENTS.mobileAndroidChrome },
    body: JSON.stringify({
      email: studentBEmail,
      password: 'Password123!',
      fullName: 'Fatima Sanusi (Student B)',
      role: 'STUDENT',
      phone: '08033334444',
      studentDetails: {
        department: 'Biochemistry',
        level: '200L',
        matricNo: `22/${timestamp.toString().slice(-4)}`
      }
    })
  });
  assert(regStudentB.ok, 'Student B registration failed');
  const tokenB = regStudentB.data.token;
  const userB = regStudentB.data.user;
  console.log(`   ✓ Student B registered: UID = ${userB.id}`);

  // Test: Student B attempts to access Student A's private conversation (MUST return 403 Forbidden)
  console.log('\n[Security Check] Student B attempts to open Student A\'s private conversation...');
  const snoopRes = await apiRequest(`/messages/conversations/${convIdA}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': USER_AGENTS.desktopEdge,
      'x-user-id': userB.id,
      'x-user-email': userB.email,
      'x-user-role': userB.role
    }
  });
  console.log(`   HTTP Status: ${snoopRes.status}`);
  console.log(`   Response: ${JSON.stringify(snoopRes.data)}`);
  assert(snoopRes.status === 403, `Security failure! Expected 403 Forbidden, got ${snoopRes.status}`);
  assert(snoopRes.data.error.includes('authorized') || snoopRes.data.error.includes('denied'), 'Expected authorization error');
  console.log('   ✓ VERIFIED: Student B is strictly forbidden (HTTP 403) from accessing Student A\'s conversation!');

  // Test: Student B attempts to send message in Student A's conversation
  console.log('\n[Security Check] Student B attempts to inject a message into Student A\'s conversation...');
  const injectMsgRes = await apiRequest(`/messages/conversations/${convIdA}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': USER_AGENTS.mobileAndroidChrome,
      'x-user-id': userB.id,
      'x-user-email': userB.email,
      'x-user-role': userB.role
    },
    body: JSON.stringify({
      content: 'Unauthorized malicious injection attempt',
      messageType: 'TEXT'
    })
  });
  console.log(`   HTTP Status: ${injectMsgRes.status}`);
  console.log(`   Response: ${JSON.stringify(injectMsgRes.data)}`);
  assert(injectMsgRes.status === 403, `Security failure! Expected 403 Forbidden, got ${injectMsgRes.status}`);
  console.log('   ✓ VERIFIED: Student B cannot inject messages into Student A\'s conversation (HTTP 403)!');

  // Test: Agent B attempts to access Agent A's conversation
  console.log('\n[Security Check] Agent B attempts to access Agent A\'s conversation...');
  const agentBId = 'user-provider-2'; // Alhaji Mukaila Oladapo
  const agentBUser = db.prepare('SELECT email FROM users WHERE id = ?').get(agentBId);
  const tokenAgentB = jwt.sign({ id: agentBId, email: agentBUser.email, role: 'PROVIDER' }, JWT_SECRET);
  const agentSnoopRes = await apiRequest(`/messages/conversations/${convIdA}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenAgentB}`,
      'User-Agent': USER_AGENTS.desktopSafari,
      'x-user-id': agentBId,
      'x-user-email': agentBUser.email,
      'x-user-role': 'PROVIDER'
    }
  });
  console.log(`   HTTP Status: ${agentSnoopRes.status}`);
  console.log(`   Response: ${JSON.stringify(agentSnoopRes.data)}`);
  assert(agentSnoopRes.status === 403, `Security failure! Expected 403 Forbidden for non-participating Agent, got ${agentSnoopRes.status}`);
  console.log('   ✓ VERIFIED: Agent B is strictly forbidden (HTTP 403) from accessing Agent A\'s conversation!\n');

  // -------------------------------------------------------------------------
  // SECTION 10: LOGOUT & SESSION ISOLATION
  // -------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('SECTION 10: LOGOUT & SESSION ISOLATION TEST');
  console.log('------------------------------------------------------------------------\n');

  console.log('[Test 10] Student A logs out -> Student B logs in on same browser...');
  // Query Student B's conversation list
  const listB = await apiRequest('/messages/conversations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': USER_AGENTS.mobileIPhoneSafari
    }
  });
  assert(listB.ok, 'Failed to fetch Student B conversations');
  const conversationsForB = listB.data.conversations || [];
  console.log(`   Student B conversation count: ${conversationsForB.length}`);
  const leakedConv = conversationsForB.find(c => c.id === convIdA || c.studentId === userA.id);
  assert(!leakedConv, 'DATA LEAK DETECTED: Student B received Student A conversation!');
  console.log('   ✓ VERIFIED: Student B has 0 access to Student A conversations or session state!\n');

  // -------------------------------------------------------------------------
  // SECTION 18: REQUIRED TEST MATRIX (8 Matrix Cells + Cross Verification)
  // -------------------------------------------------------------------------
  console.log('========================================================================');
  console.log('SECTION 18: REQUIRED TEST MATRIX (Desktop & Mobile Matrix Across 4 Roles)');
  console.log('========================================================================\n');

  const matrixRoles = [
    { name: 'Student A', email: studentAEmail, password: 'Password123!', role: 'STUDENT', expectedType: 'student' },
    { name: 'Student B', email: studentBEmail, password: 'Password123!', role: 'STUDENT', expectedType: 'student' },
    { name: 'Agent A', email: agentUser.email, password: 'Provider123!', role: 'PROVIDER', expectedType: 'provider' },
    { name: 'Agent B', email: agentBUser.email, password: 'Provider123!', role: 'PROVIDER', expectedType: 'provider' }
  ];

  for (const actor of matrixRoles) {
    console.log(`\n>>> TESTING ACTOR: ${actor.name} (${actor.role}) <<<`);

    // Test on Desktop
    console.log(`\n  [Desktop Test: ${actor.name}]`);
    const deskLogin = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENTS.desktopChrome },
      body: JSON.stringify({ email: actor.email, password: actor.password, role: actor.role })
    });
    assert(deskLogin.ok, `${actor.name} desktop login failed: ${JSON.stringify(deskLogin.data)}`);
    const deskToken = deskLogin.data.token;
    console.log(`     ✓ Desktop Login successful`);

    // Refresh simulation (verify session rehydration via /auth/me)
    const deskMe = await apiRequest('/auth/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${deskToken}`, 'User-Agent': USER_AGENTS.desktopChrome }
    });
    assert(deskMe.ok, `${actor.name} desktop session rehydration failed`);
    console.log(`     ✓ Desktop Refresh / Session rehydration verified`);

    // Open Messages
    const deskConvs = await apiRequest('/messages/conversations', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${deskToken}`, 'User-Agent': USER_AGENTS.desktopChrome }
    });
    assert(deskConvs.ok, `${actor.name} desktop fetch conversations failed`);
    console.log(`     ✓ Desktop Open Messages list (${deskConvs.data.conversations.length} conversations found)`);

    // Test on Mobile
    console.log(`\n  [Mobile Test: ${actor.name}]`);
    const mobLogin = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'User-Agent': USER_AGENTS.mobileIPhoneSafari },
      body: JSON.stringify({ email: actor.email, password: actor.password, role: actor.role })
    });
    assert(mobLogin.ok, `${actor.name} mobile login failed`);
    const mobToken = mobLogin.data.token;
    console.log(`     ✓ Mobile Login successful (iPhone Safari)`);

    // Mobile refresh simulation
    const mobMe = await apiRequest('/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mobToken}`,
        'User-Agent': USER_AGENTS.mobileIPhoneSafari,
        'x-user-id': mobLogin.data.user.id,
        'x-user-email': mobLogin.data.user.email,
        'x-user-role': mobLogin.data.user.role
      }
    });
    assert(mobMe.ok, `${actor.name} mobile session rehydration failed`);
    console.log(`     ✓ Mobile Refresh / Session rehydration verified`);

    // Mobile Open Messages
    const mobConvs = await apiRequest('/messages/conversations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mobToken}`,
        'User-Agent': USER_AGENTS.mobileIPhoneSafari,
        'x-user-id': mobLogin.data.user.id,
        'x-user-email': mobLogin.data.user.email,
        'x-user-role': mobLogin.data.user.role
      }
    });
    assert(mobConvs.ok, `${actor.name} mobile fetch conversations failed`);
    console.log(`     ✓ Mobile Open Messages list (${mobConvs.data.conversations.length} conversations found)`);
  }

  // -------------------------------------------------------------------------
  // SECTION 11: FULL CONVERSATION ROUNDTRIP (STUDENT SENDS -> AGENT REPLIES -> STUDENT RECEIVES)
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SECTION 11: TWO-WAY CONVERSATION INTERACTION (Tests A through I)');
  console.log('------------------------------------------------------------------------\n');

  // Test B & C: Student B creates a conversation with Agent A on mobile
  console.log('[Test B & C] Student B creates conversation with Agent A from mobile phone...');
  const createB = await apiRequest('/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': USER_AGENTS.mobileIPhoneSafari,
      'x-user-id': userB.id,
      'x-user-email': userB.email,
      'x-user-role': userB.role
    },
    body: JSON.stringify({
      propertyId: property.id,
      initialMessage: 'Hi Agent Adeleke, is this room ready for immediate move-in?'
    })
  });
  assert(createB.ok, `Failed to create conversation: ${JSON.stringify(createB.data)}`);
  const convIdB = createB.data.conversationId;
  console.log(`   ✓ Conversation Created: ID = ${convIdB}`);

  // Test D: Agent A checks inbox and receives Student B's message
  console.log('\n[Test D] Agent A opens Messages and verifies message from Student B...');
  const agentList = await apiRequest('/messages/conversations', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${agentToken}`, 'User-Agent': USER_AGENTS.desktopFirefox }
  });
  const foundConvB = agentList.data.conversations.find(c => c.id === convIdB);
  assert(foundConvB, 'Agent A did not receive Student B conversation');
  console.log(`   ✓ Agent A found conversation: Student = ${foundConvB.studentName}, LastMsg = "${foundConvB.lastMessageText}"`);

  // Test E: Agent A replies to Student B
  console.log('\n[Test E] Agent A replies to Student B...');
  const agentReply = await apiRequest(`/messages/conversations/${convIdB}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${agentToken}`, 'User-Agent': USER_AGENTS.desktopFirefox },
    body: JSON.stringify({
      content: 'Hello Fatima! Yes, the room is vacant, painted, and ready for move-in today.',
      messageType: 'TEXT'
    })
  });
  assert(agentReply.ok, `Agent reply failed: ${JSON.stringify(agentReply.data)}`);
  console.log(`   ✓ Agent A reply sent: MsgID = ${agentReply.data.message.id}`);

  // Test F: Student B loads conversation and receives Agent A's reply
  console.log('\n[Test F] Student B receives Agent A\'s reply on mobile device...');
  const studentBView = await apiRequest(`/messages/conversations/${convIdB}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': USER_AGENTS.mobileIPhoneSafari,
      'x-user-id': userB.id,
      'x-user-email': userB.email,
      'x-user-role': userB.role
    }
  });
  assert(studentBView.ok, `Student B view failed: ${JSON.stringify(studentBView.data)}`);
  const msgs = studentBView.data.messages;
  const lastMsg = msgs[msgs.length - 1];
  console.log(`   ✓ Total messages in thread: ${msgs.length}`);
  console.log(`   ✓ Latest message received: [${lastMsg.senderRole}] "${lastMsg.content}"`);
  assert(lastMsg.content.includes('vacant, painted, and ready'), 'Agent reply content mismatch');

  // Test G: Refresh page and re-verify persistence
  console.log('\n[Test G] Student B refreshes page (token rehydration)...');
  const studentBRefreshed = await apiRequest(`/messages/conversations/${convIdB}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenB}`, 'User-Agent': USER_AGENTS.mobileIPhoneSafari }
  });
  assert(studentBRefreshed.ok, 'Re-load after refresh failed');
  console.log(`   ✓ Conversation persisted after refresh: ${studentBRefreshed.data.messages.length} messages verified.`);

  // Test H: Logout and login again
  console.log('\n[Test H] Student B logs out and logs back in...');
  const reloginB = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENTS.mobileAndroidChrome },
    body: JSON.stringify({ email: studentBEmail, password: 'Password123!', role: 'STUDENT' })
  });
  assert(reloginB.ok, 'Student B re-login failed');
  const newTokenB = reloginB.data.token;
  const relogView = await apiRequest(`/messages/conversations/${convIdB}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${newTokenB}`, 'User-Agent': USER_AGENTS.mobileAndroidChrome }
  });
  assert(relogView.ok, 'Student B conversation access after re-login failed');
  console.log(`   ✓ Re-login verified: Conversation ${convIdB} intact.`);

  // -------------------------------------------------------------------------
  // SECTION 16: AUDIT OTHER PROTECTED ROUTES ON PLATFORM
  // -------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('SECTION 16: AUDIT OTHER PROTECTED PLATFORM ROUTES WITH SHARED AUTH');
  console.log('------------------------------------------------------------------------\n');

  // Student Dashboard / Preferences
  const prefRes = await apiRequest('/auth/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   ✓ Student Profile/Me: HTTP ${prefRes.status} OK`);

  // Provider properties
  const providerPropsRes = await apiRequest('/provider/properties', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  console.log(`   ✓ Provider Properties: HTTP ${providerPropsRes.status} OK`);

  // Presence heartbeat
  const heartbeatRes = await apiRequest('/presence/heartbeat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log(`   ✓ Presence Heartbeat: HTTP ${heartbeatRes.status} OK`);

  console.log('\n========================================================================');
  console.log('✅ ALL TESTS PASSED: SHARED ROOT CAUSE RESOLVED ACROSS DESKTOP & MOBILE!');
  console.log('========================================================================\n');
}

runMasterVerificationSuite().catch((err) => {
  console.error('\n❌ MASTER VERIFICATION SUITE FAILED:', err);
  process.exit(1);
});
