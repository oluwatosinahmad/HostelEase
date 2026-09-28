async function runVerification() {
  console.log('🧪 Starting E2E Central Database Hostel Booking Status Verification...\n');

  const API_BASE = 'http://localhost:5000/api';

  // 1. Health check
  const healthRes = await fetch(`${API_BASE}/health`);
  const health = await healthRes.json();
  console.log('✅ Server Health Check:', health.status, '| DB:', health.database);

  // Pick unbooked property
  const testPropertyId = 'prop-tour-1790589733871';
  const roomId = 'room-tour-1-1790589733871';

  // 2. Fetch homepage properties
  const propsRes = await fetch(`${API_BASE}/properties`);
  const propsData = await propsRes.json();
  const testPropBefore = propsData.properties.find((p: any) => p.id === testPropertyId);

  if (!testPropBefore) {
    throw new Error(`❌ FAILED: Property ${testPropertyId} not found in /properties`);
  }

  console.log(`\n--- STEP 1: Initial Property State (No active bookings) ---`);
  console.log(`Property: "${testPropBefore.title}" (${testPropBefore.id})`);
  console.log(`isBooked:`, testPropBefore.isBooked);
  console.log(`bookingStatus:`, testPropBefore.bookingStatus);
  console.log(`availabilityStatus:`, testPropBefore.availabilityStatus);
  console.log(`activeBookingCount:`, testPropBefore.activeBookingCount);

  if (testPropBefore.isBooked !== false || testPropBefore.bookingStatus !== 'AVAILABLE') {
    throw new Error('❌ FAILED: Expected property to be AVAILABLE before booking');
  }
  console.log('✅ STEP 1 PASSED: Property is correctly AVAILABLE in central DB.');

  // 3. Log in as student 1
  const student1Email = `student1_${Date.now()}@lautech.edu.ng`;
  const regRes1 = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: student1Email,
      password: 'StudentPassword123!',
      fullName: 'Aisha Bello',
      role: 'STUDENT',
      phone: '08099887766'
    })
  });
  const regData1 = await regRes1.json();
  const student1Token = regData1.token;
  console.log('\n--- STEP 2: Authenticated as Student 1 ---', regData1.user.fullName);

  // 4. Student 1 books the hostel
  console.log('\n--- STEP 3: Student 1 Books Hostel ---');
  const bookRes1 = await fetch(`${API_BASE}/bookings/reserve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student1Token}`
    },
    body: JSON.stringify({
      propertyId: testPropertyId,
      roomId: roomId,
      moveInDate: '2026-10-15',
      academicSession: '2026/2027',
      durationMonths: 12
    })
  });

  const bookData1 = await bookRes1.json();
  console.log('Booking response status:', bookRes1.status);
  console.log('Booking Reference:', bookData1.bookingReference, '| Booking ID:', bookData1.bookingId);

  if (bookRes1.status !== 201 && bookRes1.status !== 200) {
    throw new Error(`❌ FAILED: Booking creation failed: ${JSON.stringify(bookData1)}`);
  }
  console.log('✅ STEP 3 PASSED: Booking recorded in central database.');

  // 5. Query Homepage Properties list (simulates student viewing homepage after booking)
  console.log('\n--- STEP 4: Query Homepage Properties List from Central DB ---');
  const propsResAfter = await fetch(`${API_BASE}/properties`);
  const propsDataAfter = await propsResAfter.json();
  const testPropAfter = propsDataAfter.properties.find((p: any) => p.id === testPropertyId);

  console.log(`Property: "${testPropAfter.title}"`);
  console.log(`isBooked:`, testPropAfter.isBooked);
  console.log(`bookingStatus:`, testPropAfter.bookingStatus);
  console.log(`availabilityStatus:`, testPropAfter.availabilityStatus);
  console.log(`activeBookingCount:`, testPropAfter.activeBookingCount);

  if (testPropAfter.isBooked !== true || testPropAfter.bookingStatus !== 'BOOKED' || testPropAfter.availabilityStatus !== 'BOOKED') {
    throw new Error(`❌ FAILED: Expected property to be BOOKED on homepage list, got: ${JSON.stringify(testPropAfter)}`);
  }
  console.log('✅ STEP 4 PASSED: Homepage card immediately reflects BOOKED from real DB data.');

  // 6. Query Single Property Detail endpoint
  console.log('\n--- STEP 5: Query Single Property Details ---');
  const detailRes = await fetch(`${API_BASE}/properties/${testPropertyId}`);
  const detailData = await detailRes.json();
  console.log(`Detail isBooked:`, detailData.property.isBooked);
  console.log(`Detail bookingStatus:`, detailData.property.bookingStatus);
  console.log(`Detail availabilityStatus:`, detailData.property.availabilityStatus);

  if (detailData.property.isBooked !== true || detailData.property.bookingStatus !== 'BOOKED') {
    throw new Error('❌ FAILED: Expected property detail to be BOOKED');
  }
  console.log('✅ STEP 5 PASSED: Hostel details page reflects BOOKED.');

  // 7. Student 2 tries to book the same already-booked hostel
  console.log('\n--- STEP 6: Student 2 Attempts to Book Already Booked Hostel ---');
  const student2Email = `student2_${Date.now()}@lautech.edu.ng`;
  const regRes2 = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: student2Email,
      password: 'StudentPassword123!',
      fullName: 'Segun Olawale',
      role: 'STUDENT',
      phone: '08122334455'
    })
  });
  const regData2 = await regRes2.json();
  const student2Token = regData2.token;

  const bookRes2 = await fetch(`${API_BASE}/bookings/reserve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student2Token}`
    },
    body: JSON.stringify({
      propertyId: testPropertyId,
      roomId: roomId,
      moveInDate: '2026-10-20',
      academicSession: '2026/2027',
      durationMonths: 12
    })
  });

  const bookData2 = await bookRes2.json();
  console.log('Student 2 booking attempt HTTP status:', bookRes2.status);
  console.log('Student 2 error response:', bookData2.error);

  if (bookRes2.status !== 409) {
    throw new Error(`❌ FAILED: Expected HTTP 409 Conflict, got: ${bookRes2.status}`);
  }
  console.log('✅ STEP 6 PASSED: Duplicate booking rejected with HTTP 409 Conflict ("' + bookData2.error + '").');

  // 8. Student 1 cancels the booking -> property should become AVAILABLE again
  console.log('\n--- STEP 7: Student 1 Cancels Booking -> Reverts to AVAILABLE ---');
  const cancelRes = await fetch(`${API_BASE}/bookings/${bookData1.bookingId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student1Token}`
    },
    body: JSON.stringify({ reason: 'Found alternative closer to my department' })
  });
  const cancelData = await cancelRes.json();
  console.log('Cancellation status:', cancelRes.status, cancelData);

  // Check homepage properties again
  const propsResReverted = await fetch(`${API_BASE}/properties`);
  const propsDataReverted = await propsResReverted.json();
  const testPropReverted = propsDataReverted.properties.find((p: any) => p.id === testPropertyId);

  console.log(`Reverted Property: "${testPropReverted.title}"`);
  console.log(`isBooked:`, testPropReverted.isBooked);
  console.log(`bookingStatus:`, testPropReverted.bookingStatus);
  console.log(`availabilityStatus:`, testPropReverted.availabilityStatus);
  console.log(`activeBookingCount:`, testPropReverted.activeBookingCount);

  if (testPropReverted.isBooked !== false || testPropReverted.bookingStatus !== 'AVAILABLE') {
    throw new Error('❌ FAILED: Expected property to revert to AVAILABLE after cancellation');
  }
  console.log('✅ STEP 7 PASSED: Property successfully reverted from Booked to Available.');

  console.log('\n🎉 ALL E2E CENTRAL DATABASE BOOKING STATUS TESTS PASSED PERFECTLY!\n');
}

runVerification()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  });
