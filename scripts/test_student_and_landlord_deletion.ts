import fs from 'fs';
import path from 'path';
import db from '../server/db.js';
import { userDeletionService } from '../server/services/userDeletionService.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const VERIF_DIR = path.join(UPLOADS_DIR, 'verification_documents');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VERIF_DIR)) fs.mkdirSync(VERIF_DIR, { recursive: true });

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runTest() {
  console.log('================================================================');
  console.log('STARTING RIGOROUS STUDENT & LANDLORD PERMANENT DELETION TEST');
  console.log('================================================================\n');

  const adminId = 'usr-admin-master';
  const landlordId = `usr-landlord-test-${Date.now()}`;
  const studentId = `usr-student-test-${Date.now()}`;
  const propId = `prop-test-${Date.now()}`;
  const roomId = `room-test-${Date.now()}`;
  const bedspaceId = `bed-test-${Date.now()}`;
  const bookingId = `book-test-${Date.now()}`;
  const mediaImgId = `media-img-${Date.now()}`;
  const mediaVidId = `media-vid-${Date.now()}`;
  const docId = `doc-test-${Date.now()}`;
  const moveInPhotoId = `photo-test-${Date.now()}`;

  // Unique file names
  const landlordAvatarName = `landlord_av_${Date.now()}.png`;
  const landlordCoverName = `landlord_cov_${Date.now()}.jpg`;
  const landlordRoomImgName = `landlord_rm_${Date.now()}.jpg`;
  const landlordVideoName = `landlord_4k_${Date.now()}.mp4`;
  const landlordThumbName = `landlord_thumb_${Date.now()}.jpg`;
  const landlordDocName = `verif_landlord_${Date.now()}.pdf`;

  const studentAvatarName = `student_av_${Date.now()}.png`;
  const studentMoveInPhotoName = `student_movein_${Date.now()}.jpg`;

  // Create physical test files on disk
  fs.writeFileSync(path.join(UPLOADS_DIR, landlordAvatarName), 'fake-avatar-data');
  fs.writeFileSync(path.join(UPLOADS_DIR, landlordCoverName), 'fake-cover-data');
  fs.writeFileSync(path.join(UPLOADS_DIR, landlordRoomImgName), 'fake-room-img-data');
  fs.writeFileSync(path.join(UPLOADS_DIR, landlordVideoName), 'fake-4k-video-data');
  fs.writeFileSync(path.join(UPLOADS_DIR, landlordThumbName), 'fake-thumbnail-data');
  fs.writeFileSync(path.join(VERIF_DIR, landlordDocName), 'fake-landlord-doc-pdf');

  fs.writeFileSync(path.join(UPLOADS_DIR, studentAvatarName), 'fake-student-avatar');
  fs.writeFileSync(path.join(UPLOADS_DIR, studentMoveInPhotoName), 'fake-student-movein-photo');

  // Verify all files were created on disk
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordAvatarName)), 'Landlord avatar created on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordCoverName)), 'Landlord cover created on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordRoomImgName)), 'Landlord room photo created on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordVideoName)), 'Landlord 4K video created on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordThumbName)), 'Landlord video thumb created on disk');
  assert(fs.existsSync(path.join(VERIF_DIR, landlordDocName)), 'Landlord verification doc created on disk in verification_documents/');
  assert(fs.existsSync(path.join(UPLOADS_DIR, studentAvatarName)), 'Student avatar created on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, studentMoveInPhotoName)), 'Student move-in photo created on disk');

  console.log('\n--- Seeding Test Records in SQLite ---');
  // 1. Create Landlord
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url, account_status)
    VALUES (?, ?, 'hash', 'Test Landlord Deletion', '08011112222', 'PROVIDER', ?, 'ACTIVE')
  `).run(landlordId, `landlord_${Date.now()}@example.com`, `/uploads/${landlordAvatarName}`);

  db.prepare(`
    INSERT INTO provider_profiles (id, user_id, business_name, provider_type, verification_status)
    VALUES (?, ?, 'Test Lodge Ventures', 'HOSTEL_OWNER', 'VERIFIED')
  `).run(`prof-${landlordId}`, landlordId);

  // 2. Create Landlord Property
  const universityId = (db.prepare('SELECT id FROM universities LIMIT 1').get() as any)?.id || 'uni-lautech';
  const areaId = (db.prepare('SELECT id FROM areas LIMIT 1').get() as any)?.id || 'area-under-g';

  db.prepare(`
    INSERT INTO properties (id, provider_id, university_id, area_id, title, slug, description, address, distance_from_campus_km, property_type, cover_image, verification_status, availability_status, total_rooms)
    VALUES (?, ?, ?, ?, 'Test Villa Suites', ?, 'Luxury suites', 'Under-G Road', 0.8, 'SELF_CONTAIN', ?, 'APPROVED', 'AVAILABLE', 2)
  `).run(propId, landlordId, universityId, areaId, `slug-${Date.now()}`, `/uploads/${landlordCoverName}`);

  // 3. Create Rooms & Bedspaces
  db.prepare(`
    INSERT INTO rooms (id, property_id, room_name, room_type, max_occupants, quantity_total, quantity_available, occupied_count, status)
    VALUES (?, ?, 'Executive Suite A', 'SELF_CONTAIN', 2, 2, 1, 1, 'AVAILABLE')
  `).run(roomId, propId);

  db.prepare(`
    INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
    VALUES (?, ?, 'Bed 1', 1, 'OCCUPIED')
  `).run(bedspaceId, roomId);

  db.prepare(`
    INSERT INTO bedspaces (id, room_id, bedspace_number, is_occupied, status)
    VALUES (?, ?, 'Bed 2', 0, 'AVAILABLE')
  `).run(`bed-free-${Date.now()}`, roomId);

  // 4. Create Media & Documents for Landlord
  db.prepare(`
    INSERT INTO property_media (id, property_id, media_type, url, thumbnail_url, display_order)
    VALUES (?, ?, 'IMAGE', ?, NULL, 0)
  `).run(mediaImgId, propId, `/uploads/${landlordRoomImgName}`);

  db.prepare(`
    INSERT INTO property_media (id, property_id, media_type, url, thumbnail_url, display_order)
    VALUES (?, ?, 'VIDEO', ?, ?, 1)
  `).run(mediaVidId, propId, `/uploads/${landlordVideoName}`, `/uploads/${landlordThumbName}`);

  db.prepare(`
    INSERT INTO verification_documents (id, provider_id, property_id, document_type, file_url, filename, mime_type, status)
    VALUES (?, ?, ?, 'PROOF_OF_OWNERSHIP', ?, ?, 'application/pdf', 'APPROVED')
  `).run(docId, landlordId, propId, `/uploads/verification_documents/${landlordDocName}`, landlordDocName);

  // 5. Create Student
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url, account_status)
    VALUES (?, ?, 'hash', 'Test Student Occupant', '08099998888', 'STUDENT', ?, 'ACTIVE')
  `).run(studentId, `student_${Date.now()}@example.com`, `/uploads/${studentAvatarName}`);

  db.prepare(`
    INSERT INTO student_profiles (id, user_id, university_id, matric_no, department)
    VALUES (?, ?, ?, '19/40KA/9999', 'Computer Science')
  `).run(`sprof-${studentId}`, studentId, universityId);

  // 6. Create Student Booking occupying the Bedspace
  db.prepare(`
    INSERT INTO bookings (id, booking_reference, student_id, provider_id, property_id, room_id, bedspace_id, rent_amount, total_cost, status, move_in_date, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 150000, 165000, 'CONFIRMED', '2026-10-01', '2026-10-15T00:00:00Z')
  `).run(bookingId, `REF-${Date.now()}`, studentId, landlordId, propId, roomId, bedspaceId);

  // 7. Create Student Move-in record & photo, saved hostel, inspection request, notification
  const moveInRecordId = `minrec-${Date.now()}`;
  db.prepare(`
    INSERT INTO move_in_records (id, booking_id, student_id, provider_id, property_id, room_id, bedspace_id, move_in_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, '2026-10-01', 'MOVED_IN')
  `).run(moveInRecordId, bookingId, studentId, landlordId, propId, roomId, bedspaceId);

  db.prepare(`
    INSERT INTO move_in_photos (id, move_in_record_id, booking_id, uploader_id, photo_url, category)
    VALUES (?, ?, ?, ?, ?, 'ROOM_CONDITION')
  `).run(moveInPhotoId, moveInRecordId, bookingId, studentId, `/uploads/${studentMoveInPhotoName}`);

  db.prepare(`
    INSERT INTO saved_properties (id, user_id, property_id)
    VALUES (?, ?, ?)
  `).run(`saved-${Date.now()}`, studentId, propId);

  db.prepare(`
    INSERT INTO inspection_requests (id, student_id, property_id, inspection_type, preferred_date, preferred_time, status)
    VALUES (?, ?, ?, 'PHYSICAL', '2026-10-01', '10:00 AM', 'PENDING')
  `).run(`insp-${Date.now()}`, studentId, propId);

  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (?, ?, 'Welcome', 'Welcome to HostelEase', 'SYSTEM')
  `).run(`notif-${Date.now()}`, studentId);

  console.log('\n================================================================');
  console.log('PHASE 1: PERMANENTLY DELETING STUDENT ACCOUNT');
  console.log('================================================================\n');

  // Verify pre-deletion summary for student
  const studentSummary = userDeletionService.getUserDeletionSummary(studentId);
  assert(studentSummary.bookingsCount === 1, 'Student summary records 1 booking');
  assert(studentSummary.savedHostelsCount === 1, 'Student summary records 1 saved hostel');
  assert(studentSummary.inspectionsCount === 1, 'Student summary records 1 inspection request');

  // Execute Student Permanent Deletion
  const studentDelResult = userDeletionService.deleteUserPermanently(studentId, adminId, 'Automated Student Deletion Test');
  assert(studentDelResult.success === true, 'Student deletion returned success');

  // 1. Verify Student Account and Records are PERMANENTLY ERASED
  const deletedStudentUser = db.prepare('SELECT id FROM users WHERE id = ?').get(studentId);
  assert(!deletedStudentUser, 'Student user record completely removed from users table');

  const deletedStudentProfile = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(studentId);
  assert(!deletedStudentProfile, 'Student profile completely removed');

  const deletedStudentBookings = db.prepare('SELECT id FROM bookings WHERE student_id = ?').all(studentId);
  assert(deletedStudentBookings.length === 0, 'Student bookings completely removed');

  const deletedStudentSaved = db.prepare('SELECT id FROM saved_properties WHERE user_id = ?').all(studentId);
  assert(deletedStudentSaved.length === 0, 'Student saved properties completely removed');

  const deletedStudentInspections = db.prepare('SELECT id FROM inspection_requests WHERE student_id = ?').all(studentId);
  assert(deletedStudentInspections.length === 0, 'Student inspections completely removed');

  // 2. Verify Student Storage Files are Deleted from disk
  assert(!fs.existsSync(path.join(UPLOADS_DIR, studentAvatarName)), 'Student avatar physically deleted from disk');
  assert(!fs.existsSync(path.join(UPLOADS_DIR, studentMoveInPhotoName)), 'Student move-in photo physically deleted from disk');

  // 3. CRITICAL: Verify Bedspace Occupancy was RELEASED and CAPACITY RESTORED
  const releasedBedspace = db.prepare('SELECT is_occupied, status FROM bedspaces WHERE id = ?').get(bedspaceId) as any;
  assert(releasedBedspace !== undefined, 'Landlord bedspace still exists');
  assert(releasedBedspace.is_occupied === 0, 'Bedspace is_occupied was reset to 0');
  assert(releasedBedspace.status === 'AVAILABLE', 'Bedspace status was restored to AVAILABLE');

  const restoredRoom = db.prepare('SELECT quantity_available, occupied_count, status FROM rooms WHERE id = ?').get(roomId) as any;
  assert(restoredRoom.occupied_count === 0, 'Room occupied_count was decremented to 0');
  assert(restoredRoom.quantity_available === 2, 'Room quantity_available was restored to full capacity (2)');
  assert(restoredRoom.status === 'AVAILABLE', 'Room status is AVAILABLE');

  // 4. CRITICAL: Verify Landlord Data was NOT Corrupted or Deleted
  const preservedLandlord = db.prepare('SELECT id FROM users WHERE id = ?').get(landlordId);
  assert(Boolean(preservedLandlord), 'Landlord user record is 100% SAFE and untouched');

  const preservedProp = db.prepare('SELECT id, availability_status FROM properties WHERE id = ?').get(propId) as any;
  assert(Boolean(preservedProp), 'Landlord property is 100% SAFE and untouched');
  assert(preservedProp.availability_status === 'AVAILABLE', 'Landlord property availability is AVAILABLE');

  const preservedMedia = db.prepare('SELECT id FROM property_media WHERE property_id = ?').all(propId);
  assert(preservedMedia.length === 2, 'Landlord property media (image & 4K video) remains 100% intact');

  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordCoverName)), 'Landlord cover image still safely on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordRoomImgName)), 'Landlord room photo still safely on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordVideoName)), 'Landlord 4K video still safely on disk');
  assert(fs.existsSync(path.join(UPLOADS_DIR, landlordThumbName)), 'Landlord video thumb still safely on disk');
  assert(fs.existsSync(path.join(VERIF_DIR, landlordDocName)), 'Landlord verification document still safely on disk');

  console.log('\n================================================================');
  console.log('PHASE 2: PERMANENTLY DELETING LANDLORD ACCOUNT');
  console.log('================================================================\n');

  // Verify pre-deletion summary for landlord
  const landlordSummary = userDeletionService.getUserDeletionSummary(landlordId);
  assert(landlordSummary.hostelsCount === 1, 'Landlord summary records 1 hostel');
  assert(landlordSummary.roomsCount === 1, 'Landlord summary records 1 room');
  assert(landlordSummary.mediaCount === 2, 'Landlord summary records 2 media items');
  assert(landlordSummary.videosCount === 1, 'Landlord summary records 1 video');

  // Execute Landlord Permanent Deletion
  const landlordDelResult = userDeletionService.deleteUserPermanently(landlordId, adminId, 'Automated Landlord Deletion Test');
  assert(landlordDelResult.success === true, 'Landlord deletion returned success');
  assert(landlordDelResult.deletedHostelsCount === 1, 'Deleted hostels count is 1');

  // 1. Verify Landlord Account and Profile are completely removed
  const deletedLandlordUser = db.prepare('SELECT id FROM users WHERE id = ?').get(landlordId);
  assert(!deletedLandlordUser, 'Landlord user record completely removed from users table');

  const deletedLandlordProfile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ?').get(landlordId);
  assert(!deletedLandlordProfile, 'Landlord profile completely removed');

  // 2. Verify Landlord Properties, Rooms, and Bedspaces are completely removed
  const deletedProp = db.prepare('SELECT id FROM properties WHERE id = ?').get(propId);
  assert(!deletedProp, 'Landlord property completely removed from properties table');

  const deletedRooms = db.prepare('SELECT id FROM rooms WHERE property_id = ?').all(propId);
  assert(deletedRooms.length === 0, 'Landlord rooms completely removed');

  const deletedBedspaces = db.prepare('SELECT id FROM bedspaces WHERE room_id = ?').all(roomId);
  assert(deletedBedspaces.length === 0, 'Landlord bedspaces completely removed');

  const deletedMedia = db.prepare('SELECT id FROM property_media WHERE property_id = ?').all(propId);
  assert(deletedMedia.length === 0, 'Landlord property_media completely removed');

  const deletedDocs = db.prepare('SELECT id FROM verification_documents WHERE provider_id = ?').all(landlordId);
  assert(deletedDocs.length === 0, 'Landlord verification_documents completely removed');

  // 3. Verify ALL Landlord Storage Files are Physically Removed from Disk (No Orphaned Files)
  assert(!fs.existsSync(path.join(UPLOADS_DIR, landlordAvatarName)), 'Landlord avatar physically removed from disk');
  assert(!fs.existsSync(path.join(UPLOADS_DIR, landlordCoverName)), 'Landlord cover image physically removed from disk');
  assert(!fs.existsSync(path.join(UPLOADS_DIR, landlordRoomImgName)), 'Landlord room photo physically removed from disk');
  assert(!fs.existsSync(path.join(UPLOADS_DIR, landlordVideoName)), 'Landlord 4K video physically removed from disk');
  assert(!fs.existsSync(path.join(UPLOADS_DIR, landlordThumbName)), 'Landlord video thumbnail physically removed from disk');
  assert(!fs.existsSync(path.join(VERIF_DIR, landlordDocName)), 'Landlord verification document in subfolder physically removed from disk');

  console.log('\n================================================================');
  console.log('ALL VERIFICATIONS PASSED: 100% COMPLETE & ATOMIC DATA CLEANUP');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
