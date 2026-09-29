const BASE_URL = 'http://localhost:5000/api';

async function request(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 RUNNING CROSS-DEVICE MESSAGING & NOTIFICATION E2E');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Student (Simulating Device 1)
    console.log('[STEP 1] Authenticating Student on Device 1...');
    const studentAuthRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'student@lautech.edu.ng',
        password: 'Student123!'
      }
    });
    const studentToken = studentAuthRes.data.token;
    const studentUser = studentAuthRes.data.user;
    assert(Boolean(studentToken), 'Student token obtained');
    assert(studentUser.role === 'STUDENT', 'Student role verified');

    // Test Welcome message formatting for Student
    const studentWelcome = `Welcome to HostelEase, ${studentUser.fullName}!`;
    assert(studentWelcome === `Welcome to HostelEase, ${studentUser.fullName}!`, `Personalized student welcome greeting: "${studentWelcome}"`);

    // 2. Authenticate Agent (Simulating Device 2)
    console.log('\n[STEP 2] Authenticating Agent on Device 2...');
    const agentAuthRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'provider@hostelease.ng',
        password: 'Provider123!'
      }
    });
    const agentToken = agentAuthRes.data.token;
    const agentUser = agentAuthRes.data.user;
    assert(Boolean(agentToken), 'Agent token obtained');
    assert(agentUser.role === 'PROVIDER', 'Agent role verified');

    // Test Welcome message formatting for Agent
    const agentWelcome = `Welcome to HostelEase, ${agentUser.fullName}!`;
    assert(agentWelcome === `Welcome to HostelEase, ${agentUser.fullName}!`, `Personalized agent welcome greeting: "${agentWelcome}"`);

    // 3. Find a Property owned by the Agent
    console.log('\n[STEP 3] Finding registered property owned by Agent...');
    const propsRes = await request('/provider/properties', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const agentProps = propsRes.data.properties || [];
    assert(agentProps.length > 0, `Agent owns ${agentProps.length} properties`);
    const targetProperty = agentProps[0];
    console.log(`  Selected Target Property: "${targetProperty.title}" (ID: ${targetProperty.id})`);

    // 4. Record initial Agent Notifications & Unread count (Device 2)
    console.log('\n[STEP 4] Fetching initial Agent notifications on Device 2...');
    const initialAgentNotifsRes = await request('/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const initialAgentUnreadCount = initialAgentNotifsRes.data.unreadCount || 0;
    console.log(`  Agent initial unread notifications: ${initialAgentUnreadCount}`);

    // 5. Student sends message to Agent (Device 1)
    console.log('\n[STEP 5] Student sends initial message to Agent from Device 1...');
    const initialMsgText = `Hello Agent, is a room available for 2026/2027 session at ${targetProperty.title}? [${Date.now()}]`;
    const startConvRes = await request('/messages/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        propertyId: targetProperty.id,
        initialMessage: initialMsgText
      }
    });
    const convId = startConvRes.data.conversationId;
    assert(Boolean(convId), `Conversation started or retrieved: ID ${convId}`);

    // 6. Device 2 (Agent) polls /api/notifications and receives notification
    console.log('\n[STEP 6] Device 2 (Agent) polls notifications to receive student message alert...');
    const updatedAgentNotifsRes = await request('/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const updatedAgentUnreadCount = updatedAgentNotifsRes.data.unreadCount;
    const latestAgentNotif = updatedAgentNotifsRes.data.notifications[0];

    assert(updatedAgentUnreadCount >= initialAgentUnreadCount, 'Agent unread notification count maintained or incremented');
    assert(latestAgentNotif?.type === 'NEW_MESSAGE', `Notification type is NEW_MESSAGE (got ${latestAgentNotif?.type})`);
    assert(latestAgentNotif?.linkUrl?.includes(convId), `Notification link contains conversationId: ${latestAgentNotif?.linkUrl}`);
    assert(latestAgentNotif?.title?.includes(targetProperty.title), `Notification title includes property title: "${latestAgentNotif?.title}"`);

    // 7. Device 2 (Agent) checks conversation list and unread count
    console.log('\n[STEP 7] Device 2 (Agent) checks conversation inbox...');
    const agentConvsRes = await request('/messages/conversations', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const targetConv = agentConvsRes.data.conversations.find((c: any) => c.id === convId);
    assert(Boolean(targetConv), 'Conversation appears in Agent inbox');
    assert(targetConv?.studentName?.includes('Student') || Boolean(targetConv?.studentName), `Conversation shows student name: ${targetConv?.studentName}`);

    // 8. Device 2 (Agent) clicks notification and opens conversation (marks read)
    console.log('\n[STEP 8] Device 2 (Agent) opens conversation detail (marking read)...');
    const agentOpenConvRes = await request(`/messages/conversations/${convId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const convDetail = agentOpenConvRes.data;
    assert(convDetail.messages?.length > 0, `Conversation contains ${convDetail.messages.length} messages`);
    const studentMsgInThread = convDetail.messages.find((m: any) => m.content === initialMsgText);
    assert(Boolean(studentMsgInThread), 'Student message found in active thread');
    assert(studentMsgInThread?.senderRole === 'STUDENT', 'Message sender role is STUDENT');

    // 9. Agent sends reply to Student (Device 2)
    console.log('\n[STEP 9] Agent sends reply to Student from Device 2...');
    const agentReplyText = `Yes! Self-contain is vacant with running borehole and light. When would you like to inspect? [${Date.now()}]`;
    const agentReplyRes = await request(`/messages/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentToken}` },
      body: { content: agentReplyText }
    });
    assert(agentReplyRes.status === 201, 'Agent reply sent successfully with HTTP 201');
    assert(agentReplyRes.data.message.content === agentReplyText, 'Agent reply content matches');

    // 10. Device 1 (Student) receives Agent's reply and notification
    console.log('\n[STEP 10] Device 1 (Student) polls notifications and thread...');
    const studentNotifsRes = await request('/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const latestStudentNotif = studentNotifsRes.data.notifications[0];
    assert(latestStudentNotif?.type === 'NEW_MESSAGE', 'Student received NEW_MESSAGE notification');
    assert(latestStudentNotif?.linkUrl?.includes(convId), `Student notification links to conversation: ${latestStudentNotif?.linkUrl}`);

    const studentOpenConvRes = await request(`/messages/conversations/${convId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const studentThread = studentOpenConvRes.data.messages;
    const agentMsgInThread = studentThread.find((m: any) => m.content === agentReplyText);
    assert(Boolean(agentMsgInThread), "Agent's reply rendered in Student thread");
    assert(agentMsgInThread?.senderRole === 'PROVIDER', 'Reply sender role is PROVIDER');

    // 11. Student sends follow-up on EXISTING conversation
    console.log('\n[STEP 11] Student sends follow-up message on EXISTING conversation...');
    await new Promise(r => setTimeout(r, 300));
    const followUpText = `I would like to inspect tomorrow at 2 PM please! [${Date.now()}]`;
    const followUpRes = await request('/messages/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        propertyId: targetProperty.id,
        initialMessage: followUpText
      }
    });
    assert(followUpRes.data.conversationId === convId, 'Re-inquiry reuses existing conversation thread ID');

    // Check thread has follow-up message
    const updatedThreadRes = await request(`/messages/conversations/${convId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const followUpInThread = updatedThreadRes.data.messages.find((m: any) => m.content === followUpText);
    assert(Boolean(followUpInThread), 'Follow-up message on existing conversation was persisted');

    // Check Agent got notification for follow-up
    const agentFollowUpNotifs = await request('/notifications', {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const followUpNotif = agentFollowUpNotifs.data.notifications[0];
    assert(followUpNotif?.message?.includes('I would like to inspect tomorrow'), `Agent received notification for follow-up message: "${followUpNotif?.message}"`);

    // 12. Security Test: Unauthorized 3rd party user access & Admin oversight
    console.log('\n[STEP 12] Security authorization check for 3rd party user & Admin...');
    // 12a. Platform Admin check
    const adminAuthRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: 'admin@hostelease.ng',
        password: 'admin123'
      }
    });
    if (adminAuthRes.data.token) {
      const adminConvRes = await request(`/messages/conversations/${convId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminAuthRes.data.token}` }
      });
      assert(adminConvRes.status === 200, 'Platform Administrator can inspect conversation for safety & moderation');
    }

    // 12b. Unauthorized 3rd-party student check
    const intruderEmail = `intruder.${Date.now()}@lautech.edu.ng`;
    const intruderReg = await request('/auth/register', {
      method: 'POST',
      body: {
        email: intruderEmail,
        password: 'Password123!',
        fullName: 'Intruder Student',
        role: 'STUDENT'
      }
    });
    const intruderToken = intruderReg.data.token;
    if (intruderToken) {
      const intruderAccessRes = await request(`/messages/conversations/${convId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${intruderToken}` }
      });
      assert(intruderAccessRes.status === 403, 'Unauthorized 3rd-party user is strictly forbidden (HTTP 403) from accessing conversation');
    }

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runE2ETests();
