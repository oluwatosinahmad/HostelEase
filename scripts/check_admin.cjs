const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/hostel_ease.db'));

const admins = db.prepare("SELECT id, email, role, full_name FROM users WHERE role='ADMIN'").all();
console.log('Admins found:', admins);
