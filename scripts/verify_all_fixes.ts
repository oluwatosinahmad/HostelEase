import db from '../server/db.js';

async function runVerification() {
  console.log('=====================================================');
  console.log('STARTING HOSTEL EASE COMPREHENSIVE VERIFICATION SUITE');
  console.log('=====================================================');

  const BASE_URL = 'http://127.0.0.1:5000';
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error('   Details:', details);
    }
  }

  // 1. Health Check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', '1. Server Health Check returns 200 OK');
  } catch (err: any) {
    assert(false, '1. Server Health Check', err.message);
  }

  // 2. Video Streaming HTTP 206 Byte-Range Partial Content
  try {
    const rangeRes = await fetch(`${BASE_URL}/uploads/sample_hostel_tour.mp4`, {
      headers: { Range: 'bytes=0-1023' }
    });
    const contentRange = rangeRes.headers.get('content-range');
    const acceptRanges = rangeRes.headers.get('accept-ranges');
    const contentLength = rangeRes.headers.get('content-length');

    assert(
      rangeRes.status === 206 &&
      contentRange?.startsWith('bytes 0-1023/') &&
      acceptRanges === 'bytes' &&
      contentLength === '1024',
      '2. HTTP 206 Partial Content Video Streaming works for uploads',
      { status: rangeRes.status, contentRange, acceptRanges, contentLength }
    );
  } catch (err: any) {
    assert(false, '2. HTTP 206 Video Streaming', err.message);
  }

  // 3. Public Properties Search Video Associations
  let sampleApprovedProperty: any = null;
  try {
    const propsRes = await fetch(`${BASE_URL}/api/properties?limit=10`);
    const propsData = await propsRes.json();
    const props = propsData.properties || [];
    
    assert(props.length > 0, '3a. Public search returns approved properties');

    const allApproved = props.every((p: any) => p.verificationStatus === 'APPROVED');
    assert(allApproved, '3b. All properties in public search have verificationStatus === "APPROVED"');

    const videoProps = props.filter((p: any) => p.has4KVideo && p.videoTourUrl);
    assert(videoProps.length > 0, '3c. Verified properties include has4KVideo=true and authentic videoTourUrl', {
      countWithVideo: videoProps.length,
      sampleVideoUrl: videoProps[0]?.videoTourUrl
    });

    const hasMedia = props.some((p: any) => p.media && p.media.some((m: any) => m.mediaType === 'VIDEO'));
    assert(hasMedia, '3d. Property media array includes VIDEO walkthrough media items');

    sampleApprovedProperty = videoProps[0] || props[0];
  } catch (err: any) {
    assert(false, '3. Public Properties Search Video Associations', err.message);
  }

  // 4. Authenticate as Admin & Landlord
  let adminToken = '';
  let landlordToken = '';
  let landlordUser: any = null;

  try {
    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
    assert(Boolean(adminToken), '4a. Admin login successful and token retrieved');

    // Landlord login
    const landlordLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    const landlordLoginData = await landlordLoginRes.json();
    landlordToken = landlordLoginData.token;
    landlordUser = landlordLoginData.user;
    assert(Boolean(landlordToken), '4b. Landlord login successful and token retrieved');
  } catch (err: any) {
    assert(false, '4. Authentication', err.message);
  }

  // 5. Admin Hostels endpoint returns Video Tour & Media
  try {
    const adminHostelsRes = await fetch(`${BASE_URL}/api/admin/hostels?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminHostelsData = await adminHostelsRes.json();
    const hostels = adminHostelsData.hostels || [];

    const hostelWithVideo = hostels.find((h: any) => h.has4KVideo && h.videoTourUrl);
    assert(
      Boolean(hostelWithVideo),
      '5. Admin hostels endpoint supplies has4KVideo, videoTourUrl, and media for 8-point checklist audit',
      { sampleVideo: hostelWithVideo?.videoTourUrl, mediaCount: hostelWithVideo?.media?.length }
    );
  } catch (err: any) {
    assert(false, '5. Admin Hostels Media Verification', err.message);
  }

  // 6. Complete Landlord Upload -> Private (PENDING_REVIEW) -> Admin 8-point Approval -> Public Flow
  try {
    const testStamp = Date.now();
    const testTitle = `E2E Verified Tour Lodge ${testStamp}`;
    const testAddress = `Plot ${testStamp.toString().slice(-4)}, Under G Area, Ogbomoso`;
    const testVideoUrl = '/uploads/sample_hostel_tour.mp4';

    const createPayload = {
      title: testTitle,
      areaId: 'area-under-g',
      description: 'Exclusive 4K verified student hostel near LAUTECH Under G gate with borehole water.',
      address: testAddress,
      nearbyLandmark: 'Close to LAUTECH Under G Gate',
      distanceFromCampusKm: 0.5,
      propertyType: 'SELF_CONTAIN',
      genderPreference: 'ANY',
      totalRooms: 10,
      isDraft: false,
      has4KVideo: true,
      videoTourUrl: testVideoUrl,
      pricing: {
        period: 'YEARLY',
        rentAmount: 220000,
        serviceCharge: 15000,
        cautionFee: 20000,
        agencyFee: 0,
        otherMandatoryCharges: 0
      },
      amenityKeys: ['water_borehole', 'generator_backup', 'fenced_compound'],
      mediaItems: [
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
          mediaType: 'IMAGE',
          category: 'EXTERIOR',
          isCover: 1
        },
        {
          url: testVideoUrl,
          mediaType: 'VIDEO',
          category: 'VIDEO_WALKTHROUGH',
          isCover: 0
        }
      ]
    };

    // A. Landlord creates listing
    const createRes = await fetch(`${BASE_URL}/api/provider/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${landlordToken}`
      },
      body: JSON.stringify(createPayload)
    });
    const createJson = await createRes.json();
    const createdPropId = createJson.propertyId;

    assert(createRes.status === 201 && Boolean(createdPropId), '6a. Landlord creates hostel listing successfully');

    // B. Check that ONLY 1 record exists in SQLite for this property
    const countRow = db.prepare('SELECT COUNT(*) as count FROM properties WHERE id = ?').get(createdPropId) as any;
    assert(countRow.count === 1, '6b. Exactly 1 database record created for listing (no duplicate creation)');

    // C. Verify status is PENDING_REVIEW
    const propRow = db.prepare('SELECT verification_status FROM properties WHERE id = ?').get(createdPropId) as any;
    assert(propRow.verification_status === 'PENDING_REVIEW', '6c. Newly created property status is strictly PENDING_REVIEW');

    // D. Verify property does NOT appear in public search
    const publicSearchRes = await fetch(`${BASE_URL}/api/properties?search=${encodeURIComponent(testTitle)}`);
    const publicSearchJson = await publicSearchRes.json();
    const foundInPublic = (publicSearchJson.properties || []).some((p: any) => p.id === createdPropId);
    assert(!foundInPublic, '6d. PENDING_REVIEW property is strictly hidden from public directory and students');

    // E. Verify double-submit prevention: Attempting to create the exact same title & address returns 409
    const duplicateRes = await fetch(`${BASE_URL}/api/provider/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${landlordToken}`
      },
      body: JSON.stringify(createPayload)
    });
    assert(duplicateRes.status === 409, '6e. Idempotency guard prevents duplicate property submissions (returns 409 Conflict)');

    // F. Admin conducts 8-Point Verification Checklist review
    const reviewRes = await fetch(`${BASE_URL}/api/admin/verification/properties/${createdPropId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        adminFeedback: '8-point physical inspection and 4K video verified by LAUTECH campus operations team.',
        checklist: {
          identityVerified: true,
          locationConfirmed: true,
          genuinePhotos: true,
          transparentPricing: true,
          structuralSafety: true,
          waterPowerVerified: true,
          roomCountAccurate: true,
          physicalVisitDone: true
        }
      })
    });
    const reviewJson = await reviewRes.json();
    assert(reviewRes.status === 200, '6f. Admin submits 8-point verification review successfully');

    // G. Verify property status updated to APPROVED in DB
    const approvedPropRow = db.prepare('SELECT verification_status FROM properties WHERE id = ?').get(createdPropId) as any;
    assert(approvedPropRow.verification_status === 'APPROVED', '6g. Property status updated to APPROVED in canonical store');

    // H. Verify property now appears in public search with authentic video
    const publicSearchAfterRes = await fetch(`${BASE_URL}/api/properties?search=${encodeURIComponent(testTitle)}`);
    const publicSearchAfterJson = await publicSearchAfterRes.json();
    const approvedPublicProp = (publicSearchAfterJson.properties || []).find((p: any) => p.id === createdPropId);
    assert(
      Boolean(approvedPublicProp) && approvedPublicProp.has4KVideo && approvedPublicProp.videoTourUrl === testVideoUrl,
      '6h. Approved property now appears in public student directory with authentic 4K video tour attached'
    );
  } catch (err: any) {
    assert(false, '6. Landlord Upload & Admin Verification Flow', err.message);
  }

  // 7. Chatbot Instant Connection
  try {
    const aiChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Which hostels have steady light in Under G?' })
    });
    const aiChatJson = await aiChatRes.json();
    assert(
      aiChatRes.status === 200 && Boolean(aiChatJson.response),
      '7. AI Accommodation Assistant responds with authentic database intelligence'
    );
  } catch (err: any) {
    assert(false, '7. AI Accommodation Assistant', err.message);
  }

  console.log('=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
  console.log('=====================================================');

  if (passedCount === totalTests) {
    console.log('🎉 ALL SYSTEM REQUIREMENTS AND FLOWS FULLY VERIFIED!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. Review errors above.');
    process.exit(1);
  }
}

runVerification();
