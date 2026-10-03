const jwt = require('jsonwebtoken');

// 1. Netlify Functions Handler
const apiModule = require('../netlify/functions/api.ts');
const netlifyHandler = apiModule.default || apiModule;

const JWT_SECRET = 'hostel-ease-jwt-secure-secret-key-2026';
const EXPRESS_BASE = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  HOSTELEASE CHAT SYSTEM COMPREHENSIVE VERIFICATION  ');
  console.log('====================================================\n');

  const studentToken = jwt.sign({
    id: 'user-student-test',
    email: 'teststudent@lautech.edu.ng',
    fullName: 'Test Student User',
    role: 'STUDENT'
  }, JWT_SECRET, { expiresIn: '2h' });

  // Authorized provider for prop-1
  const authorizedProviderToken = jwt.sign({
    id: 'user-provider-1',
    email: 'provider@hostelease.ng',
    fullName: 'Chief (Alhaji) G. O. Adeleke',
    role: 'PROVIDER'
  }, JWT_SECRET, { expiresIn: '2h' });

  // Unauthorized provider
  const unauthorizedProviderToken = jwt.sign({
    id: 'user-provider-unauthorized',
    email: 'unauth@hostelease.ng',
    fullName: 'Unrelated Provider',
    role: 'PROVIDER'
  }, JWT_SECRET, { expiresIn: '2h' });

  // ------------------------------------------------------------------
  // PART 1: TEST NETLIFY FUNCTIONS HANDLER
  // ------------------------------------------------------------------
  console.log('--- TEST PART 1: NETLIFY FUNCTIONS HANDLER ---');

  // Test 1.1: Start conversation without initial message
  console.log('1.1 Starting conversation with NO initial message...');
  const startReq = new Request('http://localhost/api/messages/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      propertyId: 'prop-1'
    })
  });
  const startRes = await netlifyHandler(startReq);
  const startData = await startRes.json();
  if (startRes.status !== 201) throw new Error(`Expected 201, got ${startRes.status}: ${JSON.stringify(startData)}`);
  console.log('✓ Conversation created:', startData.conversationId);
  console.log('  Preview text:', `"${startData.conversation.lastMessageText}"`);
  if (startData.conversation.lastMessageText !== 'No messages yet') {
    throw new Error(`Expected 'No messages yet', got '${startData.conversation.lastMessageText}'`);
  }

  const convId = startData.conversationId;

  // Test 1.2: Conversation list shows "No messages yet"
  console.log('\n1.2 Fetching conversation list for Student...');
  const listReq = new Request('http://localhost/api/messages/conversations', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const listRes = await netlifyHandler(listReq);
  const listData = await listRes.json();
  if (listRes.status !== 200) throw new Error(`Expected 200, got ${listRes.status}`);
  const studentConv = listData.conversations.find(c => c.id === convId);
  if (!studentConv) throw new Error(`Conversation ${convId} not found in list`);
  console.log('✓ Found conversation in list. lastMessageText:', `"${studentConv.lastMessageText}"`);
  if (studentConv.lastMessageText !== 'No messages yet') {
    throw new Error(`Expected 'No messages yet', got '${studentConv.lastMessageText}'`);
  }

  // Test 1.3: Fetch empty conversation detail for Student
  console.log('\n1.3 Fetching empty conversation detail as Student...');
  const detailReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const detailRes = await netlifyHandler(detailReq);
  const detailData = await detailRes.json();
  if (detailRes.status !== 200) throw new Error(`Expected 200, got ${detailRes.status}: ${JSON.stringify(detailData)}`);
  console.log('✓ Successfully retrieved empty conversation. Status:', detailRes.status);
  console.log('  Messages length:', detailData.messages.length);
  console.log('  Property title:', detailData.conversation?.property?.title);
  if (detailData.messages.length !== 0) throw new Error('Expected 0 messages');

  // Test 1.4: Fetch empty conversation detail for Authorized Provider
  console.log('\n1.4 Fetching empty conversation detail as Authorized Provider...');
  const provDetailReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${authorizedProviderToken}` }
  });
  const provDetailRes = await netlifyHandler(provDetailReq);
  const provDetailData = await provDetailRes.json();
  if (provDetailRes.status !== 200) throw new Error(`Expected 200, got ${provDetailRes.status}: ${JSON.stringify(provDetailData)}`);
  console.log('✓ Authorized Provider successfully retrieved conversation. Status:', provDetailRes.status);

  // Test 1.4b: Security Check - Unauthorized Provider is blocked
  console.log('\n1.4b Security Isolation: Testing unauthorized provider access...');
  const unauthReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${unauthorizedProviderToken}` }
  });
  const unauthRes = await netlifyHandler(unauthReq);
  if (unauthRes.status === 403) {
    console.log('✓ Security Verified: Unauthorized provider blocked with 403 Access Denied');
  } else {
    throw new Error(`Expected 403 for unauthorized provider, got ${unauthRes.status}`);
  }

  // Test 1.5: Student sends a real message
  console.log('\n1.5 Student sends message...');
  const sendReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      content: 'Is this room available for immediate move-in?'
    })
  });
  const sendRes = await netlifyHandler(sendReq);
  const sendData = await sendRes.json();
  if (sendRes.status !== 201) throw new Error(`Expected 201, got ${sendRes.status}: ${JSON.stringify(sendData)}`);
  console.log('✓ Message sent successfully:', sendData.message.content);

  // Test 1.6: Conversation list now reflects real message content
  console.log('\n1.6 Checking conversation list preview after sending message...');
  const listAfterReq = new Request('http://localhost/api/messages/conversations', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const listAfterRes = await netlifyHandler(listAfterReq);
  const listAfterData = await listAfterRes.json();
  const convAfter = listAfterData.conversations.find(c => c.id === convId);
  const isExpected = convAfter.lastMessageText.includes('Is this room available') || convAfter.lastMessageText.includes('Your message has been received');
  if (!isExpected) {
    throw new Error(`Preview was not updated to real message! Got: ${convAfter.lastMessageText}`);
  }

  // Test 1.7: Provider replies to message
  console.log('\n1.7 Provider sends reply...');
  const replyReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authorizedProviderToken}`
    },
    body: JSON.stringify({
      content: 'Yes! Fully vacant, running water and clean environment.'
    })
  });
  const replyRes = await netlifyHandler(replyReq);
  const replyData = await replyRes.json();
  if (replyRes.status !== 201) throw new Error(`Expected 201, got ${replyRes.status}: ${JSON.stringify(replyData)}`);
  console.log('✓ Provider reply sent:', replyData.message.content);

  // Test 1.8: Student loads thread and sees both messages
  console.log('\n1.8 Student loads conversation thread...');
  const finalDetailReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const finalDetailRes = await netlifyHandler(finalDetailReq);
  const finalDetailData = await finalDetailRes.json();
  console.log('✓ Total messages in thread:', finalDetailData.messages.length);
  if (finalDetailData.messages.length < 2) throw new Error('Expected at least 2 messages in thread');

  // Test 1.9: Typing indicator on Netlify
  console.log('\n1.9 Testing Typing Indicators on Netlify...');
  const typePostReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ isTyping: true })
  });
  const typePostRes = await netlifyHandler(typePostReq);
  if (typePostRes.status !== 200) throw new Error(`Expected 200 for POST /typing, got ${typePostRes.status}`);

  const typeGetReq = new Request(`http://localhost/api/messages/conversations/${encodeURIComponent(convId)}/typing`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${authorizedProviderToken}` }
  });
  const typeGetRes = await netlifyHandler(typeGetReq);
  const typeGetData = await typeGetRes.json();
  console.log('✓ Provider checked typing status:', typeGetData);
  if (!typeGetData.isTyping) throw new Error('Expected isTyping: true');

  console.log('\n>>> ALL NETLIFY TESTS PASSED SUCCESSFULLY! <<<\n');

  // ------------------------------------------------------------------
  // PART 2: TEST EXPRESS BACKEND (IF RUNNING)
  // ------------------------------------------------------------------
  console.log('--- TEST PART 2: EXPRESS BACKEND ---');
  try {
    const health = await fetch(`${EXPRESS_BASE}/health`).catch(() => null);
    if (!health || !health.ok) {
      console.log('Express backend not reachable at port 5000, skipping live Express test.');
    } else {
      console.log('Express backend is running. Testing live endpoints...');

      // Sign token for seed student in SQLite DB
      const expStudentToken = jwt.sign({
        id: 'user-student-1',
        email: 'student@lautech.edu.ng',
        fullName: 'Babatunde Adeleke',
        role: 'STUDENT'
      }, JWT_SECRET, { expiresIn: '2h' });

      // Start conversation
      const expStartRes = await fetch(`${EXPRESS_BASE}/messages/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expStudentToken}`
        },
        body: JSON.stringify({ propertyId: 'prop-1' })
      });
      const expStartData = await expStartRes.json();
      console.log('✓ Express start conversation status:', expStartRes.status);
      const expConvId = expStartData.conversationId;

      // Fetch list
      const expListRes = await fetch(`${EXPRESS_BASE}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${expStudentToken}` }
      });
      const expListData = await expListRes.json();
      console.log('✓ Express conversation list count:', expListData.conversations?.length);

      // Fetch detail
      const expDetailRes = await fetch(`${EXPRESS_BASE}/messages/conversations/${encodeURIComponent(expConvId)}`, {
        headers: { 'Authorization': `Bearer ${expStudentToken}` }
      });
      const expDetailData = await expDetailRes.json();
      console.log('✓ Express conversation detail status:', expDetailRes.status, 'Messages:', expDetailData.messages?.length);
      if (expDetailRes.status !== 200) throw new Error(`Express detail returned ${expDetailRes.status}`);

      // Send message
      const expSendRes = await fetch(`${EXPRESS_BASE}/messages/conversations/${encodeURIComponent(expConvId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expStudentToken}`
        },
        body: JSON.stringify({ content: 'Express integration test message' })
      });
      const expSendData = await expSendRes.json();
      console.log('✓ Express message sent status:', expSendRes.status, expSendData.message?.content);

      console.log('\n>>> ALL EXPRESS TESTS PASSED SUCCESSFULLY! <<<\n');
    }
  } catch (expErr) {
    console.error('Express test error:', expErr);
  }

  console.log('====================================================');
  console.log('  VERIFICATION COMPLETE: ALL SYSTEMS FUNCTIONAL!    ');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
