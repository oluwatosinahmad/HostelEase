import db from '../server/db';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000/api';

async function request(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    ok: res.ok,
    data,
    headers: res.headers
  };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('  HOSTEL EASE PHASE 6 AUTOMATED TEST SUITE');
  console.log('  Testing Payments & Financial Management Engine');
  console.log('====================================================\n');

  const ctx: any = {};

  console.log('--- 1. Setting Up Test Accounts & Accommodations ---');
  {
    // 1. Student 1 Login
    const sLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'student@lautech.edu.ng', password: 'Student123!' }
    });
    assert(sLogin.status === 200, 'Student 1 logged in successfully');
    ctx.studentToken = sLogin.data.token;
    ctx.studentId = sLogin.data.user.id;

    // 2. Student 2 Login
    let s2Login = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'student2@lautech.edu.ng', password: 'Student123!' }
    });
    if (!s2Login.ok) {
      await request(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: {
          email: 'student2@lautech.edu.ng',
          password: 'Student123!',
          fullName: 'Babatunde Fashola',
          phone: '08022223344',
          role: 'STUDENT'
        }
      });
      s2Login = await request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: { email: 'student2@lautech.edu.ng', password: 'Student123!' }
      });
    }
    assert(s2Login.status === 200, 'Student 2 authenticated');
    ctx.student2Token = s2Login.data.token;
    ctx.student2Id = s2Login.data.user.id;

    // 3. Provider Login
    const pLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'provider@hostelease.ng', password: 'Provider123!' }
    });
    assert(pLogin.status === 200, 'Provider logged in successfully');
    ctx.providerToken = pLogin.data.token;
    ctx.providerId = pLogin.data.user.id;

    // 4. Admin Login
    const aLogin = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@hostelease.ng', password: 'Admin123!' }
    });
    assert(aLogin.status === 200, 'Admin logged in successfully');
    ctx.adminToken = aLogin.data.token;
    ctx.adminId = aLogin.data.user.id;

    // 5. Create a clean test property & room
    const prop = db.prepare('SELECT id, area_id, university_id FROM properties LIMIT 1').get() as any;
    ctx.propertyId = prop.id;
    const room = db.prepare('SELECT id FROM rooms WHERE property_id = ? LIMIT 1').get(ctx.propertyId) as any;
    ctx.roomId = room.id;

    // Clean up any stale active bookings for this student on this property to ensure fresh run
    db.prepare(`
      UPDATE bookings 
      SET status = 'CANCELLED_BY_STUDENT', updated_at = datetime('now')
      WHERE student_id = ? AND property_id = ? AND status IN ('PENDING', 'CONFIRMED')
    `).run(ctx.studentId, ctx.propertyId);

    // Create fresh confirmed booking for payment testing
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const reserveRes = await request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        propertyId: ctx.propertyId,
        roomId: ctx.roomId,
        moveInDate: tomorrow
      }
    });
    assert(reserveRes.status === 201, 'Created fresh reservation for payment testing');
    ctx.bookingId = reserveRes.data.bookingId;
    ctx.bookingReference = reserveRes.data.bookingReference;

    // Landlord Confirms the booking
    const confirmRes = await request(`${API_BASE}/bookings/${ctx.bookingId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.providerToken}` }
    });
    assert(confirmRes.status === 200, 'Landlord confirmed booking reservation');
  }

  console.log('\n--- 2. Testing Configurable Platform Fee API ---');
  {
    const feeRes = await request(`${API_BASE}/payments/platform-fee`);
    assert(feeRes.status === 200, 'GET /payments/platform-fee returns 200 OK');
    assert(typeof feeRes.data.feeAmount === 'number', 'Platform fee returned as number');
    assert(feeRes.data.feeAmount > 0, 'Platform fee is greater than 0');
    assert(feeRes.data.currency === 'NGN', 'Platform fee currency is NGN');
    ctx.platformFee = feeRes.data.feeAmount;
  }

  console.log('\n--- 3. Testing Payment Initialization & Strict Price Integrity ---');
  {
    const initRes = await request(`${API_BASE}/payments/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        bookingId: ctx.bookingId,
        paymentProvider: 'TEST_GATEWAY',
        paymentMethod: 'CARD'
      }
    });

    assert(initRes.status === 201, 'POST /payments/initialize returns 201 Created');
    assert(Boolean(initRes.data.paymentId), 'Payment ID generated');
    assert(initRes.data.paymentReference.startsWith('HE-PAY-2026-'), 'Payment reference adheres to format HE-PAY-2026-XXXXXX');
    assert(initRes.data.amount > 0, 'Computed total payment amount is positive');
    assert(initRes.data.platformFee === ctx.platformFee, 'Platform fee matches server config');
    assert(Boolean(initRes.data.breakdown), 'Transparent price breakdown returned');
    assert(initRes.data.breakdown.totalAmount === initRes.data.amount, 'Breakdown matches total amount');

    ctx.paymentId = initRes.data.paymentId;
    ctx.paymentReference = initRes.data.paymentReference;
    ctx.totalAmount = initRes.data.amount;

    // Check DB status
    const payDb = db.prepare('SELECT status, amount FROM payments WHERE id = ?').get(ctx.paymentId) as any;
    assert(payDb.status === 'PENDING', 'Database payment record is PENDING');

    const bookDb = db.prepare('SELECT payment_status FROM bookings WHERE id = ?').get(ctx.bookingId) as any;
    assert(bookDb.payment_status === 'PENDING_PAYMENT', 'Booking payment_status updated to PENDING_PAYMENT');
  }

  console.log('\n--- 4. Testing Payment Verification & Immutable Financial Ledger ---');
  {
    const verifyRes = await request(`${API_BASE}/payments/verify/${ctx.paymentReference}`, {
      headers: { Authorization: `Bearer ${ctx.studentToken}` }
    });

    assert(verifyRes.status === 200, 'GET /payments/verify returns 200 OK');
    assert(verifyRes.data.success === true, 'Payment verified successfully');
    assert(verifyRes.data.status === 'SUCCESS', 'Payment status transitioned to SUCCESS');
    assert(Boolean(verifyRes.data.payment.paidAt), 'Paid timestamp recorded');

    // 1. Verify DB Payment Record
    const payDb = db.prepare('SELECT status, paid_at, verified_at, payment_method FROM payments WHERE id = ?').get(ctx.paymentId) as any;
    assert(payDb.status === 'SUCCESS', 'Database payment status is SUCCESS');
    assert(Boolean(payDb.paid_at), 'paid_at timestamp stored in DB');
    assert(Boolean(payDb.verified_at), 'verified_at timestamp stored in DB');

    // 2. Verify Booking Record Sync
    const bookDb = db.prepare('SELECT status, payment_status, paid_at FROM bookings WHERE id = ?').get(ctx.bookingId) as any;
    assert(bookDb.payment_status === 'PAID', 'Booking payment_status transitioned to PAID');
    assert(bookDb.status === 'CONFIRMED', 'Booking status remains CONFIRMED');
    assert(Boolean(bookDb.paid_at), 'Booking paid_at timestamp stored in DB');

    // 3. Verify Immutable Financial Ledger Entries
    const ledgerEntries = db.prepare('SELECT * FROM financial_ledger WHERE payment_id = ?').all(ctx.paymentId) as any[];
    assert(ledgerEntries.length >= 2, 'Financial ledger created multiple immutable double-entry records');

    const paymentReceivedEntry = ledgerEntries.find(e => e.entry_type === 'PAYMENT_RECEIVED');
    assert(Boolean(paymentReceivedEntry), 'Ledger records PAYMENT_RECEIVED into GATEWAY_ESCROW');
    assert(paymentReceivedEntry.amount === ctx.totalAmount, 'PAYMENT_RECEIVED amount matches total payment');

    const providerCreditEntry = ledgerEntries.find(e => e.entry_type === 'PROVIDER_EARNING_CREDITED');
    assert(Boolean(providerCreditEntry), 'Ledger records PROVIDER_EARNING_CREDITED into PROVIDER_PAYABLE');

    // 4. Verify Notifications
    const studentNotif = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
      .get(ctx.studentId, 'PAYMENT') as any;
    assert(Boolean(studentNotif), 'Student received in-app payment success notification');

    const providerNotif = db.prepare('SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1')
      .get(ctx.providerId, 'PAYMENT') as any;
    assert(Boolean(providerNotif), 'Provider received in-app payment receipt notification');
  }

  console.log('\n--- 5. Testing Double-Payment & Duplicate Prevention ---');
  {
    // Try to re-initialize payment on the already-paid booking -> Must be rejected
    const doublePayRes = await request(`${API_BASE}/payments/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.studentToken}` },
      body: {
        bookingId: ctx.bookingId,
        paymentProvider: 'TEST_GATEWAY',
        paymentMethod: 'CARD'
      }
    });

    assert(doublePayRes.status === 400, 'Double payment initialization blocked with HTTP 400 Bad Request');
    assert(doublePayRes.data.error.includes('already been paid'), 'Error message clearly states booking is already paid');
  }

  console.log('\n--- 6. Testing Idempotent Webhook Processing ---');
  {
    // Create a new booking for webhook test
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Clean student 2 active bookings on property
    db.prepare(`
      UPDATE bookings SET status = 'CANCELLED_BY_STUDENT'
      WHERE student_id = ? AND property_id = ? AND status IN ('PENDING', 'CONFIRMED')
    `).run(ctx.student2Id, ctx.propertyId);

    const bRes = await request(`${API_BASE}/bookings/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.student2Token}` },
      body: { propertyId: ctx.propertyId, roomId: ctx.roomId, moveInDate: tomorrow }
    });
    const s2BookingId = bRes.data.bookingId;

    await request(`${API_BASE}/bookings/${s2BookingId}/confirm`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ctx.providerToken}` }
    });

    const initRes = await request(`${API_BASE}/payments/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.student2Token}` },
      body: { bookingId: s2BookingId, paymentProvider: 'TEST_GATEWAY' }
    });
    const s2PayRef = initRes.data.paymentReference;

    // Send Webhook Event
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: 99887711,
        reference: s2PayRef,
        amount: initRes.data.amount * 100,
        currency: 'NGN',
        status: 'success'
      }
    };

    // First Webhook Call
    const wh1 = await request(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'x-webhook-signature': 'test_valid_signature'
      },
      body: webhookPayload
    });
    assert(wh1.status === 200, 'Initial webhook processed successfully (200 OK)');

    // Repeat identical Webhook Call (Idempotency test)
    const wh2 = await request(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'x-webhook-signature': 'test_valid_signature'
      },
      body: webhookPayload
    });
    assert(wh2.status === 200, 'Duplicate webhook handled idempotently (200 OK)');
    assert(wh2.data.status === 'ALREADY_PROCESSED', 'Duplicate webhook identified and skipped');

    // Verify payment count in DB is exactly 1
    const paymentsCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE payment_reference = ?').get(s2PayRef) as any;
    assert(paymentsCount.count === 1, 'Exactly 1 payment record maintained without duplicate creation');
  }

  console.log('\n--- 7. Testing Digital Receipt Query & Verification Hash ---');
  {
    const receiptRes = await request(`${API_BASE}/payments/receipt/${ctx.paymentReference}`, {
      headers: { Authorization: `Bearer ${ctx.studentToken}` }
    });

    assert(receiptRes.status === 200, 'GET /payments/receipt/:ref returns 200 OK');
    const r = receiptRes.data.receipt;
    assert(r.paymentReference === ctx.paymentReference, 'Receipt payment reference matches');
    assert(r.bookingReference === ctx.bookingReference, 'Receipt booking reference matches');
    assert(r.status === 'SUCCESS', 'Receipt status is SUCCESS');
    assert(r.totalPaid === ctx.totalAmount, 'Receipt total matches paid amount');
    assert(Boolean(r.verificationHash), 'Tamper-proof security verification hash generated');
    assert(r.student.name.length > 0, 'Tenant student name included');
    assert(r.provider.name.length > 0, 'Landlord name included');
    assert(r.accommodation.title.length > 0, 'Hostel property info included');
  }

  console.log('\n--- 8. Testing Student Payment History & Data Isolation ---');
  {
    const s1List = await request(`${API_BASE}/payments/student`, {
      headers: { Authorization: `Bearer ${ctx.studentToken}` }
    });
    assert(s1List.status === 200, 'Student 1 can query payment history');
    assert(Array.isArray(s1List.data.payments), 'Payments returned as array');
    assert(s1List.data.payments.some((p: any) => p.paymentReference === ctx.paymentReference), 'Student 1 sees their payment');

    // Student 2 tries to view Student 1 receipt -> Must be blocked with 403 Forbidden
    const unauthReceipt = await request(`${API_BASE}/payments/receipt/${ctx.paymentReference}`, {
      headers: { Authorization: `Bearer ${ctx.student2Token}` }
    });
    assert(unauthReceipt.status === 403, 'Cross-student receipt access blocked with HTTP 403 Forbidden');
  }

  console.log('\n--- 9. Testing Provider Financials & Settlement Bank Account ---');
  {
    // Save settlement bank account
    const bankRes = await request(`${API_BASE}/payments/payout-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.providerToken}` },
      body: {
        bankCode: '058',
        bankName: 'Guaranty Trust Bank (GTBank)',
        accountNumber: '0123456789',
        accountName: 'SAMUEL TUNDE ADEYEMI'
      }
    });
    assert(bankRes.status === 200, 'Provider settlement bank account saved');
    assert(bankRes.data.account.accountNumberMasked.startsWith('******'), 'Account number masked for security');

    // Query Provider Financials
    const finRes = await request(`${API_BASE}/payments/provider/financials`, {
      headers: { Authorization: `Bearer ${ctx.providerToken}` }
    });
    assert(finRes.status === 200, 'Provider financials query returns 200 OK');
    assert(typeof finRes.data.metrics.totalRevenue === 'number', 'Total revenue calculated');
    assert(finRes.data.metrics.totalRevenue > 0, 'Total revenue reflects paid tenant bookings');
    assert(Array.isArray(finRes.data.propertyRevenue), 'Revenue by property returned as array');
    assert(Boolean(finRes.data.payoutAccount), 'Saved settlement bank account populated');
  }

  console.log('\n--- 10. Testing Admin Financials & Authorized Refund Engine ---');
  {
    // 1. Admin Financials Query
    const adminFin = await request(`${API_BASE}/payments/admin/financials`, {
      headers: { Authorization: `Bearer ${ctx.adminToken}` }
    });
    assert(adminFin.status === 200, 'Admin financials returns 200 OK');
    assert(adminFin.data.metrics.totalGmv > 0, 'Platform Gross Merchandise Value (GMV) calculated');
    assert(adminFin.data.metrics.totalPlatformFees > 0, 'Platform service fees calculated');
    assert(Array.isArray(adminFin.data.ledgerStream), 'Immutable double-entry ledger stream returned');

    // 2. Execute Authorized Refund
    const refundRes = await request(`${API_BASE}/payments/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.adminToken}` },
      body: {
        paymentId: ctx.paymentId,
        reason: 'Student granted authorized relocation exemption'
      }
    });
    assert(refundRes.status === 200, 'Admin executed authorized refund (200 OK)');
    assert(refundRes.data.refundReference.startsWith('HE-REF-2026-'), 'Refund reference format HE-REF-2026-XXXXXX');
    assert(refundRes.data.status === 'SUCCESS', 'Refund status is SUCCESS');

    // 3. Verify Payment and Booking Status
    const payAfter = db.prepare('SELECT status FROM payments WHERE id = ?').get(ctx.paymentId) as any;
    assert(payAfter.status === 'REFUNDED', 'Payment status transitioned to REFUNDED');

    const bookAfter = db.prepare('SELECT payment_status FROM bookings WHERE id = ?').get(ctx.bookingId) as any;
    assert(bookAfter.payment_status === 'REFUNDED', 'Booking payment_status transitioned to REFUNDED');

    // 4. Verify Financial Ledger Debit
    const refundLedger = db.prepare(`SELECT * FROM financial_ledger WHERE payment_id = ? AND entry_type = 'REFUND_DEBITED'`).get(ctx.paymentId) as any;
    assert(Boolean(refundLedger), 'Ledger records REFUND_DEBITED immutable entry');
  }

  console.log('\n====================================================');
  console.log(`  PHASE 6 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');
}

runPhase6Tests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
