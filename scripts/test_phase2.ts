import db from '../server/db.js';
import { runSeed } from '../server/seed.js';

async function runPhase2Tests() {
  console.log('🧪 Starting Hostel Ease Phase 2 Automated End-to-End Test Suite...\n');

  // Reset database with fresh Phase 2 seeds
  runSeed();

  const BASE_URL = 'http://localhost:5000/api';

  async function apiCall(path: string, options: any = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: Provider Registration & Profile Foundation
    // ----------------------------------------------------
    console.log('\n--- 1. PROVIDER REGISTRATION & ONBOARDING ---');
    
    const newProviderEmail = `landlord_${Date.now()}@ogbomoso.ng`;
    const regRes = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: newProviderEmail,
        password: 'Landlord123!',
        fullName: 'Alhaji Rasheed Alabi',
        phone: '+2348077788990',
        role: 'PROVIDER',
        providerDetails: {
          businessName: 'Alabi Student Accommodations Ltd',
          address: 'Stadium Road, Ogbomoso',
          idType: 'NIN_CARD'
        }
      })
    });
    assert(regRes.ok && regRes.data.user.role === 'PROVIDER', 'New accommodation provider registered successfully');
    const newProviderToken = regRes.data.token;
    const newProviderId = regRes.data.user.id;

    // Verify initial verification status is PENDING (not automatically verified)
    const newProvProfile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ?').get(newProviderId) as any;
    assert(newProvProfile && newProvProfile.verification_status === 'PENDING', 'New provider initial verification status is strictly PENDING');

    // Chief Adeleke (Verified Provider Login)
    const adelekeLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    assert(adelekeLogin.ok && adelekeLogin.data.user.role === 'PROVIDER', 'Chief Adeleke (Landlord) logged in');
    const adelekeToken = adelekeLogin.data.token;
    const adelekeId = adelekeLogin.data.user.id;

    // Student Login
    const studentLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    const studentToken = studentLogin.data.token;

    // Admin Login
    const adminLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    const adminToken = adminLogin.data.token;

    // ----------------------------------------------------
    // TEST SUITE 2: Provider Dashboard KPIs
    // ----------------------------------------------------
    console.log('\n--- 2. PROVIDER DASHBOARD STATS ---');
    const statsRes = await apiCall('/provider/dashboard/stats', { token: adelekeToken });
    assert(statsRes.ok, 'Provider dashboard statistics endpoint reachable');
    assert(statsRes.data.stats.totalHostels >= 1, 'Total hostels tracked for landlord');
    assert(statsRes.data.stats.availableRooms >= 1, 'Available rooms/spaces calculated');
    assert(statsRes.data.stats.providerVerificationStatus === 'VERIFIED', 'Chief Adeleke verified provider status reflected');

    // ----------------------------------------------------
    // TEST SUITE 3: Duplicate Hostel Protection
    // ----------------------------------------------------
    console.log('\n--- 3. DUPLICATE HOSTEL DETECTION ---');
    const dupCheck = await apiCall('/provider/properties/check-duplicate', {
      method: 'POST',
      token: adelekeToken,
      body: JSON.stringify({
        title: 'Under G Royal Self-Contain Suites',
        areaId: 'area-under-g'
      })
    });
    assert(dupCheck.ok && dupCheck.data.isDuplicate === true, 'Duplicate detection warns when hostel title exists in the same area');

    const noDupCheck = await apiCall('/provider/properties/check-duplicate', {
      method: 'POST',
      token: adelekeToken,
      body: JSON.stringify({
        title: 'Completely Unique New Lodge 99',
        areaId: 'area-under-g'
      })
    });
    assert(noDupCheck.ok && noDupCheck.data.isDuplicate === false, 'Duplicate detection passes for distinct hostel');

    // ----------------------------------------------------
    // TEST SUITE 4: 8-Step Wizard & Save Draft / Submit
    // ----------------------------------------------------
    console.log('\n--- 4. 8-STEP HOSTEL CREATION WIZARD & DRAFT SAVING ---');
    
    // Save as DRAFT
    const draftRes = await apiCall('/provider/properties', {
      method: 'POST',
      token: newProviderToken,
      body: JSON.stringify({
        title: 'Alabi Sunshine Lodge (Draft)',
        areaId: 'area-stadium-road',
        description: 'Incomplete lodge draft description',
        address: 'Stadium Road, Ogbomoso',
        distanceFromCampusKm: 0.9,
        propertyType: 'SINGLE_ROOM',
        genderPreference: 'ANY',
        totalRooms: 6,
        isDraft: true,
        pricing: {
          period: 'YEARLY',
          rentAmount: 130000,
          serviceCharge: 10000,
          agencyFee: 10000,
          cautionFee: 10000,
          otherMandatoryCharges: 5000
        },
        amenityKeys: ['electricity', 'water'],
        mediaItems: []
      })
    });
    assert(draftRes.ok && draftRes.data.propertyId, 'Hostel saved as DRAFT successfully');
    const draftPropId = draftRes.data.propertyId;

    const draftPropInDb = db.prepare('SELECT * FROM properties WHERE id = ?').get(draftPropId) as any;
    assert(draftPropInDb.verification_status === 'DRAFT', 'Property verification status is strictly DRAFT in database');

    // Submit Complete Listing for Review (PENDING_REVIEW)
    const submitRes = await apiCall('/provider/properties', {
      method: 'POST',
      token: newProviderToken,
      body: JSON.stringify({
        title: 'Alabi Executive Palms',
        areaId: 'area-under-g',
        description: 'Brand new luxury self-contain rooms with dedicated borehole and generator.',
        address: 'Behind Bovas Station, Under G, Ogbomoso',
        nearbyLandmark: 'Opposite Bovas Fuel Station',
        distanceFromCampusKm: 0.5,
        propertyType: 'SELF_CONTAIN',
        genderPreference: 'ANY',
        totalRooms: 10,
        isDraft: false,
        pricing: {
          period: 'YEARLY',
          rentAmount: 200000,
          serviceCharge: 15000,
          agencyFee: 15000,
          cautionFee: 15000,
          otherMandatoryCharges: 5000,
          notes: 'Standard 1 year agreement'
        },
        amenityKeys: ['electricity', 'water', 'security', 'kitchen', 'inverter'],
        mediaItems: [
          { type: 'IMAGE', cat: 'EXTERIOR', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5', isCover: true, caption: 'Front View' },
          { type: 'IMAGE', cat: 'BEDROOM', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af', isCover: false, caption: 'Ensuite Room' },
          { type: 'IMAGE', cat: 'BATHROOM', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a', isCover: false, caption: 'Bathroom' },
          { type: 'IMAGE', cat: 'KITCHEN', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f', isCover: false, caption: 'Kitchenette' },
          { type: 'VIDEO', cat: 'VIDEO_WALKTHROUGH', url: 'https://assets.mixkit.co/videos/preview/mixkit-tour-43288.mp4', isCover: false, caption: 'Video Tour' }
        ],
        roomsList: [
          { name: 'Ground Floor Self-Contain', type: 'SELF_CONTAIN', maxOccupants: 1, total: 5, available: 5, isEnsuite: true, isFurnished: false },
          { name: 'First Floor Self-Contain', type: 'SELF_CONTAIN', maxOccupants: 1, total: 5, available: 3, isEnsuite: true, isFurnished: false }
        ]
      })
    });
    assert(submitRes.ok && submitRes.data.propertyId, 'Hostel submitted for Admin Verification (PENDING_REVIEW)');
    const submittedPropId = submitRes.data.propertyId;

    const submittedPropInDb = db.prepare('SELECT * FROM properties WHERE id = ?').get(submittedPropId) as any;
    assert(submittedPropInDb.verification_status === 'PENDING_REVIEW', 'Submitted hostel status is PENDING_REVIEW');
    assert(submittedPropInDb.completeness_score >= 80, `Listing completeness calculated (${submittedPropInDb.completeness_score}%)`);

    // ----------------------------------------------------
    // TEST SUITE 5: Room & Bedspace Management
    // ----------------------------------------------------
    console.log('\n--- 5. ROOMS & BEDSPACE FOUNDATION ---');
    const roomsRes = await apiCall(`/provider/properties/${submittedPropId}/rooms`, { token: newProviderToken });
    assert(roomsRes.ok && roomsRes.data.rooms.length === 2, 'Rooms created and retrieved');
    const firstRoom = roomsRes.data.rooms[0];
    assert(firstRoom.bedspaces && firstRoom.bedspaces.length >= 1, 'Individual bedspace records initialized for room');

    // ----------------------------------------------------
    // TEST SUITE 6: Price History Tracking
    // ----------------------------------------------------
    console.log('\n--- 6. PRICE HISTORY AUDIT TRAIL ---');
    
    // Update price on submitted property
    const priceUpdateRes = await apiCall(`/provider/properties/${submittedPropId}`, {
      method: 'PUT',
      token: newProviderToken,
      body: JSON.stringify({
        pricing: {
          rentAmount: 220000,
          serviceCharge: 15000,
          agencyFee: 15000,
          cautionFee: 15000,
          otherMandatoryCharges: 5000,
          changeReason: 'Installed new backup solar inverter on premises.'
        }
      })
    });
    assert(priceUpdateRes.ok, 'Provider updated accommodation rent');

    const historyRes = await apiCall(`/provider/properties/${submittedPropId}/price-history`, { token: newProviderToken });
    assert(historyRes.ok && historyRes.data.priceHistory.length >= 1, 'Price history record automatically logged');
    assert(historyRes.data.priceHistory[0].previousRent === 200000 && historyRes.data.priceHistory[0].newRent === 220000, 'Price change history accurately tracks ₦200,000 -> ₦220,000');

    // ----------------------------------------------------
    // TEST SUITE 7: Private Verification Document Security
    // ----------------------------------------------------
    console.log('\n--- 7. PRIVATE VERIFICATION DOCUMENT SECURITY ---');
    
    // Provider views own documents
    const ownDocs = await apiCall('/verification/documents', { token: adelekeToken });
    assert(ownDocs.ok && ownDocs.data.documents.length >= 1, 'Provider can view own uploaded verification documents');

    // Admin views provider's documents
    const adminDocs = await apiCall(`/verification/documents/admin/${adelekeId}`, { token: adminToken });
    assert(adminDocs.ok && adminDocs.data.documents.length >= 1, 'Admin can securely inspect landlord verification documents');

    // Student attempting to access admin documents endpoint is rejected
    const studentDocAccess = await apiCall(`/verification/documents/admin/${adelekeId}`, { token: studentToken });
    assert(studentDocAccess.status === 403, 'Students strictly prohibited from accessing landlord verification documents (403 Forbidden)');

    // ----------------------------------------------------
    // TEST SUITE 8: Admin Verification Center (Request Changes, Reject, Approve)
    // ----------------------------------------------------
    console.log('\n--- 8. ADMIN VERIFICATION CENTER & MODERATION ---');
    
    // Admin views Pending Hostels queue
    const pendingHostels = await apiCall('/admin/verification/hostels?status=PENDING_REVIEW', { token: adminToken });
    assert(pendingHostels.ok && pendingHostels.data.properties.some((p: any) => p.id === submittedPropId), 'Admin receives submitted listing in verification queue');

    // Admin Requests Changes (Action Required)
    const reqChanges = await apiCall(`/admin/verification/hostels/${submittedPropId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        status: 'PENDING_REVIEW',
        adminFeedbackNotes: 'Please confirm borehole pumping schedule and update gate pictures.'
      })
    });
    assert(reqChanges.ok, 'Admin requested changes with custom action required note');

    // Verify Provider received notification for changes requested
    const provNotifs = await apiCall('/notifications', { token: newProviderToken });
    assert(provNotifs.ok && provNotifs.data.notifications.some((n: any) => n.type === 'CHANGES_REQUESTED'), 'Provider received in-app notification for requested changes');

    // Admin Approves Property
    const approveProp = await apiCall(`/admin/verification/hostels/${submittedPropId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        status: 'APPROVED',
        isFeatured: true
      })
    });
    assert(approveProp.ok, 'Admin approved property with "Hostel Ease Verified" badge');

    // Admin Approves Provider
    const approveProv = await apiCall(`/admin/verification/providers/${newProviderId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        status: 'VERIFIED',
        adminFeedback: 'NIN and property management authorization verified.'
      })
    });
    assert(approveProv.ok, 'Admin verified provider account');

    // ----------------------------------------------------
    // TEST SUITE 9: Public Provider Profile (Privacy-Safe)
    // ----------------------------------------------------
    console.log('\n--- 9. PUBLIC LANDLORD PROFILE & STUDENT PRIVACY ---');
    const publicProfile = await apiCall(`/public/providers/${adelekeId}`);
    assert(publicProfile.ok, 'Public landlord profile retrieved');
    assert(publicProfile.data.provider.verificationStatus === 'VERIFIED', 'Public profile shows Verified Provider badge');
    assert(publicProfile.data.provider.properties.length >= 1, 'Public profile catalogs active approved hostels');
    assert(!publicProfile.data.provider.documents, 'Sensitive verification documents never leaked on public profile');
    assert(!publicProfile.data.provider.nin, 'National Identity / NIN never leaked on public profile');

    // ----------------------------------------------------
    // TEST SUITE 10: In-App Notifications Read State
    // ----------------------------------------------------
    console.log('\n--- 10. IN-APP NOTIFICATION SYSTEM ---');
    const notifs = await apiCall('/notifications', { token: adelekeToken });
    assert(notifs.ok && notifs.data.notifications.length >= 1, 'Notifications retrieved for landlord');
    
    const firstNotifId = notifs.data.notifications[0].id;
    const markOneRead = await apiCall(`/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      token: adelekeToken
    });
    assert(markOneRead.ok, 'Single notification marked as read');

    const markAllRead = await apiCall('/notifications/read-all', {
      method: 'PATCH',
      token: adelekeToken
    });
    assert(markAllRead.ok, 'All notifications marked as read');

    // ----------------------------------------------------
    // TEST SUITE 11: Audit Logging Verification
    // ----------------------------------------------------
    console.log('\n--- 11. AUDIT LOGGING OF SENSITIVE ACTIONS ---');
    const auditLogsRes = await apiCall('/admin/audit-logs', { token: adminToken });
    assert(auditLogsRes.ok && auditLogsRes.data.auditLogs.length >= 3, 'Audit logs recorded for provider and admin actions');

    // ----------------------------------------------------
    // TEST SUITE 12: Security & Provider Ownership Restrictions
    // ----------------------------------------------------
    console.log('\n--- 12. SECURITY & PROVIDER OWNERSHIP ENFORCEMENT ---');
    
    // New Provider attempts to modify Chief Adeleke's property (prop-1)
    const unauthorizedEdit = await apiCall('/provider/properties/prop-1', {
      method: 'PUT',
      token: newProviderToken,
      body: JSON.stringify({ title: 'Hacked Property Title' })
    });
    assert(unauthorizedEdit.status === 403, 'Provider cannot edit another provider’s hostel (403 Forbidden)');

    // Student attempts to access provider listings endpoint
    const studentProviderAccess = await apiCall('/provider/properties', { token: studentToken });
    assert(studentProviderAccess.status === 403, 'Student cannot access provider management endpoints (403 Forbidden)');

    console.log(`\n==================================================`);
    console.log(`🎯 PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Phase 2 test error:', err);
    process.exit(1);
  }
}

runPhase2Tests();
