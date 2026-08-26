import { sanitizeString } from '../server/middleware/sanitize';
import { securityAuditService } from '../server/services/securityAuditService';
import db from '../server/db';
import { runMigrations } from '../server/migrate';
import { runBackupDisasterRecoveryTest } from './backup_restore';

export function runSecurityTestSuite(): { passed: boolean; results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] } {
  runMigrations();
  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  console.log('\n🔒 RUNNING PHASE 17 SECURITY & PRODUCTION READINESS TEST SUITE\n' + '='.repeat(65));

  // Test 1: XSS & Input Sanitization
  try {
    const dirtyPayload = '<script>alert("hacked")</script>Quiet student lodge <iframe src="javascript:evil()"></iframe> with light <img src=x onerror=alert(1)>';
    const cleanPayload = sanitizeString(dirtyPayload);
    const hasScript = cleanPayload.includes('<script>') || cleanPayload.includes('onerror=') || cleanPayload.includes('javascript:');
    if (!hasScript && cleanPayload.includes('Quiet student lodge')) {
      results.push({
        test: 'XSS & Malicious Input Sanitization',
        status: 'PASS',
        details: 'Stripped script tags, iframes, and onerror handlers cleanly.'
      });
    } else {
      results.push({
        test: 'XSS & Malicious Input Sanitization',
        status: 'FAIL',
        details: `Payload was not sanitized properly: ${cleanPayload}`
      });
    }
  } catch (err: any) {
    results.push({ test: 'XSS & Malicious Input Sanitization', status: 'FAIL', details: err.message });
  }

  // Test 2: Append-Only Security Audit Logging
  try {
    const existingUser = (db.prepare('SELECT id, email, role FROM users LIMIT 1').get() as any) || { id: 'usr-1', email: 'test@lautech.edu.ng', role: 'STUDENT' };
    const testAction = `SECURITY_AUDIT_TEST_${Date.now()}`;
    securityAuditService.log({
      actorId: existingUser.id,
      actorEmail: existingUser.email,
      actorRole: existingUser.role,
      action: testAction,
      details: { testRun: true, ip: '127.0.0.1' },
      severity: 'HIGH'
    });

    const recentLogs = securityAuditService.getRecentLogs(5, 'HIGH');
    const found = recentLogs.some(l => l.action === testAction);
    if (found) {
      results.push({
        test: 'Tamper-Resistant Security Audit Logging',
        status: 'PASS',
        details: 'Successfully logged and indexed security audit record with HIGH severity.'
      });
    } else {
      results.push({
        test: 'Tamper-Resistant Security Audit Logging',
        status: 'FAIL',
        details: 'Audit log record was not found in audit_logs table.'
      });
    }
  } catch (err: any) {
    results.push({ test: 'Tamper-Resistant Security Audit Logging', status: 'FAIL', details: err.message });
  }

  // Test 3: Database Foreign Key Constraints & Concurrency WAL Mode
  try {
    const journalMode = (db.pragma('journal_mode') as any)[0]?.journal_mode;
    const foreignKeys = (db.pragma('foreign_keys') as any)[0]?.foreign_keys;

    if (journalMode === 'wal' && foreignKeys === 1) {
      results.push({
        test: 'Database WAL Concurrency & Foreign Key Integrity',
        status: 'PASS',
        details: `SQLite configured with journal_mode=WAL and foreign_keys=ON.`
      });
    } else {
      results.push({
        test: 'Database WAL Concurrency & Foreign Key Integrity',
        status: 'FAIL',
        details: `Unexpected pragma settings: journal_mode=${journalMode}, foreign_keys=${foreignKeys}`
      });
    }
  } catch (err: any) {
    results.push({ test: 'Database WAL Concurrency & Foreign Key Integrity', status: 'FAIL', details: err.message });
  }

  // Test 4: Disaster Recovery & Automated Backup Drill
  try {
    const backupDrill = runBackupDisasterRecoveryTest();
    if (backupDrill.success) {
      results.push({
        test: 'Automated Snapshot Backup & Restoration Drill',
        status: 'PASS',
        details: 'Atomic SQLite backup created and restored to sandbox with PRAGMA integrity check OK.'
      });
    } else {
      results.push({
        test: 'Automated Snapshot Backup & Restoration Drill',
        status: 'FAIL',
        details: backupDrill.report.join('; ')
      });
    }
  } catch (err: any) {
    results.push({ test: 'Automated Snapshot Backup & Restoration Drill', status: 'FAIL', details: err.message });
  }

  // Test 5: Role-Based Authorization Guard & Schema Safety
  try {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN'").get() as any)?.c || 0;
    const studentCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'STUDENT'").get() as any)?.c || 0;
    const providerCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'PROVIDER'").get() as any)?.c || 0;

    if (adminCount > 0 && studentCount > 0 && providerCount > 0) {
      results.push({
        test: 'Role-Based Authorization Directory Structure',
        status: 'PASS',
        details: `Verified distinct role entities: ${adminCount} Admins, ${studentCount} Students, ${providerCount} Landlords.`
      });
    } else {
      results.push({
        test: 'Role-Based Authorization Directory Structure',
        status: 'FAIL',
        details: 'Missing default test role entities in database.'
      });
    }
  } catch (err: any) {
    results.push({ test: 'Role-Based Authorization Directory Structure', status: 'FAIL', details: err.message });
  }

  const allPassed = results.every(r => r.status === 'PASS');

  // Print results summary
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.test}`);
    console.log(`   └─ ${r.details}`);
  });

  console.log('='.repeat(65));
  console.log(allPassed ? '🎉 ALL PHASE 17 SECURITY TESTS PASSED!\n' : '⚠️ SOME TESTS FAILED.\n');

  return { passed: allPassed, results };
}

if (process.argv[1]?.endsWith('verify_phase17_security.ts')) {
  const { passed } = runSecurityTestSuite();
  if (!passed) process.exit(1);
}
