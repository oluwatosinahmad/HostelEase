import http from 'http';

const BASE_URL = 'http://localhost:5000';

function post(urlPath: string, token: string | null, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(urlPath, BASE_URL);
    const req = http.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(urlPath: string, token: string | null): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE_URL);
    const req = http.request(u, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function listenSSE(token: string, userName: string): { close: () => void, events: any[] } {
  const events: any[] = [];
  const u = new URL(`/api/realtime/stream?token=${encodeURIComponent(token)}`, BASE_URL);
  const req = http.request(u, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  }, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        if (!part.trim() || part.startsWith(':')) continue;
        const lines = part.split('\n');
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          if (line.startsWith('data: ')) data = line.slice(6).trim();
        }
        try {
          const parsed = JSON.parse(data);
          console.log(`[SSE ${userName}] Event: "${event}" ->`, JSON.stringify(parsed));
          events.push({ event, data: parsed, time: Date.now() });
        } catch {
          console.log(`[SSE ${userName}] Event: "${event}" (raw) ->`, data);
          events.push({ event, data, time: Date.now() });
        }
      }
    });
  });
  req.on('error', (err) => console.error(`[SSE ${userName}] Error:`, err.message));
  req.end();
  return { close: () => req.destroy(), events };
}

async function run() {
  console.log('=====================================================');
  console.log('TEST 1: LOGIN AGENT & STUDENT + WELCOME NOTIFICATION');
  console.log('=====================================================');
  const agentLogin = await post('/api/auth/login', null, {
    email: 'landlord@hostelease.ng',
    password: 'Provider123!',
    role: 'PROVIDER'
  });
  console.log('Agent login status:', agentLogin.status);
  console.log('Agent welcome notification exists:', Boolean(agentLogin.data?.welcomeNotification));
  console.log('Agent welcome title:', agentLogin.data?.welcomeNotification?.title);

  const studentLogin = await post('/api/auth/login', null, {
    email: 'student@lautech.edu.ng',
    password: 'Student123!',
    role: 'STUDENT'
  });
  console.log('Student login status:', studentLogin.status);
  console.log('Student welcome notification exists:', Boolean(studentLogin.data?.welcomeNotification));
  console.log('Student welcome title:', studentLogin.data?.welcomeNotification?.title);

  const agentToken = agentLogin.data.token;
  const studentToken = studentLogin.data.token;

  console.log('\n=====================================================');
  console.log('TEST 2: REAL-TIME SSE CONNECTION');
  console.log('=====================================================');
  const agentSSE = listenSSE(agentToken, 'AGENT');
  const studentSSE = listenSSE(studentToken, 'STUDENT');

  await new Promise(r => setTimeout(r, 1200));

  console.log('\n=====================================================');
  console.log('TEST 3: STUDENT SENDS "Hi" -> AGENT RECEIVES IMMEDIATELY');
  console.log('=====================================================');
  const startConv = await post('/api/messages/conversations', studentToken, { propertyId: 'prop-1' });
  const convId = startConv.data?.conversationId;
  console.log('Conversation ready:', convId);

  const sendTime = Date.now();
  const sendRes = await post(`/api/messages/conversations/${convId}/messages`, studentToken, {
    content: 'Hi',
    messageType: 'TEXT'
  });
  console.log('Student sent "Hi" at t=0ms. Status:', sendRes.status);

  // Wait 1.5s for real-time delivery
  await new Promise(r => setTimeout(r, 1500));

  const agentMessageEvents = agentSSE.events.filter(e => e.event === 'message:new');
  const agentNotifEvents = agentSSE.events.filter(e => e.event === 'notification:new');

  console.log(`Agent received message:new count: ${agentMessageEvents.length}`);
  console.log(`Agent received notification:new count: ${agentNotifEvents.length}`);
  if (agentMessageEvents.length > 0) {
    console.log(`Agent message latency: ${agentMessageEvents[0].time - sendTime}ms`);
  }
  if (agentNotifEvents.length > 0) {
    console.log(`Agent notification latency: ${agentNotifEvents[0].time - sendTime}ms`);
  }

  // Check agent unread counts in DB
  const agentUnreadNotifs = await get('/api/notifications/unread-count', agentToken);
  const agentUnreadMsgs = await get('/api/messages/unread-count', agentToken);
  console.log('Agent DB Unread Notifications:', agentUnreadNotifs.data?.unreadCount);
  console.log('Agent DB Unread Messages:', agentUnreadMsgs.data?.unreadCount);

  console.log('\n=====================================================');
  console.log('TEST 4: AGENT REPLIES -> STUDENT RECEIVES IMMEDIATELY');
  console.log('=====================================================');
  const replyTime = Date.now();
  const replyRes = await post(`/api/messages/conversations/${convId}/messages`, agentToken, {
    content: 'Hello! The room is available for inspection tomorrow.',
    messageType: 'TEXT'
  });
  console.log('Agent sent reply at t=0ms. Status:', replyRes.status);

  await new Promise(r => setTimeout(r, 1500));

  const studentMessageEvents = studentSSE.events.filter(e => e.event === 'message:new' && e.time >= replyTime);
  const studentNotifEvents = studentSSE.events.filter(e => e.event === 'notification:new' && e.time >= replyTime);

  console.log(`Student received message:new count: ${studentMessageEvents.length}`);
  console.log(`Student received notification:new count: ${studentNotifEvents.length}`);
  if (studentMessageEvents.length > 0) {
    console.log(`Student message latency: ${studentMessageEvents[0].time - replyTime}ms`);
  }
  if (studentNotifEvents.length > 0) {
    console.log(`Student notification latency: ${studentNotifEvents[0].time - replyTime}ms`);
  }

  console.log('\n=====================================================');
  console.log('TEST 5: SIGNUP WITH NEW ACCOUNT -> WELCOME NOTIFICATION');
  console.log('=====================================================');
  const uniqueEmail = `student_new_${Date.now()}@lautech.edu.ng`;
  const signupRes = await post('/api/auth/register', null, {
    fullName: 'David Adeleke',
    email: uniqueEmail,
    password: 'Password123!',
    role: 'STUDENT',
    phone: '08012345678'
  });
  console.log('Signup status:', signupRes.status);
  console.log('New user welcome notification exists:', Boolean(signupRes.data?.welcomeNotification));
  console.log('Welcome title:', signupRes.data?.welcomeNotification?.title);
  console.log('Welcome message:', signupRes.data?.welcomeNotification?.message);

  // Check unread count for newly registered student
  const newStudentUnread = await get('/api/notifications/unread-count', signupRes.data?.token);
  console.log('New student initial unread notification count:', newStudentUnread.data?.unreadCount);

  agentSSE.close();
  studentSSE.close();

  console.log('\n=====================================================');
  console.log('ALL REAL-TIME NOTIFICATION VERIFICATIONS COMPLETED!');
  console.log('=====================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
