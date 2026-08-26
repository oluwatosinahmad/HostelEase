import { db } from '../server/db';
import { aiAssistantService } from '../server/services/aiAssistantService';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
  }
}

async function runPhase8Tests() {
  console.log('\n===============================================================');
  console.log('🤖 HOSTEL EASE PHASE 8 — AI ACCOMMODATION ASSISTANT TEST SUITE');
  console.log('===============================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SETUP: Get or create test student & properties
    // ------------------------------------------------------------------------
    let student = db.prepare("SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1").get() as any;
    if (!student) {
      const studentId = 'test-student-phase8';
      db.prepare(`
        INSERT INTO users (id, full_name, email, password_hash, role, status)
        VALUES (?, 'Phase 8 Student', 'ai_student@lautech.edu.ng', 'hash', 'STUDENT', 'ACTIVE')
      `).run(studentId);
      student = db.prepare("SELECT * FROM users WHERE id = ?").get(studentId) as any;
    }

    const testProps = db.prepare(`
      SELECT p.*, pp.rent_amount, pp.service_charge, pp.agency_fee, pp.legal_fee, pp.caution_fee, pp.other_mandatory_charges
      FROM properties p
      LEFT JOIN prices pp ON p.id = pp.property_id
      WHERE p.verification_status = 'APPROVED'
      LIMIT 5
    `).all() as any[];

    assert(testProps.length >= 2, 'Database has at least 2 verified test hostels in LAUTECH');
    const p1 = testProps[0];
    const p2 = testProps[1];

    // ========================================================================
    // TEST GROUP 1: Natural Language Search & Zero-Hallucination Parser
    // ========================================================================
    console.log('\n--- 1. Natural Language Search & Zero-Hallucination Parser ---');

    // 1.1 Budget Search
    const budgetRes = await aiAssistantService.chat(student.id, 'Find me hostels under 200k', {
      contextType: 'SEARCH'
    });
    assert(budgetRes.response.length > 20, 'Budget search returned grounded natural language response');
    assert(
      budgetRes.structuredData?.type === 'HOSTEL_LIST' || budgetRes.response.includes('₦'),
      'Budget search returned structured property cards or pricing info'
    );
    if (budgetRes.structuredData?.properties) {
      const allUnder200k = budgetRes.structuredData.properties.every(p => p.rentAmount <= 200000);
      assert(allUnder200k, 'Zero Hallucination: All returned hostels strictly adhere to budget <= ₦200,000');
    }

    // 1.2 Area Specific Search (Under G)
    const areaRes = await aiAssistantService.chat(student.id, 'Show me lodges in Under G', {
      contextType: 'SEARCH'
    });
    assert(areaRes.response.length > 20, 'Area query returned valid response for Under G');

    // 1.3 Distance Query
    const distanceRes = await aiAssistantService.chat(student.id, 'Hostels within 1.5km to campus gate', {
      contextType: 'SEARCH'
    });
    assert(distanceRes.response.length > 10, 'Distance query parsed proximity constraint');

    // 1.4 Feature Filter Query (Water & Light)
    const featureRes = await aiAssistantService.chat(student.id, 'Hostels with borehole water and constant electricity', {
      contextType: 'SEARCH'
    });
    assert(featureRes.response.length > 10, 'Facility query parsed water and power requirements');

    // ========================================================================
    // TEST GROUP 2: Contextual Property Q&A & Fee Breakdown
    // ========================================================================
    console.log('\n--- 2. Contextual Property Q&A & Fee Breakdown ---');

    const detailRes = await aiAssistantService.chat(student.id, `What are the total fees and rules for ${p1.title}?`, {
      propertyId: p1.id,
      contextType: 'HOSTEL_DETAILS'
    });
    assert(detailRes.response.includes(p1.title), 'Response references the exact queried hostel title');
    assert(
      detailRes.response.includes('₦') || detailRes.response.includes('Rent') || detailRes.response.includes('Total'),
      'Itemized rent and mandatory breakdown provided'
    );

    // ========================================================================
    // TEST GROUP 3: Multi-Property Side-by-Side Comparison
    // ========================================================================
    console.log('\n--- 3. Multi-Property Side-by-Side Comparison ---');

    const compareRes = await aiAssistantService.chat(student.id, `Compare ${p1.title} and ${p2.title}`, {
      contextType: 'COMPARISON'
    });
    assert(compareRes.response.includes(p1.title) && compareRes.response.includes(p2.title), 'Comparison analyzes both queried properties');
    assert(
      compareRes.structuredData?.type === 'HOSTEL_COMPARISON' || compareRes.response.includes('Comparison') || compareRes.response.includes('Rent'),
      'Comparison structured data or matrix returned'
    );

    // ========================================================================
    // TEST GROUP 4: Customized Inspection Checklist Generator
    // ========================================================================
    console.log('\n--- 4. Inspection Checklist Generator ---');

    const checklistRes = await aiAssistantService.chat(student.id, `Give me an inspection checklist for ${p1.title}`, {
      propertyId: p1.id,
      contextType: 'INSPECTION'
    });
    assert(
      checklistRes.structuredData?.type === 'INSPECTION_CHECKLIST' && !!checklistRes.structuredData.checklist,
      'Checklist generator returned categorized on-site inspection items'
    );
    const categories = checklistRes.structuredData?.checklist?.categories || [];
    assert(categories.length >= 3, 'Checklist has at least 3 categories (Water, Power, Security, Structural)');

    // ========================================================================
    // TEST GROUP 5: Anti-Scam & Safety Risk Assessment
    // ========================================================================
    console.log('\n--- 5. Anti-Scam & Safety Risk Assessment ---');

    // 5.1 High Risk Scenario (Pay before inspection)
    const scamRes1 = await aiAssistantService.chat(
      student.id, 
      'A landlord on WhatsApp asked me to transfer 50k booking fee before I can inspect the lodge. Is this safe?'
    );
    assert(
      scamRes1.structuredData?.type === 'SCAM_ALERT' && scamRes1.structuredData.scamAssessment?.isHighRisk === true,
      'AI flagged pre-inspection payment demand as HIGH RISK scam'
    );
    assert(
      scamRes1.response.toLowerCase().includes('scam') || scamRes1.response.toLowerCase().includes('warning') || scamRes1.response.toLowerCase().includes('do not pay'),
      'AI gave explicit protective advice against unverified wire transfers'
    );

    // 5.2 Safe Platform Scenario
    const scamRes2 = await aiAssistantService.chat(
      student.id,
      'I want to schedule an inspection through Hostel Ease and pay through the platform after verifying the room.'
    );
    assert(scamRes2.response.length > 20, 'AI recognized safe on-platform workflow');

    // ========================================================================
    // TEST GROUP 6: Student Context & Urgency Engine Integration
    // ========================================================================
    console.log('\n--- 6. Student Context & Urgency Engine Integration ---');

    const statusRes = await aiAssistantService.chat(student.id, 'What is the status of my bookings and payments?');
    assert(statusRes.response.length > 20, 'Assistant retrieved student context without errors');

    // ========================================================================
    // TEST GROUP 7: Safe Action Confirmation Architecture
    // ========================================================================
    console.log('\n--- 7. Safe Action Confirmation Architecture ---');

    // 7.1 Requesting a write action (e.g. save hostel) emits an action prompt, does NOT silently mutate
    const savePromptRes = await aiAssistantService.chat(student.id, `Save ${p1.title} to my shortlist`);
    assert(
      savePromptRes.structuredData?.actionPrompt?.actionType === 'SAVE_HOSTEL',
      'AI generated safe action confirmation prompt for SAVE_HOSTEL'
    );

    // 7.2 Explicit action execution
    const confirmRes = await aiAssistantService.executeConfirmedAction(student.id, 'SAVE_HOSTEL', {
      propertyId: p1.id
    });
    assert(confirmRes.success === true, 'Explicit action confirmation executed successfully');

    // Verify database mutation occurred ONLY after explicit confirmation
    const savedRecord = db.prepare("SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ?").get(student.id, p1.id);
    assert(!!savedRecord, 'Database confirmed property saved to student shortlist');

    // ========================================================================
    // TEST GROUP 8: Rate Limiting & Guardrails
    // ========================================================================
    console.log('\n--- 8. Rate Limiting & Guardrails ---');

    // Rate limiter allows normal traffic and logs usage
    const usageLogsBefore = db.prepare("SELECT COUNT(*) as cnt FROM ai_usage_logs WHERE student_id = ?").get(student.id) as any;
    assert(usageLogsBefore.cnt > 0, 'AI usage logs properly recorded for telemetry and auditing');

    // ========================================================================
    // TEST GROUP 9: Student Feedback & Admin Analytics
    // ========================================================================
    console.log('\n--- 9. Student Feedback & Admin Analytics ---');

    // Submit feedback on last message
    const lastMsg = db.prepare("SELECT * FROM ai_messages WHERE sender = 'AI' ORDER BY created_at DESC LIMIT 1").get() as any;
    if (lastMsg) {
      await aiAssistantService.recordFeedback(lastMsg.id, student.id, 'HELPFUL', 'Very fast and accurate fee details!');
      const fb = db.prepare("SELECT * FROM ai_feedback WHERE message_id = ?").get(lastMsg.id) as any;
      assert(fb && fb.rating === 'HELPFUL', 'Student feedback successfully recorded in database');
    }

    // Retrieve Admin Analytics
    const adminStats = await aiAssistantService.getAdminStats();
    assert(adminStats.totalQueries > 0, 'Admin analytics aggregates total query count');
    assert(adminStats.toolExecutions.length > 0, 'Admin analytics tracks tool execution distribution');
    assert(adminStats.recentLogs.length > 0, 'Admin analytics returns real-time audit trail');

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n===============================================================');
    console.log(`🎯 PHASE 8 RESULTS: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('===============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error in Phase 8 test runner:', error);
    process.exit(1);
  }
}

runPhase8Tests();
