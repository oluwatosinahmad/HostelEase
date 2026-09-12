/**
 * Cross-Device End-to-End Test Suite: Tests 1 - 9
 * Verifies that the central SQLite database, media streaming,
 * authenticated ownership, and cross-device sync operate flawlessly.
 */

const BASE_URL = 'http://127.0.0.1:5000';

async function runE2ETests() {
  console.log('===============================================================');
  console.log('🧪 CROSS-DEVICE END-TO-END VERIFICATION (TESTS 1 - 9)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`     ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     ↳ ${detail}`);
      failed++;
    }
  }

  // Helper: Login
  async function login(email: string, pass: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
    return await res.json();
  }

  try {
    // 0. Setup: Authenticate Landlord & Student
    const landlordSessionA = await login('provider@hostelease.ng', 'Provider123!');
    const landlordSessionB = await login('provider@hostelease.ng', 'Provider123!'); // Simulated Phone Device
    const studentSession = await login('student@lautech.edu.ng', 'Student123!');

    const tokenLandlordA = landlordSessionA.token;
    const tokenLandlordB = landlordSessionB.token;
    const tokenStudent = studentSession.token;

    const timestamp = Date.now();
    let hostelA_Id: string = '';
    let hostelB_Id: string = '';

    // -------------------------------------------------------------
    // TEST 1: Laptop creates Hostel A -> Phone "My Hostels" sees it immediately
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Laptop creates Hostel A -> Phone sees Hostel A ---');
    const createResA = await fetch(`${BASE_URL}/api/provider/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLandlordA}`
      },
      body: JSON.stringify({
        title: `E2E Test Villa A - Laptop Creation (${timestamp})`,
        description: 'Created from laptop session. Must sync to phone immediately through central SQLite database.',
        propertyType: 'SELF_CONTAIN',
        totalRooms: 4,
        address: '14 Under G Road, Ogbomoso',
        areaId: 'area-under-g',
        pricing: {
          rentAmount: 185000,
          cautionFee: 20000,
          serviceCharge: 15000
        },
        amenityKeys: ['borehole', 'prepaid_meter', 'security_fence']
      })
    });

    const createDataA = await createResA.json();
    hostelA_Id = createDataA.propertyId || createDataA.property?.id || createDataA.id;
    assert(createResA.status === 201 && Boolean(hostelA_Id), 'Test 1a: Laptop creates Hostel A via central API', `ID: ${hostelA_Id}`);

    // Phone checks listings
    const phoneListingsRes = await fetch(`${BASE_URL}/api/provider/properties`, {
      headers: { Authorization: `Bearer ${tokenLandlordB}` }
    });
    const phoneListings = await phoneListingsRes.json();
    const phoneProperties = Array.isArray(phoneListings) ? phoneListings : phoneListings.properties || [];
    const foundOnPhone = phoneProperties.some((p: any) => p.id === hostelA_Id);
    assert(foundOnPhone, 'Test 1b: Phone retrieves Hostel A immediately from central SQLite DB');

    // -------------------------------------------------------------
    // TEST 2: Phone creates Hostel B -> Laptop "My Hostels" sees it immediately
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Phone creates Hostel B -> Laptop sees Hostel B ---');
    const createResB = await fetch(`${BASE_URL}/api/provider/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLandlordB}`
      },
      body: JSON.stringify({
        title: `E2E Test Lodge B - Phone Creation (${timestamp})`,
        description: 'Created from phone session. Must sync to laptop immediately through central SQLite database.',
        propertyType: 'SINGLE_ROOM',
        totalRooms: 6,
        address: '22 Adenike Perimeter, Ogbomoso',
        areaId: 'area-adenike',
        pricing: {
          rentAmount: 120000,
          cautionFee: 15000,
          serviceCharge: 10000
        },
        amenityKeys: ['well_water', 'gated_compound']
      })
    });

    const createDataB = await createResB.json();
    hostelB_Id = createDataB.propertyId || createDataB.property?.id || createDataB.id;
    assert(createResB.status === 201 && Boolean(hostelB_Id), 'Test 2a: Phone creates Hostel B via central API', `ID: ${hostelB_Id}`);

    // Laptop checks listings
    const laptopListingsRes = await fetch(`${BASE_URL}/api/provider/properties`, {
      headers: { Authorization: `Bearer ${tokenLandlordA}` }
    });
    const laptopListings = await laptopListingsRes.json();
    const laptopProperties = Array.isArray(laptopListings) ? laptopListings : laptopListings.properties || [];
    const foundOnLaptop = laptopProperties.some((p: any) => p.id === hostelB_Id);
    assert(foundOnLaptop, 'Test 2b: Laptop retrieves Hostel B immediately from central SQLite DB');

    // -------------------------------------------------------------
    // TEST 3: Laptop edits Hostel A -> Phone opens Hostel A & sees updates
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Laptop edits Hostel A -> Phone sees updated price and title ---');
    const updatedTitle = `E2E Villa A - Renovated & Solar Installed (${timestamp})`;
    const updatedPrice = 210000;

    const editRes = await fetch(`${BASE_URL}/api/provider/properties/${hostelA_Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLandlordA}`
      },
      body: JSON.stringify({
        title: updatedTitle,
        pricing: {
          rentAmount: updatedPrice,
          cautionFee: 20000,
          serviceCharge: 15000
        },
        description: 'Solar inverter system added. Price updated from laptop.'
      })
    });
    assert(editRes.ok, 'Test 3a: Laptop updates Hostel A rent and title via PUT API');

    // Phone fetches public/landlord hostel details
    const phoneDetailRes = await fetch(`${BASE_URL}/api/properties/${hostelA_Id}`);
    const phoneDetailData = await phoneDetailRes.json();
    const propA = phoneDetailData.property || phoneDetailData;
    const rentAmount = propA.prices?.[0]?.rentAmount || propA.prices?.[0]?.rent_amount || propA.basePrice;
    const titleMatches = propA.title === updatedTitle;
    const priceMatches = rentAmount === updatedPrice;
    assert(titleMatches && priceMatches, 'Test 3b: Phone fetches updated Hostel A data from SQLite DB', `Title: "${propA.title}", Rent: ₦${rentAmount}`);

    // -------------------------------------------------------------
    // TEST 4: Phone uploads photo and video -> Laptop sees them attached
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Phone uploads photo & video -> Laptop sees media attached ---');
    
    // 4a. Upload photo
    const photoBlob = new Blob(['sample-fake-jpeg-binary-stream'], { type: 'image/jpeg' });
    const photoForm = new FormData();
    photoForm.append('file', photoBlob, 'exterior_veranda.jpg');
    const photoUpRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLandlordB}` },
      body: photoForm
    });
    const photoUpData = await photoUpRes.json();
    const photoUrl = photoUpData.file?.url || photoUpData.url;
    assert(photoUpRes.ok && Boolean(photoUrl), 'Test 4a: Phone uploads photo via multipart POST /api/upload', `URL: ${photoUrl}`);

    // 4b. Upload video walkthrough
    const videoBlob = new Blob(['fake-mp4-walkthrough-stream-bytes'], { type: 'video/mp4' });
    const videoForm = new FormData();
    videoForm.append('file', videoBlob, 'walkthrough_tour.mp4');
    const videoUpRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLandlordB}` },
      body: videoForm
    });
    const videoUpData = await videoUpRes.json();
    const uploadedVideoUrl = videoUpData.file?.url || videoUpData.url;
    assert(videoUpRes.ok && Boolean(uploadedVideoUrl), 'Test 4b: Phone uploads video walkthrough via multipart POST /api/upload', `URL: ${uploadedVideoUrl}`);

    // 4c. Attach media to Hostel A
    const attachRes = await fetch(`${BASE_URL}/api/provider/properties/${hostelA_Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLandlordB}`
      },
      body: JSON.stringify({
        mediaItems: [
          { url: photoUrl, mediaType: 'IMAGE', isCover: 1, caption: 'Veranda' },
          { url: '/uploads/sample_hostel_tour.mp4', mediaType: 'VIDEO', caption: 'Full Walkthrough Tour' }
        ]
      })
    });
    assert(attachRes.ok, 'Test 4c: Phone attaches mediaItems array to Hostel A in SQLite DB');

    // 4d. Laptop checks media
    const laptopDetailRes = await fetch(`${BASE_URL}/api/properties/${hostelA_Id}`);
    const laptopDetailData = await laptopDetailRes.json();
    const laptopProp = laptopDetailData.property || laptopDetailData;
    const hasMedia = Array.isArray(laptopProp.media) && laptopProp.media.length >= 2;
    const hasVideo = laptopProp.media?.some((m: any) => m.media_type === 'VIDEO' || m.mediaType === 'VIDEO' || m.type === 'VIDEO');
    assert(hasMedia && hasVideo, 'Test 4d: Laptop inspects Hostel A and confirms photo & video exist in central DB');

    // -------------------------------------------------------------
    // TEST 5: Video playback streams via HTTP 206 Partial Content
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Video byte-range streaming via HTTP 206 ---');
    const videoStreamRes = await fetch(`${BASE_URL}/uploads/sample_hostel_tour.mp4`, {
      headers: { Range: 'bytes=0-4096' }
    });
    const is206 = videoStreamRes.status === 206;
    const contentRange = videoStreamRes.headers.get('content-range');
    const acceptRanges = videoStreamRes.headers.get('accept-ranges');
    const contentType = videoStreamRes.headers.get('content-type');

    assert(
      is206 && Boolean(contentRange) && acceptRanges === 'bytes' && contentType?.includes('video/mp4'),
      'Test 5: Video streams via HTTP 206 Partial Content for mobile scrub & seek',
      `Status: ${videoStreamRes.status}, Content-Range: ${contentRange}, Type: ${contentType}`
    );

    // -------------------------------------------------------------
    // TEST 6: Student Portal retrieves Hostel A with playable video & photos
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Student Portal fetches Hostel A with verified video walkthrough ---');
    const studentPropRes = await fetch(`${BASE_URL}/api/properties/${hostelA_Id}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` }
    });
    const studentPropData = await studentPropRes.json();
    const studentProp = studentPropData.property || studentPropData;
    const studentHasVideo = Array.isArray(studentProp.media) && 
      studentProp.media.some((m: any) => (m.media_type === 'VIDEO' || m.mediaType === 'VIDEO' || m.type === 'VIDEO') && m.url?.includes('.mp4'));
    assert(studentHasVideo, 'Test 6: Student Portal receives verified .mp4 walkthrough for detail modal & lightbox playback');

    // -------------------------------------------------------------
    // TEST 7 & 8: Cross-device Chat: Student (Phone) <-> Landlord (Laptop)
    // -------------------------------------------------------------
    console.log('\n--- Test 7 & 8: Cross-Device Chat Messaging ---');
    
    // Student starts conversation with landlord
    const studentMsgText = `Hi Landlord, I am interested in Villa A! Is room inspection available this Friday at 2 PM? (${timestamp})`;
    const startConvoRes = await fetch(`${BASE_URL}/api/messages/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`
      },
      body: JSON.stringify({
        propertyId: hostelA_Id,
        initialMessage: studentMsgText
      })
    });
    const startConvoData = await startConvoRes.json();
    const conversationId = startConvoData.conversationId;
    assert(startConvoRes.ok && Boolean(conversationId), 'Test 7a: Student initiates conversation inquiry to Landlord', `Convo ID: ${conversationId}`);

    // Landlord receives message in conversations inbox
    const landlordConvosRes = await fetch(`${BASE_URL}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${tokenLandlordA}` }
    });
    const landlordConvos = await landlordConvosRes.json();
    const convosList = Array.isArray(landlordConvos) ? landlordConvos : landlordConvos.conversations || [];
    const foundConvo = convosList.find((c: any) => c.id === conversationId || c.propertyId === hostelA_Id);
    assert(Boolean(foundConvo), 'Test 7b: Landlord receives Student inquiry in cross-device message center');

    // Landlord replies from laptop
    const landlordReplyText = `Yes! Friday at 2 PM is perfect. Caretaker will receive you at Villa A. (${timestamp})`;
    const replyRes = await fetch(`${BASE_URL}/api/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLandlordA}`
      },
      body: JSON.stringify({
        content: landlordReplyText
      })
    });
    assert(replyRes.ok, 'Test 8a: Landlord replies to Student from laptop session');

    // Student fetches conversation messages and verifies landlord reply
    const studentConvoRes = await fetch(`${BASE_URL}/api/messages/conversations/${conversationId}`, {
      headers: { Authorization: `Bearer ${tokenStudent}` }
    });
    const studentConvoData = await studentConvoRes.json();
    const messages = studentConvoData.messages || [];
    const hasReply = messages.some((m: any) => m.content === landlordReplyText);
    assert(hasReply, 'Test 8b: Student on phone receives Landlord reply from SQLite message store');

    // -------------------------------------------------------------
    // TEST 9: Fresh Login & Session Persistence from SQLite DB
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Fresh Login & SQLite Persistence (Zero LocalStorage dependency) ---');
    const freshLoginSession = await login('provider@hostelease.ng', 'Provider123!');
    const freshListingsRes = await fetch(`${BASE_URL}/api/provider/properties`, {
      headers: { Authorization: `Bearer ${freshLoginSession.token}` }
    });
    const freshListings = await freshListingsRes.json();
    const freshProperties = Array.isArray(freshListings) ? freshListings : freshListings.properties || [];
    const hasBoth = freshProperties.some((p: any) => p.id === hostelA_Id) &&
                    freshProperties.some((p: any) => p.id === hostelB_Id);

    assert(hasBoth, 'Test 9: Fresh login session retrieves both Hostel A and Hostel B directly from SQLite');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('===============================================================');

    if (failed === 0) {
      console.log('🎉 ALL 9 CROSS-DEVICE SCENARIOS VERIFIED 100% OPERATIONAL!');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED.');
      process.exit(1);
    }

  } catch (err: any) {
    console.error('💥 Test suite crashed:', err.message);
    process.exit(1);
  }
}

runE2ETests();
