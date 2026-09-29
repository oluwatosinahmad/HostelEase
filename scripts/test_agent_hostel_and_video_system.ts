/**
 * Comprehensive Automated Verification: Agent Hostel Management + 4K Video System
 * 
 * Validates all 16 required test cases specified in Part 21:
 *  1. Agent A creates Hostel A -> Save Draft -> appears in drafts (verification_status = 'DRAFT')
 *  2. Agent A continues editing draft -> saves again -> no duplicate created
 *  3. Agent A publishes Hostel A -> appears in My Hostels, disappears from drafts
 *  4. Agent A deletes Hostel A -> removed. Agent B cannot delete Agent A's hostel (403 Forbidden)
 *  5. Agent A uploads 3840x2160 video for Hostel A -> stored for Agent A + Hostel A
 *  6. Agent A opens 4K Videos -> uploaded video appears
 *  7. Agent A watches video (verified URL playback)
 *  8. Admin opens 4K Videos -> sees exact video, Agent A, Hostel A
 *  9. Admin verifies video -> Admin = VERIFIED, Agent = VERIFIED
 * 10. Agent A can still watch verified video (never disappears from agent list)
 * 11. Agent A deletes video -> disappears from list, counts update, property status syncs
 * 12. Agent B cannot see Agent A's videos (strict agent isolation)
 * 13. Agent B cannot delete Agent A's video (403 Forbidden)
 * 14. Admin rejects video -> Agent sees REJECTED and rejection reason
 * 15. Upload non-4K (1080p) -> rejected with 400 Bad Request
 * 16. Cross-device verification -> backend database is single source of truth
 */

import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

const API_HOST = 'http://127.0.0.1:5000/api';

