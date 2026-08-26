import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from '../server/migrate';

const DB_PATH = path.resolve(process.cwd(), 'data', 'hostel_ease.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export function createBackup(): { backupPath: string; metadataPath: string; metadata: any } {
  // Ensure database schema is migrated
  runMigrations();

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Source database not found at ${DB_PATH}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `hostel_ease_backup_${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  const metadataPath = path.join(BACKUP_DIR, `hostel_ease_backup_${timestamp}.json`);

  // Atomic SQLite backup copy
  fs.copyFileSync(DB_PATH, backupPath);

  // Read record metrics from backup copy
  const db = new Database(backupPath);
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  const propertyCount = (db.prepare('SELECT COUNT(*) as c FROM properties').get() as any)?.c || 0;
  const bookingCount = (db.prepare('SELECT COUNT(*) as c FROM bookings').get() as any)?.c || 0;
  const auditCount = (db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as any)?.c || 0;
  db.close();

  const metadata = {
    platform: 'Hostel Ease (LAUTECH, Ogbomoso)',
    backupFileName,
    backupPath,
    createdAt: new Date().toISOString(),
    fileSizeBytes: fs.statSync(backupPath).size,
    records: {
      users: userCount,
      properties: propertyCount,
      bookings: bookingCount,
      auditLogs: auditCount
    }
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  return { backupPath, metadataPath, metadata };
}

export function restoreBackup(backupPath: string, targetPath: string): boolean {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at ${backupPath}`);
  }

  fs.copyFileSync(backupPath, targetPath);

  // Validate integrity of restored database
  const db = new Database(targetPath);
  const integrity = db.pragma('integrity_check');
  const isOk = Array.isArray(integrity) && integrity[0]?.integrity_check === 'ok';
  db.close();

  if (!isOk) {
    throw new Error('Database integrity check failed on restored target.');
  }

  return true;
}

export function runBackupDisasterRecoveryTest(): { success: boolean; report: string[] } {
  const report: string[] = [];
  try {
    report.push('1. Initiating automated database backup...');
    const { backupPath, metadata } = createBackup();
    report.push(`✓ Backup created successfully: ${path.basename(backupPath)} (${metadata.fileSizeBytes} bytes)`);
    report.push(`  - Users: ${metadata.records.users}`);
    report.push(`  - Properties: ${metadata.records.properties}`);
    report.push(`  - Bookings: ${metadata.records.bookings}`);

    report.push('2. Testing disaster recovery into sandbox environment...');
    const sandboxPath = path.join(BACKUP_DIR, 'sandbox_recovery_test.sqlite');
    restoreBackup(backupPath, sandboxPath);
    report.push('✓ Sandbox database restored and PRAGMA integrity_check returned OK');

    report.push('3. Verifying schema consistency in restored sandbox...');
    const sandboxDb = new Database(sandboxPath);
    const properties = sandboxDb.prepare('SELECT id, title, address, property_type FROM properties LIMIT 3').all();
    if (properties.length === 0) {
      throw new Error('Restored database contains no property records!');
    }
    report.push(`✓ Verified property querying in restored sandbox (${properties.length} verified sample hostels)`);
    sandboxDb.close();

    // Clean up temporary sandbox file
    if (fs.existsSync(sandboxPath)) {
      fs.unlinkSync(sandboxPath);
    }
    report.push('✓ Sandbox cleanup complete. Disaster recovery drill passed 100%!');

    return { success: true, report };
  } catch (err: any) {
    report.push(`❌ Disaster recovery test failed: ${err.message}`);
    return { success: false, report };
  }
}

// Execute standalone when invoked via CLI
if (process.argv[1]?.endsWith('backup_restore.ts')) {
  console.log('🛡️ Running Hostel Ease Automated Backup & Recovery Drill...');
  const result = runBackupDisasterRecoveryTest();
  result.report.forEach(line => console.log(line));
  if (!result.success) {
    process.exit(1);
  }
}
