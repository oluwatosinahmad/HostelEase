import db from '../server/db';
import { runSeed } from '../server/seed';

async function runPhase1Tests() {
  console.log('🧪 Starting Hostel Ease Phase 1 Automated End-to-End Test Suite...\n');

  // Reset database with fresh seeds
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
    const data = await res.json();
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
    // TEST SUITE 1: System & University Verification
    // ----------------------------------------------------
    console.log('\n--- 1. SYSTEM HEALTH & LAUTECH CONFIGURATION ---');
    const health = await apiCall('/health');
    assert(health.ok && health.data.platform === 'Hostel Ease', 'Platform identity is "Hostel Ease"');
    assert(health.data.university.includes('LAUTECH'), 'Launch market is LAUTECH, Ogbomoso, Oyo State');

    const areas = await apiCall('/areas');
    assert(areas.ok && areas.data.areas.length >= 6, 'LAUTECH accommodation areas returned', `Count: ${areas.data.areas.length}`);
    const underG = areas.data.areas.find((a: any) => a.slug === 'under-g');
    assert(Boolean(underG), 'Under G accommodation zone exists');

    // ----------------------------------------------------
    // TEST SUITE 2: Authentication & RBAC Foundation
    // ----------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION & ROLE-BASED ACCESS CONTROL ---');
    
    // Student Login
    const studentLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    assert(studentLogin.ok && studentLogin.data.user.role === 'STUDENT', 'Student demo login successful');
    const studentToken = studentLogin.data.token;

    // Provider Login
    const providerLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
    });
    assert(providerLogin.ok && providerLogin.data.user.role === 'PROVIDER', 'Provider demo login successful');
    const providerToken = providerLogin.data.token;

    // Admin Login
    const adminLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
    });
    assert(adminLogin.ok && adminLogin.data.user.role === 'ADMIN', 'Admin demo login successful');
    const adminToken = adminLogin.data.token;

    // New Student Registration
    const newStudentReg = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `teststudent_${Date.now()}@lautech.edu.ng`,
        password: 'Password123!',
        fullName: 'Folake Adeleke',
        phone: '+2348123456789',
        role: 'STUDENT',
        studentDetails: { matricNo: '20/5544', department: 'Pure & Applied Biology' }
      })
    });
    assert(newStudentReg.ok && newStudentReg.data.user.role === 'STUDENT', 'New student registration with matric & department');

    // Protected Route RBAC enforcement: Student cannot access Admin stats
    const studentAccessAdmin = await apiCall('/admin/stats', { token: studentToken });
    assert(studentAccessAdmin.status === 403, 'RBAC prevents student from accessing Admin portal (403 Forbidden)');

    // ----------------------------------------------------
    // TEST SUITE 3: Accommodation Search & Multi-Criteria Filtering
    // ----------------------------------------------------
    console.log('\n--- 3. ACCOMMODATION SEARCH, FILTERS & SORTING ---');
    
    // Standard Approved Search
    const searchAll = await apiCall('/properties');
    assert(searchAll.ok && searchAll.data.properties.length > 0, 'Properties fetched from database');
    assert(searchAll.data.properties.every((p: any) => p.isDemo === true), 'All seeded listings are explicitly marked isDemo = true');

    // Filter by Area: Under G
    const searchUnderG = await apiCall(`/properties?areaId=${underG.id}`);
    assert(searchUnderG.ok && searchUnderG.data.properties.every((p: any) => p.area.id === underG.id), 'Filter by Area (Under G)');

    // Filter by Price Range: Max 100,000
    const searchBudget = await apiCall('/properties?maxPrice=100000');
    assert(searchBudget.ok && searchBudget.data.properties.every((p: any) => p.priceSummary.rentAmount <= 100000), 'Filter by Maximum Price (<= ₦100,000)');

    // Filter by Distance from LAUTECH: Max 1.0 km
    const searchClose = await apiCall('/properties?maxDistance=1.0');
    assert(searchClose.ok && searchClose.data.properties.every((p: any) => p.distanceFromCampusKm <= 1.0), 'Filter by Distance (<= 1.0 km to LAUTECH)');

    // Filter by Facilities: Electricity + Water
    const searchFacilities = await apiCall('/properties?amenities=electricity,water');
    assert(searchFacilities.ok && searchFacilities.data.properties.length > 0, 'Filter by Facilities (Electricity + Borehole Water)');

    // Sort by Lowest Price
    const searchSortPrice = await apiCall('/properties?sortBy=price_asc');
    const prices = searchSortPrice.data.properties.map((p: any) => p.priceSummary.rentAmount);
    const isSortedAsc = prices.every((val: number, i: number, arr: number[]) => !i || arr[i - 1] <= val);
    assert(searchSortPrice.ok && isSortedAsc, 'Sort by Lowest Price (price_asc)');

    // ----------------------------------------------------
    // TEST SUITE 4: Property Details & Transparent Price Breakdown
    // ----------------------------------------------------
    console.log('\n--- 4. PROPERTY DETAILS & PRICE TRANSPARENCY ---');
    const firstProperty = searchAll.data.properties[0];
    const details = await apiCall(`/properties/${firstProperty.id}`);
    assert(details.ok && details.data.property.id === firstProperty.id, 'Retrieve comprehensive property details');

    const pData = details.data.property;
    assert(pData.prices && pData.prices.length > 0, 'Pricing breakdown records present');
    
    const priceRecord = pData.prices[0];
    assert(
      priceRecord.totalMandatoryCost === (priceRecord.rentAmount + priceRecord.serviceCharge + priceRecord.agencyFee + priceRecord.otherMandatoryCharges + priceRecord.legalFee),
      'Total Estimated Mandatory Cost mathematically matches Rent + Service + Agency + Other charges'
    );
    assert(priceRecord.totalRefundableCost === priceRecord.cautionFee, 'Caution fee categorized as Refundable');
    assert(pData.media && pData.media.length >= 2, 'Categorized media items present with captions');

    // ----------------------------------------------------
    // TEST SUITE 5: Shortlist (Saved Hostels)
    // ----------------------------------------------------
    console.log('\n--- 5. MY SAVED HOSTELS (SHORTLIST) ---');
    
    // Save Property
    const saveRes = await apiCall(`/properties/${firstProperty.id}/save`, {
      method: 'POST',
      token: studentToken,
      body: JSON.stringify({ notes: 'Top choice close to gate' })
    });
    assert(saveRes.ok && saveRes.data.isSaved === true, 'Student saves hostel to shortlist');

    // Fetch Saved Hostels
    const listSaved = await apiCall('/saved-properties', { token: studentToken });
    assert(listSaved.ok && listSaved.data.savedProperties.some((p: any) => p.id === firstProperty.id), 'Shortlist contains saved hostel');

    // Unsave Property
    const unsaveRes = await apiCall(`/properties/${firstProperty.id}/save`, {
      method: 'DELETE',
      token: studentToken
    });
    assert(unsaveRes.ok && unsaveRes.data.isSaved === false, 'Student removes hostel from shortlist');

    // ----------------------------------------------------
    // TEST SUITE 6: Inspection Request Workflow
    // ----------------------------------------------------
    console.log('\n--- 6. INSPECTION REQUEST WORKFLOW (PHYSICAL & VIRTUAL) ---');
    
    // Submit Physical Inspection
    const inspReq = await apiCall(`/inspections/properties/${firstProperty.id}`, {
      method: 'POST',
      token: studentToken,
      body: JSON.stringify({
        inspectionType: 'PHYSICAL',
        preferredDate: '2026-08-30',
        preferredTime: '14:00 (Afternoon)',
        studentPhone: '+2348031234567',
        notes: 'Check ensuite bathroom and meter'
      })
    });
    assert(inspReq.ok && inspReq.data.inspectionId, 'Student schedules Physical Inspection tour');
    const inspectionId = inspReq.data.inspectionId;

    // Provider views inspection requests
    const providerInspections = await apiCall('/inspections', { token: providerToken });
    assert(providerInspections.ok && providerInspections.data.inspections.some((i: any) => i.id === inspectionId), 'Provider receives inspection request');

    // Provider confirms inspection slot
    const confirmInsp = await apiCall(`/inspections/${inspectionId}/status`, {
      method: 'PATCH',
      token: providerToken,
      body: JSON.stringify({
        status: 'CONFIRMED',
        providerResponse: 'Confirmed. Ask for Chief Adeleke at lodge gate.'
      })
    });
    assert(confirmInsp.ok, 'Provider confirms inspection slot with arrival directions');

    // ----------------------------------------------------
    // TEST SUITE 7: Student Reporting & Moderation
    // ----------------------------------------------------
    console.log('\n--- 7. REPORTING SUSPICIOUS LISTINGS & MODERATION ---');
    
    const reportSubmit = await apiCall(`/reports/properties/${firstProperty.id}`, {
      method: 'POST',
      token: studentToken,
      body: JSON.stringify({
        reason: 'WRONG_PRICE',
        description: 'Landlord mentioned slightly higher price on phone'
      })
    });
    assert(reportSubmit.ok && reportSubmit.data.reportId, 'Student submits listing report');
    const reportId = reportSubmit.data.reportId;

    // Admin views reports
    const adminReports = await apiCall('/reports', { token: adminToken });
    assert(adminReports.ok && adminReports.data.reports.some((r: any) => r.id === reportId), 'Admin receives student listing report in queue');

    // Admin resolves report
    const resolveReport = await apiCall(`/reports/${reportId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        status: 'RESOLVED',
        adminActionNotes: 'Spoke with landlord; confirmed price in agreement.',
        suspendListing: false
      })
    });
    assert(resolveReport.ok, 'Admin audits and resolves listing report');

    // ----------------------------------------------------
    // TEST SUITE 8: Provider Portal (Listing Creation & Availability)
    // ----------------------------------------------------
    console.log('\n--- 8. PROVIDER PORTAL (LISTINGS & AVAILABILITY) ---');
    
    // Create new listing
    const newListing = await apiCall('/provider/properties', {
      method: 'POST',
      token: providerToken,
      body: JSON.stringify({
        title: 'Adeleke Royal Villa (Demo Listing)',
        areaId: underG.id,
        description: 'Spacious self-contain with running water and perimeter fencing near LAUTECH.',
        address: 'Plot 8, Under G Axis, Ogbomoso',
        nearbyLandmark: 'Opposite Bovas Station',
        distanceFromCampusKm: 0.6,
        propertyType: 'SELF_CONTAIN',
        genderPreference: 'ANY',
        totalRooms: 12,
        pricing: {
          period: 'YEARLY',
          rentAmount: 190000,
          serviceCharge: 15000,
          agencyFee: 15000,
          cautionFee: 10000,
          otherMandatoryCharges: 5000,
          notes: 'Standard annual contract'
        },
        amenityKeys: ['electricity', 'water', 'security', 'kitchen'],
        mediaItems: [
          { type: 'IMAGE', cat: 'EXTERIOR', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5', isCover: true }
        ]
      })
    });
    assert(newListing.ok && newListing.data.propertyId, 'Provider creates new accommodation listing');
    const newPropId = newListing.data.propertyId;

    // Toggle availability
    const toggleAvail = await apiCall(`/provider/properties/${newPropId}/availability`, {
      method: 'PATCH',
      token: providerToken,
      body: JSON.stringify({ availabilityStatus: 'LIMITED' })
    });
    assert(toggleAvail.ok, 'Provider updates availability status to LIMITED');

    // ----------------------------------------------------
    // TEST SUITE 9: Admin Portal Moderation & Approval
    // ----------------------------------------------------
    console.log('\n--- 9. ADMIN PORTAL MODERATION & APPROVAL ---');
    
    const adminStats = await apiCall('/admin/stats', { token: adminToken });
    assert(adminStats.ok && adminStats.data.stats.totalHostels >= 7, 'Admin statistics reflect total platform hostels');

    // Admin approves newly submitted listing
    const approveListing = await apiCall(`/admin/properties/${newPropId}/verification`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({ status: 'APPROVED', isFeatured: true })
    });
    assert(approveListing.ok, 'Admin verifies and approves new listing with "Hostel Ease Verified" badge');

    console.log(`\n==================================================`);
    console.log(`🎯 TEST RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runPhase1Tests();
