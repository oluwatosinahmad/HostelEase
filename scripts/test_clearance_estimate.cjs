const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/hostel_ease.db'));

console.log('Testing record counts for scopes:');
const scopes = ['hostels', 'videos', 'pending', 'users', 'providers', 'bookings', 'verification', 'video_tours', 'disputes', 'all'];

for (const scope of scopes) {
  let count = 0;
  if (scope === 'hostels') {
    const props = db.prepare('SELECT count(*) as c FROM properties').get().c;
    const rooms = db.prepare('SELECT count(*) as c FROM rooms').get().c;
    const media = db.prepare('SELECT count(*) as c FROM property_media').get().c;
    console.log(`hostels: ${props} properties, ${rooms} rooms, ${media} media`);
  } else if (scope === 'videos' || scope === 'video_tours') {
    const vids = db.prepare('SELECT count(*) as c FROM four_k_videos').get().c;
    const pVids = db.prepare("SELECT count(*) as c FROM property_media WHERE media_type = 'VIDEO' OR category = 'VIDEO_WALKTHROUGH'").get().c;
    console.log(`${scope}: ${vids} 4K videos, ${pVids} property video media`);
  } else if (scope === 'pending') {
    const pProps = db.prepare("SELECT count(*) as c FROM properties WHERE verification_status IN ('PENDING_REVIEW', 'PENDING')").get().c;
    const pDocs = db.prepare("SELECT count(*) as c FROM verification_documents WHERE status = 'PENDING'").get().c;
    console.log(`pending: ${pProps} pending properties, ${pDocs} pending docs`);
  } else if (scope === 'users') {
    const nonAdmin = db.prepare("SELECT count(*) as c FROM users WHERE role != 'ADMIN'").get().c;
    console.log(`users: ${nonAdmin} non-admin users`);
  } else if (scope === 'providers') {
    const provs = db.prepare("SELECT count(*) as c FROM users WHERE role = 'PROVIDER'").get().c;
    console.log(`providers: ${provs} providers`);
  } else if (scope === 'bookings') {
    const bks = db.prepare('SELECT count(*) as c FROM bookings').get().c;
    const ins = db.prepare('SELECT count(*) as c FROM inspection_requests').get().c;
    const pays = db.prepare('SELECT count(*) as c FROM payments').get().c;
    console.log(`bookings: ${bks} bookings, ${ins} inspections, ${pays} payments`);
  } else if (scope === 'verification') {
    const vDocs = db.prepare('SELECT count(*) as c FROM verification_documents').get().c;
    console.log(`verification: ${vDocs} verification docs`);
  } else if (scope === 'disputes') {
    const disps = db.prepare('SELECT count(*) as c FROM disputes').get().c;
    const reps = db.prepare('SELECT count(*) as c FROM listing_reports').get().c;
    console.log(`disputes: ${disps} disputes, ${reps} reports`);
  }
}
