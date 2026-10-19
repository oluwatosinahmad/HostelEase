import db from '../server/db';

const dups = db.prepare('SELECT LOWER(TRIM(email)) as em, COUNT(*) as cnt FROM users GROUP BY LOWER(TRIM(email)) HAVING cnt > 1').all();
console.log('Duplicate emails in users table:', dups);

const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
console.log('Total users in database:', totalUsers.cnt);

const sampleUsers = db.prepare('SELECT id, email, role, full_name FROM users LIMIT 5').all();
console.log('Sample users:', sampleUsers);

const cols = db.pragma('table_info(users)');
console.log('Users table columns:', cols.map((c: any) => `${c.name} (${c.type}, notnull=${c.notnull})`));

const studentCols = db.pragma('table_info(student_profiles)');
console.log('Student profiles columns:', studentCols.map((c: any) => `${c.name} (${c.type}, notnull=${c.notnull})`));

const emailVerifExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_verifications'").get();
console.log('email_verifications table exists:', Boolean(emailVerifExists));

const passwordResetsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='password_resets'").get();
console.log('password_resets table exists:', Boolean(passwordResetsExists));

const userIndexes = db.prepare("PRAGMA index_list('users')").all();
console.log('Users indexes:', userIndexes);

