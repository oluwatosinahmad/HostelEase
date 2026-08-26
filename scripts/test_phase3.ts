import db from '../server/db.js';
import { parseNaturalLanguageQuery, calculateMatchScore } from '../server/routes/discoveryRoutes.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('🧪 HOSTEL EASE — PHASE 3 SMART DISCOVERY & MAPS TEST SUITE');
  console.log('   Market: LAUTECH (Ladoke Akintola University of Technology)');
  console.log('   Location: Ogbomoso, Oyo State, Nigeria');
  console.log('================================================================\n');

  // Test 1: Natural Language Search Parsing
  console.log('--- TEST GROUP 1: SMART NATURAL LANGUAGE QUERY PARSING ---');
  const areas = db.prepare('SELECT id, name, slug FROM areas').all() as any[];

  // 1.1 Budget intent
  const q1 = parseNaturalLanguageQuery('Hostels under ₦200,000 near LAUTECH', areas);
  assert(q1.interpretedFilters.maxPrice === 200000, 'Under ₦200,000 parsed correctly as maxPrice: 200000');
  assert(q1.interpretedFilters.maxDistance === 1.0, '"near LAUTECH" parsed as maxDistance: 1.0km');
  assert(q1.explanation.length >= 2, 'Explanation provided for both budget and proximity');

  // 1.2 "k" shorthand budget & solar
  const q2 = parseNaturalLanguageQuery('Female hostel under 180k with solar inverter', areas);
  assert(q2.interpretedFilters.maxPrice === 180000, '180k parsed as maxPrice: 180000');
  assert(q2.interpretedFilters.genderPreference === 'FEMALE_ONLY', 'Female hostel parsed as FEMALE_ONLY');
  assert(q2.interpretedFilters.facilities.includes('inverter'), 'Solar inverter parsed into facilities array');

  // 1.3 Area and Room type
  const q3 = parseNaturalLanguageQuery('Under G self-contain with borehole water', areas);
  assert(Boolean(q3.interpretedFilters.areaId), 'Under G matched to valid areaId');
  assert(q3.interpretedFilters.roomType === 'SELF_CONTAIN', 'Self-contain parsed as SELF_CONTAIN');
  assert(q3.interpretedFilters.facilities.includes('water'), 'Borehole water parsed into facilities array');

  // 1.4 Single room budget
  const q4 = parseNaturalLanguageQuery('cheap single room within 500m of campus', areas);
  assert(q4.interpretedFilters.maxPrice === 140000, '"cheap" sets budget cap to ₦140,000');
  assert(q4.interpretedFilters.roomType === 'SINGLE_ROOM', 'Single room parsed as SINGLE_ROOM');
  assert(q4.interpretedFilters.maxDistance === 0.5, '500m parsed as maxDistance: 0.5km');

  // Test 2: Database Grounding & No AI Hallucination
  console.log('\n--- TEST GROUP 2: DATABASE GROUNDING & CATALOG INTEGRITY ---');
  const allApproved = db.prepare(`
    SELECT p.id, p.title, p.latitude, p.longitude, p.distance_from_campus_km, pr.rent_amount
    FROM properties p
    JOIN prices pr ON pr.property_id = p.id
    WHERE p.verification_status = 'APPROVED'
  `).all() as any[];

  assert(allApproved.length >= 40, `Full approved catalog active: ${allApproved.length} hostels in DB`);

  const validCoordinates = allApproved.every(p => 
    typeof p.latitude === 'number' && p.latitude > 8.0 && p.latitude < 8.3 &&
    typeof p.longitude === 'number' && p.longitude > 4.1 && p.longitude < 4.4
  );
  assert(validCoordinates, 'All 40 hostels have accurate LAUTECH geographic coordinates');

  // Test 3: Interactive Map API Endpoints
  console.log('\n--- TEST GROUP 3: MAP MARKERS & CAMPUS LANDMARKS API ---');
  const apiBase = 'http://localhost:5000/api';

  try {
    const mapRes = await fetch(`${apiBase}/discovery/map-markers`);
    const mapData = await mapRes.json();

    assert(mapRes.status === 200, 'GET /api/discovery/map-markers returned HTTP 200');
    assert(mapData.campusCenter.lat === 8.1438 && mapData.campusCenter.lng === 4.2638, 'Campus center centered on LAUTECH Main Gate (8.1438, 4.2638)');
    assert(mapData.campusLandmarks.length === 6, 'All 6 LAUTECH campus reference landmarks included');
    assert(mapData.markers.length >= 40, `All ${mapData.markers.length} accommodation pins returned with price pills`);

    // Filtered Map Test
    const underGArea = areas.find(a => a.slug === 'under-g');
    if (underGArea) {
      const filteredMapRes = await fetch(`${apiBase}/discovery/map-markers?areaId=${underGArea.id}&maxPrice=250000`);
      const filteredMapData = await filteredMapRes.json();
      assert(filteredMapData.markers.length > 0 && filteredMapData.markers.length < mapData.markers.length, `Filtered map returns ${filteredMapData.markers.length} matching pins in Under G`);
    }
  } catch (err: any) {
    assert(false, `Map markers endpoint test error: ${err.message}`);
  }

  // Test 4: 4-Hostel Side-by-Side Comparison Tool
  console.log('\n--- TEST GROUP 4: 4-HOSTEL SIDE-BY-SIDE COMPARISON TOOL ---');
  const sample4Ids = allApproved.slice(0, 4).map(p => p.id);

  try {
    const compareRes = await fetch(`${apiBase}/discovery/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyIds: sample4Ids })
    });
    const compareData = await compareRes.json();

    assert(compareRes.status === 200, 'POST /api/discovery/compare returned HTTP 200');
    assert(compareData.hostels.length === 4, '4 hostels returned in comparison matrix');
    assert(Boolean(compareData.highlights.lowestPriceId), `Lowest price highlight computed: ID ${compareData.highlights.lowestPriceId}`);
    assert(Boolean(compareData.highlights.closestDistanceId), `Closest distance highlight computed: ID ${compareData.highlights.closestDistanceId}`);
    assert(Boolean(compareData.hostels[0].pricing.totalFirstYearEstimated), 'Total first year cost calculated for all compared hostels');
    assert(Boolean(compareData.hostels[0].facilitiesMap), 'Normalized boolean facilities map computed');

    // Reject > 4 hostels
    const sample5Ids = allApproved.slice(0, 5).map(p => p.id);
    const reject5Res = await fetch(`${apiBase}/discovery/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyIds: sample5Ids })
    });
    assert(reject5Res.status === 400, 'Comparison gracefully rejects > 4 hostels with HTTP 400');
  } catch (err: any) {
    assert(false, `Comparison endpoint test error: ${err.message}`);
  }

  // Test 5: Explainable Match Scoring & Recommendations
  console.log('\n--- TEST GROUP 5: TRANSPARENT RECOMMENDATION & MATCH SCORING ---');
  try {
    const recRes = await fetch(`${apiBase}/discovery/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget: 200000,
        maxDistance: 1.0,
        facilities: ['electricity', 'water', 'inverter'],
        genderPreference: 'ANY'
      })
    });
    const recData = await recRes.json();

    assert(recRes.status === 200, 'POST /api/discovery/recommendations returned HTTP 200');
    assert(recData.recommendations.length > 0, `Returned ${recData.recommendations.length} recommendations`);
    assert(recData.recommendations[0].matchScore >= recData.recommendations[recData.recommendations.length - 1].matchScore, 'Recommendations ranked in descending order of match score');
    assert(Boolean(recData.recommendations[0].matchExplanation), `Top recommendation has transparent explanation: "${recData.recommendations[0].matchExplanation}"`);
  } catch (err: any) {
    assert(false, `Recommendations endpoint test error: ${err.message}`);
  }

  // Test 6: Search History & Recently Viewed Persistence
  console.log('\n--- TEST GROUP 6: SEARCH HISTORY & RECENTLY VIEWED TRACKING ---');
  try {
    // Login as student
    const authRes = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
    });
    const authData = await authRes.json();
    const token = authData.token;

    assert(Boolean(token), 'Student logged in to test search history');

    // Smart search with auth
    await fetch(`${apiBase}/discovery/smart-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: 'Hostels under 150k near stadium road' })
    });

    // Check search history
    const histRes = await fetch(`${apiBase}/discovery/search-history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const histData = await histRes.json();
    assert(histData.history.length > 0, `Search query recorded in user history (Total: ${histData.history.length})`);
    assert(histData.history[0].query.includes('150k'), 'Most recent query preserved accurately');

    // Track recently viewed
    const targetProp = allApproved[0];
    const trackRes = await fetch(`${apiBase}/discovery/recently-viewed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ propertyId: targetProp.id })
    });
    assert(trackRes.status === 200, 'POST /api/discovery/recently-viewed recorded property view');

    const recentRes = await fetch(`${apiBase}/discovery/recently-viewed`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const recentData = await recentRes.json();
    assert(recentData.recentViews.length > 0, `Recently viewed list fetched (Total: ${recentData.recentViews.length})`);
    assert(recentData.recentViews[0].id === targetProp.id, 'Recently viewed list returns accurate property details');

    // Clear search history
    const clearRes = await fetch(`${apiBase}/discovery/search-history`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(clearRes.status === 200, 'DELETE /api/discovery/search-history cleared user history');
  } catch (err: any) {
    assert(false, `History tracking test error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed | ${failed} Failed`);
  if (failed === 0) {
    console.log('🏆 ALL PHASE 3 SMART DISCOVERY & MAP TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME PHASE 3 TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
  }
  console.log('================================================================\n');
}

runPhase3Tests();
