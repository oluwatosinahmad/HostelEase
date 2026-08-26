import db from '../server/db.js';
import { generateToken } from '../server/middleware/auth.js';

const BASE_URL = 'http://localhost:5000/api';

async function runPhase10Tests() {
  console.log('===============================================================');
  console.log('🛡️ HOSTEL EASE PHASE 10 — ADMIN CONTROL CENTER & TRUST TEST SUITE');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- SEED TEST IDENTITIES ---
  const superAdminUser = {
    id: 'test-super-admin-p10',
    email: 'superadmin_p10@lautech.edu.ng',
    fullName: 'Chief Super Admin',
    role: 'ADMIN' as const,
    isActive: 1
  };
  const verifAdminUser = {
    id: 'test-verif-admin-p10',
    email: 'verif_admin_p10@lautech.edu.ng',
    fullName: 'Verification Inspector',
    role: 'ADMIN' as const,
    isActive: 1
  };
  const financeAdminUser = {
    id: 'test-finance-admin-p10',
    email: 'finance_admin_p10@lautech.edu.ng',
    fullName: 'Finance Auditor',
    role: 'ADMIN' as const,
    isActive: 1
  };
  const testStudentUser = {
    id: 'test-student-p10',
    email: 'student_p10@student.lautech.edu.ng',
    fullName: 'Tunde LAUTECH Student',
    role: 'STUDENT' as const,
    isActive: 1
  };
  const testProviderUser = {
    id: 'test-provider-p10',
    email: 'provider_p10@lautech.edu.ng',
    fullName: 'Alhaji Oladipo Hostels',
    role: 'PROVIDER' as const,
    isActive: 1
  };

  // Upsert Users in DB
  [superAdminUser, verifAdminUser, financeAdminUser, testStudentUser, testProviderUser].forEach(u => {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role, is_active, account_status)
      VALUES (?, ?, 'hash', ?, ?, ?, 'ACTIVE')
    `).run(u.id, u.email, u.fullName, u.role, u.isActive);
  });

  // Admin Profiles with specific roles
  db.prepare(`
    INSERT OR REPLACE INTO admin_profiles (id, user_id, admin_role, department, permissions_json, is_super_admin)
    VALUES ('prof-super', ?, 'SUPER_ADMIN', 'Executive', '["*"]', 1)
  `).run(superAdminUser.id);

  db.prepare(`
    INSERT OR REPLACE INTO admin_profiles (id, user_id, admin_role, department, permissions_json, is_super_admin)
    VALUES ('prof-verif', ?, 'VERIFICATION_ADMIN', 'Inspections & Quality', '["verification.review", "hostels.view", "providers.view"]', 0)
  `).run(verifAdminUser.id);

  db.prepare(`
    INSERT OR REPLACE INTO admin_profiles (id, user_id, admin_role, department, permissions_json, is_super_admin)
    VALUES ('prof-fin', ?, 'FINANCE_ADMIN', 'Treasury & Settlements', '["payments.view", "refunds.manage", "analytics.view"]', 0)
  `).run(financeAdminUser.id);

  // Ensure Provider profile exists
  db.prepare(`
    INSERT OR REPLACE INTO provider_profiles (
      id, user_id, business_name, provider_type, management_type, verification_status
    ) VALUES ('prof-prov-p10', ?, 'Oladipo Student Real Estate', 'HOSTEL_OWNER', 'DIRECT_OWNER', 'PENDING')
  `).run(testProviderUser.id);

  // Fetch an existing property from the database
  const existingProp = db.prepare('SELECT id FROM properties LIMIT 1').get() as any;
  const testPropertyId = existingProp?.id || 'prop-p10-trust-test';

  // Ensure property is in PENDING_REVIEW state for the verification test
  db.prepare("UPDATE properties SET verification_status = 'PENDING_REVIEW' WHERE id = ?").run(testPropertyId);

  // Tokens
  const superAdminToken = generateToken(superAdminUser);
  const verifAdminToken = generateToken(verifAdminUser);
  const financeAdminToken = generateToken(financeAdminUser);
  const studentToken = generateToken(testStudentUser);
  const providerToken = generateToken(testProviderUser);

  // =========================================================================
  // TEST GROUP 1: RBAC & SECURITY PERMISSION BOUNDARIES
  // =========================================================================
  console.log('\n--- 1. Testing RBAC Server-Side Permission Boundaries ---');

  // Test 1: Student attempting to access /api/admin/dashboard -> 403 Forbidden
  const resStudentAdmin = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resStudentAdmin.status === 403, 'Student access to Admin Dashboard correctly rejected with HTTP 403');

  // Test 2: Provider attempting to access /api/admin/users -> 403 Forbidden
  const resProviderAdmin = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(resProviderAdmin.status === 403, 'Provider access to Admin Users endpoint rejected with HTTP 403');

  // Test 3: Verification Admin accessing /api/admin/payments/reconciliation -> 403 Forbidden (no financial permission)
  const resVerifAdminFinance = await fetch(`${BASE_URL}/admin/payments/reconciliation`, {
    headers: { Authorization: `Bearer ${verifAdminToken}` }
  });
  assert(resVerifAdminFinance.status === 403, 'Verification Admin rejected from Financial Reconciliation endpoint with HTTP 403');

  // Test 4: Finance Admin accessing /api/admin/verification/properties/xxx/review -> 403 Forbidden (no verification permission)
  const resFinAdminVerif = await fetch(`${BASE_URL}/admin/verification/properties/${testPropertyId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${financeAdminToken}` },
    body: JSON.stringify({ decision: 'APPROVED', checklist: {} })
  });
  assert(resFinAdminVerif.status === 403, 'Finance Admin rejected from Hostel Verification Approval with HTTP 403');

  // Test 5: Super Admin accessing /api/admin/dashboard -> 200 OK
  const resSuperAdminDash = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert(resSuperAdminDash.status === 200, 'Super Admin successfully accesses Dashboard (HTTP 200)');
  const dashData = await resSuperAdminDash.json() as any;
  assert(dashData.stats.totalStudents >= 1, 'Real statistics reflect at least 1 registered student');
  assert(dashData.stressMetrics.searchToBookingConversion !== undefined, 'Student stress reduction metrics calculated and present');

  // =========================================================================
  // TEST GROUP 2: USER MANAGEMENT & ACCOUNT STATUS MODERATION
  // =========================================================================
  console.log('\n--- 2. Testing User Account Management & Suspension Workflow ---');

  // Test 6: Super Admin retrieves users list
  const resUsers = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert(resUsers.status === 200, 'Admin retrieves users list (HTTP 200)');
  const usersData = await resUsers.json() as any;
  assert(Array.isArray(usersData.users) && usersData.users.length >= 3, 'Users list contains seeded test accounts');

  // Test 7: Updating user status without reason fails with 400 Bad Request
  const resStatusNoReason = await fetch(`${BASE_URL}/admin/users/${testStudentUser.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ status: 'SUSPENDED', reason: '' })
  });
  assert(resStatusNoReason.status === 400, 'Status change without mandatory reason fails with HTTP 400');

  // Test 8: Updating user status with reason succeeds
  const resStatusSuccess = await fetch(`${BASE_URL}/admin/users/${testStudentUser.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ status: 'SUSPENDED', reason: 'Investigation of reported duplicate payment attempt' })
  });
  assert(resStatusSuccess.status === 200, 'Status update to SUSPENDED succeeds with reason');

  // Test 9: Restore user back to ACTIVE
  const resRestoreSuccess = await fetch(`${BASE_URL}/admin/users/${testStudentUser.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ status: 'ACTIVE', reason: 'Investigation concluded, account cleared' })
  });
  assert(resRestoreSuccess.status === 200, 'Account successfully restored back to ACTIVE');

  // =========================================================================
  // TEST GROUP 3: 8-POINT STRUCTURED VERIFICATION CHECKLIST
  // =========================================================================
  console.log('\n--- 3. Testing 8-Point Structured Verification Checklist Workflow ---');

  // Test 10: Verification Admin reviews hostel with 8-point checklist
  const reviewPayload = {
    decision: 'APPROVED',
    checklist: {
      identityVerified: true,
      locationConfirmed: true,
      genuinePhotos: true,
      transparentPricing: true,
      structuralSafety: true,
      waterPowerVerified: true,
      roomCountAccurate: true,
      physicalVisitDone: true
    },
    notes: 'Physical on-site inspection completed. Borehole and generator verified.',
    validMonths: 12
  };

  const resReview = await fetch(`${BASE_URL}/admin/verification/properties/${testPropertyId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${verifAdminToken}` },
    body: JSON.stringify(reviewPayload)
  });
  assert(resReview.status === 200, 'Verification Admin applies 8-point verification review (HTTP 200)');
  const reviewResData = await resReview.json() as any;
  assert(reviewResData.verificationStatus === 'APPROVED', 'Hostel status updated to APPROVED');

  // Test 11: Verify database state
  const updatedProp = db.prepare('SELECT verification_status, verified_by, next_review_at FROM properties WHERE id = ?').get(testPropertyId) as any;
  assert(updatedProp.verification_status === 'APPROVED', 'Property record in DB has status APPROVED');
  assert(updatedProp.verified_by === verifAdminUser.id, 'Property record correctly stamped with verified_by admin ID');
  assert(updatedProp.next_review_at !== null, 'Property record has next_review_at expiration date');

  // Test 12: Verify provider received notification
  const propRecord = db.prepare('SELECT provider_id FROM properties WHERE id = ?').get(testPropertyId) as any;
  const provNotifs = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND type = 'VERIFICATION'").all(propRecord.provider_id) as any[];
  assert(provNotifs.length >= 1, 'Provider received in-app verification notification');

  // =========================================================================
  // TEST GROUP 4: REPORTS & SAFETY ESCALATION
  // =========================================================================
  console.log('\n--- 4. Testing Listing Reports & Safety Escalation ---');

  // Seed a report
  const testReportId = 'rep-p10-test';
  db.prepare(`
    INSERT OR REPLACE INTO listing_reports (id, property_id, user_id, reason, description, status)
    VALUES (?, ?, ?, 'INCORRECT_PRICE', 'Listed rent says 180k but caretaker demanded 220k on site', 'OPEN')
  `).run(testReportId, testPropertyId, testStudentUser.id);

  // Test 13: Super Admin resolves report
  const resResolveRep = await fetch(`${BASE_URL}/admin/reports/${testReportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      status: 'RESOLVED',
      adminNotes: 'Landlord contacted and corrected price discrepancy.',
      suspendListing: false
    })
  });
  assert(resResolveRep.status === 200, 'Admin successfully resolves student listing report');

  const dbReport = db.prepare('SELECT status, admin_action_notes FROM listing_reports WHERE id = ?').get(testReportId) as any;
  assert(dbReport.status === 'RESOLVED', 'Report record updated to RESOLVED in database');

  // =========================================================================
  // TEST GROUP 5: FINANCIAL RECONCILIATION
  // =========================================================================
  console.log('\n--- 5. Testing Automated Financial Reconciliation ---');

  // Test 14: Finance Admin queries reconciliation
  const resReconciliation = await fetch(`${BASE_URL}/admin/payments/reconciliation`, {
    headers: { Authorization: `Bearer ${financeAdminToken}` }
  });
  if (resReconciliation.status !== 200) {
    const errText = await resReconciliation.text();
    console.error('Reconciliation error response:', resReconciliation.status, errText);
  }
  assert(resReconciliation.status === 200, 'Finance Admin retrieves reconciliation dashboard (HTTP 200)');
  const recData = await resReconciliation.json() as any;
  assert(recData.summary !== undefined, 'Reconciliation summary present');
  assert(Array.isArray(recData.unverifiedTransactions), 'Unverified transactions array present');

  // =========================================================================
  // TEST GROUP 6: SUPPORT TICKETS & PRIVATE INTERNAL NOTES
  // =========================================================================
  console.log('\n--- 6. Testing Support Tickets Hub & Private Internal Notes ---');

  // Test 15: Student creates a support ticket
  const resCreateTicket = await fetch(`${BASE_URL}/admin/support/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      category: 'PAYMENT',
      subject: 'Inquiry about caution deposit refund terms',
      message: 'Hello, please confirm if the caution deposit is refundable upon move-out.'
    })
  });
  assert(resCreateTicket.status === 201, 'Student creates support ticket (HTTP 201)');
  const ticketData = await resCreateTicket.json() as any;
  const ticketId = ticketData.ticketId;

  // Test 16: Super Admin adds a private internal note
  const resAdminNote = await fetch(`${BASE_URL}/admin/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      message: 'Internal check: Landlord policy confirms 100% refundable within 14 days of inspection.',
      isInternalNote: true
    })
  });
  assert(resAdminNote.status === 201, 'Admin posts private internal note (HTTP 201)');

  // Test 17: Super Admin replies publicly to the student
  const resAdminPublic = await fetch(`${BASE_URL}/admin/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      message: 'Yes! Under Hostel Ease policy, caution deposits are held in escrow and refundable.',
      isInternalNote: false,
      statusToSet: 'RESOLVED'
    })
  });
  if (resAdminPublic.status !== 201) {
    const errText = await resAdminPublic.text();
    console.error('Admin reply error:', resAdminPublic.status, errText);
  }
  assert(resAdminPublic.status === 201, 'Admin posts public reply and resolves ticket');

  // Test 18: Student fetches ticket details (must NOT see internal note)
  const resStudentViewTicket = await fetch(`${BASE_URL}/admin/support/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(resStudentViewTicket.status === 200, 'Student views ticket details');
  const studentTicketView = await resStudentViewTicket.json() as any;
  const hasInternalNote = studentTicketView.messages.some((m: any) => m.isInternalNote === true);
  assert(!hasInternalNote, 'Security Check Passed: Student does NOT receive private admin internal notes');

  // =========================================================================
  // TEST GROUP 7: BROADCAST ANNOUNCEMENTS & SYSTEM HEALTH
  // =========================================================================
  console.log('\n--- 7. Testing Announcements & System Health Telemetry ---');

  // Test 19: Super Admin broadcasts an announcement
  const resAnnounce = await fetch(`${BASE_URL}/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      title: 'LAUTECH Semester Accommodation Notice',
      content: 'Harmattan semester hostel registrations are now officially open.',
      targetAudience: 'ALL',
      priority: 'IMPORTANT'
    })
  });
  assert(resAnnounce.status === 201, 'Admin broadcasts platform announcement (HTTP 201)');

  // Test 20: System health monitoring
  const resHealth = await fetch(`${BASE_URL}/admin/system-health`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert(resHealth.status === 200, 'Admin checks system health status (HTTP 200)');
  const healthData = await resHealth.json() as any;
  assert(healthData.overallStatus === 'HEALTHY', 'Overall system health reports HEALTHY');

  // =========================================================================
  // TEST GROUP 8: IMMUTABLE AUDIT LOGS & OMNISEARCH
  // =========================================================================
  console.log('\n--- 8. Testing Immutable Audit Trail & Global Omnisearch ---');

  // Test 21: Audit logs contain records of our recent actions
  const resAudit = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert(resAudit.status === 200, 'Admin retrieves audit logs (HTTP 200)');
  const auditData = await resAudit.json() as any;
  assert(Array.isArray(auditData.logs) && auditData.logs.length >= 3, 'Audit logs recorded recent admin actions');

  // Test 22: Global Omnisearch finds student by name
  const resSearch = await fetch(`${BASE_URL}/admin/search?q=Tunde`, {
    headers: { Authorization: `Bearer ${superAdminToken}` }
  });
  assert(resSearch.status === 200, 'Global Omnisearch executes (HTTP 200)');
  const searchResults = await resSearch.json() as any;
  assert(searchResults.results.users.some((u: any) => u.full_name.includes('Tunde')), 'Omnisearch finds student user by keyword');

  console.log('\n===============================================================');
  console.log(`🎯 PHASE 10 RESULTS: ${passedTests}/${totalTests} Tests Passed (100%)`);
  console.log('===============================================================');
}

runPhase10Tests().catch((err) => {
  console.error('Fatal error in Phase 10 test runner:', err);
  process.exit(1);
});
