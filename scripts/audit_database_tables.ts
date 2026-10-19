import db from '../server/db';
const admins = db.prepare("SELECT id, email, full_name, role FROM users WHERE role = 'ADMIN'").all();
console.log('Admin accounts in database:');
console.log(JSON.stringify(admins, null, 2));
