/**
 * Automated Verification: 4K Video Upload & Admin Verification End-to-End Test
 * 
 * Verifies:
 * 1. Rejection of non-4K resolution videos (1080p, 720p).
 * 2. Acceptance and PENDING status of authentic 4K resolution videos (3840x2160 UHD).
 * 3. Cross-agent property upload isolation (HTTP 403).
 * 4. Agent "My 4K Videos" queue and statistics parity.
 * 5. Admin "Hostel Operations -> 4K Videos" queue with counts.
 * 6. Admin Video Verification: marks VERIFIED, updates property has_4k_video = 1, video_verification_status = 'APPROVED', notifies agent.
 * 7. Admin Rejection: requires mandatory rejection reason, marks REJECTED, notifies agent with feedback.
 * 8. Strict Role Security: students cannot verify or manipulate videos (HTTP 403).
 */

import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

const API_HOST = 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🎥  HOSTEL EASE 4K VIDEO UPLOAD & ADMIN VERIFICATION TEST');
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

  // 1. SETUP USERS
  console.log('1. Setting up Test Users in Database...');
  const agentA = {
    id: `usr-agent-4k-a-${timestamp}`,
    email: `agent_4k_a_${timestamp}@test.com`,
    fullName: 'Chief Adeleke (Authorized Agent)',
    role: 'PROVIDER' as const,
    phone: '08031112233'
  };

  const agentB = {
    id: `usr-agent-4k-b-${timestamp}`,
    email: `agent_4k_b_${timestamp}@test.com`,
    fullName: 'Mr. Babatunde (Separate Agent)',
    role: 'PROVIDER' as const,
    phone: '08034445566'
  };

  const admin = {
    id: `usr-admin-4k-${timestamp}`,
    email: `admin_4k_${timestamp}@hostelease.ng`,
    fullName: 'HostelEase Super Admin',
    role: 'ADMIN' as const,
    phone: '08039998877'
  };

  const student = {
    id: `usr-student-4k-${timestamp}`,
    email: `student_4k_${timestamp}@student.lautech.edu.ng`,
    fullName: 'Adekunle Student',
    role: 'STUDENT' as const,
    phone: '08037776655'
  };

  for (const u of [agentA, agentB, admin, student]) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
      VALUES (?, ?, 'dummy_hash', ?, ?, ?, 1, datetime('now'))
    `).run(u.id, u.email, u.fullName, u.phone, u.role);
  }

  // Generate tokens
  const tokenAgentA = generateToken(agentA);
  const tokenAgentB = generateToken(agentB);
  const tokenAdmin = generateToken(admin);
  const tokenStudent = generateToken(student);

  // 2. SETUP PROPERTIES
  console.log('\n2. Creating Test Properties for Agent Alpha...');
  const propA1 = {
    id: `prop-4k-alpha-1-${timestamp}`,
    provider_id: agentA.id,
    title: 'Adeleke Royal Villa (Underhill, LAUTECH)',
    slug: `adeleke-royal-villa-${timestamp}`,
    address: 'Underhill Area, Ogbomoso',
    has_4k_video: 0,
    video_verification_status: 'NONE'
  };

  const propA2 = {
    id: `prop-4k-alpha-2-${timestamp}`,
    provider_id: agentA.id,
    title: 'Adeleke Platinum Lodge (Adenike Gate)',
    slug: `adeleke-platinum-lodge-${timestamp}`,
    address: 'Adenike Gate, LAUTECH, Ogbomoso',
    has_4k_video: 0,
    video_verification_status: 'NONE'
  };

  for (const p of [propA1, propA2]) {
    db.prepare(`
      INSERT INTO properties (id, provider_id, university_id, title, slug, description, address, area_id, distance_from_campus_km, property_type, gender_preference, total_rooms, verification_status, availability_status, has_4k_video, video_verification_status, created_at)
      VALUES (?, ?, 'uni-lautech-ogbomoso', ?, ?, 'Exclusive hostel for 4K video testing', ?, 'area-under-g', 0.5, 'SELF_CONTAIN', 'ANY', 1, 'APPROVED', 'AVAILABLE', ?, ?, datetime('now'))
    `).run(p.id, p.provider_id, p.title, p.slug, p.address, p.has_4k_video, p.video_verification_status);
  }

  try {
    // TEST 1: REJECT NON-4K RESOLUTION
    console.log('\n3. Testing 4K Resolution Enforcement (Rejection of 1080p)...');
    const non4kRes = await fetch(`${API_HOST}/provider/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAgentA}`
      },
      body: JSON.stringify({
        propertyId: propA1.id,
        videoUrl: '/uploads/sample_1080p_video.mp4',
        width: 1920,
        height: 1080,
        resolution: '1920x1080 FHD',
        fileSize: '45 MB',
        duration: '1m 15s'
      })
    });

    const non4kData = await non4kRes.json();
    assert(
      non4kRes.status === 400 && String(non4kData.error || '').toLowerCase().includes('4k'),
      'HTTP 400 Bad Request when uploading non-4K (1080p) video',
      `Status: ${non4kRes.status}, Error: ${JSON.stringify(non4kData)}`
    );

    // TEST 2: ACCEPT AUTHENTIC 4K RESOLUTION
    console.log('\n4. Testing Authentic 4K Ultra HD Upload (3840x2160 UHD)...');
    const valid4kRes = await fetch(`${API_HOST}/provider/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAgentA}`
      },
      body: JSON.stringify({
        propertyId: propA1.id,
        videoUrl: '/uploads/sample_4k_tour_prop1.mp4',
        width: 3840,
        height: 2160,
        resolution: '3840x2160 UHD 4K',
        fileSize: '168 MB',
        duration: '2m 10s'
      })
    });

    const valid4kData = await valid4kRes.json();
    assert(
      valid4kRes.status === 201 && valid4kData.success && valid4kData.video?.id,
      'HTTP 201 Created for authentic 4K video upload',
      `Status: ${valid4kRes.status}, Body: ${JSON.stringify(valid4kData)}`
    );

    const video1Id = valid4kData.video?.id;

    // Verify DB state after upload (should be PENDING and property NOT yet has_4k_video = 1)
    const videoInDb = db.prepare('SELECT * FROM four_k_videos WHERE id = ?').get(video1Id) as any;
    assert(
      videoInDb && videoInDb.status === 'PENDING' && videoInDb.agent_id === agentA.id,
      'Video record saved in four_k_videos table with status PENDING and correct agent_id'
    );

    const propAfterUpload = db.prepare('SELECT has_4k_video, video_verification_status, video_tour_url FROM properties WHERE id = ?').get(propA1.id) as any;
    assert(
      propAfterUpload && propAfterUpload.has_4k_video === 0 && propAfterUpload.video_verification_status === 'PENDING_AUDIT',
      'Property has_4k_video remains 0 (unverified) and video_verification_status is PENDING_AUDIT prior to admin review'
    );

    // TEST 3: CROSS-AGENT UPLOAD ISOLATION
    console.log('\n5. Testing Cross-Agent Upload Security Isolation (Agent B -> Agent A Property)...');
    const crossAgentRes = await fetch(`${API_HOST}/provider/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAgentB}`
      },
      body: JSON.stringify({
        propertyId: propA1.id,
        videoUrl: '/uploads/malicious_cross_agent_tour.mp4',
        width: 3840,
        height: 2160
      })
    });

    const crossAgentData = await crossAgentRes.json();
    assert(
      crossAgentRes.status === 403,
      'HTTP 403 Forbidden when unauthorized Agent B attempts to upload video to Agent A property',
      `Status: ${crossAgentRes.status}, Error: ${crossAgentData.error}`
    );

    // TEST 4: AGENT "MY 4K VIDEOS" QUEUE & STATS
    console.log('\n6. Testing Agent "My 4K Videos" Endpoint...');
    const agentQueueRes = await fetch(`${API_HOST}/provider/videos`, {
      headers: { Authorization: `Bearer ${tokenAgentA}` }
    });
    const agentQueueData = await agentQueueRes.json();
    assert(
      agentQueueRes.status === 200 &&
      Array.isArray(agentQueueData.videos) &&
      agentQueueData.videos.some((v: any) => v.id === video1Id) &&
      agentQueueData.stats?.pending >= 1,
      'Agent Alpha can retrieve their 4K video queue with accurate stats breakdown',
      `Stats: ${JSON.stringify(agentQueueData.stats)}`
    );

    const agentBQueueRes = await fetch(`${API_HOST}/provider/videos`, {
      headers: { Authorization: `Bearer ${tokenAgentB}` }
    });
    const agentBQueueData = await agentBQueueRes.json();
    assert(
      agentBQueueRes.status === 200 &&
      agentBQueueData.videos.length === 0,
      'Agent Bravo queue is empty (strict tenant isolation)'
    );

    // TEST 5: ADMIN QUEUE INSPECTION
    console.log('\n7. Testing Admin Video Review Queue (Hostel Operations -> 4K Videos)...');
    const adminQueueRes = await fetch(`${API_HOST}/admin/videos`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const adminQueueData = await adminQueueRes.json();
    assert(
      adminQueueRes.status === 200 &&
      Array.isArray(adminQueueData.videos) &&
      adminQueueData.videos.some((v: any) => v.id === video1Id && v.status === 'PENDING'),
      'Admin can retrieve the 4K video verification queue with pending video and full metadata',
      `Counts: ${JSON.stringify(adminQueueData.counts)}`
    );

    // TEST 6: ADMIN VERIFICATION & APPROVAL
    console.log('\n8. Testing Admin Video Approval Workflow...');
    const verifyRes = await fetch(`${API_HOST}/admin/videos/${video1Id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        notes: 'Pristine 4K video tour. Continuous room walk, running borehole tap, and prepaid meter verified.'
      })
    });

    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 200 && verifyData.success,
      'HTTP 200 on Admin Video Verification',
      `Status: ${verifyRes.status}, Body: ${JSON.stringify(verifyData)}`
    );

    // Check DB state after approval
    const videoAfterVerify = db.prepare('SELECT status, verified_by, verified_at FROM four_k_videos WHERE id = ?').get(video1Id) as any;
    assert(
      videoAfterVerify && videoAfterVerify.status === 'VERIFIED' && videoAfterVerify.verified_by === admin.id,
      'Database status updated to VERIFIED with verified_by and verified_at timestamp'
    );

    const propAfterVerify = db.prepare('SELECT has_4k_video, video_verification_status, video_tour_url FROM properties WHERE id = ?').get(propA1.id) as any;
    assert(
      propAfterVerify && propAfterVerify.has_4k_video === 1 && propAfterVerify.video_verification_status === 'APPROVED',
      'Property has_4k_video set to 1 and video_verification_status set to APPROVED (live to students)'
    );

    // Check notification sent to Agent A
    const agentNotif = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND (type = 'VIDEO_VERIFIED' OR title LIKE '%4K Video Tour Verified%')
      ORDER BY created_at DESC LIMIT 1
    `).get(agentA.id) as any;
    assert(
      agentNotif != null,
      'In-app notification successfully dispatched to Agent Alpha regarding video approval',
      agentNotif ? `Title: ${agentNotif.title}` : 'No notification found'
    );

    // TEST 7: ADMIN REJECTION WITH MANDATORY REASON
    console.log('\n9. Testing Admin Rejection Workflow with Mandatory Feedback...');
    // First upload a 2nd 4K video for property 2
    const upload2Res = await fetch(`${API_HOST}/provider/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAgentA}`
      },
      body: JSON.stringify({
        propertyId: propA2.id,
        videoUrl: '/uploads/sample_4k_tour_prop2.mp4',
        width: 3840,
        height: 2160,
        resolution: '3840x2160 UHD 4K'
      })
    });
    const upload2Data = await upload2Res.json();
    const video2Id = upload2Data.video?.id;

    // Attempt rejection without reason -> MUST FAIL (HTTP 400)
    const rejectNoReasonRes = await fetch(`${API_HOST}/admin/videos/${video2Id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        rejectionReason: '   '
      })
    });
    const rejectNoReasonData = await rejectNoReasonRes.json();
    assert(
      rejectNoReasonRes.status === 400 && String(rejectNoReasonData.error || '').toLowerCase().includes('rejection reason is required'),
      'HTTP 400 Bad Request when Admin attempts rejection without providing a reason',
      `Status: ${rejectNoReasonRes.status}, Error: ${JSON.stringify(rejectNoReasonData)}`
    );

    // Reject with proper feedback reason -> MUST SUCCEED (HTTP 200)
    const rejectionReasonText = 'Lighting in bathroom too dark; tap flow not shown clearly. Please re-shoot with bathroom light on.';
    const rejectValidRes = await fetch(`${API_HOST}/admin/videos/${video2Id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        rejectionReason: rejectionReasonText
      })
    });
    const rejectValidData = await rejectValidRes.json();
    assert(
      rejectValidRes.status === 200 && rejectValidData.success && rejectValidData.status === 'REJECTED',
      'HTTP 200 on Admin Video Rejection with valid reason',
      `Status: ${rejectValidRes.status}`
    );

    // Verify DB state after rejection
    const videoAfterReject = db.prepare('SELECT status, rejection_reason FROM four_k_videos WHERE id = ?').get(video2Id) as any;
    assert(
      videoAfterReject && videoAfterReject.status === 'REJECTED' && videoAfterReject.rejection_reason === rejectionReasonText,
      'Database status updated to REJECTED and rejection_reason accurately preserved'
    );

    const propAfterReject = db.prepare('SELECT has_4k_video, video_verification_status FROM properties WHERE id = ?').get(propA2.id) as any;
    assert(
      propAfterReject && propAfterReject.has_4k_video === 0 && propAfterReject.video_verification_status === 'REJECTED',
      'Property has_4k_video remains 0 and video_verification_status is set to REJECTED'
    );

    // Check rejection notification sent to Agent A
    const rejNotif = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? AND (title LIKE '%Rejected%' OR title LIKE '%Action Required%' OR message LIKE '%rejected%')
      ORDER BY rowid DESC LIMIT 1
    `).get(agentA.id) as any;
    assert(
      rejNotif != null && rejNotif.message.includes(rejectionReasonText),
      'In-app notification successfully dispatched to Agent Alpha containing exact rejection feedback',
      rejNotif ? `Message: ${rejNotif.message}` : 'No notification found'
    );

    // TEST 8: STUDENT UNAUTHORIZED ATTEMPT
    console.log('\n10. Testing Strict Role Security (Student calling Admin Video Endpoints)...');
    const studentVerifyRes = await fetch(`${API_HOST}/admin/videos/${video1Id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`
      },
      body: JSON.stringify({ notes: 'Student attempt' })
    });
    assert(
      studentVerifyRes.status === 403,
      'HTTP 403 Forbidden when Student attempts to call admin video verification endpoint',
      `Status: ${studentVerifyRes.status}`
    );

  } finally {
    // CLEANUP
    console.log('\n🧹 Cleaning up test database artifacts...');
    try {
      db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?, ?, ?)').run(agentA.id, agentB.id, admin.id, student.id);
      db.prepare('DELETE FROM four_k_videos WHERE agent_id IN (?, ?)').run(agentA.id, agentB.id);
      db.prepare('DELETE FROM property_media WHERE property_id IN (?, ?)').run(propA1.id, propA2.id);
      db.prepare('DELETE FROM properties WHERE id IN (?, ?)').run(propA1.id, propA2.id);
      db.prepare('DELETE FROM users WHERE id IN (?, ?, ?, ?)').run(agentA.id, agentB.id, admin.id, student.id);
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('Cleanup error (ignored):', cleanupErr);
    }
  }

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 4K VIDEO UPLOAD & ADMIN VERIFICATION TESTS PASSED PERFECTLY!\n');
    try { db.close(); } catch {}
    process.exit(0);
  } else {
    console.error('💥 SOME TESTS FAILED!\n');
    try { db.close(); } catch {}
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
