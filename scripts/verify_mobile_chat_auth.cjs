const assert = require('assert');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = 'hostel-ease-jwt-secure-secret-key-2026';

const MOBILE_USER_AGENTS = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36'
};

async function request(endpoint, options = {}) {
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
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runMobileAuthSuite() {
  console.log('====================================================');
  console.log('HOSTEL EASE — MOBILE CHAT AUTHORIZATION TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: CORS Preflight OPTIONS check for mobile headers
  console.log('TEST 1: CORS Preflight OPTIONS Request with Mobile Headers...');
  const corsRes = await fetch(`${API_BASE}/messages/conversations`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization, x-user-email, x-user-id, x-user-role'
    }
  });
  const allowHeaders = corsRes.headers.get('access-control-allow-headers') || '';
  console.log(`   OPTIONS status: ${corsRes.status}`);
  console.log(`   Access-Control-Allow-Headers: ${allowHeaders}`);
  assert(corsRes.status === 200 || corsRes.status === 204, `OPTIONS preflight failed with status ${corsRes.status}`);
  assert(allowHeaders.toLowerCase().includes('x-user-email'), 'CORS preflight missing x-user-email in allowed headers');
  console.log('   ✓ CORS preflight allows mobile custom headers!\n');

  // TEST 2: Register a legitimate Student A from a mobile device
  console.log('TEST 2: Register Legitimate Student A on Mobile Device (iPhone Safari)...');
  const studentAEmail = `farouk.mobile.${Date.now()}@lautech.edu.ng`;
  const registerRes = await request('/auth/register', {
    method: 'POST',
    headers: {
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari
    },
    body: JSON.stringify({
      email: studentAEmail,
      password: 'Password123!',
      fullName: 'Farouk Danladi',
      role: 'STUDENT',
      phone: '08023456789',
      studentDetails: {
        department: 'Mechanical Engineering',
        level: '400L',
        matricNo: '20/47ME/0987'
      }
    })
  });
  assert(registerRes.ok, `Student A registration failed: ${JSON.stringify(registerRes.data)}`);
  const studentA = registerRes.data.user;
  const tokenA = registerRes.data.token;
  console.log(`   ✓ Student A registered: ${studentA.fullName} (ID: ${studentA.id})`);
  assert(tokenA, 'Registration did not return auth token');
  console.log('   ✓ Token generated successfully\n');

  // TEST 3: Verify Student A session via /auth/me on mobile
  console.log('TEST 3: Verify Student A Session via /auth/me...');
  const meRes = await request('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari,
      'x-user-email': studentA.email,
      'x-user-id': studentA.id,
      'x-user-role': 'STUDENT'
    }
  });
  assert(meRes.ok, `/auth/me failed: ${JSON.stringify(meRes.data)}`);
  assert(meRes.data.user.id === studentA.id, 'Session user ID mismatch');
  console.log(`   ✓ Authenticated UID: ${meRes.data.user.id}`);
  console.log(`   ✓ Role confirmed: ${meRes.data.user.role}`);
  console.log(`   ✓ Academic profile intact: ${meRes.data.user.department}, ${meRes.data.user.level}\n`);

  // TEST 4: Student opens property listing
  console.log('TEST 4: Student views property listing and identifies Agent ID...');
  const propRes = await request('/properties/prop-1', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari
    }
  });
  assert(propRes.ok, `Failed to load property prop-1: ${JSON.stringify(propRes.data)}`);
  const property = propRes.data.property;
  console.log(`   ✓ Property Loaded: "${property.title}" (ID: ${property.id})`);
  console.log(`   ✓ Provider ID Identified: ${property.providerId || property.provider?.id}`);
  assert(property.providerId || property.provider?.id, 'Property missing providerId');
  const agentId = property.providerId || property.provider?.id;
  console.log(`   ✓ Agent ID: ${agentId}\n`);

  // TEST 5: Student clicks "Message Agent" on Mobile Device -> startConversation
  console.log('TEST 5: Student clicks "Message Agent" on Mobile Device...');
  const startConvRes = await request('/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari,
      'x-user-email': studentA.email,
      'x-user-id': studentA.id,
      'x-user-role': 'STUDENT'
    },
    body: JSON.stringify({
      propertyId: property.id,
      initialMessage: 'Hello Agent, is this room still available for inspection this weekend?'
    })
  });
  assert(startConvRes.ok, `Mobile Message Agent failed with status ${startConvRes.status}: ${JSON.stringify(startConvRes.data)}`);
  const conversation = startConvRes.data.conversation;
  const convId = startConvRes.data.conversationId;
  console.log(`   ✓ Conversation opened successfully! (ID: ${convId})`);
  console.log(`   ✓ Participant Student: ${conversation.studentId}`);
  console.log(`   ✓ Participant Provider: ${conversation.providerId}`);
  assert.strictEqual(conversation.studentId, studentA.id, 'Conversation student ID does not match authenticated student');
  console.log('   ✓ Zero Unauthorized errors!\n');

  // TEST 6: Student loads conversation thread details and message history
  console.log('TEST 6: Student retrieves conversation history on mobile...');
  const threadRes = await request(`/messages/conversations/${convId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari,
      'x-user-email': studentA.email,
      'x-user-id': studentA.id,
      'x-user-role': 'STUDENT'
    }
  });
  assert(threadRes.ok, `Failed to load conversation thread: ${JSON.stringify(threadRes.data)}`);
  console.log(`   ✓ Conversation thread loaded: ${threadRes.data.messages?.length || 0} messages`);
  console.log(`   ✓ Latest message: "${threadRes.data.messages[0]?.content}"\n`);

  // TEST 7: Agent logs in and replies to Student A's inquiry
  console.log('TEST 7: Agent receives message and replies to Student A...');
  const agentLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'landlord@hostelease.ng',
      password: 'Provider123!',
      role: 'PROVIDER'
    })
  });
  assert(agentLoginRes.ok, `Agent login failed: ${JSON.stringify(agentLoginRes.data)}`);
  const agentToken = agentLoginRes.data.token;
  const agentUser = agentLoginRes.data.user;

  const agentReplyRes = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${agentToken}`,
      'x-user-email': agentUser.email,
      'x-user-id': agentUser.id,
      'x-user-role': 'PROVIDER'
    },
    body: JSON.stringify({
      content: 'Hello Farouk! Yes, the self-contain is available. You can book an inspection anytime.'
    })
  });
  assert(agentReplyRes.ok, `Agent reply failed: ${JSON.stringify(agentReplyRes.data)}`);
  console.log('   ✓ Agent reply delivered successfully!\n');

  // TEST 8: Student A checks messages and sees Agent reply
  console.log('TEST 8: Student A receives Agent reply on mobile...');
  const updatedThread = await request(`/messages/conversations/${convId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.iphoneSafari
    }
  });
  assert(updatedThread.ok, 'Failed to fetch updated thread');
  const msgs = updatedThread.data.messages;
  assert(msgs.length >= 2, 'Message thread missing agent reply');
  console.log(`   ✓ Total messages in thread: ${msgs.length}`);
  console.log(`   ✓ Last message from: ${msgs[msgs.length - 1].senderRole} - "${msgs[msgs.length - 1].content}"\n`);

  // TEST 9: Privacy & Strict Authorization - Student B attempts to access Student A's conversation
  console.log('TEST 9: Strict Authorization Check (Student B attempts to access Student A\'s conversation)...');
  const studentBEmail = `halima.student.${Date.now()}@lautech.edu.ng`;
  const registerBRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: studentBEmail,
      password: 'Password123!',
      fullName: 'Halima Bello',
      role: 'STUDENT',
      phone: '08098765432'
    })
  });
  assert(registerBRes.ok, 'Student B registration failed');
  const tokenB = registerBRes.data.token;

  const unauthorizedAccessRes = await request(`/messages/conversations/${convId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'User-Agent': MOBILE_USER_AGENTS.androidChrome
    }
  });
  console.log(`   Status returned for non-participant: ${unauthorizedAccessRes.status}`);
  assert.strictEqual(unauthorizedAccessRes.status, 403, 'Non-participant student was NOT rejected with 403 Forbidden!');
  console.log('   ✓ Strict participant isolation confirmed: Student B received 403 Forbidden!\n');

  // TEST 10: Dual Token Format: Netlify hl_ token sent to Express
  console.log('TEST 10: Dual Token Format (hl_ Base64URL token sent to Express)...');
  const netlifyPayload = {
    id: studentA.id,
    email: studentA.email,
    role: 'STUDENT',
    fullName: studentA.fullName
  };
  const hlToken = `hl_${Buffer.from(JSON.stringify(netlifyPayload)).toString('base64url')}`;
  const hlAuthRes = await request('/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${hlToken}`,
      'User-Agent': MOBILE_USER_AGENTS.androidChrome
    }
  });
  assert(hlAuthRes.ok, `hl_ token failed on Express: ${JSON.stringify(hlAuthRes.data)}`);
  assert.strictEqual(hlAuthRes.data.user.id, studentA.id, 'hl_ token resolved wrong user ID');
  console.log('   ✓ Express successfully verified Netlify hl_ token format!\n');

  // TEST 11: Property lookup by slug in startConversation
  console.log('TEST 11: Start conversation using property slug...');
  const slugRes = await request('/messages/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'User-Agent': MOBILE_USER_AGENTS.androidChrome
    },
    body: JSON.stringify({
      propertyId: property.slug || 'diamond-lodge-under-g',
      initialMessage: 'Checking availability via slug link'
    })
  });
  assert(slugRes.ok, `Slug-based startConversation failed: ${JSON.stringify(slugRes.data)}`);
  console.log('   ✓ Slug resolution in startConversation succeeded!\n');

  console.log('====================================================');
  console.log('🎉 ALL 11/11 MOBILE CHAT AUTHORIZATION TESTS PASSED (100%)');
  console.log('====================================================');
}

runMobileAuthSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
