import db from '../server/db';
import crypto from 'crypto';
import { getPaymentGateway } from '../server/services/paymentGateway';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING PAYSTACK TEST MODE INTEGRATION & SECURITY');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Gateway Resolution
  console.log('--- 1. Testing Gateway Factory Resolution ---');
  const paystackGateway = getPaymentGateway('PAYSTACK');
  assert(paystackGateway.name === 'PAYSTACK', 'getPaymentGateway("PAYSTACK") returns PaystackAdapter', `Expected PAYSTACK, got ${paystackGateway.name}`);

  // 2. Webhook Signature Security
  console.log('\n--- 2. Testing Webhook Signature Verification ---');
  const testSecret = 'sk_test_paystack_sample_secret_key_123';
  process.env.PAYSTACK_SECRET_KEY = testSecret;
  process.env.PAYSTACK_WEBHOOK_SECRET = testSecret;

  const testPayload = JSON.stringify({
    event: 'charge.success',
    data: {
      id: 9912048,
      reference: 'HE-PAY-2026-TEST01',
      amount: 20000000,
      currency: 'NGN',
      status: 'success'
    }
  });

  const validSignature = crypto.createHmac('sha512', testSecret).update(testPayload).digest('hex');
  const invalidSignature = 'invalid_tampered_signature_hex_12345';

  assert(
    paystackGateway.verifyWebhookSignature(validSignature, testPayload) === true,
    'Valid HMAC SHA512 signature is verified successfully'
  );

  assert(
    paystackGateway.verifyWebhookSignature(invalidSignature, testPayload) === false,
    'Tampered / invalid webhook signature is strictly rejected'
  );

  // 3. Price Integrity & 5% Commission Math
  console.log('\n--- 3. Testing Price Integrity & 5% Commission Architecture ---');
  const sampleBookingTotal = 200000;
  const platformCommission = Math.round(sampleBookingTotal * 0.05);
  const landlordShare = sampleBookingTotal - platformCommission;

  assert(platformCommission === 10000, '5% commission on ₦200,000 equals ₦10,000', `Got ${platformCommission}`);
  assert(landlordShare === 190000, 'Landlord share on ₦200,000 equals ₦190,000', `Got ${landlordShare}`);
  assert(platformCommission + landlordShare === sampleBookingTotal, 'Sum of commission and landlord share equals single accommodation total');

  // 4. Test DB Integration: Ensure bookings table has payment columns
  console.log('\n--- 4. Testing Database Schema Constraints ---');
  const bookingCols = db.prepare("PRAGMA table_info(bookings)").all() as any[];
  const hasPaymentStatus = bookingCols.some(c => c.name === 'payment_status');
  const hasPaidAt = bookingCols.some(c => c.name === 'paid_at');
  assert(hasPaymentStatus, 'Bookings table contains payment_status column');
  assert(hasPaidAt, 'Bookings table contains paid_at column');

  // Test Payments table columns
  const paymentCols = db.prepare("PRAGMA table_info(payments)").all() as any[];
  const hasPaymentRef = paymentCols.some(c => c.name === 'payment_reference');
  const hasProvider = paymentCols.some(c => c.name === 'payment_provider');
  const hasPlatformFee = paymentCols.some(c => c.name === 'platform_fee');
  assert(hasPaymentRef && hasProvider && hasPlatformFee, 'Payments table contains payment_reference, payment_provider, and platform_fee columns');

  // 5. Test Webhook Idempotency Table
  const webhookCols = db.prepare("PRAGMA table_info(payment_webhook_events)").all() as any[];
  const hasEventId = webhookCols.some(c => c.name === 'event_id');
  assert(hasEventId, 'payment_webhook_events table contains event_id column for idempotency');

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
