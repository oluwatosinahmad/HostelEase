const BASE_URL = 'http://localhost:5000/api';

async function testCompleteMessagingSystem() {
  console.log('====================================================');
  console.log('HOSTEL EASE COMPLETE MESSAGING & PRESENCE VERIFICATION');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Authenticate Demo Student & Agent
  console.log('\n--- 1. Authenticating Demo Users ---');
  const studentAuthRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
  });
  const studentAuth = await studentAuthRes.json();
  const studentToken = studentAuth.token;
  const studentUser = studentAuth.user;
  assert(!!studentToken && studentUser.role === 'STUDENT', 'Student login successful');

  const agentAuthRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
  });
  const agentAuth = await agentAuthRes.json();
  const agentToken = agentAuth.token;
  const agentUser = agentAuth.user;
  assert(!!agentToken && agentUser.role === 'PROVIDER', 'Agent login successful');

  // 2. Test Presence Heartbeats (Online & Offline)
  console.log('\n--- 2. Testing Presence System ---');
  // Student sends heartbeat
  const studentHeartbeatRes = await fetch(`${BASE_URL}/presence/heartbeat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(studentHeartbeatRes.status === 200, 'Student presence heartbeat recorded');

  // Agent sends heartbeat
  const agentHeartbeatRes = await fetch(`${BASE_URL}/presence/heartbeat`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  assert(agentHeartbeatRes.status === 200, 'Agent presence heartbeat recorded');

  // Check student presence from agent's perspective
  const checkStudentPresence = await fetch(`${BASE_URL}/presence/${studentUser.id}`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const studentPresenceData = await checkStudentPresence.json();
  assert(studentPresenceData.isOnline === true, 'Student correctly detected as Online');

  // Check agent presence from student's perspective
  const checkAgentPresence = await fetch(`${BASE_URL}/presence/${agentUser.id}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const agentPresenceData = await checkAgentPresence.json();
  assert(agentPresenceData.isOnline === true, 'Agent correctly detected as Online');

  // 3. Test Property Discovery & Starting Conversation
  console.log('\n--- 3. Testing Conversation Creation & Route Dispatch ---');
  const propRes = await fetch(`${BASE_URL}/properties?page=1&limit=5`);
  const propData = await propRes.json();
  const property = propData.properties?.[0];
  assert(!!property, `Found active verified property: "${property?.title}" (ID: ${property?.id})`);

  // Student starts conversation with property agent
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
  assert(startConvRes.status === 200 && !!conversationId, `Conversation created/retrieved (ID: ${conversationId})`);

  // 4. Test Student Sending WhatsApp-Style Text Message
  console.log('\n--- 4. Testing Student Message Sending & Persistence ---');
  const studentMsgContent = `Hello Agent, is running borehole water guaranteed 24/7 at ${property.title}?`;
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
  assert(sendMsgRes.status === 201 && sendMsgData.message?.content === studentMsgContent, 'Student message successfully written to SQLite DB');
  const studentMsgId = sendMsgData.message.id;

  // 5. Test Agent Receiving Notification with Direct Conversation Navigation Data
  console.log('\n--- 5. Testing Notification Routing & Integrity ---');
  const agentNotifRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const agentNotifData = await agentNotifRes.json();
  const latestNotif = agentNotifData.notifications?.[0];
  assert(
    latestNotif?.type === 'NEW_MESSAGE' &&
    latestNotif?.conversationId === conversationId &&
    latestNotif?.senderId === studentUser.id,
    'Agent received notification with exact conversationId & senderId payload'
  );
  assert(
    latestNotif?.linkUrl.includes(`conversationId=${conversationId}`),
    'Notification linkUrl contains exact conversation navigation query string'
  );

  // 6. Test Agent Reading Conversation History from DB (Central Source of Truth)
  console.log('\n--- 6. Testing Central DB Sync (Agent Opening Conversation) ---');
  const agentGetConvRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const agentConvDetail = await agentGetConvRes.json();
  assert(agentGetConvRes.status === 200, 'Agent successfully loaded conversation from DB');
  assert(agentConvDetail.messages?.length > 0, `Agent sees ${agentConvDetail.messages?.length} messages from central DB`);
  const foundStudentMsg = agentConvDetail.messages.find((m: any) => m.id === studentMsgId);
  assert(!!foundStudentMsg && foundStudentMsg.content === studentMsgContent, 'Agent sees exact student message text without truncation or corruption');

  // 7. Test Real-time Typing Indicators
  console.log('\n--- 7. Testing WhatsApp Real-Time Typing Indicator ---');
  // Student starts typing
  const startTypingRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ isTyping: true })
  });
  assert(startTypingRes.status === 200, 'Student typing state registered');

  // Agent inspects conversation typing state
  const checkTypingRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  const typingState = await checkTypingRes.json();
  assert(typingState.isTyping === true && typingState.typingUser?.userId === studentUser.id, 'Agent observes Student typing indicator in real time');

  // Agent also checks conversation detail typingUser field
  const agentConvDetailWithTyping = await (await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  })).json();
  assert(agentConvDetailWithTyping.typingUser?.userId === studentUser.id, 'Agent conversation detail includes typingUser object');

  // Student stops typing
  await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ isTyping: false })
  });
  const checkTypingStopped = await (await fetch(`${BASE_URL}/messages/conversations/${conversationId}/typing`, {
    headers: { 'Authorization': `Bearer ${agentToken}` }
  })).json();
  assert(checkTypingStopped.isTyping === false, 'Typing indicator disappears when typing stops');

  // 8. Test Agent Sending Reply with Quoted Text
  console.log('\n--- 8. Testing Agent Reply with Quoted Context ---');
  const agentReplyText = 'Yes, borehole water runs 24/7 with an automated surface pump and 5000L backup tanks.';
  const sendReplyRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
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
  const sendReplyData = await sendReplyRes.json();
  assert(sendReplyRes.status === 201 && sendReplyData.message?.content === agentReplyText, 'Agent reply saved to DB');
  assert(sendReplyData.message?.metadata?.replyToText === studentMsgContent, 'Agent reply retains quoted student message context');

  // 9. Test Student Receiving Agent Reply & Notification
  console.log('\n--- 9. Testing Student Receiving Notification & Reading Reply ---');
  const studentNotifs = await (await fetch(`${BASE_URL}/notifications`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  })).json();
  const studentMsgNotif = studentNotifs.notifications?.find((n: any) => n.conversationId === conversationId);
  assert(!!studentMsgNotif, 'Student received notification for Agent reply');

  // Student fetches conversation history
  const studentConvDetail = await (await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  })).json();
  const lastMsg = studentConvDetail.messages[studentConvDetail.messages.length - 1];
  assert(lastMsg?.content === agentReplyText && lastMsg?.senderRole === 'PROVIDER', 'Student received Agent reply in conversation history');

  // 10. Test Room Inspection Photo Snaps
  console.log('\n--- 10. Testing Room Inspection Photo Snap Delivery ---');
  const photoUrl = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85';
  const photoCaption = 'Live view of room window and tiled floor';
  const sendPhotoRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`
    },
    body: JSON.stringify({
      content: photoCaption,
      messageType: 'IMAGE',
      metadata: {
        imageUrl: photoUrl,
        imageCaption: photoCaption
      }
    })
  });
  const photoMsgData = await sendPhotoRes.json();
  assert(photoMsgData.message?.messageType === 'IMAGE', 'Photo snap sent with IMAGE type');
  assert(photoMsgData.message?.metadata?.imageUrl === photoUrl, 'Photo snap contains clear high-resolution URL');

  // 11. Test Mark-As-Read & Unread Count Recalculation
  console.log('\n--- 11. Testing Read Receipts & Unread Count Recalculation ---');
  // Student marks conversation as read
  const markReadRes = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  assert(markReadRes.status === 200, 'Student marked conversation as read');

  // Check unread count for student
  const studentUnreadRes = await fetch(`${BASE_URL}/messages/unread-count`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const studentUnreadData = await studentUnreadRes.json();
  assert(studentUnreadData.unreadCount === 0, 'Student unread message count is 0 after reading');

  // 12. Test Agent Going Offline on Logout
  console.log('\n--- 12. Testing Offline Status Transition ---');
  const agentOfflineRes = await fetch(`${BASE_URL}/presence/offline`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${agentToken}` }
  });
  assert(agentOfflineRes.status === 200, 'Agent reported offline status');

  const checkAgentOffline = await (await fetch(`${BASE_URL}/presence/${agentUser.id}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  })).json();
  assert(checkAgentOffline.isOnline === false, 'Agent status transitioned to Offline immediately');
  assert(!!checkAgentOffline.lastSeenAt, 'Agent offline state includes accurate ISO lastSeenAt timestamp');

  // 13. Test Authorization Security (Non-participant Forbidden)
  console.log('\n--- 13. Testing Security & Participant Authorization ---');
  // Register or login a third user
  const thirdUserLogin = await (await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `intruder_${Date.now()}@lautech.edu.ng`,
      password: 'Password123!',
      fullName: 'Unrelated User',
      role: 'STUDENT',
      phone: '08011122233'
    })
  })).json();
  const thirdToken = thirdUserLogin.token;

  if (thirdToken) {
    const intruderAccess = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${thirdToken}` }
    });
    assert(intruderAccess.status === 403, 'Unauthorized third user correctly denied access with 403 Forbidden');
  } else {
    console.log('Skipping third user registration test (intruder setup)');
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

testCompleteMessagingSystem().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
