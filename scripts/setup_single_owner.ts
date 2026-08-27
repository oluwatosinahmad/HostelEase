import bcrypt from 'bcryptjs';
import db from '../server/db.js';
import { runMigrations } from '../server/migrate.js';

export function configureSingleOwner(options?: { name?: string; email?: string; password?: string }) {
  console.log('\n===============================================================');
  console.log('👑 HOSTEL EASE V1 — SINGLE OWNER ADMIN ACCOUNT SETUP');
  console.log('📍 Focus: Exactly ONE Authorized Owner & Super Admin in Database');
  console.log('===============================================================\n');

  // Ensure migrations are up to date
  runMigrations();

  const ownerName = options?.name || process.env.ADMIN_NAME || 'Oluwatosin Ahmad';
  const ownerEmail = (options?.email || process.env.ADMIN_EMAIL || 'admin@hostelease.ng').toLowerCase().trim();
  const ownerPassword = options?.password || process.env.ADMIN_PASSWORD || 'Admin123!';

  if (!ownerEmail || !ownerEmail.includes('@')) {
    console.error('❌ Error: A valid email address is required.');
    process.exit(1);
  }

  if (ownerPassword.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters.');
    process.exit(1);
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(ownerPassword, salt);
  const ownerId = 'user-admin-1';

  db.transaction(() => {
    // 1. Delete any other admin profiles and users except ownerId
    db.prepare("DELETE FROM admin_profiles WHERE user_id != ? AND user_id IN (SELECT id FROM users WHERE role = 'ADMIN')").run(ownerId);
    db.prepare("DELETE FROM users WHERE id != ? AND (role = 'ADMIN' OR role = 'OWNER')").run(ownerId);

    // 2. Insert or update the single owner record
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(ownerId);
    if (existing) {
      db.prepare(`
        UPDATE users
        SET email = ?, password_hash = ?, full_name = ?, role = 'ADMIN', is_active = 1, phone = '+2348004678353'
        WHERE id = ?
      `).run(ownerEmail, passwordHash, ownerName, ownerId);
    } else {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
        VALUES (?, ?, ?, ?, '+2348004678353', 'ADMIN', 1)
      `).run(ownerId, ownerEmail, passwordHash, ownerName);
    }

    // 3. Upsert admin profile
    const existingProfile = db.prepare('SELECT id FROM admin_profiles WHERE user_id = ?').get(ownerId);
    if (existingProfile) {
      db.prepare(`
        UPDATE admin_profiles
        SET admin_role = 'SUPER_ADMIN', permissions_json = ?, is_super_admin = 1
        WHERE user_id = ?
      `).run(JSON.stringify(['*']), ownerId);
    } else {
      db.prepare(`
        INSERT INTO admin_profiles (id, user_id, admin_role, permissions_json, is_super_admin)
        VALUES ('admin-prof-owner', ?, 'SUPER_ADMIN', ?, 1)
      `).run(ownerId, JSON.stringify(['*']));
    }
  })();

  console.log('✅ Single Owner Admin Account successfully configured and secured in database:');
  console.log(`   👑 Owner Name:   ${ownerName}`);
  console.log(`   📧 Owner Email:  ${ownerEmail}`);
  console.log(`   🛡️  Role:         OWNER / SUPER_ADMIN (Sole Platform Administrator)`);
  console.log(`   🔒 Password:     Stored as secure bcrypt hash`);
  console.log(`   ⚡ Status:       ACTIVE`);
  console.log('\n🔒 Zero other Admin accounts exist. All unauthorized attempts are strictly rejected.\n');
}

// Support CLI execution
const args = process.argv.slice(2);
let customName: string | undefined;
let customEmail: string | undefined;
let customPassword: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name' && args[i + 1]) customName = args[++i];
  if (args[i] === '--email' && args[i + 1]) customEmail = args[++i];
  if (args[i] === '--password' && args[i + 1]) customPassword = args[++i];
}

configureSingleOwner({ name: customName, email: customEmail, password: customPassword });
