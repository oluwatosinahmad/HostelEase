import db from '../server/db';
import fs from 'fs';
import path from 'path';

function exportData() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
  console.log('Available tables in SQLite:', tables);

  const users = tables.includes('users') ? db.prepare('SELECT * FROM users').all().map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    passwordHash: u.password_hash,
    avatarUrl: u.avatar_url || '',
    isActive: u.is_active === 1,
    status: u.account_status || 'ACTIVE',
    department: u.department || '',
    level: u.level || '',
    matricNo: u.matric_no || '',
    gender: u.gender || '',
    isSuperAdmin: u.role === 'ADMIN' || u.role === 'SUPER_ADMIN',
    createdAt: u.created_at,
    updated_at: u.updated_at
  })) : [];

  const properties = tables.includes('properties') ? db.prepare('SELECT * FROM properties').all().map((p: any) => ({
    ...p,
    amenities: p.amenities ? (typeof p.amenities === 'string' ? JSON.parse(p.amenities) : p.amenities) : [],
    images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [],
    rules: p.rules ? (typeof p.rules === 'string' ? JSON.parse(p.rules) : p.rules) : [],
    bills_included: p.bills_included ? (typeof p.bills_included === 'string' ? JSON.parse(p.bills_included) : p.bills_included) : [],
    security_features: p.security_features ? (typeof p.security_features === 'string' ? JSON.parse(p.security_features) : p.security_features) : []
  })) : [];

  const areas = tables.includes('areas') ? db.prepare('SELECT * FROM areas').all() : [];
  const bookings = tables.includes('bookings') ? db.prepare('SELECT * FROM bookings').all() : [];

  const outDir = path.resolve('src/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    version: '2026.10',
    exportedAt: new Date().toISOString(),
    users,
    properties,
    areas,
    bookings
  };

  fs.writeFileSync(path.join(outDir, 'initialDataSnapshot.json'), JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Snapshot exported successfully: ${users.length} users, ${properties.length} properties, ${areas.length} areas, ${bookings.length} bookings.`);
}

exportData();
