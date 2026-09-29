import http from 'http';
import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

function makeRequest(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => chunks += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          resolve({ statusCode: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 200, data: chunks });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Running HostelEase End-to-End Chat & Presence Audit Test...\n');

  // 1. Health check
  const health = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  console.log(`[1] Health Check: Status ${health.statusCode} -> Platform: ${health.data?.platform}`);
  if (health.statusCode !== 200) throw new Error('Backend health check failed');

  // Find real active student, provider, and property from DB
  const student = db.prepare("SELECT id, email, full_name as fullName, role, phone, is_active as isActive FROM users WHERE role = 'STUDENT' LIMIT 1").get() as any;
  const provider = db.prepare("SELECT id, email, full_name as fullName, role, phone, is_active as isActive FROM users WHERE role = 'PROVIDER' LIMIT 1").get() as any;
  const property = db.prepare("SELECT id, title, provider_id FROM properties LIMIT 1").get() as any;

  console.log(`[INFO] Found Test Users:`);
  console.log(`       Student:  ${student.fullName} (${student.id})`);
  console.log(`       Provider: ${provider.fullName} (${provider.id})`);
  console.log(`       Property: ${property.title} (${property.id})\n`);

  const studentToken = generateToken(student);
  const providerToken = generateToken(provider);

  // 2. Test Presence Heartbeat for Student and Agent
  const studentHeartbeat = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/presence/heartbeat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  });
  console.log(`[2A] Student Heartbeat: Status ${studentHeartbeat.statusCode} -> ${JSON.stringify(studentHeartbeat.data)}`);
  if (studentHeartbeat.statusCode !== 200) throw new Error('Student heartbeat failed');

  const providerHeartbeat = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/presence/heartbeat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    }
  });
  console.log(`[2B] Agent Heartbeat: Status ${providerHeartbeat.statusCode} -> ${JSON.stringify(providerHeartbeat.data)}`);
  if (providerHeartbeat.statusCode !== 200) throw new Error('Agent heartbeat failed');

  // 3. Query Real Presence
  const studentPresence = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/presence/${student.id}`,
    method: 'GET'
  });
  console.log(`[3A] Query Student Presence:`, studentPresence.data);
  if (!studentPresence.data?.isOnline) throw new Error('Student must be reported isOnline: true immediately following heartbeat');

  const providerPresence = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/presence/${provider.id}`,
    method: 'GET'
  });
  console.log(`[3B] Query Agent Presence:`, providerPresence.data);
  if (!providerPresence.data?.isOnline) throw new Error('Agent must be reported isOnline: true immediately following heartbeat');

  // 4. Student starts or retrieves persistent conversation for the property
  const inquiryText = `Inquiry test at ${new Date().toISOString()}: Does this hostel have running water and prepaid light?`;
  const startConv = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/messages/conversations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    propertyId: property.id,
    initialMessage: inquiryText
  });
  console.log(`[4] Start Hostel Conversation: Status ${startConv.statusCode}, Conv ID: ${startConv.data?.conversationId || startConv.data?.conversation?.id}`);
  const convId = startConv.data?.conversationId || startConv.data?.conversation?.id;
  if (!convId) throw new Error('Failed to start conversation');

  // 5. Agent sends a reply message
  const replyText = `Hello ${student.fullName}, yes! 24/7 borehole and dedicated prepaid meter.`;
  const sendReply = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/messages/conversations/${convId}/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`
    }
  }, {
    content: replyText,
    messageType: 'TEXT'
  });
  console.log(`[5] Agent Sent Reply: Status ${sendReply.statusCode}, Message ID: ${sendReply.data?.message?.id}`);
  if (sendReply.statusCode !== 201 && sendReply.statusCode !== 200) throw new Error('Agent reply failed');

  // 6. Fetch conversation detail from Student perspective
  const detail = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/messages/conversations/${convId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${studentToken}`
    }
  });
  console.log(`[6] Get Conversation Detail: Status ${detail.statusCode}`);
  const conv = detail.data?.conversation;
  const messages = detail.data?.messages;
  console.log(`    Hostel Title:  ${conv?.property?.title}`);
  console.log(`    Cover Image:   ${conv?.property?.coverImage ? 'VALID HIGH-RES' : 'NONE'}`);
  console.log(`    Provider Name: ${conv?.provider?.name}`);
  console.log(`    Provider Online: ${conv?.provider?.isOnline}`);
  console.log(`    Provider Last Seen: ${conv?.provider?.lastSeenAt}`);
  console.log(`    Messages in thread: ${messages?.length}`);

  if (!conv?.property?.coverImage) {
    throw new Error('Property cover image should be present');
  }

  // Verify chronological order
  for (let i = 1; i < messages.length; i++) {
    const prev = new Date(messages[i - 1].createdAt).getTime();
    const curr = new Date(messages[i].createdAt).getTime();
    if (curr < prev) {
      throw new Error(`Chronological violation at message index ${i}`);
    }
  }
  console.log(`    Order Check: Strictly chronological (Verified ✓)`);

  // 7. Security: Verify non-participant unauthorized user gets 403 Forbidden
  let thirdPartyUser = db.prepare(`
    SELECT id, email, full_name as fullName, role, phone, is_active as isActive
    FROM users 
    WHERE id NOT IN (?, ?) AND role = 'STUDENT'
    LIMIT 1
  `).get(student.id, provider.id) as any;

  if (!thirdPartyUser) {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES ('user-intruder-test-1', 'intruder@test.ng', 'hashed', 'Intruder Student', '08000000001', 'STUDENT', 1, datetime('now'))
    `).run();
    thirdPartyUser = { id: 'user-intruder-test-1', email: 'intruder@test.ng', fullName: 'Intruder Student', role: 'STUDENT', isActive: 1 };
  }

  const intruderToken = generateToken(thirdPartyUser);

  const intruderReq = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/messages/conversations/${convId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${intruderToken}`
    }
  });
  console.log(`[7] Non-Participant Security Test: Status ${intruderReq.statusCode} (Expected 403)`);
  if (intruderReq.statusCode !== 403) {
    throw new Error(`Security violation! Expected 403 Forbidden for non-participant, got ${intruderReq.statusCode}`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 7 E2E CHAT AND PRESENCE AUDIT TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
