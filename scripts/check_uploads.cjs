const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, '../data/hostel_ease.db'));
const uploadDir = path.join(__dirname, '../uploads');

const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
console.log(`Total files in uploads/: ${files.length}`);

// Sample first 10 files
console.log('Sample files:', files.slice(0, 10));

// Count media in database
const propMedia = db.prepare("SELECT count(*) as c FROM property_media WHERE url LIKE '%/uploads/%' OR url NOT LIKE 'http%'").get().c;
const fourKVideos = db.prepare("SELECT count(*) as c FROM four_k_videos WHERE video_url LIKE '%/uploads/%' OR video_url NOT LIKE 'http%'").get().c;
const verifDocs = db.prepare("SELECT count(*) as c FROM verification_documents WHERE file_url LIKE '%/uploads/%' OR file_url NOT LIKE 'http%'").get().c;

console.log({ propMedia, fourKVideos, verifDocs });
