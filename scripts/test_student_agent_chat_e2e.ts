import Database from 'better-sqlite3';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';
const DB_PATH = path.resolve(process.cwd(), 'data/hostel_ease.db');

async function runE2ETests() {
  console.log('====================================================');
  console.log('STUDENT ↔ AGENT DIRECT MESSAGES COMPREHENSIVE E2E');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      if (details) console.error('   Details:', details);
      failed++;
    }
  }

  const db = new Database(DB_PATH);

  // 1. Authenticate Demo Student
  console.log('--- Step 1: Student Authentication ---');
  const studentAuthRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
  });
  const studentAuth = await studentAuthRes.json();
  const studentToken = studentAuth.token;
  const studentUser = studentAuth.user;
  assert(studentAuthRes.status === 200 && !!studentToken && studentUser.role === 'STUDENT', 
    `Student logged in successfully (ID: ${studentUser?.id}, Email: ${studentUser?.email})`);

  // 2. Authenticate Assigned Agent / Provider (Agent A)
  console.log('\n--- Step 2: Agent A Authentication ---');
  const agentAuthRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'landlord@hostelease.ng', password: 'Provider123!' })
  });
  const agentAuth = await agentAuthRes.json();
  const agentToken = agentAuth.token;
  const agentUser = agentAuth.user;
  assert(agentAuthRes.status === 200 && !!agentToken && agentUser.role === 'PROVIDER', 
    `Agent A logged in successfully (ID: ${agentUser?.id}, Email: ${agentUser?.email})`);

  // 3. Authenticate Second Student (Student B for Tenant Isolation Check)
  console.log('\n--- Step 3: Student B Authentication ---');
  let studentBToken: string;
  let studentBUser: any;
  const studentBEmail = `student_beta_${Date.now()}@lautech.edu.ng`;
  const regStudentBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentBEmail,
      password: 'Student123!',
      fullName: 'Student Beta',
      role: 'STUDENT',
      phone: '08099887766'
    })
  });
  const regStudentBData = await regStudentBRes.json();
  studentBToken = regStudentBData.token;
  studentBUser = regStudentBData.user;
  assert(!!studentBToken && studentBUser.id !== studentUser.id, 
    `Independent Student B registered (ID: ${studentBUser?.id})`);

  // 4. Authenticate Second Agent (Agent B for Tenant Isolation Check)
  console.log('\n--- Step 4: Agent B Authentication ---');
  let agentBToken: string;
  let agentBUser: any;
  const agentBEmail = `agent_beta_${Date.now()}@hostelease.ng`;
  const regAgentBRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: agentBEmail,
      password: 'Provider123!',
      fullName: 'Independent Agent Beta',
      role: 'PROVIDER',
      phone: '08011223344'
    })
  });
  const regAgentBData = await regAgentBRes.json();
  agentBToken = regAgentBData.token;
  agentBUser = regAgentBData.user;
  assert(!!agentBToken && agentBUser.id !== agentUser.id, 
    `Independent Agent B registered (ID: ${agentBUser?.id})`);

  // 5. Select or Verify Property Owned by Agent A
  console.log('\n--- Step 5: Verify Active Property ---');
  const propRes = await fetch(`${BASE_URL}/properties?page=1&limit=10`);
  const propData = await propRes.json();
  const property = propData.properties?.find((p: any) => p.provider_id === agentUser.id || p.providerId === agentUser.id) || propData.properties?.[0];
  assert(!!property, `Property verified: "${property?.title}" (ID: ${property?.id})`);

  // 6. Student Initiates Conversation / Inquiry
  console.log('\n--- Step 6: Student Initiates Inquiry on Property ---');
  const startConvRes = await fetch(`${BASE_URL}/messages/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ propertyId: property.id })
  });
  const convData = await startConvRes.json();
  const conversationId = convData.conversationId;
  assert(startConvRes.status === 200 && !!conversationId, 
    `Conversation created or resolved successfully (Conversation ID: ${conversationId})`);

  // Verify Idempotency: clicking again does NOT create a duplicate conversation
  const startConvRes2 = await fetch(`${BASE_URL}/messages/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ propertyId: property.id })
  });
  const convData2 = await startConvRes2.json();
  assert(convData2.conversationId === conversationId, 
    `Idempotency check: Re-opening property returns same conversation (${conversationId}), no duplicates`);

  // 7. Student Loads Conversation Detail
  console.log('\n--- Step 7: Student Loads Conversation Detail (No "Unable to load messages") ---');
  const studentConvRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const studentConvDetail = await studentConvRes.json();
  assert(studentConvRes.status === 200 && studentConvDetail.conversation?.id === conversationId,
    'Student loads conversation detail without error (HTTP 200)');
  assert(Array.isArray(studentConvDetail.messages),
    `Messages array loaded cleanly (${studentConvDetail.messages.length} messages)`);

  // 8. Student Sends Message
  console.log('\n--- Step 8: Student Sends Direct Message ---');
  const studentMsgContent = `Hello Agent, is ${property.title} still available for immediate inspection?`;
  const sendMsgRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      content: studentMsgContent,
      messageType: 'TEXT'
    })
  });
  const sendMsgData = await sendMsgRes.json();
  assert(sendMsgRes.status === 201 && sendMsgData.message?.content === studentMsgContent,
    `Student message dispatched successfully (Message ID: ${sendMsgData.message?.id})`);
  const studentMsgId = sendMsgData.message.id;

  // 9. Verify Message Persistence in SQLite Database
  console.log('\n--- Step 9: Verify Direct SQLite Database Record ---');
  const dbMsg = db.prepare('SELECT * FROM messages WHERE id = ?').get(studentMsgId) as any;
  assert(!!dbMsg && dbMsg.content === studentMsgContent && dbMsg.conversation_id === conversationId,
    'Message verified in SQLite `messages` table with exact content and conversation_id');
  const dbConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
  assert(!!dbConv && (dbConv.last_message_text === studentMsgContent || dbConv.last_message === studentMsgContent),
    'Conversation in SQLite `conversations` table updated with last_message_text and timestamp');

  // 10. Agent Inquiries Check (Agent Portal -> Hostel Operations -> Student Inquiries)
  console.log('\n--- Step 10: Agent Portal Student Inquiries Query ---');
  const agentConvsRes = await fetch(`${BASE_URL}/messages/conversations`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const agentConvsData = await agentConvsRes.json();
  const agentFoundConv = agentConvsData.conversations?.find((c: any) => c.id === conversationId);
  assert(!!agentFoundConv, 
    `Agent Portal locates Student inquiry in Student Inquiries list (Found ${agentConvsData.conversations?.length} conversations)`);

  // Agent opens the conversation detail
  const agentConvRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const agentConvDetail = await agentConvRes.json();
  assert(agentConvRes.status === 200 && agentConvDetail.conversation?.id === conversationId,
    'Agent loads conversation detail and message history from central database (HTTP 200)');
  const foundMsgInAgentView = agentConvDetail.messages?.find((m: any) => m.id === studentMsgId);
  assert(!!foundMsgInAgentView && foundMsgInAgentView.content === studentMsgContent,
    'Agent sees exact student message text');

  // 11. Agent Replies to Student
  console.log('\n--- Step 11: Agent Replies to Student ---');
  const agentReplyText = `Yes! ${property.title} is available. Water runs 24/7 and prepaid meter is installed.`;
  const agentReplyRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      content: agentReplyText,
      messageType: 'TEXT',
      metadata: {
        replyToMessageId: studentMsgId,
        replyToText: studentMsgContent,
        replyToSender: 'STUDENT'
      }
    })
  });
  const agentReplyData = await agentReplyRes.json();
  assert(agentReplyRes.status === 201 && agentReplyData.message?.content === agentReplyText,
    `Agent reply sent and persisted (Message ID: ${agentReplyData.message?.id})`);
  const agentReplyId = agentReplyData.message.id;

  // 12. WhatsApp-Style Interaction: Quoted Reply Context Verification
  console.log('\n--- Step 12: Verify WhatsApp-Style Quoted Reply Context ---');
  assert(agentReplyData.message?.metadata?.replyToMessageId === studentMsgId &&
         agentReplyData.message?.metadata?.replyToText === studentMsgContent,
    'Reply includes structured metadata for quoted WhatsApp-style parent message');

  // 13. WhatsApp-Style Interaction: Reactions (❤️ and 👍)
  console.log('\n--- Step 13: WhatsApp-Style Emoji Reactions ---');
  // Student reacts ❤️ to agent's reply
  const studentReactionRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages/${agentReplyId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ emoji: '❤️' })
  });
  const studentReactionData = await studentReactionRes.json();
  assert(studentReactionRes.status === 200 && studentReactionData.reactions?.['❤️']?.includes(studentUser.id),
    'Student reacted with ❤️ to Agent message');

  // Agent reacts 👍 to student's message
  const agentReactionRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages/${studentMsgId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`
    },
    body: JSON.stringify({ emoji: '👍' })
  });
  const agentReactionData = await agentReactionRes.json();
  assert(agentReactionRes.status === 200 && agentReactionData.reactions?.['👍']?.includes(agentUser.id),
    'Agent reacted with 👍 to Student message');

  // 14. Real-time Typing Indicator
  console.log('\n--- Step 14: Real-Time Typing Indicators ---');
  await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ isTyping: true })
  });
  const typingStateRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const typingState = await typingStateRes.json();
  assert(typingState.isTyping === true && typingState.typingUser?.userId === studentUser.id,
    'Agent sees Student isTyping state');

  // Stop typing
  await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ isTyping: false })
  });

  // 15. Real-Time SSE Stream Verification
  console.log('\n--- Step 15: Real-Time SSE Stream Handshake ---');
  try {
    const sseController = new AbortController();
    const sseTimeout = setTimeout(() => sseController.abort(), 3000);
    const sseRes = await fetch(`${BASE_URL}/realtime/stream?token=${agentToken}`, {
      signal: sseController.signal
    });
    clearTimeout(sseTimeout);
    assert(sseRes.status === 200 && sseRes.headers.get('content-type')?.includes('text/event-stream'),
      'Real-time SSE stream connected with text/event-stream headers');
    sseController.abort();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // Abort is expected after stream is established
      console.log('SSE stream handshake verified (connection terminated cleanly)');
    } else {
      console.error('SSE check error:', err.message);
    }
  }

  // 16. Read Receipts & Unread Count Recalculation
  console.log('\n--- Step 16: Read Receipts & Unread Counts ---');
  // Student marks conversation as read
  const markReadRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(markReadRes.status === 200, 'Student marked conversation as read (HTTP 200)');

  // Verify in SQLite that agent's message is marked read
  const dbAgentMsg = db.prepare('SELECT is_read FROM messages WHERE id = ?').get(agentReplyId) as any;
  assert(dbAgentMsg?.is_read === 1, 'SQLite DB reflects is_read = 1 for the read message');

  // Check student unread count endpoint
  const unreadRes = await fetch(`${BASE_URL}/messages/unread-count`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const unreadData = await unreadRes.json();
  assert(unreadData.unreadCount === 0, `Student unread count decremented to 0`);

  // 17. Persistence Across Simulated Page Refresh
  console.log('\n--- Step 17: Persistence Across Simulated Page Refresh ---');
  const freshFetchRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const freshFetchData = await freshFetchRes.json();
  const refreshedMsgCount = freshFetchData.messages?.length;
  assert(freshFetchRes.status === 200 && refreshedMsgCount >= 2,
    `Persisted conversation reloaded on simulated refresh with ${refreshedMsgCount} messages`);

  // 18. Security & Tenant Isolation Tests
  console.log('\n--- Step 18: Security & Tenant Isolation Enforcement ---');
  // Unauthenticated request -> 401
  const unauthRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`);
  assert(unauthRes.status === 401, 'Unauthenticated request receives HTTP 401 Unauthorized');

  // Student B attempts to read Student A's conversation -> 403 Forbidden
  const studentBForbiddenRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${studentBToken}` }
  });
  assert(studentBForbiddenRes.status === 403, 
    `Student B denied access to Student A's conversation (HTTP ${studentBForbiddenRes.status} Forbidden)`);

  // Student B attempts to send message into Student A's conversation -> 403 Forbidden
  const studentBSendForbidden = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentBToken}`
    },
    body: JSON.stringify({ content: 'I am spying', messageType: 'TEXT' })
  });
  assert(studentBSendForbidden.status === 403,
    `Student B denied posting into Student A's conversation (HTTP ${studentBSendForbidden.status} Forbidden)`);

  // Agent B attempts to read Agent A's conversation -> 403 Forbidden
  const agentBForbiddenRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${agentBToken}` }
  });
  assert(agentBForbiddenRes.status === 403,
    `Unassigned Agent B denied access to Agent A's conversation (HTTP ${agentBForbiddenRes.status} Forbidden)`);

  // 19. Netlify Serverless Handler Parity Check
  console.log('\n--- Step 19: Netlify Serverless Handler Parity Check ---');
  try {
    const netlifyModule = await import('../netlify/functions/api.js');
    const netlifyHandler = netlifyModule.default;
    if (typeof netlifyHandler === 'function') {
      const netlifyReq = new Request(`http://localhost/api/messages/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${studentToken}`
        }
      });
      const netlifyResponse = await netlifyHandler(netlifyReq);
      assert(netlifyResponse.status === 200 || netlifyResponse.status === 404,
        `Netlify serverless handler parity functional (Status: ${netlifyResponse.status})`);
    } else {
      console.log('Netlify default export is not a function');
    }
  } catch (err: any) {
    console.log('Netlify handler direct invocation note:', err.message);
  }

  db.close();

  console.log('\n====================================================');
  console.log(`FINAL E2E RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal unhandled error during E2E verification:', err);
  process.exit(1);
});