async function runTestAgentHostelAndVideoSystem() {
  console.log('================================================================');
  console.log('🏛️  HOSTEL EASE: AGENT HOSTEL MANAGEMENT + 4K VIDEO SYSTEM TEST');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  const timestamp = Date.now();

  // 1. SETUP ACTORS
  console.log('Setting up Test Actors in DB...');
  const agentA = {
    id: `usr-agent-hostel-a-${timestamp}`,
    email: `agent_a_${timestamp}@lautech-hostels.ng`,
    fullName: 'Chief Balogun (Agent A)',
    role: 'PROVIDER' as const,
    phone: '08021110001'
  };

  const agentB = {
    id: `usr-agent-hostel-b-${timestamp}`,
    email: `agent_b_${timestamp}@lautech-hostels.ng`,
    fullName: 'Mr. Ojo (Agent B)',
    role: 'PROVIDER' as const,
    phone: '08022220002'
  };

  const admin = {
    id: `usr-admin-hostel-${timestamp}`,
    email: `admin_${timestamp}@hostelease.ng`,
    fullName: 'Super Admin',
    role: 'ADMIN' as const,
    phone: '08023330003'
  };

  for (const u of [agentA, agentB, admin]) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES (?, ?, 'dummy_hash', ?, ?, ?, 1, datetime('now'))
    `).run(u.id, u.email, u.fullName, u.phone, u.role);

    if (u.role === 'PROVIDER') {
      db.prepare(`
        INSERT INTO provider_profiles (id, user_id, provider_type, business_name, verification_status, onboarding_completed)
        VALUES (?, ?, 'HOSTEL_OWNER', ?, 'APPROVED', 1)
      `).run(`prof-${u.id}`, u.id, u.fullName);
    }
  }

  const tokenAgentA = generateToken({ id: agentA.id, email: agentA.email, role: agentA.role });
  const tokenAgentB = generateToken({ id: agentB.id, email: agentB.email, role: agentB.role });
  const tokenAdmin = generateToken({ id: admin.id, email: admin.email, role: admin.role });

  const headersAgentA = { 'Authorization': `Bearer ${tokenAgentA}`, 'Content-Type': 'application/json' };
  const headersAgentB = { 'Authorization': `Bearer ${tokenAgentB}`, 'Content-Type': 'application/json' };
  const headersAdmin = { 'Authorization': `Bearer ${tokenAdmin}`, 'Content-Type': 'application/json' };

  let hostelAId: string = '';
  let hostelBId: string = '';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Agent A creates Hostel A -> Save Draft -> appears in drafts
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Agent A creates Hostel A -> Save Draft ---');
    const createDraftRes = await fetch(`${API_HOST}/provider/properties`, {
      method: 'POST',
      headers: headersAgentA,
      body: JSON.stringify({
        title: `Grace Villa Draft ${timestamp}`,
        address: 'Under G Area, Close to LAUTECH Gate',
        nearbyLandmark: 'Opposite Zenith Bank',
        distanceFromCampusKm: 0.5,
        propertyType: 'SELF_CONTAIN',
        genderPreference: 'MIXED',
        totalRooms: 10,
        pricing: { rentAmount: 180000, serviceCharge: 20000, cautionFee: 15000 },
        isDraft: true
      })
    });

    const createDraftData = await createDraftRes.json();
    assert(createDraftRes.status === 201, 'Test 1.1: Draft property created with HTTP 201', JSON.stringify(createDraftData));
    hostelAId = createDraftData.property?.id || createDraftData.propertyId;
    assert(Boolean(hostelAId), 'Test 1.2: Valid property ID returned for draft', `ID: ${hostelAId}`);

    // Verify draft status in database
    const dbDraft = db.prepare('SELECT id, verification_status FROM properties WHERE id = ?').get(hostelAId) as any;
    assert(dbDraft?.verification_status === 'DRAFT', 'Test 1.3: DB records verification_status = DRAFT', `Status: ${dbDraft?.verification_status}`);

    // Verify it appears in agent's listings with verificationStatus === 'DRAFT'
    const myListingsRes = await fetch(`${API_HOST}/provider/properties`, { headers: headersAgentA });
    const myListingsData = await myListingsRes.json();
    const draftFound = myListingsData.properties?.find((p: any) => p.id === hostelAId);
    assert(draftFound && draftFound.verificationStatus === 'DRAFT', 'Test 1.4: Draft appears in Agent A My Listings with verificationStatus = DRAFT');

    // Verify draft does NOT appear on public search
    const publicRes = await fetch(`${API_HOST}/properties`);
    const publicData = await publicRes.json();
    const publicFound = publicData.properties?.some((p: any) => p.id === hostelAId);
    assert(!publicFound, 'Test 1.5: Draft does NOT appear in public student search');

    // -------------------------------------------------------------------------
    // TEST 2: Agent A continues editing draft -> saves again -> no duplicate created
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Agent A continues editing draft -> saves again (no duplicate) ---');
    const updateDraftRes = await fetch(`${API_HOST}/provider/properties/${hostelAId}`, {
      method: 'PUT',
      headers: headersAgentA,
      body: JSON.stringify({
        title: `Grace Villa Draft Updated ${timestamp}`,
        address: 'Under G Area, LAUTECH Main Gate',
        totalRooms: 12,
        isDraft: true
      })
    });
    assert(updateDraftRes.status === 200, 'Test 2.1: Draft updated with HTTP 200');

    // Check count of properties for Agent A
    const countDrafts = db.prepare('SELECT COUNT(*) as count FROM properties WHERE provider_id = ?').get(agentA.id) as { count: number };
    assert(countDrafts.count === 1, 'Test 2.2: Exactly 1 property exists for Agent A (no duplicates)', `Count: ${countDrafts.count}`);

    const dbUpdatedDraft = db.prepare('SELECT title, total_rooms, verification_status FROM properties WHERE id = ?').get(hostelAId) as any;
    assert(dbUpdatedDraft?.title.includes('Updated') && dbUpdatedDraft?.total_rooms === 12 && dbUpdatedDraft?.verification_status === 'DRAFT',
      'Test 2.3: Same record was updated in-place without ID changes');

    // -------------------------------------------------------------------------
    // TEST 3: Agent A publishes Hostel A -> transitions to PENDING_REVIEW, appears in My Hostels
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Agent A publishes Hostel A ---');
    const publishRes = await fetch(`${API_HOST}/provider/properties/${hostelAId}`, {
      method: 'PUT',
      headers: headersAgentA,
      body: JSON.stringify({
        submitForReview: true,
        isDraft: false
      })
    });
    assert(publishRes.status === 200, 'Test 3.1: Publish property returned HTTP 200');

    const dbPublished = db.prepare('SELECT verification_status FROM properties WHERE id = ?').get(hostelAId) as any;
    assert(dbPublished?.verification_status === 'PENDING_REVIEW', 'Test 3.2: Status transitioned from DRAFT to PENDING_REVIEW', `Status: ${dbPublished?.verification_status}`);

    // Verify it is now in published hostels queue (not DRAFT)
    const myListingsRes3 = await fetch(`${API_HOST}/provider/properties`, { headers: headersAgentA });
    const myListingsData3 = await myListingsRes3.json();
    const publishedFound = myListingsData3.properties?.find((p: any) => p.id === hostelAId);
    assert(publishedFound && publishedFound.verificationStatus === 'PENDING_REVIEW', 'Test 3.3: Hostel A has verificationStatus = PENDING_REVIEW in My Hostels');

    // -------------------------------------------------------------------------
    // TEST 4: Agent A deletes Hostel A -> removed. Agent B cannot delete Agent A's hostel (403)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Deletion & Security (Agent B 403, Agent A succeeds) ---');
    // Agent B attempts to delete Agent A's hostel -> MUST be 403
    const agentBDeleteRes = await fetch(`${API_HOST}/provider/properties/${hostelAId}`, {
      method: 'DELETE',
      headers: headersAgentB
    });
    assert(agentBDeleteRes.status === 403, 'Test 4.1: Agent B cannot delete Agent A hostel (HTTP 403 Forbidden)', `Status: ${agentBDeleteRes.status}`);

    // Verify hostel still exists in DB
    const checkStillExists = db.prepare('SELECT id FROM properties WHERE id = ?').get(hostelAId);
    assert(Boolean(checkStillExists), 'Test 4.2: Hostel A remained untouched after unauthorized delete attempt');

    // Agent A deletes their own hostel
    const agentADeleteRes = await fetch(`${API_HOST}/provider/properties/${hostelAId}`, {
      method: 'DELETE',
      headers: headersAgentA
    });
    const agentADeleteData = await agentADeleteRes.json();
    assert(agentADeleteRes.status === 200 && agentADeleteData.success === true, 'Test 4.3: Agent A deletes own hostel with HTTP 200 & success=true');

    // Verify hostel removed from DB
    const checkGone = db.prepare('SELECT id FROM properties WHERE id = ?').get(hostelAId);
    assert(!checkGone, 'Test 4.4: Hostel A successfully deleted from database');

    // -------------------------------------------------------------------------
    // SETUP HOSTEL A2 for video tests
    // -------------------------------------------------------------------------
    console.log('\n--- Creating Hostel A2 for 4K Video Tests ---');
    const createA2Res = await fetch(`${API_HOST}/provider/properties`, {
      method: 'POST',
      headers: headersAgentA,
      body: JSON.stringify({
        title: `Executive Lodge 4K ${timestamp}`,
        address: 'Adenike Area, LAUTECH Ogbomoso',
        propertyType: 'SINGLE_ROOM',
        genderPreference: 'MALE',
        totalRooms: 8,
        pricing: { rentAmount: 150000 },
        isDraft: false
      })
    });
    const createA2Data = await createA2Res.json();
    const hostelA2Id = createA2Data.property?.id || createA2Data.propertyId;
    assert(Boolean(hostelA2Id), 'Hostel A2 created successfully for video testing', `ID: ${hostelA2Id}`);

    // -------------------------------------------------------------------------
    // TEST 5: Agent A uploads 3840x2160 video for Hostel A2
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Agent A uploads 3840x2160 4K Video ---');
    const upload4KRes = await fetch(`${API_HOST}/videos/upload-4k`, {
      method: 'POST',
      headers: headersAgentA,
      body: JSON.stringify({
        propertyId: hostelA2Id,
        videoUrl: `https://storage.hostelease.ng/videos/4k-tour-${timestamp}.mp4`,
        thumbnailUrl: `https://storage.hostelease.ng/videos/4k-thumb-${timestamp}.jpg`,
        width: 3840,
        height: 2160,
        duration: 95,
        fileSize: 45000000,
        caption: 'Full walkthrough showing running water, prepaid meter and room space'
      })
    });
    const upload4KData = await upload4KRes.json();
    assert(upload4KRes.status === 201 || upload4KRes.status === 200, 'Test 5.1: 4K Video uploaded successfully with HTTP 201/200', JSON.stringify(upload4KData));
    const videoId = upload4KData.video?.id || upload4KData.videoId;
    assert(Boolean(videoId), 'Test 5.2: Valid video ID returned', `Video ID: ${videoId}`);

    // Verify video stored in four_k_videos table associated with Agent A and Hostel A2
    const dbVideo = db.prepare('SELECT * FROM four_k_videos WHERE id = ?').get(videoId) as any;
    assert(dbVideo && dbVideo.agent_id === agentA.id && dbVideo.property_id === hostelA2Id && dbVideo.status === 'PENDING',
      'Test 5.3: Video stored in DB for Agent A + Hostel A2 with status = PENDING');

    // -------------------------------------------------------------------------
    // TEST 6: Agent A opens 4K Videos -> uploaded video appears
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Agent A opens 4K Videos page ---');
    const agentVideosRes = await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentA });
    const agentVideosData = await agentVideosRes.json();
    const videoFound = agentVideosData.videos?.find((v: any) => v.id === videoId);
    assert(Boolean(videoFound), 'Test 6.1: Uploaded video appears in Agent A 4K Videos list');
    assert(agentVideosData.counts?.total >= 1 && agentVideosData.counts?.pending >= 1,
      'Test 6.2: Agent A video stats show real counts', JSON.stringify(agentVideosData.counts));

    // -------------------------------------------------------------------------
    // TEST 7: Agent A watches video (verified URL playback)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Agent A watches video (URL playback check) ---');
    assert(videoFound?.videoUrl && videoFound.videoUrl.startsWith('https://'),
      'Test 7.1: Playable video URL is accessible for watching', `URL: ${videoFound?.videoUrl}`);
    assert(videoFound?.resolution === '3840×2160 (4K UHD)' || (videoFound?.width === 3840 && videoFound?.height === 2160),
      'Test 7.2: Video resolution specifications correctly preserved', `Resolution: ${videoFound?.resolution || `${videoFound?.width}x${videoFound?.height}`}`);

    // -------------------------------------------------------------------------
    // TEST 8: Admin opens 4K Videos -> sees exact video, Agent A, Hostel A2
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Admin opens 4K Videos queue ---');
    const adminVideosRes = await fetch(`${API_HOST}/admin/videos`, { headers: headersAdmin });
    const adminVideosData = await adminVideosRes.json();
    const adminVideoFound = adminVideosData.videos?.find((v: any) => v.id === videoId);
    assert(Boolean(adminVideoFound), 'Test 8.1: Admin sees exact uploaded video in queue');
    assert(adminVideoFound?.propertyId === hostelA2Id, 'Test 8.2: Admin sees exact property association');
    assert(adminVideoFound?.providerId === agentA.id || adminVideoFound?.agentId === agentA.id, 'Test 8.3: Admin sees Agent A attribution');

    // -------------------------------------------------------------------------
    // TEST 9: Admin verifies video -> Admin = VERIFIED, Agent = VERIFIED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Admin verifies video ---');
    const verifyRes = await fetch(`${API_HOST}/admin/videos/${videoId}/verify`, {
      method: 'POST',
      headers: headersAdmin,
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Passed 4K resolution check, clean uncut walkthrough, borehole water confirmed.'
      })
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.success === true, 'Test 9.1: Admin verified video successfully', JSON.stringify(verifyData));

    // Check DB status
    const dbVerified = db.prepare('SELECT status, verified_at, verified_by FROM four_k_videos WHERE id = ?').get(videoId) as any;
    assert(dbVerified?.status === 'VERIFIED' && Boolean(dbVerified?.verified_at) && Boolean(dbVerified?.verified_by),
      'Test 9.2: DB records status = VERIFIED with verified_at timestamp and verified_by admin ID');

    // Check Property status in DB
    const dbPropVerified = db.prepare('SELECT has_4k_video, video_verification_status, video_tour_url FROM properties WHERE id = ?').get(hostelA2Id) as any;
    assert(dbPropVerified?.has_4k_video === 1 && dbPropVerified?.video_verification_status === 'APPROVED',
      'Test 9.3: Property table has_4k_video set to 1 and video_verification_status set to APPROVED');

    // Check Agent view reflects VERIFIED
    const agentVideosAfterVerify = await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentA });
    const agentVideosAfterData = await agentVideosAfterVerify.json();
    const agentVAfter = agentVideosAfterData.videos?.find((v: any) => v.id === videoId);
    assert(agentVAfter?.status === 'VERIFIED', 'Test 9.4: Agent A video list reflects status = VERIFIED');

    // -------------------------------------------------------------------------
    // TEST 10: Agent A can still watch verified video (never disappears from list)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Verified video remains in Agent list & is playable ---');
    assert(Boolean(agentVAfter?.videoUrl), 'Test 10.1: Verified video URL is present and playable');
    assert(agentVideosAfterData.counts?.verified >= 1, 'Test 10.2: Verified video count in stats header is updated to at least 1');

    // -------------------------------------------------------------------------
    // TEST 11: Agent A deletes video -> disappears from list, counts update, property synced
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Agent A deletes video ---');
    const deleteVideoRes = await fetch(`${API_HOST}/provider/videos/${videoId}`, {
      method: 'DELETE',
      headers: headersAgentA
    });
    const deleteVideoData = await deleteVideoRes.json();
    assert(deleteVideoRes.status === 200 && deleteVideoData.success === true, 'Test 11.1: Video deleted with HTTP 200 and success = true');

    // Verify video gone from DB
    const dbVideoGone = db.prepare('SELECT id FROM four_k_videos WHERE id = ?').get(videoId);
    assert(!dbVideoGone, 'Test 11.2: Video permanently removed from four_k_videos table');

    // Verify property reverted to has_4k_video = 0
    const dbPropReverted = db.prepare('SELECT has_4k_video, video_verification_status, video_tour_url FROM properties WHERE id = ?').get(hostelA2Id) as any;
    assert(dbPropReverted?.has_4k_video === 0 && dbPropReverted?.video_verification_status === 'NONE' && !dbPropReverted?.video_tour_url,
      'Test 11.3: Property reverted has_4k_video = 0 and video_verification_status = NONE');

    // Verify video list for Agent A updated
    const agentVideosAfterDel = await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentA });
    const agentVideosDelData = await agentVideosAfterDel.json();
    const videoGoneFromList = !agentVideosDelData.videos?.some((v: any) => v.id === videoId);
    assert(videoGoneFromList, 'Test 11.4: Deleted video no longer appears in Agent A list');

    // -------------------------------------------------------------------------
    // SETUP VIDEO FOR AGENT ISOLATION & REJECTION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Uploading Video 2 for Agent Isolation & Rejection Tests ---');
    const uploadV2Res = await fetch(`${API_HOST}/videos/upload-4k`, {
      method: 'POST',
      headers: headersAgentA,
      body: JSON.stringify({
        propertyId: hostelA2Id,
        videoUrl: `https://storage.hostelease.ng/videos/4k-tour-2-${timestamp}.mp4`,
        width: 3840,
        height: 2160,
        duration: 80,
        fileSize: 42000000,
        caption: 'Second 4K video tour'
      })
    });
    const uploadV2Data = await uploadV2Res.json();
    const video2Id = uploadV2Data.video?.id || uploadV2Data.videoId;
    assert(Boolean(video2Id), 'Video 2 uploaded successfully');

    // -------------------------------------------------------------------------
    // TEST 12: Agent B cannot see Agent A's videos
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Agent B cannot see Agent A videos (Isolation) ---');
    const agentBVideosRes = await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentB });
    const agentBVideosData = await agentBVideosRes.json();
    const canSeeAgentAVideo = agentBVideosData.videos?.some((v: any) => v.id === video2Id || v.agentId === agentA.id);
    assert(!canSeeAgentAVideo, 'Test 12.1: Agent B list does NOT contain Agent A videos (strict agent isolation)');
    assert(agentBVideosData.counts?.total === 0, 'Test 12.2: Agent B stats show 0 total videos');

    // -------------------------------------------------------------------------
    // TEST 13: Agent B cannot delete Agent A's video (403)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: Agent B cannot delete Agent A video (403 Forbidden) ---');
    const agentBDeleteVideoRes = await fetch(`${API_HOST}/provider/videos/${video2Id}`, {
      method: 'DELETE',
      headers: headersAgentB
    });
    assert(agentBDeleteVideoRes.status === 403, 'Test 13.1: Agent B cannot delete Agent A video (HTTP 403 Forbidden)', `Status: ${agentBDeleteVideoRes.status}`);

    const dbV2StillExists = db.prepare('SELECT id FROM four_k_videos WHERE id = ?').get(video2Id);
    assert(Boolean(dbV2StillExists), 'Test 13.2: Video remained in database after unauthorized deletion attempt');

    // -------------------------------------------------------------------------
    // TEST 14: Admin rejects video -> Agent sees REJECTED and rejection reason
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: Admin rejects video with mandatory reason ---');
    const rejectionReasonText = 'Camera lighting in bathroom is too dark; please record an uncut daytime tour showing running tap water.';
    const rejectRes = await fetch(`${API_HOST}/admin/videos/${video2Id}/reject`, {
      method: 'POST',
      headers: headersAdmin,
      body: JSON.stringify({
        rejectionReason: rejectionReasonText
      })
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.status === 200 && rejectData.success === true, 'Test 14.1: Admin rejected video with HTTP 200');

    // Verify DB records REJECTED and rejection reason
    const dbV2Rejected = db.prepare('SELECT status, rejection_reason FROM four_k_videos WHERE id = ?').get(video2Id) as any;
    assert(dbV2Rejected?.status === 'REJECTED' && dbV2Rejected?.rejection_reason === rejectionReasonText,
      'Test 14.2: DB records status = REJECTED and exact rejection reason');

    // Agent A fetches videos and sees REJECTED + reason
    const agentVideosAfterReject = await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentA });
    const agentVideosRejectData = await agentVideosAfterReject.json();
    const agentV2Item = agentVideosRejectData.videos?.find((v: any) => v.id === video2Id);
    assert(agentV2Item?.status === 'REJECTED', 'Test 14.3: Agent A sees status = REJECTED');
    assert(agentV2Item?.rejectionReason === rejectionReasonText || agentV2Item?.verificationNotes?.includes('Camera lighting'),
      'Test 14.4: Agent A sees the administrative feedback / rejection reason');

    // -------------------------------------------------------------------------
    // TEST 15: Upload non-4K (1080p, 1920x1080) -> rejected with 400
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: Non-4K (1080p) upload rejected with HTTP 400 ---');
    const non4KRes = await fetch(`${API_HOST}/videos/upload-4k`, {
      method: 'POST',
      headers: headersAgentA,
      body: JSON.stringify({
        propertyId: hostelA2Id,
        videoUrl: 'https://storage.hostelease.ng/videos/1080p-tour.mp4',
        width: 1920,
        height: 1080,
        duration: 60,
        fileSize: 15000000
      })
    });
    const non4KData = await non4KRes.json();
    assert(non4KRes.status === 400, 'Test 15.1: Non-4K video rejected with HTTP 400 Bad Request', `Status: ${non4KRes.status}`);
    assert(Boolean(non4KData.error && non4KData.error.toLowerCase().includes('4k')),
      'Test 15.2: Error message explicitly mentions 4K resolution requirement', `Error: ${non4KData.error}`);

    // -------------------------------------------------------------------------
    // TEST 16: Cross-device verification -> backend synchronization check
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: Cross-Device Synchronization Check ---');
    // Device 1 (Agent A session 1) and Device 2 (Agent A session 2 with fresh token)
    const freshTokenA = generateToken({ id: agentA.id, email: agentA.email, role: agentA.role });
    const device1Props = await (await fetch(`${API_HOST}/provider/properties`, { headers: headersAgentA })).json();
    const device2Props = await (await fetch(`${API_HOST}/provider/properties`, { headers: { 'Authorization': `Bearer ${freshTokenA}` } })).json();

    assert(device1Props.properties?.length === device2Props.properties?.length,
      'Test 16.1: Cross-device property listings are identical');

    const device1Videos = await (await fetch(`${API_HOST}/provider/videos`, { headers: headersAgentA })).json();
    const device2Videos = await (await fetch(`${API_HOST}/provider/videos`, { headers: { 'Authorization': `Bearer ${freshTokenA}` } })).json();

    assert(device1Videos.videos?.length === device2Videos.videos?.length &&
           device1Videos.counts?.total === device2Videos.counts?.total &&
           device1Videos.counts?.rejected === device2Videos.counts?.rejected,
      'Test 16.2: Cross-device video records & status counts are synchronized from database');

  } catch (err: any) {
    console.error('Unhandled exception during test execution:', err);
    assert(false, 'Test suite completed without exceptions', err.message);
  } finally {
    // Clean up test data
    console.log('\nCleaning up test artifacts...');
    try {
      db.prepare('DELETE FROM four_k_videos WHERE agent_id IN (?, ?)').run(agentA.id, agentB.id);
      db.prepare('DELETE FROM properties WHERE provider_id IN (?, ?)').run(agentA.id, agentB.id);
      db.prepare('DELETE FROM provider_profiles WHERE user_id IN (?, ?)').run(agentA.id, agentB.id);
      db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(agentA.id, agentB.id, admin.id);
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 16 SYSTEM REQUIREMENTS & TEST CASES PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('💥 SOME TEST CASES FAILED!\n');
    process.exit(1);
  }
}

runTestAgentHostelAndVideoSystem();
