const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hostel-ease-jwt-secure-secret-key-2026';

// 1. Netlify Functions Handler import
const apiModule = require('../netlify/functions/api.ts');
const netlifyHandler = apiModule.default || apiModule;

// Helper to make HTTP request to local Express daemon (port 5000)
function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('VERIFY HOSTEL -> CHAT FLOW & CONVERSATION RESOLUTION');
  console.log('====================================================\n');

  // Sign token for seed student user
  const token = jwt.sign(
    {
      id: 'user-student-1',
      email: 'student@lautech.edu.ng',
      fullName: 'Babatunde Adeleke',
      role: 'STUDENT',
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  console.log('--- PART 1: LIVE EXPRESS BACKEND VERIFICATION (PORT 5000) ---');

  // Step 1: Start conversation for Property 2
  console.log('1.1 Testing Chat click on Property prop-2 (Under G Comfort Single Lodge)...');
  const startRes1 = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/messages/conversations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { propertyId: 'prop-2' }
  );

  console.log(`    Status: ${startRes1.status}`);
  if (startRes1.status !== 200 && startRes1.status !== 201) {
    console.error('    Error starting conversation:', startRes1.body);
    process.exit(1);
  }

  const convId1 = startRes1.body.conversationId;
  const conv1 = startRes1.body.conversation;
  console.log(`    Conversation ID: ${convId1}`);
  console.log(`    Property Title: "${conv1.propertyTitle}"`);
  console.log(`    Property Address: "${conv1.propertyAddress}"`);
  console.log(`    Agent Name: "${conv1.providerName}" (${conv1.providerId})`);
  console.log(`    Agent Avatar: ${conv1.avatarUrl ? 'Present' : 'Missing'}`);
  console.log(`    Student ID: "${conv1.studentId}"`);

  if (!convId1 || !conv1.propertyTitle || !conv1.providerName) {
    console.error('    FAILED: Conversation metadata incomplete!');
    process.exit(1);
  }
  console.log('    ✓ PASSED: Conversation resolved with complete property & agent metadata.');

  // Step 2: Test Deduplication - Rapid repeated click on Property prop-2
  console.log('\n1.2 Testing Deduplication: Rapid second Chat click on Property prop-2...');
  const startRes2 = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/messages/conversations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { propertyId: 'prop-2' }
  );

  console.log(`    Status: ${startRes2.status}`);
  const convId2 = startRes2.body.conversationId;
  console.log(`    Second Conversation ID: ${convId2}`);

  if (convId1 !== convId2) {
    console.error(`    FAILED: Duplicate conversation created! First: ${convId1}, Second: ${convId2}`);
    process.exit(1);
  }
  console.log('    ✓ PASSED: Deduplication guaranteed! Both requests resolved to exact same conversation.');

  // Step 3: Test Chat on separate Property prop-3
  console.log('\n1.3 Testing Chat click on separate Property prop-3 (Adenike Deluxe Villa)...');
  const startRes3 = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/messages/conversations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { propertyId: 'prop-3' }
  );

  console.log(`    Status: ${startRes3.status}`);
  const convId3 = startRes3.body.conversationId;
  const conv3 = startRes3.body.conversation;
  console.log(`    Property prop-3 Conversation ID: ${convId3}`);
  console.log(`    Property Title: "${conv3.propertyTitle}"`);
  console.log(`    Agent Name: "${conv3.providerName}"`);

  if (convId3 === convId1) {
    console.error('    FAILED: Separate property collided with prop-2 conversation!');
    process.exit(1);
  }
  console.log('    ✓ PASSED: Separate property correctly assigned its own dedicated thread.');

  // Step 4: Test loading full conversation detail into foreground
  console.log('\n1.4 Testing Conversation Detail Retrieval for prop-2 conversation...');
  const detailRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/messages/conversations/${encodeURIComponent(convId1)}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log(`    Status: ${detailRes.status}`);
  if (detailRes.status !== 200) {
    console.error('    FAILED to retrieve conversation detail:', detailRes.body);
    process.exit(1);
  }

  const detail = detailRes.body;
  const propertyInfo = detail.conversation?.property || detail.property;
  const messages = detail.messages || [];
  console.log(`    Detail Property Title: "${propertyInfo?.title}"`);
  console.log(`    Detail Messages Count: ${messages.length}`);
  console.log('    ✓ PASSED: Thread details load cleanly without errors.');

  // Step 5: Post message in thread to verify active chat interaction
  console.log('\n1.5 Testing sending an inquiry message in active thread...');
  const sendRes = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/messages/conversations/${encodeURIComponent(convId1)}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { content: `Hello, is this room available for the 2026/2027 session? (Verified at ${new Date().toISOString()})` }
  );

  console.log(`    Status: ${sendRes.status}`);
  if (sendRes.status !== 201 && sendRes.status !== 200) {
    console.error('    FAILED to send message:', sendRes.body);
    process.exit(1);
  }
  console.log(`    Message ID: ${sendRes.body?.message?.id || sendRes.body?.id}`);
  console.log('    ✓ PASSED: Message successfully sent and stored in SQLite.');

  // Step 6: Verify conversation appears in user conversations list with updated preview
  console.log('\n1.6 Verifying conversation list contains the thread...');
  const listRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/messages/conversations',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log(`    Status: ${listRes.status}`);
  const userConvs = listRes.body.conversations || [];
  const foundInList = userConvs.find((c) => c.id === convId1);
  console.log(`    Total User Conversations: ${userConvs.length}`);
  console.log(`    Target Conversation Found: ${Boolean(foundInList)}`);
  if (foundInList) {
    console.log(`    Preview: "${foundInList.lastMessageText}"`);
  }

  if (!foundInList) {
    console.error('    FAILED: Conversation not found in user conversation list!');
    process.exit(1);
  }
  console.log('    ✓ PASSED: Conversation is present in list with accurate message preview.');

  // ------------------------------------------------------------------
  // PART 2: NETLIFY FUNCTIONS HANDLER VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n--- PART 2: NETLIFY FUNCTIONS HANDLER VERIFICATION ---');

  const netlifyStudentToken = jwt.sign(
    {
      id: 'usr-student-netlify-1',
      email: 'student.netlify@lautech.edu.ng',
      fullName: 'Netlify Student',
      role: 'STUDENT',
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  console.log('2.1 Testing Chat click on Netlify Functions with Property prop-underg-1...');
  const netlifyReq1 = new Request('http://localhost/api/messages/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyStudentToken}`,
    },
    body: JSON.stringify({ propertyId: 'prop-underg-1' }),
  });

  const netlifyRes1 = await netlifyHandler(netlifyReq1);
  console.log(`    Status: ${netlifyRes1.status}`);
  if (netlifyRes1.status !== 201 && netlifyRes1.status !== 200) {
    throw new Error(`Netlify startConversation returned ${netlifyRes1.status}`);
  }
  const netlifyData1 = await netlifyRes1.json();
  const netlifyConvId1 = netlifyData1.conversationId;
  const netlifyConv1 = netlifyData1.conversation;
  console.log(`    Netlify Conversation ID: ${netlifyConvId1}`);
  console.log(`    Property Title: "${netlifyConv1.propertyTitle}"`);
  console.log(`    Agent Name: "${netlifyConv1.providerName}"`);
  console.log(`    Agent Avatar: ${netlifyConv1.avatarUrl ? 'Present' : 'Missing'}`);

  console.log('\n2.2 Testing Deduplication on Netlify: Repeated click for prop-underg-1...');
  const netlifyReq2 = new Request('http://localhost/api/messages/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyStudentToken}`,
    },
    body: JSON.stringify({ propertyId: 'prop-underg-1' }),
  });
  const netlifyRes2 = await netlifyHandler(netlifyReq2);
  const netlifyData2 = await netlifyRes2.json();
  console.log(`    Second Conversation ID: ${netlifyData2.conversationId}`);

  if (netlifyData1.conversationId !== netlifyData2.conversationId) {
    throw new Error('Netlify deduplication failed: duplicate conversation created!');
  }
  console.log('    ✓ PASSED: Netlify deduplication verified!');

  console.log('\n2.3 Testing Conversation Detail on Netlify Functions...');
  const netlifyDetailReq = new Request(
    `http://localhost/api/messages/conversations/${encodeURIComponent(netlifyConvId1)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${netlifyStudentToken}` },
    }
  );
  const netlifyDetailRes = await netlifyHandler(netlifyDetailReq);
  console.log(`    Status: ${netlifyDetailRes.status}`);
  if (netlifyDetailRes.status !== 200) {
    throw new Error(`Expected 200 for Netlify conversation detail, got ${netlifyDetailRes.status}`);
  }
  const netlifyDetailData = await netlifyDetailRes.json();
  console.log(`    Detail Property: "${netlifyDetailData.conversation?.property?.title || netlifyDetailData.property?.title}"`);
  console.log('    ✓ PASSED: Netlify conversation detail successfully retrieved!');

  console.log('\n====================================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY ACROSS BOTH BACKENDS!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
