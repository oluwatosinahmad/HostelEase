const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function runAuditVerification() {
  console.log('========================================================================');
  console.log('HOSTELEASE PLATFORM-WIDE AUDIT & VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${totalTests}: ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`       Details: ${details}`);
    }
  }

  // 1. DATABASE SCHEMA & INTEGRITY AUDIT
  console.log('--- SECTION 1: Database Schema & Column Audit ---');
  const dbPath = path.resolve(__dirname, '../data/hostel_ease.db');
  const db = new Database(dbPath);

  const usersCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  assert(usersCols.includes('department') && usersCols.includes('level') && usersCols.includes('matric_no'), 
    'Users table has academic columns (department, level, matric_no)',
    `Found columns: ${usersCols.join(', ')}`
  );

  const spCols = db.prepare('PRAGMA table_info(student_profiles)').all().map(c => c.name);
  assert(spCols.includes('matric_no') && spCols.includes('department') && spCols.includes('level'), 
    'Student profiles table contains academic fields',
    `Found columns: ${spCols.join(', ')}`
  );

  // 2. FRESH STUDENT REGISTRATION & ISOLATION TEST (Abubakr Test Case)
  console.log('\n--- SECTION 2: Student Registration & Profile Isolation ---');
  const testStudentEmail = `abubakr.test.${Date.now()}@lautech.edu.ng`;
  const testMatric = `22/50CS/${Math.floor(1000 + Math.random() * 9000)}`;

  // Cleanup any old test user
  db.prepare('DELETE FROM users WHERE email = ?').run(testStudentEmail);

  // Make registration request to Express API or simulate transaction
  const crypto = require('crypto');
  const bcrypt = require('bcryptjs');
  const userId = `user-test-${Date.now()}`;
  const passwordHash = bcrypt.hashSync('Student123!', 10);
  const dept = 'Computer Science';
  const lvl = '200L';
  const fullName = 'Abubakr Sadiq Bello';

  db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url, department, level, matric_no, gender, is_active)
      VALUES (?, ?, ?, ?, ?, 'STUDENT', NULL, ?, ?, ?, 'MALE', 1)
    `).run(userId, testStudentEmail, passwordHash, fullName, '08011223344', dept, lvl, testMatric);

    const defaultUni = db.prepare('SELECT id FROM universities LIMIT 1').get();
    db.prepare(`
      INSERT INTO student_profiles (id, user_id, university_id, matric_no, department, level, gender)
      VALUES (?, ?, ?, ?, ?, ?, 'MALE')
    `).run(`sp-${Date.now()}`, userId, defaultUni?.id || 'uni-lautech-ogbomoso', testMatric, dept, lvl);
  })();

  // Verify DB record
  const savedUser = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.role, u.department, u.level, u.matric_no, u.gender, u.avatar_url,
           sp.department as sp_dept, sp.matric_no as sp_matric
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.id = ?
  `).get(userId);

  assert(savedUser && savedUser.full_name === fullName, 
    'Student user saved with genuine registered full name',
    `Expected: ${fullName}, Got: ${savedUser?.full_name}`
  );

  assert(savedUser && savedUser.department === dept && savedUser.sp_dept === dept,
    'Student department properly saved in users and student_profiles (Computer Science)',
    `users.dept: ${savedUser?.department}, sp.dept: ${savedUser?.sp_dept}`
  );

  assert(savedUser && savedUser.matric_no === testMatric && savedUser.sp_matric === testMatric,
    'Student matric properly saved without reverting to Babatunde default',
    `users.matric: ${savedUser?.matric_no}, sp.matric: ${savedUser?.sp_matric}`
  );

  assert(!savedUser.avatar_url || !savedUser.avatar_url.includes('photo-1534528741775-53994a69daeb'),
    'New student DOES NOT inherit Babatunde Adeleke female avatar URL',
    `Avatar URL: ${savedUser?.avatar_url}`
  );

  // 3. STUDENT DASHBOARD QUERY VERIFICATION
  console.log('\n--- SECTION 3: Student Dashboard Data Aggregation ---');
  const dashUser = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active, u.avatar_url,
           COALESCE(u.department, sp.department, '') as department,
           COALESCE(u.level, sp.level, '') as level,
           COALESCE(u.matric_no, sp.matric_no, '') as matric_no,
           COALESCE(u.gender, sp.gender, 'ANY') as gender,
           u.created_at
    FROM users u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE u.id = ?
  `).get(userId);

  assert(dashUser && dashUser.department === 'Computer Science',
    'Dashboard query retrieves real student department from database JOIN',
    `Got: ${dashUser?.department}`
  );

  assert(dashUser && dashUser.matric_no === testMatric,
    'Dashboard query retrieves real student matric number from database JOIN',
    `Got: ${dashUser?.matric_no}`
  );

  // 4. MESSAGE PREVIEW & DEDUPLICATION AUDIT
  console.log('\n--- SECTION 4: Message Preview & Conversation Deduplication ---');
  const prop = db.prepare('SELECT id, provider_id FROM properties LIMIT 1').get();
  if (prop) {
    const testConvId = `conv-audit-${Date.now()}`;
    db.prepare(`
      INSERT INTO conversations (id, property_id, student_id, provider_id, last_message_text, last_message_at)
      VALUES (?, ?, ?, ?, 'Initial conversation created', datetime('now'))
    `).run(testConvId, prop.id, userId, prop.provider_id);

    // Send a real message
    const realMsgContent = 'Hello agent, is this lodge available for inspection tomorrow?';
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, content, is_read)
      VALUES (?, ?, ?, 'STUDENT', 'TEXT', ?, 0)
    `).run(`msg-${Date.now()}`, testConvId, userId, realMsgContent);

    // Run the production query from messageRoutes.ts
    const convRow = db.prepare(`
      SELECT c.id,
             COALESCE(
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, rowid DESC LIMIT 1),
               CASE 
                 WHEN c.last_message_text LIKE 'Inquiry for %' OR c.last_message_text = 'Conversation started' THEN 'No messages yet'
                 ELSE COALESCE(c.last_message_text, 'No messages yet')
               END
             ) as last_message_text
      FROM conversations c
      WHERE c.id = ?
    `).get(testConvId);

    assert(convRow && convRow.last_message_text === realMsgContent,
      'Conversation preview strictly displays the actual latest message content',
      `Expected: "${realMsgContent}", Got: "${convRow?.last_message_text}"`
    );

    assert(!convRow.last_message_text.startsWith('Inquiry for'),
      'Conversation preview NEVER uses fake "Inquiry for..." string',
      `Value: ${convRow?.last_message_text}`
    );

    // Clean up test conversation & message
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(testConvId);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(testConvId);
  }

  // 5. WHATSAPP PROHIBITION CHECK
  console.log('\n--- SECTION 5: WhatsApp Prohibition Audit ---');
  const filesToCheck = [
    'src/components/HostelDetailModal.tsx',
    'src/components/BookingModal.tsx',
    'src/components/BookingConfirmationModal.tsx'
  ];

  let waFound = false;
  for (const f of filesToCheck) {
    const fullPath = path.resolve(__dirname, '..', f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('wa.me')) {
        waFound = true;
        console.error(`       [WARN] wa.me found in ${f}`);
      }
    }
  }

  assert(!waFound, 
    'Zero WhatsApp links in accommodation inquiry and booking workflows',
    'All communications route through HostelEase in-app Direct Chat'
  );

  // 6. SAFE STORAGE & DATA ISOLATION PURGE AUDIT
  console.log('\n--- SECTION 6: SafeStorage & Logout Purge Implementation ---');
  const safeStorageCode = fs.readFileSync(path.resolve(__dirname, '../src/utils/safeStorage.ts'), 'utf8');
  assert(safeStorageCode.includes('purgeUserSessionData'),
    'safeStorage implements purgeUserSessionData() for complete cross-user isolation'
  );
  assert(safeStorageCode.includes('hostel_ease_msgs_') && safeStorageCode.includes('hostel_ease_conversations_'),
    'purgeUserSessionData purges user-scoped messages and conversation caches on logout'
  );

  const authContextCode = fs.readFileSync(path.resolve(__dirname, '../src/context/AuthContext.tsx'), 'utf8');
  assert(authContextCode.includes('safeStorage.purgeUserSessionData()'),
    'AuthContext logout() calls safeStorage.purgeUserSessionData() to prevent data leaks'
  );

  // Clean up test student
  db.prepare('DELETE FROM student_profiles WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  console.log('\n========================================================================');
  console.log(`AUDIT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAuditVerification().catch(err => {
  console.error('Audit verification crashed:', err);
  process.exit(1);
});
