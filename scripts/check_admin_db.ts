import db from '../server/db.ts';

const admin = db.prepare("SELECT id, email, full_name, role, is_active FROM users WHERE role = 'ADMIN' OR role = 'OWNER'").all();
console.log('Admin users in database:', JSON.stringify(admin, null, 2));

const allUsers = db.prepare("SELECT id, email, full_name, role, is_active FROM users LIMIT 10").all();
console.log('Sample users in database:', JSON.stringify(allUsers, null, 2));
