/**
 * Automated Verification: Dual-Agent Security Isolation & Network Performance Benchmark
 * Tests Agent A vs Agent B data isolation across all provider endpoints,
 * verifies chunked upload and measures response latency.
 */

import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const API_HOST = 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🛡️  HOSTEL EASE DUAL-AGENT SECURITY ISOLATION & PERFORMANCE TEST');
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

  // 1. SETUP DUAL AGENTS
  console.log('1. Setting up Agent Alpha and Agent Bravo in database...');
  const agentA = {
    id: `usr-agent-alpha-${Date.now()}`,
    email: `agent_alpha_${Date.now()}@test.com`,
    fullName: 'Agent Alpha Adeleke',
    role: 'PROVIDER' as const,
    phone: '08030000001',
    isActive: 1
  };

  const agentB = {
    id: `usr-agent-bravo-${Date.now()}`,
    email: `agent_bravo_${Date.now()}@test.com`,
    fullName: 'Agent Bravo Bello',
    role: 'PROVIDER' as const,
    phone: '08030000002',
    isActive: 1
  };

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'dummy_hash', ?, ?, 'PROVIDER', 1, datetime('now'))
  `).run(agentA.id, agentA.email, agentA.fullName, agentA.phone);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, created_at)
    VALUES (?, ?, 'dummy_hash', ?, ?, 'PROVIDER', 1, datetime('now'))
  `).run(agentB.id, agentB.email, agentB.fullName, agentB.phone);

  const tokenA = generateToken(agentA);
  const tokenB = generateToken(agentB);

  console.log(`  Agent A: ${agentA.fullName} (${agentA.id})`);
  console.log(`  Agent B: ${agentB.fullName} (${agentB.id})\n`);

  // 2. CREATE AGENT A PROPERTY, ROOM, BEDSPACE
  console.log('2. Provisioning Agent A Property & Inventory...');
  const propAId = `prop-alpha-${Date.now()}`;
  const roomAId = `room-alpha-${Date.now()}`;
  const bedAId = `bed-alpha-${Date.now()}`;

  db.prepare(`
    INSERT INTO properties (id, provider_id, university_id, title, slug, description, address, area_id, distance_from_campus_km, property_type, gender_preference, total_rooms, verification_status, availability_status, created_at)
    VALUES (?, ?, 'uni-lautech-ogbomoso', 'Alpha Luxury Hostel', 'alpha-luxury-hostel', 'Agent Alpha exclusive hostel', '1 Alpha Road, Under-G', 'area-under-g', 0.5, 'SELF_CONTAIN', 'ANY', 5, 'APPROVED', 'AVAILABLE', datetime('now'))
  `).run(propAId, agentA.id);

  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
    VALUES (?, ?, 'Executive Suite Alpha', 'SELF_CONTAIN', 1, 1, 1, 0, 1, 1, 'AVAILABLE')
  `).run(roomAId, propAId);

  db.prepare(`
    INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
    VALUES (?, ?, 'Space A1', 0, 'AVAILABLE')
  `).run(bedAId, roomAId);

  db.prepare(`
    INSERT INTO prices (id, property_id, rent_amount, service_charge, agency_fee, caution_fee, total_mandatory_cost)
    VALUES (?, ?, 250000, 15000, 20000, 15000, 300000)
  `).run(`price-alpha-${Date.now()}`, propAId);

  // 3. CREATE AGENT B PROPERTY, ROOM, BEDSPACE
  console.log('3. Provisioning Agent B Property & Inventory...');
  const propBId = `prop-bravo-${Date.now()}`;
  const roomBId = `room-bravo-${Date.now()}`;
  const bedBId = `bed-bravo-${Date.now()}`;

  db.prepare(`
    INSERT INTO properties (id, provider_id, university_id, title, slug, description, address, area_id, distance_from_campus_km, property_type, gender_preference, total_rooms, verification_status, availability_status, created_at)
    VALUES (?, ?, 'uni-lautech-ogbomoso', 'Bravo Royale Villa', 'bravo-royale-villa', 'Agent Bravo exclusive hostel', '2 Bravo Way, Adenike', 'area-adenike', 0.8, 'FLAT', 'ANY', 8, 'APPROVED', 'AVAILABLE', datetime('now'))
  `).run(propBId, agentB.id);

  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, is_ensuite, is_furnished, status)
    VALUES (?, ?, 'Deluxe Flat Bravo', 'FLAT', 2, 2, 2, 0, 1, 1, 'AVAILABLE')
  `).run(roomBId, propBId);

  db.prepare(`
    INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
    VALUES (?, ?, 'Space B1', 0, 'AVAILABLE')
  `).run(bedBId, roomBId);

  db.prepare(`
    INSERT INTO prices (id, property_id, rent_amount, service_charge, agency_fee, caution_fee, total_mandatory_cost)
    VALUES (?, ?, 350000, 25000, 30000, 20000, 425000)
  `).run(`price-bravo-${Date.now()}`, propBId);

  console.log('  Properties & Inventory created.\n');

  // 4. TEST SUITE 1: LISTING QUERY ISOLATION
  console.log('4. Testing Portal Listing Data Isolation...');
  const resPropsA = await fetch(`${API_HOST}/provider/properties`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const dataPropsA = await resPropsA.json();
  const listA = dataPropsA.properties || [];

  assert(
    listA.some((p: any) => p.id === propAId) && !listA.some((p: any) => p.id === propBId),
    'Agent A only sees Property A (Property B is strictly hidden)',
    `Returned IDs: ${listA.map((p: any) => p.id).join(', ')}`
  );

  const resPropsB = await fetch(`${API_HOST}/provider/properties`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const dataPropsB = await resPropsB.json();
  const listB = dataPropsB.properties || [];

  assert(
    listB.some((p: any) => p.id === propBId) && !listB.some((p: any) => p.id === propAId),
    'Agent B only sees Property B (Property A is strictly hidden)',
    `Returned IDs: ${listB.map((p: any) => p.id).join(', ')}`
  );

  // 5. TEST SUITE 2: FORBIDDEN CROSS-AGENT ACCESS (Agent A -> Property B)
  console.log('\n5. Testing Security Enforcement: Agent A attacking Agent B resources...');

  // A -> B Rooms
  const resAtoBRooms = await fetch(`${API_HOST}/provider/properties/${propBId}/rooms`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBRooms.status === 403, 'GET /properties/:id/rooms returns 403 Forbidden for unauthorized agent');

  // A -> B Edit Property
  const resAtoBEdit = await fetch(`${API_HOST}/provider/properties/${propBId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ title: 'Hacked Title By Agent A' })
  });
  assert(resAtoBEdit.status === 403, 'PUT /properties/:id returns 403 Forbidden for unauthorized agent');

  // A -> B Delete Property
  const resAtoBDelete = await fetch(`${API_HOST}/provider/properties/${propBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBDelete.status === 403, 'DELETE /properties/:id returns 403 Forbidden for unauthorized agent');

  // A -> B Price History
  const resAtoBPrice = await fetch(`${API_HOST}/provider/properties/${propBId}/price-history`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBPrice.status === 403, 'GET /properties/:id/price-history returns 403 Forbidden for unauthorized agent');

  // A -> B Availability
  const resAtoBAvail = await fetch(`${API_HOST}/provider/properties/${propBId}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ availabilityStatus: 'UNAVAILABLE' })
  });
  assert(resAtoBAvail.status === 403, 'PATCH /properties/:id/availability returns 403 Forbidden for unauthorized agent');

  // A -> B Calendar
  const resAtoBCalendar = await fetch(`${API_HOST}/provider/calendar?propertyId=${propBId}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBCalendar.status === 403, 'GET /calendar?propertyId=:id returns 403 Forbidden for unauthorized agent');

  // A -> B Dashboard
  const resAtoBDash = await fetch(`${API_HOST}/provider/dashboard?propertyId=${propBId}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBDash.status === 403, 'GET /dashboard?propertyId=:id returns 403 Forbidden for unauthorized agent');

  // A -> B Room Modification
  const resAtoBRoomEdit = await fetch(`${API_HOST}/provider/rooms/${roomBId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ roomName: 'Malicious Rename' })
  });
  assert(resAtoBRoomEdit.status === 403, 'PUT /rooms/:roomId returns 403 Forbidden for unauthorized agent');

  // A -> B Room Deletion
  const resAtoBRoomDel = await fetch(`${API_HOST}/provider/rooms/${roomBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(resAtoBRoomDel.status === 403, 'DELETE /rooms/:roomId returns 403 Forbidden for unauthorized agent');

  // A -> B Bedspace Toggle
  const resAtoBBedEdit = await fetch(`${API_HOST}/provider/rooms/${roomBId}/bedspaces/${bedBId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ status: 'OCCUPIED' })
  });
  assert(resAtoBBedEdit.status === 403, 'PUT /rooms/:roomId/bedspaces/:bedId returns 403 Forbidden for unauthorized agent');

  // 6. TEST SUITE 3: RECIPROCAL ENFORCEMENT (Agent B -> Property A)
  console.log('\n6. Testing Reciprocal Security: Agent B attacking Agent A resources...');

  const resBtoARooms = await fetch(`${API_HOST}/provider/properties/${propAId}/rooms`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(resBtoARooms.status === 403, 'GET /properties/:id/rooms returns 403 Forbidden for Agent B accessing Agent A');

  const resBtoAEdit = await fetch(`${API_HOST}/provider/properties/${propAId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ title: 'Hacked Title By Agent B' })
  });
  assert(resBtoAEdit.status === 403, 'PUT /properties/:id returns 403 Forbidden for Agent B modifying Agent A');

  const resBtoADelete = await fetch(`${API_HOST}/provider/properties/${propAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(resBtoADelete.status === 403, 'DELETE /properties/:id returns 403 Forbidden for Agent B deleting Agent A');

  // 7. TEST SUITE 4: CHUNKED RESUMABLE UPLOAD PIPELINE
  console.log('\n7. Testing Chunked Resumable Video Upload Pipeline...');
  const uploadSessionId = `test-session-${Date.now()}`;
  const chunk1Data = Buffer.from('TEST_VIDEO_CHUNK_1_'.repeat(100));
  const chunk2Data = Buffer.from('TEST_VIDEO_CHUNK_2_'.repeat(100));

  // Chunk 1 of 2
  const formChunk1 = new FormData();
  formChunk1.append('chunk', new Blob([chunk1Data], { type: 'video/mp4' }), 'chunk_0.mp4');
  formChunk1.append('uploadId', uploadSessionId);
  formChunk1.append('chunkIndex', '0');
  formChunk1.append('totalChunks', '2');
  formChunk1.append('fileName', 'test_tour_walkthrough.mp4');
  formChunk1.append('fileType', 'video/mp4');

  const resChunk1 = await fetch(`${API_HOST}/upload/chunk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formChunk1
  });
  const dataChunk1 = await resChunk1.json();
  assert(
    resChunk1.status === 200 && dataChunk1.completed === false && dataChunk1.chunkIndex === 0,
    'Chunk 1/2 accepted, returning completed: false with progress'
  );

  // Chunk 2 of 2 with base64 thumbnail
  const sampleThumb = 'data:image/jpeg;base64,' + Buffer.from('SAMPLE_THUMBNAIL_BYTES').toString('base64');
  const formChunk2 = new FormData();
  formChunk2.append('chunk', new Blob([chunk2Data], { type: 'video/mp4' }), 'chunk_1.mp4');
  formChunk2.append('uploadId', uploadSessionId);
  formChunk2.append('chunkIndex', '1');
  formChunk2.append('totalChunks', '2');
  formChunk2.append('fileName', 'test_tour_walkthrough.mp4');
  formChunk2.append('fileType', 'video/mp4');
  formChunk2.append('thumbnailDataUrl', sampleThumb);

  const resChunk2 = await fetch(`${API_HOST}/upload/chunk`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formChunk2
  });
  const dataChunk2 = await resChunk2.json();
  assert(
    resChunk2.status === 201 && dataChunk2.completed === true && dataChunk2.file?.url?.startsWith('/uploads/'),
    'Chunk 2/2 successfully assembled into final video on server with permanent URL',
    JSON.stringify(dataChunk2)
  );

  // Clean up test uploaded file
  if (dataChunk2.file?.filename) {
    const uploadFilePath = path.resolve(process.cwd(), 'uploads', dataChunk2.file.filename);
    try {
      if (fs.existsSync(uploadFilePath)) fs.unlinkSync(uploadFilePath);
    } catch {}
  }

  // 8. TEST SUITE 5: NETWORK PERFORMANCE BENCHMARK
  console.log('\n8. Running Performance Latency Benchmarks (5 runs each)...');

  // Benchmark A: Provider Properties
  const propTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await fetch(`${API_HOST}/provider/properties`, { headers: { Authorization: `Bearer ${tokenA}` } });
    propTimes.push(performance.now() - start);
  }
  const avgPropsTime = propTimes.reduce((a, b) => a + b, 0) / propTimes.length;
  console.log(`  📊 GET /api/provider/properties: avg ${avgPropsTime.toFixed(1)}ms [${propTimes.map(t => t.toFixed(0) + 'ms').join(', ')}]`);

  // Benchmark B: Provider Dashboard
  const dashTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await fetch(`${API_HOST}/provider/dashboard`, { headers: { Authorization: `Bearer ${tokenA}` } });
    dashTimes.push(performance.now() - start);
  }
  const avgDashTime = dashTimes.reduce((a, b) => a + b, 0) / dashTimes.length;
  console.log(`  📊 GET /api/provider/dashboard: avg ${avgDashTime.toFixed(1)}ms [${dashTimes.map(t => t.toFixed(0) + 'ms').join(', ')}]`);

  // Benchmark C: Public Properties Catalog
  const catTimes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await fetch(`${API_HOST}/properties`);
    catTimes.push(performance.now() - start);
  }
  const avgCatTime = catTimes.reduce((a, b) => a + b, 0) / catTimes.length;
  console.log(`  📊 GET /api/properties: avg ${avgCatTime.toFixed(1)}ms [${catTimes.map(t => t.toFixed(0) + 'ms').join(', ')}]`);

  assert(avgPropsTime < 60, `Provider properties API responded with high-performance latency (avg ${avgPropsTime.toFixed(1)}ms < 60ms)`);
  assert(avgDashTime < 60, `Provider dashboard API responded with high-performance latency (avg ${avgDashTime.toFixed(1)}ms < 60ms)`);

  // 9. CLEAN UP TEST USERS & PROPERTIES
  console.log('\n9. Cleaning up test data...');
  db.prepare('DELETE FROM bedspaces WHERE id IN (?, ?)').run(bedAId, bedBId);
  db.prepare('DELETE FROM rooms WHERE id IN (?, ?)').run(roomAId, roomBId);
  db.prepare('DELETE FROM prices WHERE property_id IN (?, ?)').run(propAId, propBId);
  db.prepare('DELETE FROM properties WHERE id IN (?, ?)').run(propAId, propBId);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(agentA.id, agentB.id);
  console.log('  Cleaned up temporary test entities.');

  console.log('\n================================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL SECURITY ISOLATION & PERFORMANCE BENCHMARKS PASSED!');
  } else {
    console.error('❌ SOME TESTS FAILED. Check details above.');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
