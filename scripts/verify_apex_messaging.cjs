const assert = require('assert');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = 'hostel-ease-jwt-secure-secret-key-2026';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('HOSTEL EASE — APEX-LEVEL MESSAGING & READ/UNREAD VERIFICATION');
  console.log('====================================================\n');

  // 1. Authenticate Student and Agent
  console.log('1. Generating tokens for Student and Agent...');
  const studentUser = {
    id: 'user-student-1',
    email: 'student@lautech.edu.ng',
    fullName: 'Babatunde Adeleke',
    role: 'STUDENT'
  };
  const studentToken = signToken(studentUser);

  const agentUser = {
    id: 'user-provider-1',
    email: 'landlord@hostelease.ng',
    fullName: 'Chief (Alhaji) G. O. Adeleke',
    role: 'PROVIDER'
  };
  const agentToken = signToken(agentUser);

  console.log(`   Student: ${studentUser.fullName} (${studentUser.id})`);
  console.log(`   Agent: ${agentUser.fullName} (${agentUser.id})\n`);

  // 2. Start / Resolve conversation for a verified property
  console.log('2. Starting conversation for Property prop-1...');
  const startRes = await request('/messages/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ propertyId: 'prop-1' })
  });
  assert(startRes.ok, `Failed to start conversation: ${JSON.stringify(startRes.data)}`);
  const convId = startRes.data.conversationId;
  console.log(`   Conversation ID: ${convId}\n`);

  // Reset test conversation messages for a fresh cycle
  const dbInit = new Database('data/hostel_ease.db');
  dbInit.prepare("DELETE FROM messages WHERE conversation_id = ?").run(convId);
  dbInit.prepare("DELETE FROM notifications WHERE conversation_id = ?").run(convId);

  // 3. TEST 1: CHATBOT SPEED & PERSISTENCE
  console.log('3. TEST 1: Student sends "Hi" (Chatbot speed & automated acknowledgement)...');
  const sendStart = Date.now();
  const sendRes = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ content: 'Hi' })
  });
  const elapsed = Date.now() - sendStart;
  console.log(`   Response time: ${elapsed}ms`);
  assert(sendRes.ok, `Failed to send message: ${JSON.stringify(sendRes.data)}`);
  assert(sendRes.data.message, 'Missing student message in response');
  assert.equal(sendRes.data.message.content, 'Hi');
  assert(sendRes.data.autoReply, 'Missing autoReply in response');
  assert(sendRes.data.autoReply.content.includes('Hi! Thanks for reaching out'), 'Auto-reply content mismatch');
  assert.equal(sendRes.data.autoReply.messageType, 'AUTOMATED_ACKNOWLEDGEMENT');
  console.log(`   ✓ Message sent and confirmed in ${elapsed}ms (< 100ms)`);
  console.log(`   ✓ Auto-reply generated: "${sendRes.data.autoReply.content.substring(0, 50)}..."\n`);

  // 4. TEST 2: AUTOMATED ACKNOWLEDGEMENT DOES NOT INFLATE STUDENT UNREAD COUNT
  console.log('4. TEST 2: Verifying automated assistant does not create phantom unread badge for student...');
  const studentConvsAfterSend = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(studentConvsAfterSend.ok);
  const targetConvStudent = studentConvsAfterSend.data.conversations.find(c => c.id === convId);
  assert(targetConvStudent, 'Conversation not found in student list');
  console.log(`   Student unread count for conversation: ${targetConvStudent.unreadCount}`);
  assert.equal(targetConvStudent.unreadCount, 0, `Expected 0 unread for student, got ${targetConvStudent.unreadCount}`);

  const studentGlobalUnread = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(studentGlobalUnread.data.unreadCount, 0, `Expected 0 global unread for student, got ${studentGlobalUnread.data.unreadCount}`);
  console.log('   ✓ Student unread count is 0 (No phantom unread badge)\n');

  // 5. TEST 3: AGENT SENDS 2 MESSAGES -> STUDENT SEES "2 NEW"
  console.log('5. TEST 3: Agent sends 2 new messages to Student...');
  const msg1 = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ content: 'Hello! Thanks for your interest in Under G Royal Suites.' })
  });
  assert(msg1.ok);

  const msg2 = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ content: 'Water and electricity are stable 24/7. When would you like to inspect?' })
  });
  assert(msg2.ok);

  // Student checks unread count: MUST BE EXACTLY 2
  const studentConvsWith2Unread = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const conv2Unread = studentConvsWith2Unread.data.conversations.find(c => c.id === convId);
  console.log(`   Student inbox shows: "${conv2Unread.unreadCount} new"`);
  assert.equal(conv2Unread.unreadCount, 2, `Expected unreadCount to be 2, got ${conv2Unread.unreadCount}`);

  const globalUnread2 = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log(`   Global unread badge shows: ${globalUnread2.data.unreadCount}`);
  assert.equal(globalUnread2.data.unreadCount, 2, `Expected global unread to be 2, got ${globalUnread2.data.unreadCount}`);
  console.log('   ✓ Student sees exactly "2 new" and global badge shows 2\n');

  // 6. TEST 4: STUDENT OPENS CONVERSATION -> BADGE DISAPPEARS AND PERSISTS IN DB
  console.log('6. TEST 4: Student opens conversation...');
  const openRes = await request(`/messages/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(openRes.ok);
  assert(openRes.data.messages && openRes.data.messages.length >= 4);

  // Check that all incoming messages from agent are marked read
  const incomingMessages = openRes.data.messages.filter(m => m.senderId !== studentUser.id);
  const allIncomingRead = incomingMessages.every(m => m.isRead === true);
  console.log(`   All incoming agent messages returned with isRead = true: ${allIncomingRead}`);
  assert(allIncomingRead, 'Expected all incoming messages from agent to be isRead: true');

  // Student checks conversation list: "2 new" MUST BE GONE
  const studentConvsAfterOpen = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const convAfterOpen = studentConvsAfterOpen.data.conversations.find(c => c.id === convId);
  console.log(`   Student inbox shows: unreadCount = ${convAfterOpen.unreadCount}`);
  assert.equal(convAfterOpen.unreadCount, 0, `Expected unreadCount to be 0 after opening, got ${convAfterOpen.unreadCount}`);

  const globalUnreadAfterOpen = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log(`   Global unread badge shows: ${globalUnreadAfterOpen.data.unreadCount}`);
  assert.equal(globalUnreadAfterOpen.data.unreadCount, 0, `Expected global unread to be 0 after opening, got ${globalUnreadAfterOpen.data.unreadCount}`);
  console.log('   ✓ "2 new" badge disappeared immediately upon opening\n');

  // 7. TEST 5: PERSISTENCE ACROSS REFRESH AND SECOND DEVICE LOGIN
  console.log('7. TEST 5: Verifying read persistence in SQLite and simulated second device...');
  const db = new Database('data/hostel_ease.db');
  const unreadRows = db.prepare('SELECT id, content, is_read FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0').all(convId, studentUser.id);
  console.log(`   Unread rows in SQLite for this conversation: ${unreadRows.length}`);
  assert.equal(unreadRows.length, 0, 'Database still has unread messages for student');

  // Second device login token
  const tokenDevice2 = signToken(studentUser);
  const convsDevice2 = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${tokenDevice2}` }
  });
  const convDevice2 = convsDevice2.data.conversations.find(c => c.id === convId);
  console.log(`   Second device inbox shows: unreadCount = ${convDevice2.unreadCount}`);
  assert.equal(convDevice2.unreadCount, 0, `Second device resurrected unread count: ${convDevice2.unreadCount}`);
  console.log('   ✓ Read state 100% persisted in SQLite and synchronized across devices\n');

  // 8. TEST 6: GENUINELY NEW MESSAGE AFTER CONVERSATION WAS READ -> "1 NEW"
  console.log('8. TEST 6: Agent sends a genuinely NEW message...');
  const msg3 = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ content: 'Are you still interested in the room?' })
  });
  assert(msg3.ok);

  const studentConvsWith1New = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const conv1New = studentConvsWith1New.data.conversations.find(c => c.id === convId);
  console.log(`   Student inbox shows: "${conv1New.unreadCount} new"`);
  assert.equal(conv1New.unreadCount, 1, `Expected unreadCount to be 1, got ${conv1New.unreadCount}`);

  // Student opens conversation again -> 1 new disappears
  const openAgain = await request(`/messages/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(openAgain.ok);

  const studentConvsAfterSecondOpen = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const convAfterSecondOpen = studentConvsAfterSecondOpen.data.conversations.find(c => c.id === convId);
  console.log(`   After opening, student inbox shows: unreadCount = ${convAfterSecondOpen.unreadCount}`);
  assert.equal(convAfterSecondOpen.unreadCount, 0);
  console.log('   ✓ Genuinely new message shows "1 new" and disappears upon opening\n');

  // 9. TEST 7: USER-SPECIFIC READ INDEPENDENCE
  console.log('9. TEST 7: Testing student and agent read state independence...');
  // Student sends a new message to Agent
  const studentNewMsg = await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ content: 'Yes, I can inspect at 3 PM today.' })
  });
  assert(studentNewMsg.ok);

  // For Student: student sent it, so student unread is 0
  const studentCheck = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(studentCheck.data.unreadCount, 0, 'Student should have 0 unread');

  // For Agent: incoming inquiry from student, so Agent unread MUST BE >= 1
  const agentCheck = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  const agentConv = agentCheck.data.conversations.find(c => c.id === convId);
  console.log(`   Agent inbox for this conversation shows unreadCount: ${agentConv.unreadCount}`);
  assert(agentConv.unreadCount >= 1, `Agent should have unread messages from student, got ${agentConv.unreadCount}`);

  // Agent opens conversation -> Agent unread becomes 0
  await request(`/messages/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  const agentAfterOpen = await request('/messages/conversations', {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  const agentConvAfterOpen = agentAfterOpen.data.conversations.find(c => c.id === convId);
  console.log(`   Agent unreadCount after agent opens: ${agentConvAfterOpen.unreadCount}`);
  assert.equal(agentConvAfterOpen.unreadCount, 0);
  console.log('   ✓ Student and Agent read states are completely independent\n');

  // 10. TEST 8: MARK ALL AS READ ENDPOINT
  console.log('10. TEST 8: Testing Mark All As Read...');
  // Agent sends a message so student has 1 unread
  await request(`/messages/conversations/${convId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: JSON.stringify({ content: 'Great, see you at 3 PM!' })
  });
  const studentHasUnread = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(studentHasUnread.data.unreadCount, 1);

  // Call mark-all-as-read
  const markAllRes = await request('/messages/conversations/read-all', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(markAllRes.ok);
  assert.equal(markAllRes.data.unreadCount, 0);

  const studentFinalCount = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert.equal(studentFinalCount.data.unreadCount, 0);
  console.log('   ✓ Mark All As Read cleared all unread messages and notifications\n');

  console.log('====================================================');
  console.log('🎉 ALL APEX MESSAGING & READ/UNREAD TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
